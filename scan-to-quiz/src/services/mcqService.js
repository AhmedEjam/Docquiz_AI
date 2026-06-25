import { chunkText } from '../utils/textChunker';
import { safeParseJSON } from '../utils/jsonParser';
import { chatComplete } from './aiClient';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getWords(str) {
  return new Set(str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersectionSize = 0;
  for (const w of setA) if (setB.has(w)) intersectionSize++;
  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

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
      .replace(/{CHAPTER_NUM}/g, section.chapterNum)
      .replace(/{SECTION_NAME}/g, section.name)
      .replace(/{START_NUM}/g, qNum)
      .replace(/{NEXT_NUM}/g, qNum + 1);
      
    const raw = await chatComplete(cfg.provider, sys, chunk, { 
      signal: jc?.abortController.signal,
      temperature: 0.1,
      jsonMode: true
    });
    
    let { data: parsed, error: parseError } = safeParseJSON(raw);
    
    if (parseError) {
      console.warn(`[MCQ Extraction] Chunk ${i+1} JSON parse failed:`, parseError);
      // We could try to recover or skip. For now we skip, but the error is no longer silent.
    }
    
    // Empty array [] or parse failure means no MCQs extracted properly — trigger generation pass
    if (parseError || (Array.isArray(parsed) && parsed.length === 0)) {
      const genSys = prompts.generation
        .replace(/{CHAPTER_NUM}/g, section.chapterNum)
        .replace(/{SECTION_NAME}/g, section.name)
        .replace(/{START_NUM}/g, qNum)
        .replace(/{NEXT_NUM}/g, qNum + 1);
        
      const genRaw = await chatComplete(cfg.provider, genSys, chunk, { 
        signal: jc?.abortController.signal,
        temperature: 0.5,
        jsonMode: true
      });
      
      const genRes = safeParseJSON(genRaw);
      parsed = genRes.data || [];
    }
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Review pass — data sent as user message, instructions are the system prompt
      if (cfg.reviewEnabled && prompts.review && prompts.review.trim() !== '') {
        const reviewSystem = prompts.review.replace('{MCQ_JSON_ARRAY}', '').trim();
        const reviewedRaw = await chatComplete(
          cfg.provider,
          reviewSystem,
          JSON.stringify(parsed),
          { 
            signal: jc?.abortController.signal,
            temperature: 0.1,
            jsonMode: true
          }
        );
        const reviewRes = safeParseJSON(reviewedRaw);
        if (Array.isArray(reviewRes.data) && reviewRes.data.length > 0) {
          parsed = reviewRes.data;
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
  
  // 9A/Concern 1: Fuzzy deduplicate MCQs across chunks (useful for questions split at chunk boundaries)
  const uniqueMCQs = [];
  
  for (const q of all) {
    if (!q.stem) continue;
    
    const words = getWords(q.stem);
    let isDuplicate = false;
    
    for (const existing of uniqueMCQs) {
      if (jaccard(words, getWords(existing.stem)) > 0.85) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueMCQs.push(q);
    }
  }

  // Renumber the deduplicated MCQs to ensure sequence is perfectly preserved
  let finalQNum = cfg.resumeQNum || 1;
  uniqueMCQs.forEach(q => {
    q.ch_q = section.chapterNum + '-' + finalQNum;
    finalQNum++;
  });

  return uniqueMCQs;
}
