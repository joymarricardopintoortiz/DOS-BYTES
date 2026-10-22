'use strict';

const mongoose = require('mongoose');

const SERVICE_ORDER_STATUSES = [
  'recibido',
  'diagnostico',
  'esperando_aprobacion',
  'en_reparacion',
  'listo',
  'entregado',
  'no_reparable',
];

const EQUIPMENT_TYPES = ['consola', 'laptop', 'pc', 'otro'];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: SERVICE_ORDER_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const partSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    quantity: { type: Number, default: 1, min: 1 },
    unitCost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const serviceOrderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    source: { type: String, enum: ['web', 'local'], default: 'web', index: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customerSnapshot: {
      name: { type: String, trim: true, maxlength: 120, default: '' },
      email: { type: String, lowercase: true, trim: true, maxlength: 180, default: '' },
      phone: { type: String, trim: true, maxlength: 30, default: '' },
    },

    equipment: {
      type: { type: String, enum: EQUIPMENT_TYPES, required: true },
      brand: { type: String, trim: true, maxlength: 80, default: '' },
      model: { type: String, trim: true, maxlength: 120, default: '' },
      serial: { type: String, trim: true, maxlength: 120, default: '' },
      accessories: { type: [String], default: [] },
    },

    reportedIssue: { type: String, required: true, trim: true, maxlength: 2000 },
    diagnosis: { type: String, trim: true, maxlength: 2000, default: '' },

    quote: {
      amount: { type: Number, default: 0, min: 0 },
      notes: { type: String, trim: true, maxlength: 1000, default: '' },
      status: {
        type: String,
        enum: ['pendiente', 'aprobada', 'rechazada'],
        default: 'pendiente',
      },
      decidedAt: { type: Date, default: null },
    },

    parts: { type: [partSchema], default: [] },
    finalCost: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: SERVICE_ORDER_STATUSES, default: 'recibido', index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },

    warranty: {
      days: { type: Number, default: 0, min: 0 },
      startsAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
    },

    receivedAt: { type: Date, default: Date.now },
    promisedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    notifiedReadyAt: { type: Date, default: null },

    internalNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

serviceOrderSchema.index({ createdAt: -1 });
serviceOrderSchema.index({ 'equipment.serial': 1 });

serviceOrderSchema.virtual('partsTotal').get(function partsTotal() {
  if (!this.parts?.length) return 0;
  return this.parts.reduce((sum, part) => sum + part.quantity * part.unitCost, 0);
});

const ServiceOrder = mongoose.model('ServiceOrder', serviceOrderSchema);

module.exports = ServiceOrder;
module.exports.SERVICE_ORDER_STATUSES = SERVICE_ORDER_STATUSES;
module.exports.EQUIPMENT_TYPES = EQUIPMENT_TYPES;
