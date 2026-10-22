'use strict';

const mongoose = require('mongoose');

const LINES = ['tecnico', 'cibercafe', 'papeleria', 'impresion', 'videojuegos', 'otro'];

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    line: { type: String, enum: LINES, default: 'tecnico', index: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },

    price: { type: Number, required: true, min: 0 },
    priceUnit: {
      type: String,
      enum: ['servicio', 'hora', 'pagina', 'mes', 'unidad'],
      default: 'servicio',
    },

    icon: { type: String, trim: true, default: '' },
    warrantyDays: { type: Number, default: 0, min: 0 },
    visible: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
module.exports.LINES = LINES;
