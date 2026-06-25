import React from 'react';
import useAppStore, { selectStage, selectPages, selectOcrResults } from '../../store/useAppStore';

export default function PipelineNav() {
  const stage = useAppStore(selectStage);
  const pages = useAppStore(selectPages);
  const ocrResults = useAppStore(selectOcrResults);
  const setStage = useAppStore(s => s.setStage);

  const stages = [
    { num: 1, name: 'PDF Splitter' },
    { num: 2, name: 'OCR Engine', disabled: pages.length === 0 },
    { num: 3, name: 'MCQ Processor', disabled: pages.length === 0 || Object.keys(ocrResults).length === 0 }
  ];

  return (
    <nav className="flex space-x-4 p-4 border-b border-border-tertiary bg-background-secondary sticky top-0 z-50">
      {stages.map((s) => (
        <button
          key={s.num}
          onClick={() => !s.disabled && setStage(s.num)}
          disabled={s.disabled}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            stage === s.num
              ? 'bg-text-info text-white'
              : s.disabled 
                ? 'text-gray-400 cursor-not-allowed opacity-50'
                : 'text-text-secondary hover:bg-background-primary hover:text-text-primary'
          }`}
        >
          Stage {s.num}: {s.name}
        </button>
      ))}
    </nav>
  );
}
