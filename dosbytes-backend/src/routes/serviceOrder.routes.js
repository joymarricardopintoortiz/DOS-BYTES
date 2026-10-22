'use strict';

const router = require('express').Router();
const controller = require('../controllers/serviceOrder.controller');
const validators = require('../validators/serviceOrder.validator');
const validate = require('../middlewares/validate.middleware');
const { optionalAuth, authenticate } = require('../middlewares/auth.middleware');
const {
  allowStaff,
  allowCustomer,
  requirePasswordChanged,
} = require('../middlewares/role.middleware');
const { trackingLimiter } = require('../middlewares/rateLimit.middleware');

// Público (RF-05)
router.post('/', optionalAuth, validators.createPublic, validate, controller.createPublic);
router.get('/track/:code', trackingLimiter, validators.trackCode, validate, controller.track);
router.post(
  '/track/:code/quote',
  trackingLimiter,
  validators.quoteDecision,
  validate,
  controller.quoteDecision
);

// Cliente (RF-08)
router.get(
  '/me',
  authenticate,
  requirePasswordChanged,
  allowCustomer,
  controller.listMine
);

// Empleado / administrador
const staffAuth = [authenticate, requirePasswordChanged, allowStaff];

router.get('/history', staffAuth, controller.history);
router.get('/', staffAuth, controller.listStaff);
router.post('/local', staffAuth, validators.createStaff, validate, controller.createStaff);
router.get('/:id', staffAuth, controller.getById);
router.patch('/:id/status', staffAuth, validators.changeStatus, validate, controller.changeStatus);
router.patch('/:id', staffAuth, validators.update, validate, controller.update);

module.exports = router;
