'use strict';

const router = require('express').Router();
const controller = require('../controllers/review.controller');
const validators = require('../validators/review.validator');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowStaff, allowAdmin, requirePasswordChanged } = require('../middlewares/role.middleware');

// Cliente dueño de la opinión
router.patch(
  '/:id',
  authenticate,
  requirePasswordChanged,
  validators.update,
  validate,
  controller.update
);
router.delete(
  '/:id',
  authenticate,
  requirePasswordChanged,
  validators.idParam,
  validate,
  controller.remove
);

// Moderación
router.get(
  '/',
  authenticate,
  requirePasswordChanged,
  allowStaff,
  controller.listAll
);
router.patch(
  '/:id/visibility',
  authenticate,
  requirePasswordChanged,
  allowAdmin,
  validators.visibility,
  validate,
  controller.setVisibility
);

module.exports = router;
