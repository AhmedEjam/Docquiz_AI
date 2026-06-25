import * as XLSX from 'xlsx';
import { EXPORT_HEADERS, mcqToCSVValues, mcqToRow } from '../schema/mcqSchema';

export function exportCSV(mcqs, filename = 'mcqs.csv') {
  const esc = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';

  const rows = mcqs.map((q) => mcqToCSVValues(q).map(esc).join(','));

  // \uFEFF = UTF-8 BOM, required for Arabic text in Excel on Windows
  const csv = '\uFEFF' + [EXPORT_HEADERS.map(esc).join(','), ...rows].join('\n');
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  a.click();
}

export function exportXLSX(mcqs, filename = 'mcqs.xlsx') {
  const data = mcqs.map(mcqToRow);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MCQs');
  XLSX.writeFile(workbook, filename);
}
