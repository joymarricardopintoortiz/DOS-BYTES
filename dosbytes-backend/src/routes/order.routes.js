'use strict';

const router = require('express').Router();
const controller = require('../controllers/order.controller');
const validators = require('../validators/order.validator');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  allowStaff,
  allowCustomer,
  requirePasswordChanged,
} = require('../middlewares/role.middleware');

const authenticated = [authenticate, requirePasswordChanged];

// Cliente
router.post(
  '/',
  authenticated,
  allowCustomer,
  validators.create,
  validate,
  controller.create
);
router.get('/me', authenticated, allowCustomer, controller.listMine);
router.get('/:code', authenticated, validators.codeParam, validate, controller.getByCode);
router.patch(
  '/:code/cancel',
  authenticated,
  validators.codeParam,
  validate,
  controller.cancel
);

// Empleado / administrador
router.get('/', authenticated, allowStaff, controller.listStaff);
router.patch(
  '/:id/status',
  authenticated,
  allowStaff,
  validators.changeStatus,
  validate,
  controller.changeStatus
);

module.exports = router;
