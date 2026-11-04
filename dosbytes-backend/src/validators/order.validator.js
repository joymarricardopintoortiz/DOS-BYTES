'use strict';

const { body, param } = require('express-validator');
const { ORDER_STATUSES } = require('../models/Order');
const { isValidDepartment } = require('../services/shipping');

const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'cuenta_bancaria', 'tienda'];

const PHONE_RE = /^\+?[0-9\s().-]{7,20}$/;

// Los campos nuevos son opcionales para no romper las reservas antiguas
// (e2e y clientes que solo envían `items`): el checkout siempre los envía.
const create = [
  body('items').isArray({ min: 1 }).withMessage('El carrito está vacío'),
  body('items.*.product').isMongoId().withMessage('Producto inválido'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Cantidad inválida')
    .toInt(),
  body('pickupNotes').optional().trim().isLength({ max: 500 }),

  body('shipping.department')
    .optional()
    .trim()
    .custom((value) => {
      if (!isValidDepartment(value)) throw new Error('Selecciona un departamento de Colombia');
      return true;
    }),
  body('shipping.city').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 80 })
    .withMessage('Ciudad inválida'),
  body('shipping.address').optional({ values: 'falsy' }).trim().isLength({ min: 5, max: 240 })
    .withMessage('Dirección inválida'),

  body('contact.email').optional({ values: 'falsy' }).trim().isEmail()
    .withMessage('Correo electrónico inválido'),
  body('contact.phone').optional({ values: 'falsy' }).trim().matches(PHONE_RE)
    .withMessage('Teléfono inválido'),

  body('paymentMethod').optional().isIn(PAYMENT_METHODS).withMessage('Método de pago inválido'),
  body('payment.cardNumber')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const digits = String(value).replace(/[\s-]/g, '');
      if (!/^\d{13,19}$/.test(digits)) throw new Error('Número de tarjeta inválido');
      return true;
    }),
  body('payment.cardName').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 80 })
    .withMessage('Nombre del titular inválido'),
  body('payment.expiry').optional({ values: 'falsy' }).matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
    .withMessage('Vencimiento inválido (MM/AA)'),
  body('payment.cvv').optional({ values: 'falsy' }).matches(/^\d{3,4}$/)
    .withMessage('CVV inválido'),
  body('payment.bank').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 60 })
    .withMessage('Banco inválido'),
  body('payment.account')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const digits = String(value).replace(/[\s-]/g, '');
      if (!/^\d{4,20}$/.test(digits)) throw new Error('Número de cuenta inválido');
      return true;
    }),
];

const codeParam = [param('code').trim().isLength({ min: 4, max: 30 }).withMessage('Código inválido')];

const changeStatus = [
  param('id').isMongoId().withMessage('Pedido inválido'),
  body('status').isIn(ORDER_STATUSES).withMessage('Estado inválido'),
  body('note').optional().trim().isLength({ max: 500 }),
];

module.exports = { create, codeParam, changeStatus, PAYMENT_METHODS };
