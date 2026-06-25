/**
 * Single source of truth for MCQ field definitions.
 * Used by MCQTable (columns), csvExport (headers), and addMCQ (empty row template).
 */

export const MCQ_FIELDS = [
  { key: 'ch_q',              label: 'Ch#-Q#',              path: 'ch_q' },
  { key: 'stem',              label: 'Stem (Full)',          path: 'stem' },
  { key: 'stem_brief',        label: 'Stem (Brief)',         path: 'stem_brief' },
  { key: 'optionA',           label: 'Option A',             path: 'options.A' },
  { key: 'optionB',           label: 'Option B',             path: 'options.B' },
  { key: 'optionC',           label: 'Option C',             path: 'options.C' },
  { key: 'optionD',           label: 'Option D',             path: 'options.D' },
  { key: 'optionE',           label: 'Option E',             path: 'options.E' },
  { key: 'key',               label: 'Key',                  path: 'key' },
  { key: 'explanation',       label: 'Explanation (Full)',    path: 'explanation' },
  { key: 'explanation_brief', label: 'Explanation (Brief)',   path: 'explanation_brief' },
  { key: 'hint',              label: 'Hint',                 path: 'hint' },
  { key: 'high_yield',        label: 'High Yield Info',      path: 'high_yield' },
  { key: 'generated',         label: 'AI Generated?',        path: 'generated' },
];

export const EXPORT_HEADERS = MCQ_FIELDS.map(f => f.label);

/** Create an empty MCQ row */
export function emptyMCQ() {
  return {
    ch_q: '', stem: '', stem_brief: '',
    options: { A: '', B: '', C: '', D: '', E: '' },
    key: '', hint: '', explanation: '', explanation_brief: '',
    high_yield: '', generated: false,
  };
}

/** Get a flat export row from an MCQ object */
export function mcqToRow(q) {
  return {
    'Ch#-Q#':              q.ch_q,
    'Stem (Full)':         q.stem,
    'Stem (Brief)':        q.stem_brief,
    'Option A':            q.options?.A,
    'Option B':            q.options?.B,
    'Option C':            q.options?.C,
    'Option D':            q.options?.D,
    'Option E':            q.options?.E,
    'Key':                 q.key,
    'Explanation (Full)':  q.explanation,
    'Explanation (Brief)': q.explanation_brief,
    'Hint':                q.hint,
    'High Yield Info':     q.high_yield,
    'AI Generated?':       q.generated ? 'Yes' : 'No',
  };
}

/** Get a flat array of values for CSV export */
export function mcqToCSVValues(q) {
  return [
    q.ch_q, q.stem, q.stem_brief,
    q.options?.A, q.options?.B, q.options?.C, q.options?.D, q.options?.E,
    q.key, q.explanation, q.explanation_brief, q.hint, q.high_yield,
    q.generated ? 'Yes' : 'No'
  ];
}
