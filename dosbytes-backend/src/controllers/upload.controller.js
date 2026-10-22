'use strict';

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadImage, deleteImage } = require('../services/upload.service');
const env = require('../config/env');

const uploadOne = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No se recibió ninguna imagen');

  const image = await uploadImage(req.file.buffer, {
    mimetype: req.file.mimetype,
    folder: `${env.cloudinary.folder}/general`,
  });

  res.status(201).json({ ok: true, data: { image } });
});

const removeOne = asyncHandler(async (req, res) => {
  if (!req.body.publicId) throw ApiError.badRequest('Falta el identificador de la imagen');
  await deleteImage(req.body.publicId);
  res.json({ ok: true, message: 'Imagen eliminada' });
});

module.exports = { uploadOne, removeOne };
