import React, { useState } from 'react';
import useAppStore, { selectOcrPrompt, selectOcrReviewPrompt, selectOcrReviewConfig } from '../../store/useAppStore';

export default function PromptEditor() {
  const ocrPrompt = useAppStore(selectOcrPrompt);
  const ocrReviewPrompt = useAppStore(selectOcrReviewPrompt);
  const ocrReviewConfig = useAppStore(selectOcrReviewConfig);
  
  const setOcrPrompt = useAppStore(s => s.setOcrPrompt);
  const setOcrReviewPrompt = useAppStore(s => s.setOcrReviewPrompt);
  const setOcrReviewConfig = useAppStore(s => s.setOcrReviewConfig);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('extraction');

  return (
    <div className="bg-background-secondary border border-border-tertiary rounded-lg mb-4 overflow-hidden">
      <div 
        className="flex justify-between items-center p-3 cursor-pointer bg-background-primary hover:bg-background-secondary transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-medium">Stage 2 AI Configuration (OCR & Refine)</h3>
        <span className="text-text-secondary text-xs">{isOpen ? '▼' : '▶'}</span>
      </div>
      
      {isOpen && (
        <div className="border-t border-border-tertiary">
          <div className="flex border-b border-border-tertiary bg-background-primary">
            {['extraction', 'refinement'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium capitalize ${
                  activeTab === tab 
                    ? 'border-b-2 border-text-info text-text-primary' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab === 'extraction' ? '1. Vision Extraction' : '2. Text Refinement'}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'extraction' ? (
              <>
                <textarea 
                  value={ocrPrompt}
                  onChange={(e) => setOcrPrompt(e.target.value)}
                  className="w-full h-64 p-3 font-mono text-[11px] border border-border-tertiary rounded bg-background-primary"
                />
                <p className="text-[10px] text-text-secondary mt-2">
                  This prompt is sent to the Vision model for every page to guide the initial text extraction.
                </p>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-[10px] text-text-secondary mb-1">Text Review Model</label>
                  <input 
                    type="text" 
                    value={ocrReviewConfig.model} 
                    onChange={(e) => setOcrReviewConfig({ model: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-border-tertiary rounded bg-background-primary"
                    placeholder="e.g. llama3.1"
                  />
                </div>
                <textarea 
                  value={ocrReviewPrompt}
                  onChange={(e) => setOcrReviewPrompt(e.target.value)}
                  className="w-full h-48 p-3 font-mono text-[11px] border border-border-tertiary rounded bg-background-primary"
                />
                <p className="text-[10px] text-text-secondary mt-2">
                  This prompt is used when you click "Refine Text" to clean up OCR artifacts using a faster text model.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
