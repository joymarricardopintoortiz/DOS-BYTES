'use strict';

const { body } = require('express-validator');

const update = [
  body('businessName').optional().trim().isLength({ min: 2, max: 80 }),
  body('logoUrl').optional().trim().isLength({ max: 500 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('address').optional().trim().isLength({ max: 240 }),
  body('schedule').optional().trim().isLength({ max: 240 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('adminEmails')
    .optional()
    .isArray({ max: 2 })
    .withMessage('Solo se permiten dos correos de administrador'),
  body('adminEmails.*')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Correo de administrador inválido'),
  body('employeeEmail')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Correo de empleado inválido'),
  body('banners').optional().isArray({ max: 8 }),
  body('banners.*.title').optional().trim().isLength({ max: 140 }),
  body('banners.*.subtitle').optional().trim().isLength({ max: 240 }),
  body('banners.*.image').optional().trim().isLength({ max: 500 }),
  body('banners.*.link').optional().trim().isLength({ max: 500 }),
  body('banners.*.order').optional().isInt().toInt(),
];

module.exports = { update };
