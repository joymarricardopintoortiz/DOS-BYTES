'use strict';

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, maxlength: 180, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    sku: { type: String, uppercase: true, trim: true, default: '' },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 5000, default: '' },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: 0 },
    isOffer: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 3, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },

    visible: { type: Boolean, default: true, index: true },
    images: { type: [imageSchema], default: [] },

    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ name: 'text', description: 'text', sku: 'text' }, {
  weights: { name: 10, sku: 6, description: 1 },
  name: 'product_text_search',
});
productSchema.index({ price: 1 });
productSchema.index({ ratingAvg: -1 });
productSchema.index({ soldCount: -1 });

productSchema.virtual('mainImage').get(function mainImage() {
  if (!Array.isArray(this.images) || this.images.length === 0) return null;
  return [...this.images].sort((a, b) => a.order - b.order)[0].url;
});

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

productSchema.virtual('inStock').get(function inStock() {
  return this.stock > 0;
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
