'use strict';

const mongoose = require('mongoose');

const ORDER_STATUSES = ['reservado', 'listo', 'entregado', 'cancelado'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    code: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderShippingSchema = new mongoose.Schema(
  {
    department: { type: String, trim: true, maxlength: 60, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    address: { type: String, trim: true, maxlength: 240, default: '' },
    cost: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const orderContactSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'reservado', index: true },
    // tienda: reservas antiguas (pago al recoger). Los nuevos checkout envían
    // efectivo / tarjeta / cuenta_bancaria y se cobra según el flujo del local.
    paymentMethod: {
      type: String,
      enum: ['tienda', 'efectivo', 'tarjeta', 'cuenta_bancaria'],
      default: 'tienda',
    },
    // Referencia enmascarada (ej. "Tarjeta **** 4321"): nunca se guarda el
    // número completo ni el CVV.
    paymentDetail: { type: String, trim: true, maxlength: 120, default: '' },
    shipping: { type: orderShippingSchema, default: () => ({}) },
    contact: { type: orderContactSchema, default: () => ({}) },
    pickupNotes: { type: String, trim: true, maxlength: 500, default: '' },

    stockApplied: { type: Boolean, default: true },
    soldCounted: { type: Boolean, default: false },

    history: { type: [orderHistorySchema], default: [] },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
