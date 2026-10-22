'use strict';

const { body, param } = require('express-validator');
const { LINES } = require('../models/Service');

const create = [
  body('name').trim().isLength({ min: 2, max: 140 }).withMessage('El nombre es obligatorio'),
  body('slug').optional().trim().isLength({ max: 90 }),
  body('line').optional().isIn(LINES).withMessage('Línea de servicio inválida'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('price').isFloat({ min: 0 }).withMessage('Precio inválido').toFloat(),
  body('priceUnit').optional().isIn(['servicio', 'hora', 'pagina', 'mes', 'unidad']),
  body('icon').optional().trim().isLength({ max: 80 }),
  body('warrantyDays').optional().isInt({ min: 0 }).toInt(),
  body('visible').optional().isBoolean().toBoolean(),
  body('order').optional().isInt().toInt(),
];

const update = [
  param('id').isMongoId().withMessage('Servicio inválido'),
  body('name').optional().trim().isLength({ min: 2, max: 140 }),
  body('slug').optional().trim().isLength({ max: 90 }),
  body('line').optional().isIn(LINES),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('priceUnit').optional().isIn(['servicio', 'hora', 'pagina', 'mes', 'unidad']),
  body('icon').optional().trim().isLength({ max: 80 }),
  body('warrantyDays').optional().isInt({ min: 0 }).toInt(),
  body('visible').optional().isBoolean().toBoolean(),
  body('order').optional().isInt().toInt(),
];

module.exports = { create, update };
