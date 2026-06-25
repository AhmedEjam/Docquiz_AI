import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Use ?url suffix to let Vite properly resolve the worker as an asset URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const PATTERNS = [
  /^chapter\s+\d+/i,
  /^unit\s+\d+/i,
  /^section\s+\d+/i,
  /^part\s+[IVX\d]+/i,
  /^\d{1,2}\.\s+[A-Z]/,
  /^lecture\s+\d+/i,
  /^(\u0627\u0644\u0641\u0635\u0644|\u0627\u0644\u0648\u062d\u062f\u0629|\u0627\u0644\u0642\u0633\u0645)\s+\d+/,
];

/**
 * Module-level registry — keeps heavy PDFPageProxy objects out of Zustand.
 * Components access proxies via getPageProxy(pageNum).
 */
const _pageProxies = new Map();

export function getPageProxy(pageNum) {
  return _pageProxies.get(pageNum);
}

export async function loadPDF(file, onProgress) {
  const url = URL.createObjectURL(file);
  const pdf = await pdfjsLib.getDocument({ url }).promise;
  const pages = [];

  _pageProxies.clear();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    _pageProxies.set(i, page);

    const text = await getPageText(page);
    // State-safe: no PDFPageProxy stored here
    pages.push({ num: i, text, thumb: null });
    if (onProgress) onProgress(i, pdf.numPages);

    // Yield to the browser render loop to prevent UI freezing on large PDFs
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  URL.revokeObjectURL(url);
  return pages;
}

export async function getPageText(page) {
  const c = await page.getTextContent();
  return c.items.map(i => i.str).join(' ');
}

export async function renderPage(pageNum, scale = 1.5) {
  const page = _pageProxies.get(pageNum);
  if (!page) return null;
  
  const vp = page.getViewport({ scale });
  const cv = document.createElement('canvas');
  cv.width = vp.width; 
  cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
  const dataUrl = cv.toDataURL('image/png');
  
  // Release canvas
  cv.width = 0;
  cv.height = 0;
  
  return dataUrl;
}

export async function extractImagesFromPage(pageNum) {
  const page = _pageProxies.get(pageNum);
  if (!page) return [];
  
  const ops = await page.getOperatorList();
  const images = [];
  
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject || ops.fnArray[i] === pdfjsLib.OPS.paintJpegXObject) {
      const objId = ops.argsArray[i][0];
      try {
        const img = await page.objs.get(objId);
        if (img) {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (img.bitmap) {
            ctx.drawImage(img.bitmap, 0, 0);
            images.push(canvas.toDataURL('image/png'));
          } else if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || img instanceof ImageBitmap) {
            ctx.drawImage(img, 0, 0);
            images.push(canvas.toDataURL('image/png'));
          } else if (img.data) {
            let data = img.data;
            const pxCount = img.width * img.height;
            if (data.length === pxCount * 3) {
              const rgba = new Uint8ClampedArray(pxCount * 4);
              for (let j = 0, k = 0; j < data.length; j += 3, k += 4) {
                rgba[k] = data[j]; rgba[k+1] = data[j+1]; rgba[k+2] = data[j+2]; rgba[k+3] = 255;
              }
              data = rgba;
            } else if (data.length === pxCount * 1) {
              const rgba = new Uint8ClampedArray(pxCount * 4);
              for (let j = 0, k = 0; j < data.length; j += 1, k += 4) {
                rgba[k] = data[j]; rgba[k+1] = data[j]; rgba[k+2] = data[j]; rgba[k+3] = 255;
              }
              data = rgba;
            } else if (data.length !== pxCount * 4) {
              console.warn('Unknown image format data length', data.length);
              continue;
            }

            const imgData = new ImageData(new Uint8ClampedArray(data), img.width, img.height);
            ctx.putImageData(imgData, 0, 0);
            images.push(canvas.toDataURL('image/png'));
          }
        }
      } catch (e) {
        console.warn('Failed to extract image', e);
      }
    }
  }
  return images;
}

export function autoDetectSplits(pages) {
  return pages
    .filter(p => PATTERNS.some(r => r.test(p.text.trim().split('\n')[0])))
    .map(p => p.num - 1);
}

export function buildSections(pages, splitPoints, existingSections = []) {
  const pts = [...new Set([0, ...splitPoints, pages.length])].sort((a,b) => a-b);
  let lastChapterNum = 0;

  return pts.slice(0,-1).map((start, i) => {
    const startPageNum = start + 1;
    const endPageNum = pts[i+1];
    
    // Preserve existing section if it starts at the exact same page
    const existing = existingSections.find(s => s.startPage === startPageNum);
    if (existing) {
      lastChapterNum = existing.chapterNum;
      return {
        ...existing,
        endPage: endPageNum
      };
    }

    // Try to auto-detect chapter number from the first page of the section
    const firstPageText = pages[start].text.trim().split('\n')[0];
    
    let detectedNum = null;
    for (const pat of PATTERNS) {
      const match = firstPageText.match(pat);
      if (match) {
        const nums = match[0].match(/\d+/);
        if (nums) detectedNum = parseInt(nums[0], 10);
        break;
      }
    }

    if (detectedNum !== null) {
      lastChapterNum = detectedNum;
    }

    return {
      id:         'sec-start-' + startPageNum,
      name:       'Section ' + (i+1),
      startPage:  startPageNum,
      endPage:    endPageNum,
      chapterNum: lastChapterNum,
    };
  });
}

export async function exportPdfSubset(file, pagesToKeep, outputFilename, method = 'preserve') {
  console.log(`[Export PDF] Starting export. Method: ${method}, Output: ${outputFilename}, Pages:`, pagesToKeep);
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  let pdfBytes;
  if (method === 'preserve') {
    // Create a set of zero-indexed pages to keep
    const keepSet = new Set(pagesToKeep.map(p => p - 1));
    
    // Iterate backwards so page indices don't shift during deletion
    const totalPages = pdfDoc.getPageCount();
    for (let i = totalPages - 1; i >= 0; i--) {
      if (!keepSet.has(i)) {
        pdfDoc.removePage(i);
      }
    }
    pdfBytes = await pdfDoc.save();
  } else {
    const newPdf = await PDFDocument.create();
    const pageIndices = pagesToKeep.map(p => p - 1);
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));
    pdfBytes = await newPdf.save();
  }
  
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = outputFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
