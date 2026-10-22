'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/upload.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowStaff, requirePasswordChanged } = require('../middlewares/role.middleware');
const { singleImage } = require('../middlewares/upload.middleware');

const staffAuth = [authenticate, requirePasswordChanged, allowStaff];

router.post('/', staffAuth, singleImage, controller.uploadOne);
router.delete(
  '/',
  staffAuth,
  body('publicId').isString().notEmpty().withMessage('Imagen inválida'),
  validate,
  controller.removeOne
);

module.exports = router;
