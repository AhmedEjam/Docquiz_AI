import { generateWithImage } from './aiClient';
import { AsyncQueue } from '../lib/asyncQueue';
import { extractImagesFromPage } from './pdfService';
import { saveOcrImages, loadOcrImages } from '../utils/sessionCache';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export class JobControl {
  constructor() {
    this.isPaused = false;
    this.isStopped = false;
    this.abortController = new AbortController();
  }
  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() {
    this.isStopped = true;
    this.abortController.abort();
  }
}

/**
 * Render a PDF page to base64 PNG image(s).
 * Tall pages (>2500px) are split in half for better OCR accuracy.
 * Canvases are released immediately after encoding to free memory.
 */
export async function pageToB64(page, scale = 2.0) {
  const vp = page.getViewport({ scale });
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = vp.width;
  fullCanvas.height = vp.height;
  const ctx = fullCanvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  let images;
  if (vp.height > 2500) {
    images = [];
    const half = Math.floor(vp.height / 2);
    for (const [topY, h] of [[0, half], [half, vp.height - half]]) {
      const slice = document.createElement('canvas');
      slice.width = vp.width;
      slice.height = h;
      slice.getContext('2d').drawImage(fullCanvas, 0, topY, vp.width, h, 0, 0, vp.width, h);
      images.push(slice.toDataURL('image/png').split(',')[1]);
      slice.width = 0;
      slice.height = 0;
    }
  } else {
    images = [fullCanvas.toDataURL('image/png').split(',')[1]];
  }

  fullCanvas.width = 0;
  fullCanvas.height = 0;

  return images;
}

/**
 * Process a single section through OCR.
 * Uses the unified aiClient for HTTP calls.
 */
export async function processSection(section, getPageProxy, cfg, onProgress) {
  let text = cfg.initialText || '';
  let flagged = false;

  const startPage = cfg.resumePage || section.startPage;
  
  // Load previously extracted images for this section if resuming
  let extractedImages = [];
  if (startPage > section.startPage) {
    extractedImages = await loadOcrImages(section.id) || [];
  }

  for (let n = startPage; n <= section.endPage; n++) {
    const jc = cfg.jobControl;
    if (jc?.isStopped) throw new Error('AbortError');
    while (jc?.isPaused) {
      if (jc.isStopped) throw new Error('AbortError');
      await sleep(200);
    }

    if (cfg.excludedPages && cfg.excludedPages.has(n)) {
      continue;
    }

    const page = getPageProxy(n);
    const b64Images = await pageToB64(page, 2.0);
    
    // Extract raw embedded images from the PDF page
    const rawImages = await extractImagesFromPage(n);
    const pageImageIds = [];
    
    for (let i = 0; i < rawImages.length; i++) {
      const imgId = `sec_${section.id}_p${n}_img${i + 1}`;
      extractedImages.push({
        id: imgId,
        dataUrl: rawImages[i]
      });
      pageImageIds.push(imgId);
    }

    let pageText = '';
    for (const b64 of b64Images) {
      const result = await generateWithImage(cfg.provider, cfg.prompt, [b64], {
        signal: jc?.abortController.signal
      });
      pageText += result + '\n';
    }

    // Quality flag logic
    const illegibleCount = (pageText.match(/\[ILLEGIBLE\]/g) || []).length;
    const questionCount = (pageText.match(/\[\?.*?\]/g) || []).length;
    if (illegibleCount > 2 || questionCount > 5 || pageText.length < 100) {
      flagged = true;
    }

    if (cfg.includeDividers !== false) {
      text += pageText + '\n';
    } else {
      text += pageText + '\n\n';
    }
    
    // Append image tags for any images found on this page
    if (pageImageIds.length > 0) {
      text += `\n\n*Extracted Figures from Page ${n}:*\n`;
      pageImageIds.forEach((id, idx) => {
        text += `![Figure ${idx + 1}](images/${id}.png)\n`;
      });
    }
    
    if (cfg.includeDividers !== false) {
      text += '\n--- PAGE ' + n + ' ---\n\n';
    }

    // Save images progressively
    await saveOcrImages(section.id, extractedImages);

    if (onProgress) {
      onProgress({ 
        sectionId: section.id, 
        page: n, 
        of: section.endPage,
        partialText: text
      });
    }
  }

  return { sectionId: section.id, name: section.name, text, flagged };
}

/**
 * Create an OCR queue with the given concurrency.
 * Returns an AsyncQueue instance. Callers enqueue section tasks.
 */
export function createOCRQueue(concurrency = 2) {
  return new AsyncQueue(concurrency);
}
