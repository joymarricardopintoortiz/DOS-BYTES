'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/favorite.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowCustomer, requirePasswordChanged } = require('../middlewares/role.middleware');

const customerAuth = [authenticate, requirePasswordChanged, allowCustomer];

router.get('/', customerAuth, controller.list);
router.post(
  '/',
  customerAuth,
  body('productId').isMongoId().withMessage('Producto inválido'),
  validate,
  controller.add
);
router.delete(
  '/:productId',
  customerAuth,
  require('express-validator').param('productId').isMongoId().withMessage('Producto inválido'),
  validate,
  controller.remove
);

module.exports = router;
