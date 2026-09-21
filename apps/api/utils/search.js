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

module.exports = { escapeRegex, normalizeSearchTerm, MAX_SEARCH_TERM_LENGTH };
