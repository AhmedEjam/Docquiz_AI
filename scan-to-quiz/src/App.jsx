import React from 'react';
import useAppStore, { selectStage, selectPages, selectOcrProvider, selectMcqProvider } from './store/useAppStore';
import PipelineNav from './components/shared/PipelineNav';
import PdfUploader from './components/stage1/PdfUploader';
import PdfPageGrid from './components/stage1/PdfPageGrid';
import SectionManager from './components/stage1/SectionManager';
import AIConfigPanel from './components/shared/AIConfigPanel';
import PromptEditor from './components/stage2/PromptEditor';
import OCRQueuePanel from './components/stage2/OCRQueuePanel';
import TextReview from './components/stage2/TextReview';
import MCQPromptEditor from './components/stage3/MCQPromptEditor';
import MCQQueuePanel from './components/stage3/MCQQueuePanel';
import MCQTable from './components/stage3/MCQTable';
import CSVExporter from './components/stage3/CSVExporter';
import { loadAllOcrResults, loadMcqResults } from './utils/sessionCache';

function App() {
  const stage = useAppStore(selectStage);
  const pages = useAppStore(selectPages);
  const setAllOcrResults = useAppStore(s => s.setAllOcrResults);
  const setAllMcqResults = useAppStore(s => s.setAllMcqResults);

  const ocrProvider = useAppStore(selectOcrProvider);
  const setOcrProvider = useAppStore(s => s.setOcrProvider);
  
  const mcqProvider = useAppStore(selectMcqProvider);
  const setMcqProvider = useAppStore(s => s.setMcqProvider);

  React.useEffect(() => {
    async function hydrate() {
      const ocr = await loadAllOcrResults();
      if (Object.keys(ocr).length > 0) setAllOcrResults(ocr);
      const mcq = await loadMcqResults();
      if (mcq.length > 0) setAllMcqResults(mcq);
    }
    hydrate();
  }, [setAllOcrResults, setAllMcqResults]);

  return (
    <div className="min-h-screen bg-background-primary text-text-primary flex flex-col font-sans">
      <PipelineNav />
      
      <main className="flex-1 p-6 flex flex-col">
        {stage === 1 && (
          <div className="flex-1 flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
            <div className="flex-[3] bg-background-secondary border border-border-tertiary rounded-lg overflow-hidden flex flex-col">
              {pages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <PdfUploader />
                </div>
              ) : (
                <PdfPageGrid />
              )}
            </div>
            <div className="flex-1 min-w-[300px]">
              <SectionManager />
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="flex-1 flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
            <div className="flex-[3] flex flex-col overflow-hidden gap-4">
              <PromptEditor />
              <div className="flex-1 overflow-y-auto">
                <TextReview />
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-[300px] gap-4">
              <AIConfigPanel title="OCR API Settings" config={ocrProvider} setConfig={setOcrProvider} />
              <div className="flex-1">
                <OCRQueuePanel />
              </div>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div className="flex-1 flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
            <div className="flex-[3] flex flex-col overflow-hidden gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Generated MCQs</h2>
                <CSVExporter />
              </div>
              <div className="flex-1 overflow-y-auto">
                <MCQTable />
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-[300px] gap-4">
              <MCQPromptEditor />
              <AIConfigPanel title="MCQ API Settings" config={mcqProvider} setConfig={setMcqProvider} />
              <div className="flex-1">
                <MCQQueuePanel />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
