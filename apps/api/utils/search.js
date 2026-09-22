const MAX_SEARCH_TERM_LENGTH = 100;

/** Escape every regex metacharacter so user input matches literally. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize a free-text `q` query param for a `$regex` filter:
 * trims, caps the length (ReDoS / oversized scans) and escapes
 * metacharacters (regex injection). Returns '' when nothing usable remains.
 */
function normalizeSearchTerm(q, maxLength = MAX_SEARCH_TERM_LENGTH) {
  if (typeof q !== 'string') return '';
  const trimmed = q.trim().slice(0, maxLength);
  return trimmed ? escapeRegex(trimmed) : '';
}

/**
 * Normalize a free-text `q` query param for a MongoDB `$text` search:
 * trims and caps the length only. Unlike `normalizeSearchTerm`, this must
 * NOT escape regex metacharacters — `$text` is not a regex, and escaping
 * would corrupt its own syntax (quoted phrases, `-exclusion`).
 */
function normalizeTextSearchTerm(q, maxLength = MAX_SEARCH_TERM_LENGTH) {
  if (typeof q !== 'string') return '';
  return q.trim().slice(0, maxLength);
}

module.exports = {
  escapeRegex,
  normalizeSearchTerm,
  normalizeTextSearchTerm,
  MAX_SEARCH_TERM_LENGTH,
};
