const express = require('express');
const router = express.Router();

const { getStorefrontHome } = require('../controllers/storefrontHome.controller');

router.get('/storefront/home', getStorefrontHome);

module.exports = router;
