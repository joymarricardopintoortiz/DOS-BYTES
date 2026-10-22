'use strict';

const router = require('express').Router();
const controller = require('../controllers/service.controller');
const validators = require('../validators/service.validator');
const validate = require('../middlewares/validate.middleware');
const { optionalAuth, authenticate } = require('../middlewares/auth.middleware');
const { allowAdmin, requirePasswordChanged } = require('../middlewares/role.middleware');

router.get('/', optionalAuth, controller.list);
router.get('/:slug', optionalAuth, controller.getBySlug);

const adminAuth = [authenticate, requirePasswordChanged, allowAdmin];

router.post('/', adminAuth, validators.create, validate, controller.create);
router.patch('/:id', adminAuth, validators.update, validate, controller.update);
router.delete(
  '/:id',
  adminAuth,
  require('express-validator').param('id').isMongoId(),
  validate,
  controller.remove
);

module.exports = router;
