import React, { useState, useRef } from 'react';
import useAppStore, { selectSections, selectOcrResults, selectMcqConfig, selectMcqPrompts, selectMcqProvider, selectMcqResults, selectExcludedSections } from '../../store/useAppStore';
import { processMCQ } from '../../services/mcqService';
import { AsyncQueue } from '../../lib/asyncQueue';
import { JobControl } from '../../services/ocrService';
import { saveMcqResults, clearMcqCache } from '../../utils/sessionCache';

export default function MCQQueuePanel() {
  const sections = useAppStore(selectSections);
  const ocrResults = useAppStore(selectOcrResults);
  const mcqConfig = useAppStore(selectMcqConfig);
  const mcqPrompts = useAppStore(selectMcqPrompts);
  const mcqProvider = useAppStore(selectMcqProvider);
  const mcqResults = useAppStore(selectMcqResults);
  const excludedSections = useAppStore(selectExcludedSections);
  
  const appendMCQs = useAppStore(s => s.appendMCQs);
  const setAllMcqResults = useAppStore(s => s.setAllMcqResults);

  const queueRef = useRef(new AsyncQueue(2)); // Throttled to 2 for Ollama
  const jobControlsRef = useRef({});
  const [activeJobs, setActiveJobs] = useState({});
  const [progressMap, setProgressMap] = useState({});
  const [error, setError] = useState('');

  const handleStartSection = async (sec) => {
    if (excludedSections.has(sec.id)) return;
    const hasText = ocrResults[sec.id] && ocrResults[sec.id].text.trim().length > 0;
    if (!hasText) return;

    let resumeChunk = 0;
    let resumeQNum = 1;
    const p = progressMap[sec.id];
    
    if (p?.status === 'stopped' || p?.status === 'error') {
      // Resuming
      resumeChunk = p.chunk || 0; 
      resumeQNum = (p.found || 0) + 1; 
    } else {
      // Starting fresh or force-retry: clear existing MCQs for this section
      setAllMcqResults(useAppStore.getState().mcqResults.filter(m => !m.ch_q?.startsWith(sec.chapterNum + '-')));
      setProgressMap(prev => ({ ...prev, [sec.id]: { chunk: 0, total: 0, found: 0, status: 'processing' } }));
    }

    const jc = new JobControl();
    jobControlsRef.current[sec.id] = jc;
    setActiveJobs(prev => ({ ...prev, [sec.id]: 'running' }));
    
    const resultSection = { ...sec, text: ocrResults[sec.id].text };
    const cfg = { ...mcqConfig, provider: mcqProvider, jobControl: jc, resumeChunk, resumeQNum };

    try {
      const newMcqs = await queueRef.current.enqueue(() => processMCQ(
        resultSection, 
        cfg, 
        mcqPrompts, 
        (prog) => {
          setProgressMap(prev => {
            return {
              ...prev,
              [sec.id]: { 
                ...prog, 
                found: (resumeQNum - 1) + prog.found, // Cumulative found
                status: 'processing' 
              }
            };
          });
        }
      ));
      
      appendMCQs(newMcqs);
      saveMcqResults(useAppStore.getState().mcqResults);
      
      setProgressMap(prev => ({ 
        ...prev, 
        [sec.id]: { ...prev[sec.id], status: 'complete' } 
      }));
      
    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'AbortError') {
        setProgressMap(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], status: 'stopped' } }));
      } else {
        console.error('MCQ failed for section ' + sec.id, err);
        setProgressMap(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], status: 'error', error: err.message } }));
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
    const validSections = sections.filter(s => !excludedSections.has(s.id) && ocrResults[s.id] && ocrResults[s.id].text.trim().length > 0);
    if (validSections.length === 0) {
      setError('No OCR text available. Complete Stage 2 first.');
      return;
    }
    validSections.forEach(sec => {
      const jobState = activeJobs[sec.id];
      const p = progressMap[sec.id];
      
      if (jobState === 'paused') {
        handleResumeSection(sec.id);
      } else if (!jobState && p?.status !== 'complete') {
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
    stopAll();
    await clearMcqCache();
    setAllMcqResults([]);
    setProgressMap({});
  };

  const anyRunning = Object.values(activeJobs).includes('running');
  const anyActive = Object.keys(activeJobs).length > 0;

  return (
    <div className="bg-background-secondary p-4 border border-border-tertiary rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Processing Queue</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleClearCache}
            disabled={mcqResults.length === 0 && Object.keys(progressMap).length === 0}
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
          const hasText = ocrResults[sec.id] && ocrResults[sec.id].text.length > 0;
          const p = progressMap[sec.id];
          const pct = p ? (p.total ? Math.round((p.chunk / p.total) * 100) : 0) : 0;
          const sectionMcqs = mcqResults.filter(m => m.ch_q && m.ch_q.startsWith(sec.chapterNum + '-')).length;
          
          const jobState = activeJobs[sec.id];

          return (
            <div key={sec.id} className={`p-3 bg-background-primary border rounded text-xs transition-opacity ${!hasText || isExcluded ? 'opacity-50 grayscale border-gray-200 bg-gray-50' : 'border-border-tertiary'}`}>
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium flex items-center gap-2">
                  <span>{sec.name}</span>
                  {!isExcluded && hasText && (
                    <div className="flex gap-1">
                      {!jobState && p?.status !== 'complete' && (
                        <button onClick={() => handleStartSection(sec)} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] hover:bg-blue-200" title={p?.status === 'stopped' ? 'Resume from stopped chunk' : 'Start extraction'}>▶</button>
                      )}
                      {!jobState && p?.status === 'complete' && (
                        <button onClick={() => handleStartSection(sec)} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] hover:bg-gray-200" title="Force restart from scratch">↻</button>
                      )}
                      {jobState === 'running' && (
                        <button onClick={() => handlePauseSection(sec.id)} className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] hover:bg-yellow-200" title="Pause after current chunk">⏸</button>
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
                  {!hasText && !isExcluded && <span className="bg-gray-200 text-gray-700 px-1.5 rounded text-[10px]">No Text</span>}
                  {p?.status === 'complete' && <span className="bg-green-100 text-green-700 px-1.5 rounded text-[10px]">✓ Complete</span>}
                  {p?.status === 'error' && <span className="bg-red-100 text-red-700 px-1.5 rounded text-[10px]" title={p.error}>✗ Error</span>}
                  {p?.status === 'stopped' && <span className="bg-gray-200 text-gray-700 px-1.5 rounded text-[10px]">⏹ Stopped</span>}
                </div>
                {hasText && !isExcluded && <span className="text-text-secondary">{pct}%</span>}
              </div>
              
              {hasText && !isExcluded && (
                <>
                  <div className="w-full bg-border-tertiary rounded-full h-1.5 mt-1.5 mb-1">
                    <div className={`h-1.5 rounded-full transition-all ${p?.status === 'error' ? 'bg-red-500' : p?.status === 'stopped' ? 'bg-gray-400' : 'bg-text-info'}`} style={{ width: `${pct}%` }}></div>
                  </div>
                  {(p || sectionMcqs > 0) && (
                    <div className="text-[10px] text-text-secondary flex justify-between items-center mt-1">
                      {p && p.status !== 'complete' ? <span>Chunk {p.chunk} of {p.total}</span> : <span></span>}
                      {jobState === 'paused' && <span className="text-yellow-600 font-medium animate-pulse">Paused</span>}
                      {sectionMcqs > 0 && <span className="text-green-600 font-medium">{sectionMcqs} MCQs Generated</span>}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
