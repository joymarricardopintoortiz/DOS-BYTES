'use strict';

const { body, param } = require('express-validator');

const create = [
  param('slug').trim().isLength({ min: 1, max: 90 }).withMessage('Producto inválido'),
  body('text')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('La pregunta debe tener entre 3 y 500 caracteres'),
];

const answer = [
  param('id').isMongoId().withMessage('Pregunta inválida'),
  body('answer')
    .trim()
    .isLength({ min: 2, max: 1000 })
    .withMessage('La respuesta debe tener entre 2 y 1000 caracteres'),
];

const idParam = [param('id').isMongoId().withMessage('Pregunta inválida')];

const visibility = [
  param('id').isMongoId().withMessage('Pregunta inválida'),
  body('visible').isBoolean().withMessage('Visibilidad inválida').toBoolean(),
];

module.exports = { create, answer, idParam, visibility };
