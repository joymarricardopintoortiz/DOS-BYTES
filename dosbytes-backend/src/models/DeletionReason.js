'use strict';

const mongoose = require('mongoose');

const DELETION_REASONS = [
  'precio',
  'no_uso',
  'mala_experiencia',
  'privacidad',
  'otro',
];

/**
 * Motivos de eliminación de cuenta SIN datos personales (RF-26).
 * No guarda referencia al usuario a propósito.
 */
const deletionReasonSchema = new mongoose.Schema(
  {
    reason: { type: String, enum: DELETION_REASONS, required: true, index: true },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

const DeletionReason = mongoose.model('DeletionReason', deletionReasonSchema);

module.exports = DeletionReason;
module.exports.DELETION_REASONS = DELETION_REASONS;
