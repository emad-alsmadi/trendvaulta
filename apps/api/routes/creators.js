const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getAllCreators,
  getCreatorById,
  createCreator,
  updateCreator,
  deleteCreator,
} = require('../controllers/creator.controller');

router.get('/creators', getAllCreators);
router.get('/creators/:id', getCreatorById);

router.post(
  '/creators',
  verfiyToken,
  checkRolePermission('creators:write'),
  createCreator,
);

router.put(
  '/creators/:id',
  verfiyToken,
  checkRolePermission('creators:write'),
  updateCreator,
);

router.delete(
  '/creators/:id',
  verfiyToken,
  checkRolePermission('creators:delete'),
  deleteCreator,
);

module.exports = router;
