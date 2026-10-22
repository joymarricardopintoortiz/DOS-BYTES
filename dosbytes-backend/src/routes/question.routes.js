'use strict';

const router = require('express').Router();
const controller = require('../controllers/question.controller');
const validators = require('../validators/question.validator');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowStaff, requirePasswordChanged } = require('../middlewares/role.middleware');

const staffAuth = [authenticate, requirePasswordChanged, allowStaff];

router.patch('/:id/answer', staffAuth, validators.answer, validate, controller.answer);
router.patch(
  '/:id/visibility',
  staffAuth,
  validators.visibility,
  validate,
  controller.setVisibility
);
router.delete(
  '/:id',
  authenticate,
  requirePasswordChanged,
  validators.idParam,
  validate,
  controller.remove
);

module.exports = router;
