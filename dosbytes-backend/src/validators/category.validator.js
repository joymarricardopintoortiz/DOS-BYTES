'use strict';

const { body, param } = require('express-validator');

const create = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre es obligatorio'),
  body('slug').optional().trim().isLength({ max: 90 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('image').optional().trim().isLength({ max: 500 }),
  body('icon').optional().trim().isLength({ max: 80 }),
  body('parent').optional({ nullable: true }).isMongoId().withMessage('Categoría padre inválida'),
  body('order').optional().isInt().toInt(),
  body('visible').optional().isBoolean().toBoolean(),
];

const update = [
  param('id').isMongoId().withMessage('Categoría inválida'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('slug').optional().trim().isLength({ max: 90 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('image').optional().trim().isLength({ max: 500 }),
  body('icon').optional().trim().isLength({ max: 80 }),
  body('parent').optional({ nullable: true }).isMongoId(),
  body('order').optional().isInt().toInt(),
  body('visible').optional().isBoolean().toBoolean(),
];

module.exports = { create, update };
