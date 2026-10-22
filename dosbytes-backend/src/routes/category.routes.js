'use strict';

const router = require('express').Router();
const controller = require('../controllers/category.controller');
const validators = require('../validators/category.validator');
const validate = require('../middlewares/validate.middleware');
const { optionalAuth, authenticate } = require('../middlewares/auth.middleware');
const { allowStaff, allowAdmin, requirePasswordChanged } = require('../middlewares/role.middleware');

router.get('/', optionalAuth, controller.list);
router.get('/:slug', optionalAuth, controller.getBySlug);

const staffAuth = [authenticate, requirePasswordChanged, allowStaff];

router.post('/', staffAuth, validators.create, validate, controller.create);
router.patch('/:id', staffAuth, validators.update, validate, controller.update);
router.delete(
  '/:id',
  authenticate,
  requirePasswordChanged,
  allowAdmin,
  require('express-validator').param('id').isMongoId(),
  validate,
  controller.remove
);

module.exports = router;
