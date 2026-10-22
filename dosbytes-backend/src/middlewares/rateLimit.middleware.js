'use strict';

const { rateLimit } = require('express-rate-limit');

const common = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
  },
};

const globalLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 600,
});

const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

const verificationLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 6,
});

const trackingLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 40,
});

const writeLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: 25,
});

module.exports = {
  globalLimiter,
  authLimiter,
  registerLimiter,
  verificationLimiter,
  trackingLimiter,
  writeLimiter,
};
