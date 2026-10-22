'use strict';

const { body, param } = require('express-validator');

const create = [
  body('code')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-]{3,24}$/)
    .withMessage('Código inválido (3 a 24 letras, números o guiones)'),
  body('sku').optional().trim().isLength({ max: 40 }),
  body('name').trim().isLength({ min: 2, max: 160 }).withMessage('El nombre es obligatorio'),
  body('slug').optional().trim().isLength({ max: 90 }),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('category').trim().notEmpty().withMessage('La categoría es obligatoria'),
  body('price').isFloat({ min: 0 }).withMessage('Precio inválido').toFloat(),
  body('compareAtPrice').optional().isFloat({ min: 0 }).toFloat(),
  body('isOffer').optional().isBoolean().toBoolean(),
  body('featured').optional().isBoolean().toBoolean(),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock inválido').toInt(),
  body('lowStockThreshold').optional().isInt({ min: 0 }).toInt(),
  body('visible').optional().isBoolean().toBoolean(),
];

const update = [
  param('id').isMongoId().withMessage('Producto inválido'),
  body('code')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-]{3,24}$/)
    .withMessage('Código inválido'),
  body('name').optional().trim().isLength({ min: 2, max: 160 }),
  body('slug').optional().trim().isLength({ max: 90 }),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('category').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('compareAtPrice').optional().isFloat({ min: 0 }).toFloat(),
  body('isOffer').optional().isBoolean().toBoolean(),
  body('featured').optional().isBoolean().toBoolean(),
  body('stock').optional().isInt({ min: 0 }).toInt(),
  body('lowStockThreshold').optional().isInt({ min: 0 }).toInt(),
  body('visible').optional().isBoolean().toBoolean(),
];

const updateStock = [
  param('id').isMongoId().withMessage('Producto inválido'),
  body('stock').isInt({ min: 0 }).withMessage('Stock inválido').toInt(),
  body('lowStockThreshold').optional().isInt({ min: 0 }).toInt(),
];

const idParam = [param('id').isMongoId().withMessage('Producto inválido')];

const byCode = [param('code').trim().isLength({ min: 2, max: 30 }).withMessage('Código inválido')];

const reorderImages = [
  param('id').isMongoId().withMessage('Producto inválido'),
  body('images').isArray({ min: 1 }).withMessage('Lista de imágenes inválida'),
  body('images.*.publicId').isString().notEmpty(),
  body('images.*.order').isInt({ min: 0 }).toInt(),
];

const removeImage = [
  param('id').isMongoId().withMessage('Producto inválido'),
  body('publicId').isString().notEmpty().withMessage('Imagen inválida'),
];

const setMainImage = [
  param('id').isMongoId().withMessage('Producto inválido'),
  body('publicId').isString().notEmpty().withMessage('Imagen inválida'),
];

module.exports = {
  create,
  update,
  updateStock,
  idParam,
  byCode,
  reorderImages,
  removeImage,
  setMainImage,
};
