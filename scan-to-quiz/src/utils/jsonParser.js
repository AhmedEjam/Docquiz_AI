/**
 * Robustly parse a JSON response from an LLM.
 * Handles: markdown fences, trailing commas, extra text before/after JSON,
 * and models that return a JSON object instead of an array.
 */
export function safeParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return { data: null, error: 'Empty response' };

  // 1. Strip markdown code fences (```json ... ```)
  let s = raw.replace(/^```[\w]*\n?|\n?```$/gm, '').trim();

  // 2. Remove trailing commas before ] or } (common model quirk)
  s = s.replace(/,\s*([}\]])/g, '$1');

  // 3. Try direct parse first
  try {
    return { data: JSON.parse(s), error: null };
  } catch (_) { /* continue to fallbacks */ }

  // 4. Try to extract a JSON array [...] from somewhere in the string
  const arrMatch = s.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return { data: JSON.parse(arrMatch[0]), error: null }; } catch (_) { /* continue */ }
  }

  // 5. Try to extract a JSON object {...} from somewhere in the string
  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return { data: JSON.parse(objMatch[0]), error: null }; } catch (_) { /* continue */ }
  }

  // 6. All fallbacks exhausted
  return { data: null, error: 'Failed to parse JSON from response' };
}
