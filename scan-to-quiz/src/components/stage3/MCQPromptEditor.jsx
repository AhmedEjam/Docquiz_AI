import { useState } from 'react';
import useAppStore, { selectMcqConfig, selectMcqPrompts } from '../../store/useAppStore';
import { EXT_DEFAULT, GEN_DEFAULT, REV_DEFAULT, EXT_SIMPLE, GEN_SIMPLE } from '../../prompts/mcqPrompts';

export default function MCQPromptEditor() {
  const mcqConfig = useAppStore(selectMcqConfig);
  const mcqPrompts = useAppStore(selectMcqPrompts);
  const setMcqConfig = useAppStore(s => s.setMcqConfig);
  const setMcqPrompts = useAppStore(s => s.setMcqPrompts);

  const [activeTab, setActiveTab] = useState('extraction');

  const handleRestoreDefault = () => {
    if (window.confirm('Are you sure you want to restore the default prompt?')) {
      const isSimple = mcqConfig.promptMode === 'simple';
      const defaults = {
        extraction: isSimple ? EXT_SIMPLE : EXT_DEFAULT,
        generation: isSimple ? GEN_SIMPLE : GEN_DEFAULT,
        review: REV_DEFAULT,
      };
      setMcqPrompts({ [activeTab]: defaults[activeTab] });
    }
  };

  return (
    <div className="bg-background-secondary border border-border-tertiary rounded-lg mb-4">
      <div className="p-4 border-b border-border-tertiary flex gap-4 items-center justify-between">
        <h3 className="text-sm font-medium">MCQ Prompts</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <span className="text-text-secondary font-medium">Complexity:</span>
            <select 
              value={mcqConfig.promptMode || 'detailed'}
              onChange={(e) => {
                setMcqConfig({ promptMode: e.target.value });
                if (window.confirm(`Switch to ${e.target.value} prompts? This will overwrite the current prompts.`)) {
                  const isSimple = e.target.value === 'simple';
                  setMcqPrompts({
                    extraction: isSimple ? EXT_SIMPLE : EXT_DEFAULT,
                    generation: isSimple ? GEN_SIMPLE : GEN_DEFAULT
                  });
                }
              }}
              className="bg-background-primary border border-border-tertiary rounded p-1 text-xs focus:outline-none focus:border-border-info"
            >
              <option value="detailed">Detailed (Cloud Models)</option>
              <option value="simple">Simple (Local Models)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input 
              type="checkbox" 
              checked={mcqConfig.reviewEnabled || false} 
              onChange={(e) => setMcqConfig({ reviewEnabled: e.target.checked })}
            />
            <span className="text-text-primary font-medium">Enable Review Pass</span>
          </label>
        </div>
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
        <div className="flex justify-between items-center mt-2">
          <div className="text-[10px] text-text-secondary">
            Placeholders: {`{CHAPTER_NUM}, {SECTION_NAME}, {START_NUM}`} 
            {activeTab === 'review' && `, {MCQ_JSON_ARRAY}`}
          </div>
          <button
            onClick={handleRestoreDefault}
            className="px-2 py-1 text-[10px] font-medium border border-border-tertiary rounded bg-background-primary hover:bg-background-secondary text-text-secondary hover:text-text-primary transition-colors duration-150 ml-4 whitespace-nowrap"
          >
            ↻ Restore Default
          </button>
        </div>
      </div>
    </div>
  );
}
