import React, { useState, useRef, useEffect } from 'react';
import useAppStore, { selectOcrProvider, selectOcrConfig, selectOcrPrompt, selectSections, selectOcrResults, selectPages, selectExcludedSections } from '../../store/useAppStore';
import { processSection, createOCRQueue, JobControl } from '../../services/ocrService';
import { getPageProxy } from '../../services/pdfService';
import { saveOcrResult, clearOcrCache } from '../../utils/sessionCache';

export default function OCRQueuePanel() {
  const pages = useAppStore(selectPages);
  const sections = useAppStore(selectSections);
  const ocrConfig = useAppStore(selectOcrConfig);
  const ocrPrompt = useAppStore(selectOcrPrompt);
  const ocrResults = useAppStore(selectOcrResults);
  const ocrProvider = useAppStore(selectOcrProvider);
  const setOcrResult = useAppStore(s => s.setOcrResult);
  const setAllOcrResults = useAppStore(s => s.setAllOcrResults);
  const setOcrConfig = useAppStore(s => s.setOcrConfig);

  const excludedSections = useAppStore(selectExcludedSections);
  const excludedPages = useAppStore(s => s.excludedPages);

  const queueRef = useRef(createOCRQueue(ocrConfig.concurrency));
  const jobControlsRef = useRef({}); // sectionId -> JobControl
  const [activeJobs, setActiveJobs] = useState({}); // sectionId -> 'running' | 'paused'
  
  const [progressMap, setProgressMap] = useState({});
  const [error, setError] = useState('');

  // Update concurrency if config changes
  useEffect(() => {
    queueRef.current._max = ocrConfig.concurrency;
    queueRef.current._drain();
  }, [ocrConfig.concurrency]);

  const handleStartSection = async (sec) => {
    if (excludedSections.has(sec.id)) return;

    const result = ocrResults[sec.id];
    let initialText = '';
    let resumePage = sec.startPage;

    if (result?.status === 'complete') {
      // Force restart from scratch
      initialText = '';
      resumePage = sec.startPage;
    } else if (result?.status === 'stopped' || result?.status === 'error') {
      // Resume from last successfully processed page
      const p = progressMap[sec.id];
      if (p && p.page) {
        resumePage = p.page + 1;
        initialText = result.text || '';
        
        // If somehow resumePage is beyond endPage, start from beginning
        if (resumePage > sec.endPage) {
          resumePage = sec.startPage;
          initialText = '';
        }
      }
    }

    const jc = new JobControl();
    jobControlsRef.current[sec.id] = jc;
    setActiveJobs(prev => ({ ...prev, [sec.id]: 'running' }));
    
    setOcrResult(sec.id, { text: initialText, status: 'processing', flagged: false });

    const cfg = { ...ocrConfig, prompt: ocrPrompt, provider: ocrProvider, excludedPages, jobControl: jc, initialText, resumePage };

    try {
      const res = await queueRef.current.enqueue(() => processSection(sec, getPageProxy, cfg, (progress) => {
        setProgressMap(prev => ({ ...prev, [progress.sectionId]: progress }));
        if (progress.partialText) {
          setOcrResult(sec.id, { text: progress.partialText, status: 'processing', flagged: false });
        }
      }));
      
      const resultPayload = { text: res.text, status: 'complete', flagged: res.flagged };
      setOcrResult(sec.id, resultPayload);
      saveOcrResult(sec.id, resultPayload);
    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'AbortError') {
        const latestText = useAppStore.getState().ocrResults[sec.id]?.text || '';
        const payload = { text: latestText, status: 'stopped', error: 'Stopped by user', flagged: false };
        setOcrResult(sec.id, payload);
        saveOcrResult(sec.id, payload);
      } else {
        console.error('OCR failed for section ' + sec.id, err);
        const errPayload = { text: '', status: 'error', error: err.message };
        setOcrResult(sec.id, errPayload);
        saveOcrResult(sec.id, errPayload);
      }
    } finally {
      delete jobControlsRef.current[sec.id];
      setActiveJobs(prev => {
        const next = { ...prev };
        delete next[sec.id];
        return next;
      });
    }
  };

  const handlePauseSection = (secId) => {
    if (jobControlsRef.current[secId]) {
      jobControlsRef.current[secId].pause();
      setActiveJobs(prev => ({ ...prev, [secId]: 'paused' }));
    }
  };

  const handleResumeSection = (secId) => {
    if (jobControlsRef.current[secId]) {
      jobControlsRef.current[secId].resume();
      setActiveJobs(prev => ({ ...prev, [secId]: 'running' }));
    }
  };

  const handleStopSection = (secId) => {
    if (jobControlsRef.current[secId]) {
      jobControlsRef.current[secId].stop();
    }
  };

  const startAll = () => {
    setError('');
    const activeSecs = sections.filter(s => !excludedSections.has(s.id));
    if (activeSecs.length === 0) {
      setError('No active sections to process.');
      return;
    }
    activeSecs.forEach(sec => {
      const jobState = activeJobs[sec.id];
      const status = ocrResults[sec.id]?.status;
      
      if (jobState === 'paused') {
        handleResumeSection(sec.id);
      } else if (!jobState && status !== 'complete') {
        handleStartSection(sec);
      }
    });
  };

  const pauseAll = () => {
    Object.keys(activeJobs).forEach(secId => {
      if (activeJobs[secId] === 'running') handlePauseSection(secId);
    });
  };

  const stopAll = () => {
    Object.keys(activeJobs).forEach(secId => handleStopSection(secId));
  };

  const handleClearCache = async () => {
    stopAll(); // Prevent ongoing jobs from writing to state
    await clearOcrCache();
    setAllOcrResults({});
    setProgressMap({});
  };

  const anyRunning = Object.values(activeJobs).includes('running');
  const anyActive = Object.keys(activeJobs).length > 0;

  return (
    <div className="bg-background-secondary p-4 border border-border-tertiary rounded-lg h-full flex flex-col">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-medium">Processing Queue</h3>
          <div className="flex items-center gap-2 border border-border-tertiary rounded px-2 py-1 bg-background-primary">
            <label className="text-[10px] font-medium text-text-secondary uppercase">Concurrency</label>
            <input 
              type="number" 
              min="1" max="10" 
              value={ocrConfig.concurrency} 
              onChange={e => setOcrConfig({ concurrency: parseInt(e.target.value) || 1 })}
              className="w-10 bg-transparent text-xs focus:outline-none text-center"
            />
          </div>
          <div className="flex items-center gap-2 border border-border-tertiary rounded px-2 py-1 bg-background-primary">
            <label className="flex items-center gap-1 cursor-pointer">
              <input 
                type="checkbox" 
                checked={ocrConfig.includeDividers !== false}
                onChange={e => setOcrConfig({ includeDividers: e.target.checked })}
              />
              <span className="text-[10px] font-medium text-text-secondary uppercase">Page Dividers</span>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleClearCache}
            disabled={Object.keys(ocrResults).length === 0}
            className="px-3 py-1.5 border border-border-tertiary bg-background-primary text-xs rounded hover:bg-background-secondary disabled:opacity-50"
          >
            Clear Cache
          </button>
          
          {!anyRunning ? (
            <button 
              onClick={startAll}
              disabled={sections.length === 0}
              className="px-4 py-1.5 bg-text-info text-white text-xs font-medium rounded hover:bg-opacity-90 disabled:opacity-50"
            >
              ▶ Start / Resume All
            </button>
          ) : (
            <button 
              onClick={pauseAll}
              className="px-4 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded hover:bg-yellow-600"
            >
              ⏸ Pause All
            </button>
          )}

          {anyActive && (
            <button 
              onClick={stopAll}
              className="px-4 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600"
            >
              ⏹ Stop All
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red-500 font-medium text-xs mb-3 p-2 bg-red-50 rounded border border-red-100">{error}</div>}

      <div className="flex-1 overflow-y-auto space-y-2">
        {sections.map(sec => {
          const isExcluded = excludedSections.has(sec.id);
          const p = progressMap[sec.id];
          const totalPages = sec.endPage - sec.startPage + 1;
          const current = p ? p.page - sec.startPage + 1 : 0;
          let pct = Math.round((current / totalPages) * 100) || 0;
          
          const result = ocrResults[sec.id];
          if (result?.status === 'complete') pct = 100;

          const jobState = activeJobs[sec.id];

          return (
            <div key={sec.id} className={`p-3 bg-background-primary border border-border-tertiary rounded text-xs transition-opacity ${isExcluded ? 'opacity-40 grayscale' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium flex items-center gap-2">
                  <span>{sec.name}</span>
                  {!isExcluded && (
                    <div className="flex gap-1">
                      {!jobState && result?.status !== 'complete' && (
                        <button onClick={() => handleStartSection(sec)} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] hover:bg-blue-200" title={result?.status === 'stopped' ? 'Resume from stopped page' : 'Start extraction'}>▶</button>
                      )}
                      {!jobState && result?.status === 'complete' && (
                        <button onClick={() => handleStartSection(sec)} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] hover:bg-gray-200" title="Force restart from scratch">↻</button>
                      )}
                      {jobState === 'running' && (
                        <button onClick={() => handlePauseSection(sec.id)} className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] hover:bg-yellow-200" title="Pause after current page">⏸</button>
                      )}
                      {jobState === 'paused' && (
                        <button onClick={() => handleResumeSection(sec.id)} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] hover:bg-green-200" title="Resume">▶</button>
                      )}
                      {jobState && (
                        <button onClick={() => handleStopSection(sec.id)} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] hover:bg-red-200" title="Stop instantly">⏹</button>
                      )}
                    </div>
                  )}
                  {isExcluded && <span className="bg-gray-200 text-gray-700 px-1.5 rounded text-[10px]">Excluded</span>}
                  {!isExcluded && result?.status === 'complete' && <span className="bg-green-100 text-green-700 px-1.5 rounded text-[10px]">✓ Complete</span>}
                  {!isExcluded && result?.status === 'error' && <span className="bg-red-100 text-red-700 px-1.5 rounded text-[10px]" title={result.error}>✗ Error</span>}
                  {!isExcluded && result?.status === 'stopped' && <span className="bg-gray-200 text-gray-700 px-1.5 rounded text-[10px]">⏹ Stopped</span>}
                  {!isExcluded && result?.flagged && <span className="bg-yellow-100 text-yellow-700 px-1.5 rounded text-[10px]">⚠ Flagged</span>}
                </div>
                <span className="text-text-secondary">{pct}%</span>
              </div>
              <div className="w-full bg-border-tertiary rounded-full h-1.5 mt-1.5">
                <div className={`h-1.5 rounded-full ${result?.status === 'error' ? 'bg-red-500' : result?.status === 'stopped' ? 'bg-gray-400' : 'bg-text-info'}`} style={{ width: `${pct}%` }}></div>
              </div>
              {(p && pct < 100 && result?.status !== 'error') && (
                <div className="text-[10px] text-text-secondary mt-1 flex justify-between">
                  <span>Page {p.page} of {sec.endPage}</span>
                  {jobState === 'paused' && <span className="text-yellow-600 font-medium animate-pulse">Paused</span>}
                </div>
              )}
              {result?.status === 'error' && (
                <div className="text-[10px] text-red-600 font-medium mt-1.5 p-1.5 bg-red-50 rounded border border-red-100">
                  <span className="font-bold">Error:</span> {result.error}
                </div>
              )}
            </div>
          );
        })}
        {sections.length === 0 && (
          <div className="text-xs text-text-secondary text-center p-4">
            No sections defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
