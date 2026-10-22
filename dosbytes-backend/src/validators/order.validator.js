'use strict';

const { body, param } = require('express-validator');
const { ORDER_STATUSES } = require('../models/Order');

const create = [
  body('items').isArray({ min: 1 }).withMessage('El carrito está vacío'),
  body('items.*.product').isMongoId().withMessage('Producto inválido'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Cantidad inválida')
    .toInt(),
  body('pickupNotes').optional().trim().isLength({ max: 500 }),
];

const codeParam = [param('code').trim().isLength({ min: 4, max: 30 }).withMessage('Código inválido')];

const changeStatus = [
  param('id').isMongoId().withMessage('Pedido inválido'),
  body('status').isIn(ORDER_STATUSES).withMessage('Estado inválido'),
  body('note').optional().trim().isLength({ max: 500 }),
];

module.exports = { create, codeParam, changeStatus };
