/**
 * Parse and clamp page/limit query params shared by list endpoints.
 *
 * Every list endpoint must bound `limit` — an unclamped value lets a client
 * request an arbitrarily large page (`?limit=999999`) and force an
 * oversized query/response.
 *
 * @param {{page?: unknown, limit?: unknown}} query
 * @param {{defaultLimit?: number, maxLimit?: number}} [options]
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query = {}, options = {}) {
  const { defaultLimit = 20, maxLimit = 100 } = options;

  const rawPage = parseInt(query.page, 10);
  const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);

  const rawLimit = parseInt(query.limit, 10);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.isNaN(rawLimit) ? defaultLimit : rawLimit),
  );

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = { parsePagination };
