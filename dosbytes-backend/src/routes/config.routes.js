'use strict';

const router = require('express').Router();
const controller = require('../controllers/config.controller');
const validators = require('../validators/config.validator');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowAdmin, requirePasswordChanged } = require('../middlewares/role.middleware');

router.get('/', controller.get);
router.patch(
  '/',
  authenticate,
  requirePasswordChanged,
  allowAdmin,
  validators.update,
  validate,
  controller.update
);

module.exports = router;
