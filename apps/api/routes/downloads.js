const express = require('express');
const router = express.Router();
const {
  getMyDownloads,
  getDownloadById,
  recordDownload,
  createDownload,
  deleteDownload,
} = require('../controllers/download.controller');
const { verfiyToken } = require('../middlewares/verfiyToken');

// All routes require authentication
router.use(verfiyToken);

router.route('/downloads').post(createDownload);
router.route('/downloads/my').get(getMyDownloads);
router.route('/downloads/:id').get(getDownloadById).delete(deleteDownload);
router.route('/downloads/:id/download').post(recordDownload);

module.exports = router;
