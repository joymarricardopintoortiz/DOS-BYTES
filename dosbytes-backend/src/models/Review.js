'use strict';

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    visible: { type: Boolean, default: true, index: true },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Una sola opinión por cliente y producto.
reviewSchema.index({ product: 1, user: 1 }, { unique: true, name: 'one_review_per_user_product' });
reviewSchema.index({ product: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
