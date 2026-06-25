import React, { useState } from 'react';
import useAppStore, { selectSections, selectOcrResults, selectExportFilename, selectOcrProvider, selectOcrReviewConfig, selectOcrReviewPrompt } from '../../store/useAppStore';
import { chatComplete } from '../../services/aiClient';
import { saveOcrResult, loadOcrImages } from '../../utils/sessionCache';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function TextReview() {
  const sections = useAppStore(selectSections);
  const ocrResults = useAppStore(selectOcrResults);
  const updateOcrResultText = useAppStore(s => s.updateOcrResultText);
  const exportFilename = useAppStore(selectExportFilename);
  const ocrProvider = useAppStore(selectOcrProvider);
  const ocrReviewConfig = useAppStore(selectOcrReviewConfig);
  const ocrReviewPrompt = useAppStore(selectOcrReviewPrompt);
  const setOcrResult = useAppStore(s => s.setOcrResult);

  const [globalRefining, setGlobalRefining] = useState(false);

  const handleExportMarkdown = async (sec, text) => {
    const baseDocName = exportFilename || 'document';
    const cleanDocName = baseDocName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const cleanSecName = sec.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    
    const images = await loadOcrImages(sec.id);
    
    if (images && images.length > 0) {
      const zip = new JSZip();
      zip.file(`${cleanDocName}_${cleanSecName}_ocr.md`, text);
      
      const imgFolder = zip.folder("images");
      images.forEach(img => {
        // img.dataUrl looks like "data:image/png;base64,iVBORw0KGgo..."
        const base64Data = img.dataUrl.split(',')[1];
        if (base64Data) {
          imgFolder.file(`${img.id}.png`, base64Data, { base64: true });
        }
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${cleanDocName}_${cleanSecName}_export.zip`);
    } else {
      const blob = new Blob([text], { type: 'text/markdown' });
      saveAs(blob, `${cleanDocName}_${cleanSecName}_ocr.md`);
    }
  };

  const handleRefineSection = async (secId) => {
    const res = ocrResults[secId];
    if (!res || !res.text) return;

    setOcrResult(secId, { ...res, status: 'refining' });

    try {
      const providerConfig = { ...ocrProvider, model: ocrReviewConfig.model || ocrProvider.model };
      const refinedText = await chatComplete(providerConfig, ocrReviewPrompt, res.text);
      const payload = { text: refinedText, status: 'refined', flagged: false };
      setOcrResult(secId, payload);
      saveOcrResult(secId, payload);
    } catch (err) {
      console.error('Refinement failed', err);
      setOcrResult(secId, { ...res, status: 'error', error: err.message });
    }
  };

  const handleRefineAll = async () => {
    // Only refine sections that have some text
    const sectionIds = sections
      .map(s => s.id)
      .filter(id => ocrResults[id] && ocrResults[id].text && (ocrResults[id].status === 'complete' || ocrResults[id].status === 'stopped' || ocrResults[id].status === 'error'));
    
    setGlobalRefining(true);
    for (const id of sectionIds) {
      await handleRefineSection(id);
    }
    setGlobalRefining(false);
  };

  if (sections.length === 0) return null;

  const hasExtractedTests = Object.values(ocrResults).some(r => r && r.text && r.text.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium">Extracted Text Review</h3>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-text-secondary uppercase">Refine Model:</label>
            <input 
              type="text" 
              value={ocrReviewConfig.model || ''} 
              onChange={e => useAppStore.getState().setOcrReviewConfig({ model: e.target.value })}
              placeholder={ocrProvider.model}
              className="w-32 px-2 py-1 bg-background-primary border border-border-tertiary rounded text-[10px] focus:outline-none focus:border-border-info font-mono"
            />
          </div>
        </div>
        {hasExtractedTests && (
          <button 
            onClick={handleRefineAll}
            disabled={globalRefining}
            className="px-3 py-1.5 bg-text-info text-white text-xs font-medium rounded hover:bg-opacity-90 disabled:opacity-50"
          >
            {globalRefining ? 'Refining All...' : '✨ Refine All Sections'}
          </button>
        )}
      </div>

      {sections.map(sec => {
        const res = ocrResults[sec.id];
        if (!res) return null;

        const isRefining = res.status === 'refining';

        return (
          <div key={sec.id} className="bg-background-secondary border border-border-tertiary rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-background-secondary border-b border-border-tertiary">
              <span className="text-xs font-medium">{sec.name} (Ch {sec.chapterNum})</span>
              <div className="flex gap-2 items-center">
                {(res.status === 'complete' || res.status === 'refined' || res.status === 'stopped') && (
                  <>
                    <button 
                      onClick={() => handleRefineSection(sec.id)}
                      disabled={isRefining || globalRefining}
                      className="px-2 py-0.5 bg-background-primary border border-border-tertiary text-text-info font-medium rounded text-[10px] hover:bg-background-secondary disabled:opacity-50"
                      title="Send to text model to clean up OCR artifacts"
                    >
                      {isRefining ? 'Refining...' : '✨ Refine'}
                    </button>
                    <button 
                      onClick={() => handleExportMarkdown(sec, res.text)}
                      className="px-2 py-0.5 bg-background-primary border border-border-tertiary rounded text-[10px] hover:bg-background-secondary"
                      title="Export as Markdown (.md)"
                    >
                      ⬇️ Export .md
                    </button>
                  </>
                )}

                {res.flagged && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200">
                    Review Flagged
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  res.status === 'complete' ? 'bg-green-100 text-green-800' : 
                  res.status === 'refined' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                  res.status === 'refining' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                  res.status === 'stopped' ? 'bg-gray-200 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {res.status === 'refined' ? '✨ Refined' : res.status}
                </span>
              </div>
            </div>
            <textarea
              value={res.text}
              onChange={(e) => updateOcrResultText(sec.id, e.target.value)}
              disabled={isRefining}
              className={`w-full h-64 p-4 font-mono text-xs bg-background-primary resize-y focus:outline-none focus:ring-1 focus:ring-border-info ${isRefining ? 'opacity-50' : ''}`}
              placeholder="Extracted text will appear here..."
            />
          </div>
        );
      })}
    </div>
  );
}
