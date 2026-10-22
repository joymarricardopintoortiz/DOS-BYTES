'use strict';

const router = require('express').Router();
const controller = require('../controllers/user.controller');
const favoriteController = require('../controllers/favorite.controller');
const reviewController = require('../controllers/review.controller');
const questionController = require('../controllers/question.controller');
const validators = require('../validators/user.validator');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  allowAdmin,
  allowCustomer,
  requirePasswordChanged,
} = require('../middlewares/role.middleware');

const staffAuth = [authenticate, requirePasswordChanged, allowAdmin];

router.patch('/me', authenticate, requirePasswordChanged, validators.updateMe, validate, controller.updateMe);
router.delete(
  '/me',
  authenticate,
  requirePasswordChanged,
  allowCustomer,
  validators.deleteMe,
  validate,
  controller.deleteMe
);

router.get(
  '/me/favorites',
  authenticate,
  requirePasswordChanged,
  allowCustomer,
  favoriteController.list
);
router.get(
  '/me/reviews',
  authenticate,
  requirePasswordChanged,
  allowCustomer,
  reviewController.listMine
);
router.get(
  '/me/questions',
  authenticate,
  requirePasswordChanged,
  allowCustomer,
  questionController.listMine
);

// RF-19: gestión de cuentas solo para administradores.
router.get('/', staffAuth, controller.listUsers);
router.post(
  '/employees',
  staffAuth,
  validators.createEmployee,
  validate,
  controller.createEmployee
);
router.get('/deletion-stats', staffAuth, controller.deletionStats);
router.patch(
  '/:id',
  staffAuth,
  validators.updateUser,
  validate,
  controller.updateUser
);

module.exports = router;
