import React, { useState } from 'react';
import useAppStore, { selectMcqConfig, selectMcqPrompts } from '../../store/useAppStore';

export default function MCQPromptEditor() {
  const mcqConfig = useAppStore(selectMcqConfig);
  const mcqPrompts = useAppStore(selectMcqPrompts);
  const setMcqConfig = useAppStore(s => s.setMcqConfig);
  const setMcqPrompts = useAppStore(s => s.setMcqPrompts);

  const [activeTab, setActiveTab] = useState('extraction');

  return (
    <div className="bg-background-secondary border border-border-tertiary rounded-lg mb-4">
      <div className="p-4 border-b border-border-tertiary flex gap-4 items-center justify-between">
        <h3 className="text-sm font-medium">MCQ Prompts</h3>
        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <input 
            type="checkbox" 
            checked={mcqConfig.reviewEnabled || false} 
            onChange={(e) => setMcqConfig({ reviewEnabled: e.target.checked })}
          />
          <span className="text-text-primary font-medium">Enable Review Pass</span>
        </label>
      </div>
      
      <div className="flex border-b border-border-tertiary bg-background-primary">
        {['extraction', 'generation', 'review'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium capitalize ${
              activeTab === tab 
                ? 'border-b-2 border-text-info text-text-primary' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="p-4">
        <textarea 
          value={mcqPrompts[activeTab]}
          onChange={(e) => setMcqPrompts({ [activeTab]: e.target.value })}
          className="w-full h-64 p-3 font-mono text-[11px] border border-border-tertiary rounded bg-background-primary"
        />
        <div className="text-[10px] text-text-secondary mt-2">
          Placeholders: {`{CHAPTER_NUM}, {SECTION_NAME}, {START_NUM}`} 
          {activeTab === 'review' && `, {MCQ_JSON_ARRAY}`}
        </div>
      </div>
    </div>
  );
}
