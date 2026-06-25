import React, { useState, useEffect, useRef } from 'react';
import useAppStore, { 
  selectPages, selectSplitPoints, selectGridCols, 
  selectThumbScale, selectExcludedPages, selectSections, selectExcludedSections
} from '../../store/useAppStore';
import { renderPage, buildSections } from '../../services/pdfService';

function Thumbnail({ pageNum, scale }) {
  const [src, setSrc] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    // Reset image when scale changes to force high-res rerender
    setSrc(null);
  }, [scale]);

  useEffect(() => {
    if (src) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        renderPage(pageNum, scale).then(dataUrl => {
          if (dataUrl) setSrc(dataUrl);
        });
        observer.disconnect();
      }
    }, { rootMargin: '100px' });
    
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src, pageNum, scale]);

  return (
    <div ref={imgRef} className="w-full aspect-[1/1.4] bg-background-secondary flex items-center justify-center text-text-secondary text-xs">
      {src ? (
        <img 
          src={src} 
          alt={`Page ${pageNum}`} 
          className="w-full h-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => {
            const newWindow = window.open();
            if (newWindow) {
              newWindow.document.write(`<html><head><title>Page ${pageNum} Preview</title></head><body style="margin:0; background:#0e1111; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${src}" style="max-width:100%; max-height:100vh; object-fit:contain;" /></body></html>`);
              newWindow.document.close();
            }
          }}
          title="Click to view full size in new tab"
        />
      ) : (
        <span>Loading...</span>
      )}
    </div>
  );
}

export default function PdfPageGrid() {
  const pages = useAppStore(selectPages);
  const splitPoints = useAppStore(selectSplitPoints);
  const gridCols = useAppStore(selectGridCols);
  const thumbScale = useAppStore(selectThumbScale);
  const excludedPages = useAppStore(selectExcludedPages);
  const sections = useAppStore(selectSections);
  const excludedSections = useAppStore(selectExcludedSections);
  
  const setSplitPoints = useAppStore(s => s.setSplitPoints);
  const setSections = useAppStore(s => s.setSections);
  const setGridCols = useAppStore(s => s.setGridCols);
  const setThumbScale = useAppStore(s => s.setThumbScale);
  const togglePageExclude = useAppStore(s => s.togglePageExclude);

  const toggleSplit = (pageIndex) => {
    if (pageIndex === 0 || pageIndex === pages.length) return;
    
    const newPoints = new Set(splitPoints);
    if (newPoints.has(pageIndex)) {
      newPoints.delete(pageIndex);
    } else {
      newPoints.add(pageIndex);
    }
    const sortedPoints = Array.from(newPoints).sort((a, b) => a - b);
    setSplitPoints(sortedPoints);
    setSections(buildSections(pages, sortedPoints));
  };

  if (pages.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border-tertiary bg-background-secondary flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-text-secondary font-medium">Pages per row:</label>
          <input 
            type="range" min="1" max="10" 
            value={gridCols} onChange={(e) => setGridCols(parseInt(e.target.value))}
            className="w-24"
          />
          <span className="w-4">{gridCols}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-text-secondary font-medium">Resolution:</label>
          <select 
            value={thumbScale} 
            onChange={(e) => setThumbScale(parseFloat(e.target.value))}
            className="border border-border-tertiary rounded px-2 py-1 bg-background-primary"
          >
            <option value={0.5}>Low (0.5x)</option>
            <option value={1.0}>Normal (1.0x)</option>
            <option value={1.5}>High (1.5x)</option>
            <option value={2.0}>Ultra (2.0x)</option>
          </select>
        </div>
      </div>
      
      <div 
        className="grid gap-4 p-4 overflow-y-auto flex-1"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {pages.map((p, i) => {
          const sectionForPage = sections.find(s => p.num >= s.startPage && p.num <= s.endPage);
          const isSectionExcluded = sectionForPage && excludedSections.has(sectionForPage.id);
          const isExcluded = excludedPages.has(p.num) || isSectionExcluded;
          const isSplitAfter = splitPoints.includes(i + 1);
          const sectionStartsHere = sections.find(sec => sec.startPage === p.num);

          return (
            <React.Fragment key={p.num}>
              {sectionStartsHere && (
                <div className="col-span-full mt-4 border-b border-border-tertiary pb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">
                    {sectionStartsHere.name} <span className="text-text-secondary font-normal text-xs ml-2">(Chapter {sectionStartsHere.chapterNum})</span>
                  </h4>
                </div>
              )}
              <div className={`relative group border-2 rounded overflow-hidden shadow-sm bg-background-primary flex flex-col items-center transition-opacity ${isExcluded ? 'opacity-30 grayscale' : ''} ${isSplitAfter ? 'border-text-info mb-2' : 'border-border-tertiary'}`}>
                <Thumbnail pageNum={p.num} scale={thumbScale} />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => togglePageExclude(p.num)}
                    className="bg-black/70 text-white px-2 py-1 rounded text-[10px]"
                  >
                    {isExcluded ? 'Include' : 'Exclude'}
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1.5 px-2 flex justify-between items-center font-mono">
                  <span>Page {p.num} {isExcluded && '(Excluded)'}</span>
                  {i < pages.length - 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSplit(i + 1); }}
                      className={`px-1.5 py-0.5 rounded transition-colors ${isSplitAfter ? 'bg-text-info text-white' : 'bg-white/20 hover:bg-white/40 text-white'}`}
                      title="Split section after this page"
                    >
                      {isSplitAfter ? 'Split Here' : 'Split'}
                    </button>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
