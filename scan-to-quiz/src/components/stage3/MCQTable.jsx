import React, { useState } from 'react';
import useAppStore, { selectMcqResults } from '../../store/useAppStore';
import { emptyMCQ } from '../../schema/mcqSchema';

export default function MCQTable() {
  const mcqResults = useAppStore(selectMcqResults);
  const updateMCQ = useAppStore(s => s.updateMCQ);
  const deleteMCQ = useAppStore(s => s.deleteMCQ);
  const addMCQ = useAppStore(s => s.addMCQ);

  const [cols, setCols] = useState({
    stemFull: false,
    stemBrief: true,
    optionA: true,
    optionB: true,
    optionC: true,
    optionD: true,
    optionE: true,
    key: true,
    hint: true,
    expFull: false,
    expBrief: false,
    highYield: false
  });

  const handleAddRow = () => addMCQ(emptyMCQ());

  const toggleCol = (c) => setCols(prev => ({ ...prev, [c]: !prev[c] }));

  if (mcqResults.length === 0) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="bg-background-secondary border border-border-tertiary rounded-lg p-8 text-center text-text-secondary text-sm flex-1 flex flex-col justify-center items-center">
          <p className="mb-4">No MCQs generated yet. Run the MCQ Processor to see results here.</p>
          <button onClick={handleAddRow} className="px-4 py-2 bg-text-info text-white text-xs rounded hover:opacity-90">
            + Add Empty Row
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Column visibility toggles */}
      <div className="flex flex-wrap gap-3 p-2 bg-background-secondary border border-border-tertiary rounded text-[10px]">
        <span className="font-medium text-text-secondary mr-2">Toggle Columns:</span>
        {[
          { id: 'stemFull', label: 'Stem (Full)' },
          { id: 'stemBrief', label: 'Stem (Brief)' },
          { id: 'optionA', label: 'Option A' },
          { id: 'optionB', label: 'Option B' },
          { id: 'optionC', label: 'Option C' },
          { id: 'optionD', label: 'Option D' },
          { id: 'optionE', label: 'Option E' },
          { id: 'key', label: 'Key' },
          { id: 'hint', label: 'Hint' },
          { id: 'expFull', label: 'Exp (Full)' },
          { id: 'expBrief', label: 'Exp (Brief)' },
          { id: 'highYield', label: 'High Yield' }
        ].map(c => (
          <label key={c.id} className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={cols[c.id]} onChange={() => toggleCol(c.id)} />
            {c.label}
          </label>
        ))}
      </div>

      <div className="border border-border-tertiary rounded-lg overflow-hidden bg-background-primary overflow-x-auto flex-1 relative">
        <div className="absolute inset-0 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs min-w-max">
            <thead className="bg-background-secondary text-text-secondary sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-2 border-b border-border-tertiary font-medium bg-background-secondary">Ch-Q</th>
                {cols.stemFull && <th className="p-2 border-b border-border-tertiary font-medium min-w-[200px] bg-background-secondary">Stem (Full)</th>}
                {cols.stemBrief && <th className="p-2 border-b border-border-tertiary font-medium min-w-[200px] bg-background-secondary">Stem (Brief)</th>}
                {cols.optionA && <th className="p-2 border-b border-border-tertiary font-medium min-w-[150px] bg-background-secondary">Option A</th>}
                {cols.optionB && <th className="p-2 border-b border-border-tertiary font-medium min-w-[150px] bg-background-secondary">Option B</th>}
                {cols.optionC && <th className="p-2 border-b border-border-tertiary font-medium min-w-[150px] bg-background-secondary">Option C</th>}
                {cols.optionD && <th className="p-2 border-b border-border-tertiary font-medium min-w-[150px] bg-background-secondary">Option D</th>}
                {cols.optionE && <th className="p-2 border-b border-border-tertiary font-medium min-w-[150px] bg-background-secondary">Option E</th>}
                {cols.key && <th className="p-2 border-b border-border-tertiary font-medium bg-background-secondary">Key</th>}
                {cols.hint && <th className="p-2 border-b border-border-tertiary font-medium min-w-[150px] bg-background-secondary">Hint</th>}
                {cols.expFull && <th className="p-2 border-b border-border-tertiary font-medium min-w-[200px] bg-background-secondary">Exp (Full)</th>}
                {cols.expBrief && <th className="p-2 border-b border-border-tertiary font-medium min-w-[200px] bg-background-secondary">Exp (Brief)</th>}
                {cols.highYield && <th className="p-2 border-b border-border-tertiary font-medium min-w-[200px] bg-background-secondary">High Yield Info</th>}
                <th className="p-2 border-b border-border-tertiary font-medium bg-background-secondary sticky right-0">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mcqResults.map((q, i) => {
                const isKeyValid = ['A','B','C','D','E'].includes(q.key);
                return (
                  <tr key={i} className={`border-b border-border-tertiary hover:bg-background-secondary ${q.generated ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-2 align-top">
                      <input 
                        value={q.ch_q || ''} 
                        onChange={e => updateMCQ(i, { ...q, ch_q: e.target.value })}
                        className="w-16 px-1 py-0.5 bg-transparent border-b border-transparent focus:border-border-info focus:outline-none"
                      />
                    </td>
                    {cols.stemFull && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.stem || ''} 
                          onChange={e => updateMCQ(i, { ...q, stem: e.target.value })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded"
                        />
                      </td>
                    )}
                    {cols.stemBrief && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.stem_brief || ''} 
                          onChange={e => updateMCQ(i, { ...q, stem_brief: e.target.value })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded"
                        />
                      </td>
                    )}
                    {cols.optionA && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.options?.A || ''} 
                          onChange={e => updateMCQ(i, { ...q, options: { ...q.options, A: e.target.value } })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded text-[10px]"
                        />
                      </td>
                    )}
                    {cols.optionB && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.options?.B || ''} 
                          onChange={e => updateMCQ(i, { ...q, options: { ...q.options, B: e.target.value } })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded text-[10px]"
                        />
                      </td>
                    )}
                    {cols.optionC && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.options?.C || ''} 
                          onChange={e => updateMCQ(i, { ...q, options: { ...q.options, C: e.target.value } })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded text-[10px]"
                        />
                      </td>
                    )}
                    {cols.optionD && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.options?.D || ''} 
                          onChange={e => updateMCQ(i, { ...q, options: { ...q.options, D: e.target.value } })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded text-[10px]"
                        />
                      </td>
                    )}
                    {cols.optionE && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.options?.E || ''} 
                          onChange={e => updateMCQ(i, { ...q, options: { ...q.options, E: e.target.value } })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded text-[10px]"
                        />
                      </td>
                    )}
                    {cols.key && (
                      <td className="p-2 align-top">
                        <input 
                          value={q.key || ''} 
                          onChange={e => updateMCQ(i, { ...q, key: e.target.value.toUpperCase() })}
                          maxLength={1}
                          className={`w-8 px-1 py-0.5 bg-transparent font-medium border-b focus:outline-none text-center ${isKeyValid ? 'border-transparent focus:border-border-info' : 'border-red-500 text-red-600 bg-red-50'}`}
                        />
                      </td>
                    )}
                    {cols.hint && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.hint || ''} 
                          onChange={e => updateMCQ(i, { ...q, hint: e.target.value })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded"
                        />
                      </td>
                    )}
                    {cols.expFull && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.explanation || ''} 
                          onChange={e => updateMCQ(i, { ...q, explanation: e.target.value })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded"
                        />
                      </td>
                    )}
                    {cols.expBrief && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.explanation_brief || ''} 
                          onChange={e => updateMCQ(i, { ...q, explanation_brief: e.target.value })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded"
                        />
                      </td>
                    )}
                    {cols.highYield && (
                      <td className="p-2 align-top">
                        <textarea 
                          value={q.high_yield || ''} 
                          onChange={e => updateMCQ(i, { ...q, high_yield: e.target.value })}
                          className="w-full min-h-[40px] px-1 py-0.5 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-border-info rounded"
                        />
                      </td>
                    )}
                    <td className="p-2 text-center align-top sticky right-0 bg-background-primary z-0 border-l border-border-tertiary">
                      <button 
                        onClick={() => deleteMCQ(i)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Question"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex justify-end mt-1">
        <button onClick={handleAddRow} className="px-3 py-1.5 bg-text-info text-white text-[10px] rounded hover:opacity-90 font-medium">
          + Add Empty Row
        </button>
      </div>
    </div>
  );
}
