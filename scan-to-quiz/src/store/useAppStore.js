import { create } from 'zustand';
import { OCR_DEFAULT } from '../prompts/ocrPrompt';
import { EXT_DEFAULT, GEN_DEFAULT, REV_DEFAULT } from '../prompts/mcqPrompts';
import { getDefaultProviderConfig } from '../config/aiProviders';

const useAppStore = create((set) => ({
  // Pipeline Stage (1, 2, or 3)
  stage: 1,
  setStage: (stage) => set({ stage }),

  // Global Config (Deprecated ollamaBaseUrl, now per-stage providers)
  ocrProvider: getDefaultProviderConfig('ollama'),
  setOcrProvider: (p) => set((s) => ({ ocrProvider: { ...s.ocrProvider, ...p } })),
  
  mcqProvider: getDefaultProviderConfig('ollama'),
  setMcqProvider: (p) => set((s) => ({ mcqProvider: { ...s.mcqProvider, ...p } })),

  // Stage 1
  pages: [], // { num, text, thumb }[]
  sections: [], // { id, name, startPage, endPage, chapterNum }[]
  splitPoints: [], // page numbers where split occurs
  gridCols: 2,
  thumbScale: 1.0,
  excludedPages: new Set(),
  excludedSections: new Set(),
  originalPdfFile: null,

  setPages: (pages) => set({ pages }),
  setSections: (sections) => set({ sections }),
  setSplitPoints: (splitPoints) => set({ splitPoints }),
  setGridCols: (cols) => set({ gridCols: cols }),
  setThumbScale: (scale) => set({ thumbScale: scale }),
  setOriginalPdfFile: (file) => set({ originalPdfFile: file }),
  
  togglePageExclude: (pageNum) => set((s) => {
    const newSet = new Set(s.excludedPages);
    if (newSet.has(pageNum)) newSet.delete(pageNum);
    else newSet.add(pageNum);
    return { excludedPages: newSet };
  }),
  
  toggleSectionExclude: (secId) => set((s) => {
    const newSet = new Set(s.excludedSections);
    if (newSet.has(secId)) newSet.delete(secId);
    else newSet.add(secId);
    return { excludedSections: newSet };
  }),

  // Stage 2
  ocrConfig: { concurrency: 2, includeDividers: true },
  ocrPrompt: OCR_DEFAULT,
  ocrReviewConfig: { model: 'llama3.1' },
  ocrReviewPrompt: "You are an expert editor. Review the following OCR extracted text. Fix any obvious typos, artifact glitches, or formatting errors. Do not change the meaning or remove content. Output ONLY the corrected text without any chat wrap or introductions.",
  ocrResults: {}, // sectionId -> { text, status, flagged }
  
  setOcrConfig: (config) => set((s) => ({ ocrConfig: { ...s.ocrConfig, ...config } })),
  setOcrPrompt: (prompt) => set({ ocrPrompt: prompt }),
  setOcrReviewConfig: (config) => set((s) => ({ ocrReviewConfig: { ...s.ocrReviewConfig, ...config } })),
  setOcrReviewPrompt: (prompt) => set({ ocrReviewPrompt: prompt }),
  setOcrResult: (id, r) => set((s) => ({ ocrResults: { ...s.ocrResults, [id]: r } })),
  setAllOcrResults: (results) => set({ ocrResults: results }),
  updateOcrResultText: (id, text) => set((s) => ({ ocrResults: { ...s.ocrResults, [id]: { ...s.ocrResults[id], text } } })),

  // Stage 3
  mcqConfig: { reviewEnabled: false },
  mcqPrompts: { extraction: EXT_DEFAULT, generation: GEN_DEFAULT, review: REV_DEFAULT },
  mcqResults: [], // flat MCQ[]
  exportFilename: '',
  
  setMcqConfig: (config) => set((s) => ({ mcqConfig: { ...s.mcqConfig, ...config } })),
  setMcqPrompts: (prompts) => set((s) => ({ mcqPrompts: { ...s.mcqPrompts, ...prompts } })),
  setExportFilename: (name) => set({ exportFilename: name }),
  
  appendMCQs: (mcqs) => set((s) => ({ mcqResults: [...s.mcqResults, ...mcqs] })),
  setAllMcqResults: (results) => set({ mcqResults: results }),
  addMCQ: (mcq) => set((s) => ({ mcqResults: [...s.mcqResults, mcq] })),
  clearMCQs: () => set({ mcqResults: [] }),
  updateMCQ: (index, updatedMCQ) => set((s) => {
    const newResults = [...s.mcqResults];
    newResults[index] = updatedMCQ;
    return { mcqResults: newResults };
  }),
  deleteMCQ: (index) => set((s) => {
    const newResults = [...s.mcqResults];
    newResults.splice(index, 1);
    return { mcqResults: newResults };
  })
}));

// --- Selectors (subscribe to only what you need) ---
export const selectStage          = (s) => s.stage;
export const selectPages          = (s) => s.pages;
export const selectSections       = (s) => s.sections;
export const selectSplitPoints    = (s) => s.splitPoints;
export const selectGridCols       = (s) => s.gridCols;
export const selectThumbScale     = (s) => s.thumbScale;
export const selectExcludedPages  = (s) => s.excludedPages;
export const selectExcludedSections= (s) => s.excludedSections;
export const selectOriginalPdfFile = (s) => s.originalPdfFile;
export const selectOcrConfig      = (s) => s.ocrConfig;
export const selectOcrPrompt      = (s) => s.ocrPrompt;
export const selectOcrReviewConfig = (s) => s.ocrReviewConfig;
export const selectOcrReviewPrompt = (s) => s.ocrReviewPrompt;
export const selectOcrResults     = (s) => s.ocrResults;
export const selectMcqConfig      = (s) => s.mcqConfig;
export const selectMcqPrompts     = (s) => s.mcqPrompts;
export const selectMcqResults     = (s) => s.mcqResults;
export const selectOcrProvider    = (s) => s.ocrProvider;
export const selectMcqProvider    = (s) => s.mcqProvider;
export const selectExportFilename = (s) => s.exportFilename;

export default useAppStore;
