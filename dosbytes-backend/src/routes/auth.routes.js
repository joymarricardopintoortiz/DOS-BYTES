'use strict';

const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const validators = require('../validators/auth.validator');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  authLimiter,
  registerLimiter,
  verificationLimiter,
} = require('../middlewares/rateLimit.middleware');

router.post('/register', registerLimiter, validators.register, validate, controller.register);
router.get(
  '/verify/:token',
  verificationLimiter,
  validators.verify,
  validate,
  controller.verifyEmail
);
router.post(
  '/resend-verification',
  verificationLimiter,
  validators.resendVerification,
  validate,
  controller.resendVerification
);
router.post('/login', authLimiter, validators.login, validate, controller.login);
router.post(
  '/forgot-password',
  verificationLimiter,
  validators.forgotPassword,
  validate,
  controller.forgotPassword
);
router.post(
  '/reset-password/:token',
  verificationLimiter,
  validators.resetPassword,
  validate,
  controller.resetPassword
);

router.get('/me', authenticate, controller.me);
router.post('/logout', authenticate, controller.logout);
router.patch(
  '/change-password',
  authenticate,
  validators.changePassword,
  validate,
  controller.changePassword
);

module.exports = router;
