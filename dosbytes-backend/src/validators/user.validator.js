'use strict';

const { body, param } = require('express-validator');
const { DELETION_REASONS } = require('../models/DeletionReason');

const updateMe = [
  body('name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Nombre inválido'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Teléfono inválido'),
];

const deleteMe = [
  body('password').isString().notEmpty().withMessage('Debes confirmar tu contraseña'),
  body('reason')
    .isIn(DELETION_REASONS)
    .withMessage(`Motivo inválido. Opciones: ${DELETION_REASONS.join(', ')}`),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comentario demasiado largo'),
];

const createEmployee = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('El nombre es obligatorio'),
  body('email').trim().isEmail().withMessage('Correo inválido').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('tempPassword')
    .optional()
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('La contraseña temporal debe tener al menos 8 caracteres'),
];

const updateUser = [
  param('id').isMongoId().withMessage('Usuario inválido'),
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('role')
    .optional()
    .isIn(['customer', 'employee'])
    .withMessage('Solo se puede asignar cliente o empleado'),
  body('active').optional().isBoolean().withMessage('Estado inválido').toBoolean(),
];

const listUsers = [
  body().custom(() => true),
];

const deletionStats = [];

module.exports = { updateMe, deleteMe, createEmployee, updateUser, listUsers, deletionStats };
