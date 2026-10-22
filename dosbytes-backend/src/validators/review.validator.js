'use strict';

const { body, param } = require('express-validator');

const create = [
  param('slug').trim().isLength({ min: 1, max: 90 }).withMessage('Producto inválido'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe estar entre 1 y 5')
    .toInt(),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comentario muy largo'),
];

const update = [
  param('id').isMongoId().withMessage('Opinión inválida'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Calificación inválida').toInt(),
  body('comment').optional().trim().isLength({ max: 1000 }),
];

const idParam = [param('id').isMongoId().withMessage('Opinión inválida')];

const visibility = [
  param('id').isMongoId().withMessage('Opinión inválida'),
  body('visible').isBoolean().withMessage('Visibilidad inválida').toBoolean(),
];

module.exports = { create, update, idParam, visibility };
