export function safeParseJSON(raw) {
  const s = raw.replace(/^```[\w]*\n?|\n?```$/gm, '').trim();
  try {
    return JSON.parse(s);
  } catch (e) {
    const m = s.match(/\[[\s\S]*\]/);
    try {
      return m ? JSON.parse(m[0]) : null;
    } catch (err) {
      return null;
    }
  }
}
