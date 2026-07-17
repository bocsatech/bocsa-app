export const DEFAULT_EXCLUDE_KEYWORDS = ['ecoboost', 'export'];

export function normalizeExcludeKeywords(value) {
  if (!Array.isArray(value)) return [...DEFAULT_EXCLUDE_KEYWORDS];
  const list = value.map((k) => String(k || '').trim()).filter(Boolean);
  return list.length ? list : [...DEFAULT_EXCLUDE_KEYWORDS];
}

export function matchExcludeKeyword(text, keywords) {
  const hay = String(text || '').toLowerCase();
  for (const kw of normalizeExcludeKeywords(keywords)) {
    const needle = kw.toLowerCase();
    if (needle && hay.includes(needle)) return kw;
  }
  return null;
}
