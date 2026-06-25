import React, { useCallback, useState } from 'react';
import { loadPDF } from '../../services/pdfService';
import useAppStore from '../../store/useAppStore';

export default function PdfUploader() {
  const setPages = useAppStore(s => s.setPages);
  const setExportFilename = useAppStore(s => s.setExportFilename);
  const setOriginalPdfFile = useAppStore(s => s.setOriginalPdfFile);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    setExportFilename(file.name.replace('.pdf', ''));
    setOriginalPdfFile(file);
    
    setLoading(true);
    try {
      const pages = await loadPDF(file, (current, total) => {
        setProgress(Math.round((current / total) * 100));
      });
      setPages(pages);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [setPages, setExportFilename]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {error && <div className="text-red-500 font-medium text-center">{error}</div>}
      <div 
        onDrop={onDrop} 
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border-tertiary p-12 text-center rounded-lg hover:bg-background-secondary transition-colors cursor-pointer w-full"
      >
        <input 
          type="file" 
          accept="application/pdf" 
          onChange={onDrop} 
          className="hidden" 
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload" className="cursor-pointer">
          {loading ? (
            <div className="text-text-info font-medium">
              Loading PDF... {progress}%
            </div>
          ) : (
            <div className="text-text-secondary">
              <span className="font-medium text-text-primary">Click to upload</span> or drag and drop a PDF file here
            </div>
          )}
        </label>
      </div>
    </div>
  );
}
