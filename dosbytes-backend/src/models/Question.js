'use strict';

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    answer: {
      text: { type: String, trim: true, maxlength: 1000, default: '' },
      answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      answeredAt: { type: Date, default: null },
    },
    visible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

questionSchema.index({ product: 1, createdAt: -1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
