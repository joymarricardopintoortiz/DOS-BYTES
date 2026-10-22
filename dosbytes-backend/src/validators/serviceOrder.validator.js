'use strict';

const { body, param } = require('express-validator');
const { SERVICE_ORDER_STATUSES, EQUIPMENT_TYPES } = require('../models/ServiceOrder');

const customerRules = [
  body('customerSnapshot.name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('El nombre del cliente es obligatorio'),
  body('customerSnapshot.email')
    .trim()
    .isEmail()
    .withMessage('Correo del cliente inválido')
    .normalizeEmail(),
  body('customerSnapshot.phone')
    .trim()
    .isLength({ min: 7, max: 30 })
    .withMessage('Teléfono del cliente inválido'),
];

const equipmentRules = [
  body('equipment.type')
    .isIn(EQUIPMENT_TYPES)
    .withMessage(`Tipo de equipo inválido. Opciones: ${EQUIPMENT_TYPES.join(', ')}`),
  body('equipment.brand').optional().trim().isLength({ max: 80 }),
  body('equipment.model').optional().trim().isLength({ max: 120 }),
  body('equipment.serial').optional().trim().isLength({ max: 120 }),
  body('equipment.accessories').optional().isArray(),
  body('equipment.accessories.*').optional().trim().isLength({ max: 80 }),
];

const createPublic = [
  ...customerRules,
  ...equipmentRules,
  body('reportedIssue')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Describe la falla con al menos 10 caracteres'),
];

const createStaff = [
  body('customerId').optional().isMongoId().withMessage('Cliente inválido'),
  body('customerSnapshot.name').optional().trim().isLength({ min: 2, max: 120 }),
  body('customerSnapshot.email').optional().trim().isEmail().normalizeEmail(),
  body('customerSnapshot.phone').optional().trim().isLength({ max: 30 }),
  ...equipmentRules,
  body('reportedIssue')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Describe la falla del equipo'),
];

const update = [
  param('id').isMongoId().withMessage('Orden inválida'),
  body('diagnosis').optional().trim().isLength({ max: 2000 }),
  body('quote.amount').optional().isFloat({ min: 0 }).toFloat(),
  body('quote.notes').optional().trim().isLength({ max: 1000 }),
  body('quote.status').optional().isIn(['pendiente', 'aprobada', 'rechazada']),
  body('parts').optional().isArray(),
  body('parts.*.name').optional().trim().isLength({ min: 1, max: 160 }),
  body('parts.*.quantity').optional().isInt({ min: 1 }).toInt(),
  body('parts.*.unitCost').optional().isFloat({ min: 0 }).toFloat(),
  body('finalCost').optional().isFloat({ min: 0 }).toFloat(),
  body('internalNotes').optional().trim().isLength({ max: 2000 }),
  body('promisedAt').optional({ nullable: true }).isISO8601().toDate(),
  body('warranty.days').optional().isInt({ min: 0, max: 3650 }).toInt(),
  body('equipment.serial').optional().trim().isLength({ max: 120 }),
  body('equipment.brand').optional().trim().isLength({ max: 80 }),
  body('equipment.model').optional().trim().isLength({ max: 120 }),
];

const changeStatus = [
  param('id').isMongoId().withMessage('Orden inválida'),
  body('status')
    .isIn(SERVICE_ORDER_STATUSES)
    .withMessage(`Estado inválido. Opciones: ${SERVICE_ORDER_STATUSES.join(', ')}`),
  body('note').optional().trim().isLength({ max: 500 }),
];

const trackCode = [
  param('code').trim().isLength({ min: 4, max: 30 }).withMessage('Código inválido'),
];

const quoteDecision = [
  param('code').trim().isLength({ min: 4, max: 30 }).withMessage('Código inválido'),
  body('decision')
    .isIn(['aprobada', 'rechazada'])
    .withMessage('Decisión inválida (aprobada o rechazada)'),
  body('note').optional().trim().isLength({ max: 500 }),
];

module.exports = {
  createPublic,
  createStaff,
  update,
  changeStatus,
  trackCode,
  quoteDecision,
};
