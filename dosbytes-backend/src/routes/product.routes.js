'use strict';

const router = require('express').Router();
const controller = require('../controllers/product.controller');
const reviewController = require('../controllers/review.controller');
const questionController = require('../controllers/question.controller');
const reviewValidators = require('../validators/review.validator');
const questionValidators = require('../validators/question.validator');
const validators = require('../validators/product.validator');
const validate = require('../middlewares/validate.middleware');
const { optionalAuth, authenticate } = require('../middlewares/auth.middleware');
const { allowStaff, requirePasswordChanged } = require('../middlewares/role.middleware');
const { arrayImages } = require('../middlewares/upload.middleware');

const staffAuth = [authenticate, requirePasswordChanged, allowStaff];

// Público
router.get('/suggestions', controller.suggestions);
router.get('/', optionalAuth, controller.list);
router.get('/code/:code', optionalAuth, validators.byCode, validate, controller.getByCode);
router.get('/:slug/related', controller.related);
router.get('/:slug/reviews', optionalAuth, reviewController.listByProduct);
router.get('/:slug/questions', optionalAuth, questionController.listByProduct);
router.get('/:slug', optionalAuth, controller.getBySlug);

// Cliente autenticado
router.post(
  '/:slug/reviews',
  authenticate,
  requirePasswordChanged,
  reviewValidators.create,
  validate,
  reviewController.create
);
router.post(
  '/:slug/questions',
  authenticate,
  requirePasswordChanged,
  questionValidators.create,
  validate,
  questionController.create
);

// Empleado / administrador
router.get('/low-stock/list', staffAuth, controller.lowStock);
router.post('/', staffAuth, validators.create, validate, controller.create);
router.patch('/:id/stock', staffAuth, validators.updateStock, validate, controller.updateStock);
router.patch('/:id', staffAuth, validators.update, validate, controller.update);
router.delete('/:id', staffAuth, validators.idParam, validate, controller.remove);

// Galería de fotos: agregar, ordenar, elegir principal y eliminar (RF-13)
router.post(
  '/:id/images',
  staffAuth,
  validators.idParam,
  validate,
  arrayImages,
  controller.addImages
);
router.patch(
  '/:id/images/order',
  staffAuth,
  validators.reorderImages,
  validate,
  controller.reorderImages
);
router.patch(
  '/:id/images/main',
  staffAuth,
  validators.setMainImage,
  validate,
  controller.setMainImage
);
router.delete(
  '/:id/images',
  staffAuth,
  validators.removeImage,
  validate,
  controller.removeImage
);

module.exports = router;
