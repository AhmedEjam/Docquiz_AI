import React, { useState } from 'react';
import useAppStore, { 
  selectPages, selectSections, selectSplitPoints, selectExcludedSections, selectOriginalPdfFile, selectExcludedPages, selectExportFilename
} from '../../store/useAppStore';
import { autoDetectSplits, buildSections, exportPdfSubset } from '../../services/pdfService';

export default function SectionManager() {
  const pages = useAppStore(selectPages);
  const sections = useAppStore(selectSections);
  const splitPoints = useAppStore(selectSplitPoints);
  const excludedSections = useAppStore(selectExcludedSections);
  
  const setSections = useAppStore(s => s.setSections);
  const setSplitPoints = useAppStore(s => s.setSplitPoints);
  const toggleSectionExclude = useAppStore(s => s.toggleSectionExclude);
  
  const originalPdfFile = useAppStore(selectOriginalPdfFile);
  const excludedPages = useAppStore(selectExcludedPages);
  const exportFilename = useAppStore(selectExportFilename);

  const [chunkSize, setChunkSize] = useState('');
  const [exportingId, setExportingId] = useState(null);
  const [exportMethod, setExportMethod] = useState('preserve');

  const handleExportSection = async (sec) => {
    if (!originalPdfFile) return;
    setExportingId(sec.id);
    try {
      const pagesToKeep = [];
      for (let i = sec.startPage; i <= sec.endPage; i++) {
        if (!excludedPages.has(i)) pagesToKeep.push(i);
      }
      if (pagesToKeep.length > 0) {
        const baseName = exportFilename || 'Document';
        const name = `${baseName}_${sec.name.replace(/\s+/g, '_')}.pdf`;
        await exportPdfSubset(originalPdfFile, pagesToKeep, name, exportMethod);
      } else {
        alert("All pages in this section are excluded. Nothing to export.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExportingId(null);
    }
  };

  const handleExportBulk = async () => {
    if (!originalPdfFile) return;
    setExportingId('bulk');
    try {
      const activeSections = sections.filter(s => !excludedSections.has(s.id));
      const pagesToKeep = [];
      activeSections.forEach(sec => {
        for (let i = sec.startPage; i <= sec.endPage; i++) {
          if (!excludedPages.has(i)) pagesToKeep.push(i);
        }
      });
      if (pagesToKeep.length > 0) {
        const uniquePages = [...new Set(pagesToKeep)].sort((a, b) => a - b);
        const baseName = exportFilename || 'Document';
        await exportPdfSubset(originalPdfFile, uniquePages, `${baseName}_Exported.pdf`, exportMethod);
      } else {
        alert("All sections or pages are excluded. Nothing to export.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExportingId(null);
    }
  };

  const handleAutoSplit = () => {
    const points = autoDetectSplits(pages);
    setSplitPoints(points);
    setSections(buildSections(pages, points, sections));
  };

  const handleFixedSplit = () => {
    const size = parseInt(chunkSize, 10);
    if (!size || size < 1) return;
    
    const points = [];
    for (let i = size; i < pages.length; i += size) {
      points.push(i);
    }
    setSplitPoints(points);
    setSections(buildSections(pages, points, sections));
  };

  const handleRename = (id, newName) => {
    setSections(sections.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleChapterNumChange = (id, newNum) => {
    const val = parseInt(newNum, 10);
    setSections(sections.map(s => s.id === id ? { ...s, chapterNum: isNaN(val) ? 0 : val } : s));
  };

  const handleDelete = (idx) => {
    const newSections = [...sections];
    newSections.splice(idx, 1);
    setSections(newSections);
    
    // Recalculate splitPoints based on remaining sections, sorted
    const newPoints = newSections.map(s => s.endPage).filter(p => p < pages.length).sort((a,b)=>a-b);
    setSplitPoints([...new Set(newPoints)]);
  };

  const moveSection = (idx, direction) => {
    const newSections = [...sections];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newSections.length) return;
    
    const temp = newSections[idx];
    newSections[idx] = newSections[targetIdx];
    newSections[targetIdx] = temp;
    setSections(newSections);
  };

  const handleSmartSequence = (startIndex) => {
    const startSec = sections[startIndex];
    const match = startSec.name.trim().match(/^(.*?)(\d+)$/);
    if (!match) {
      alert("Could not detect a trailing number in this section's name (e.g. 'Chapter 1'). Please rename it first.");
      return;
    }

    const prefix = match[1];
    let currentNum = parseInt(match[2], 10);

    const newSections = [...sections];
    for (let i = startIndex + 1; i < newSections.length; i++) {
      if (!excludedSections.has(newSections[i].id)) {
        currentNum++;
        newSections[i] = { 
          ...newSections[i], 
          name: `${prefix}${currentNum}`, 
          chapterNum: currentNum 
        };
      }
    }
    setSections(newSections);
  };

  if (pages.length === 0) return null;

  return (
    <div className="bg-background-secondary p-4 border border-border-tertiary rounded-lg h-full flex flex-col">
      <h3 className="text-sm font-medium mb-4">Section Manager</h3>
      
      {originalPdfFile && sections.length > 0 && (
        <div className="mb-4 space-y-2">
          <button 
            onClick={handleExportBulk}
            disabled={exportingId === 'bulk'}
            className="w-full px-3 py-1.5 bg-text-info text-white text-xs rounded hover:opacity-90 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {exportingId === 'bulk' ? 'Exporting...' : '⬇️ Export Included as PDF'}
          </button>
          <div className="flex items-center justify-between text-[10px] bg-background-primary px-2 py-1 rounded border border-border-tertiary">
            <span className="text-text-secondary font-medium">Export Method:</span>
            <select 
              value={exportMethod} 
              onChange={(e) => setExportMethod(e.target.value)}
              className="bg-transparent text-text-primary focus:outline-none"
            >
              <option value="preserve">Preserve Annotations</option>
              <option value="clean">Clean Document (Removes Annotations)</option>
            </select>
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <button 
            onClick={handleAutoSplit}
            className="px-3 py-1.5 bg-text-info text-white text-xs rounded hover:opacity-90 flex-1"
          >
            Auto Detect
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input 
            type="number" 
            min="1" 
            placeholder="Pages..."
            value={chunkSize}
            onChange={(e) => setChunkSize(e.target.value)}
            className="w-20 px-2 py-1.5 text-xs border border-border-tertiary rounded"
          />
          <button 
            onClick={handleFixedSplit}
            className="px-3 py-1.5 bg-background-primary border border-border-tertiary text-text-primary text-xs rounded hover:bg-background-secondary flex-1"
          >
            Split by Pages
          </button>
        </div>
        <p className="text-[10px] text-text-secondary leading-tight">
          Auto Detect finds chapter headers automatically. You can also split by a fixed number of pages.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {sections.map((sec, idx) => {
          const isExcluded = excludedSections.has(sec.id);
          return (
          <div key={sec.id} className={`p-3 bg-background-primary border border-border-tertiary rounded shadow-sm text-xs group relative transition-opacity ${isExcluded ? 'opacity-40' : ''}`}>
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button disabled={idx === 0} onClick={() => moveSection(idx, -1)} className="p-1 hover:bg-background-secondary rounded disabled:opacity-30">▲</button>
              <button disabled={idx === sections.length - 1} onClick={() => moveSection(idx, 1)} className="p-1 hover:bg-background-secondary rounded disabled:opacity-30">▼</button>
              <button onClick={() => handleDelete(idx)} className="p-1 hover:bg-red-100 text-red-500 rounded ml-1">✕</button>
            </div>

            <div className="flex justify-between items-center mb-2 pr-16">
              <span className="font-mono text-text-secondary">Sec {idx + 1}</span>
              <span className="text-text-secondary">Pages: {sec.startPage} - {sec.endPage}</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] text-text-secondary">Name</label>
                  <button 
                    onClick={() => handleSmartSequence(idx)}
                    disabled={isExcluded}
                    className="text-[10px] text-text-info hover:underline disabled:opacity-30 disabled:hover:no-underline flex items-center gap-1"
                    title="Automatically sequence names and numbers for all subsequent included sections"
                  >
                    🪄 Sequence
                  </button>
                </div>
                <input 
                  type="text" 
                  value={sec.name} 
                  onChange={(e) => handleRename(sec.id, e.target.value)}
                  className="w-full px-2 py-1 border border-border-tertiary rounded"
                  disabled={isExcluded}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-text-secondary mb-1">Chapter #</label>
                  <input 
                    type="number" 
                    min="0"
                    value={sec.chapterNum} 
                    onChange={(e) => handleChapterNumChange(sec.id, e.target.value)}
                    className="w-full px-2 py-1 border border-border-tertiary rounded"
                    disabled={isExcluded}
                  />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isExcluded} 
                      onChange={() => toggleSectionExclude(sec.id)} 
                    />
                    <span className="text-[10px] text-text-secondary font-medium">Exclude</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {originalPdfFile && (
                  <button 
                    onClick={() => handleExportSection(sec)}
                    disabled={isExcluded || exportingId === sec.id}
                    className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-border-tertiary rounded text-[10px] flex justify-center items-center disabled:opacity-50"
                  >
                    {exportingId === sec.id ? 'Exporting...' : '⬇️ Export PDF'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )})}
        {sections.length === 0 && (
          <div className="text-xs text-text-secondary text-center p-4">
            Click between pages to manually split, or use Auto Detect.
          </div>
        )}
      </div>
    </div>
  );
}
