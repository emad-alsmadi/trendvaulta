const asyncHandler = require('express-async-handler');
const sitemapService = require('../services/sitemap.service');
const { AppError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const CACHE_CONTROL = `public, max-age=${Math.floor(sitemapService.TTL_MS / 1000)}`;

function sendXml(res, xml) {
  res
    .status(200)
    .set('Content-Type', 'application/xml; charset=utf-8')
    .set('Cache-Control', CACHE_CONTROL)
    .send(xml);
}

/** A crawler should come back later, not record a broken sitemap. */
async function orUnavailable(res, build) {
  try {
    return await build();
  } catch (err) {
    logger.error({ err }, 'Sitemap generation failed');
    res.set('Retry-After', '300');
    throw new AppError('Sitemap temporarily unavailable', 503, 'SITEMAP_UNAVAILABLE');
  }
}

/**
 * @route GET /api/sitemap.xml
 * @access Public
 */
const getSitemapIndex = asyncHandler(async (_req, res) => {
  sendXml(res, await orUnavailable(res, () => sitemapService.getIndex()));
});

/**
 * @route GET /api/sitemaps/:file  (e.g. products-1.xml)
 * @access Public
 */
const getSitemapShard = asyncHandler(async (req, res) => {
  const xml = await orUnavailable(res, () =>
    sitemapService.getShard(req.params.file),
  );
  if (xml === null) throw new NotFoundError('Sitemap');
  sendXml(res, xml);
});

module.exports = { getSitemapIndex, getSitemapShard };
