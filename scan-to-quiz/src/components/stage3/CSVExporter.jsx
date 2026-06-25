import React from 'react';
import useAppStore, { selectMcqResults, selectExportFilename } from '../../store/useAppStore';
import { exportCSV, exportXLSX } from '../../utils/csvExport';

export default function CSVExporter() {
  const mcqResults = useAppStore(selectMcqResults);
  const exportFilename = useAppStore(selectExportFilename);
  const setExportFilename = useAppStore(s => s.setExportFilename);

  const getFilename = (ext) => {
    const base = exportFilename.trim() || 'docquiz_mcqs';
    return `${base}.${ext}`;
  };

  const handleExportCSV = () => exportCSV(mcqResults, getFilename('csv'));
  const handleExportXLSX = () => exportXLSX(mcqResults, getFilename('xlsx'));

  return (
    <div className="flex gap-3 items-center">
      <span className="text-sm text-text-secondary mr-2">
        Total MCQs: <span className="font-medium text-text-primary">{mcqResults.length}</span>
      </span>
      
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-text-secondary">Filename:</label>
        <input 
          type="text" 
          value={exportFilename} 
          onChange={(e) => setExportFilename(e.target.value)}
          placeholder="docquiz_mcqs"
          className="px-2 py-1 text-xs border border-border-tertiary rounded w-32"
        />
      </div>

      <button 
        onClick={handleExportCSV}
        disabled={mcqResults.length === 0}
        className="px-4 py-2 bg-background-primary border border-border-tertiary hover:bg-background-secondary text-xs font-medium rounded-md transition-colors disabled:opacity-50"
      >
        Export CSV
      </button>
      <button 
        onClick={handleExportXLSX}
        disabled={mcqResults.length === 0}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
      >
        Export Excel
      </button>
    </div>
  );
}
