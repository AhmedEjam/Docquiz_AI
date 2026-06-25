import { chunkText } from '../utils/textChunker';
import { safeParseJSON } from '../utils/jsonParser';
import { chatComplete } from './aiClient';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function processMCQ(section, cfg, prompts, onProgress) {
  const chunks = chunkText(section.text);
  const all = cfg.initialMCQs || []; 
  let qNum = cfg.resumeQNum || 1;
  const startChunkIndex = cfg.resumeChunk || 0;
  
  for (let i = startChunkIndex; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    const jc = cfg.jobControl;
    if (jc?.isStopped) throw new Error('AbortError');
    while (jc?.isPaused) {
      if (jc.isStopped) throw new Error('AbortError');
      await sleep(200);
    }

    const sys = prompts.extraction
      .replace('{CHAPTER_NUM}', section.chapterNum)
      .replace('{SECTION_NAME}', section.name)
      .replace('{START_NUM}', qNum);
      
    const raw = await chatComplete(cfg.provider, sys, chunk, { signal: jc?.abortController.signal });
    let parsed = safeParseJSON(raw);
    
    if (parsed && parsed.no_mcqs) {
      const genSys = prompts.generation
        .replace('{CHAPTER_NUM}', section.chapterNum)
        .replace('{SECTION_NAME}', section.name)
        .replace('{START_NUM}', qNum);
      parsed = safeParseJSON(await chatComplete(cfg.provider, genSys, chunk, { signal: jc?.abortController.signal })) || [];
    }
    
    if (Array.isArray(parsed)) {
      // Review pass
      if (cfg.reviewEnabled && prompts.review && prompts.review.trim() !== '') {
        const reviewSys = prompts.review.replace('{MCQ_JSON_ARRAY}', JSON.stringify(parsed));
        const reviewedRaw = await chatComplete(cfg.provider, reviewSys, "", { signal: jc?.abortController.signal });
        const reviewedParsed = safeParseJSON(reviewedRaw);
        if (Array.isArray(reviewedParsed) && reviewedParsed.length > 0) {
          parsed = reviewedParsed;
        }
      }

      parsed.forEach((q, j) => { 
        q.ch_q = section.chapterNum + '-' + (qNum + j); 
      });
      all.push(...parsed); 
      qNum += parsed.length;
    }
    if (onProgress) onProgress({ chunk: i+1, total: chunks.length, found: all.length });
  }
  return all;
}
