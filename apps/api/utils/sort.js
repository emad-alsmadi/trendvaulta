/**
 * Shared sort parsing for admin list endpoints.
 *
 * The field must come from a per-endpoint allow-list. A caller-supplied key
 * passed straight to `.sort()` would let anyone order by an unindexed field
 * (a collection scan on every request) or reach into paths the endpoint never
 * meant to expose, and a key beginning with `$` is a Mongo operator rather
 * than a path at all.
 */

/**
 * @param {unknown} rawSort Field name, e.g. `createdAt`.
 * @param {unknown} rawOrder `asc` | `desc` (anything else means descending).
 * @param {string[]} allowed Sortable field names for this endpoint.
 * @param {Record<string, 1|-1>} fallback Sort applied when `rawSort` is absent or rejected.
 * @returns {Record<string, 1|-1>} A Mongo sort object, never empty.
 */
function buildSort(rawSort, rawOrder, allowed, fallback = { createdAt: -1 }) {
  const field = typeof rawSort === 'string' ? rawSort.trim() : '';
  if (!field || !allowed.includes(field)) return { ...fallback };

  const direction = String(rawOrder).toLowerCase() === 'asc' ? 1 : -1;

  // Ties on a non-unique field (status, price, a name) would otherwise page
  // non-deterministically: the same document can appear on two pages, or on
  // none. _id breaks the tie so the ordering is total.
  return field === '_id' ? { _id: direction } : { [field]: direction, _id: direction };
}

module.exports = { buildSort };
