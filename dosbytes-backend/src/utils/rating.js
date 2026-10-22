'use strict';

const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');

/**
 * Recalcula y persiste el promedio y la cantidad de opiniones visibles.
 */
const recomputeProductRating = async (productId) => {
  const objectId = new mongoose.Types.ObjectId(String(productId));
  const [result] = await Review.aggregate([
    { $match: { product: objectId, visible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const ratingAvg = result ? Math.round(result.avg * 10) / 10 : 0;
  const ratingCount = result ? result.count : 0;

  await Product.updateOne({ _id: objectId }, { $set: { ratingAvg, ratingCount } });
  return { ratingAvg, ratingCount };
};

/**
 * Distribución de estrellas 5 -> 1 para la ficha del producto.
 */
const getRatingBreakdown = async (productId) => {
  const objectId = new mongoose.Types.ObjectId(String(productId));
  const rows = await Review.aggregate([
    { $match: { product: objectId, visible: true } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  rows.forEach((row) => {
    if (breakdown[row._id] !== undefined) breakdown[row._id] = row.count;
  });
  return breakdown;
};

module.exports = { recomputeProductRating, getRatingBreakdown };
