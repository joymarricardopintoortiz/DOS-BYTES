'use strict';

const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ user: 1, product: 1 }, { unique: true, name: 'one_favorite_per_user_product' });

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
