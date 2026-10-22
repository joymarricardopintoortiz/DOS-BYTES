'use strict';

const path = require('path');

// Carga el .env de la raíz del backend sin importar desde dónde se ejecute.
require('dotenv').config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  quiet: true,
});

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  process.exit(1);
}

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const env = {
  nodeEnv,
  isProd,
  port: toNumber(process.env.PORT, 3000),

  mongoUri: process.env.MONGO_URI,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    resetExpiresMinutes: toNumber(process.env.RESET_TOKEN_EXPIRES_MINUTES, 60),
    verificationExpiresHours: toNumber(process.env.VERIFICATION_TOKEN_EXPIRES_HOURS, 24),
  },

  bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 12),

  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),

  email: {
    provider: (process.env.EMAIL_PROVIDER || 'resend').toLowerCase(),
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.EMAIL_FROM || 'DOS BYTES <no-reply@dosbytes.local>',
    replyTo: process.env.EMAIL_REPLY_TO || '',
    adminCopy: splitList(process.env.EMAIL_ADMIN_COPY),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'dosbytes',
    get configured() {
      return Boolean(this.cloudName && this.apiKey && this.apiSecret);
    },
  },

  upload: {
    maxMb: toNumber(process.env.UPLOAD_MAX_MB, 5),
    allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
    maxImagesPerProduct: toNumber(process.env.MAX_IMAGES_PER_PRODUCT, 8),
  },

  seed: {
    admin1: {
      name: process.env.SEED_ADMIN_1_NAME || 'Administrador 1',
      email: (process.env.SEED_ADMIN_1_EMAIL || '').toLowerCase(),
      password: process.env.SEED_ADMIN_1_PASSWORD || '',
    },
    admin2: {
      name: process.env.SEED_ADMIN_2_NAME || 'Administrador 2',
      email: (process.env.SEED_ADMIN_2_EMAIL || '').toLowerCase(),
      password: process.env.SEED_ADMIN_2_PASSWORD || '',
    },
  },
};

module.exports = env;
