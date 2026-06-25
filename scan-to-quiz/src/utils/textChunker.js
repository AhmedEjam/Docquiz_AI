const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function sanitize(text) {
  return text.replace(CONTROL_CHARS, '').trim();
}

export function chunkText(text, maxChars = 12000) {
  const pages = text.split(/--- PAGE \d+ ---/);
  const chunks = [];
  let cur = '';
  
  for (const p of pages) {
    if ((cur + p).length > maxChars && cur) {
      chunks.push(sanitize(cur));
      cur = p;
    } else {
      cur += '\n' + p;
    }
  }
  
  if (cur.trim()) chunks.push(sanitize(cur));
  return chunks;
}
