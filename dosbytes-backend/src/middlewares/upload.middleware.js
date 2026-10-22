'use strict';

const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!env.upload.allowedMime.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Formato no permitido. Usa JPG, PNG o WebP'));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxMb * 1024 * 1024,
    files: env.upload.maxImagesPerProduct,
  },
});

const singleImage = upload.single('image');
const arrayImages = upload.array('images', env.upload.maxImagesPerProduct);

module.exports = { upload, singleImage, arrayImages };
