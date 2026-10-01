const express = require('express');
const router = express.Router();
const {
  getSitemapIndex,
  getSitemapShard,
} = require('../controllers/sitemap.controller');

// Public; the storefront exposes these as /sitemap.xml and /sitemaps/:file
router.get('/sitemap.xml', getSitemapIndex);
router.get('/sitemaps/:file', getSitemapShard);

module.exports = router;
