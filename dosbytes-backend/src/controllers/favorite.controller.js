'use strict';

const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const populateProduct = {
  path: 'product',
  select: 'name slug code price compareAtPrice images stock ratingAvg ratingCount visible',
};

const list = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .populate(populateProduct)
    .sort({ createdAt: -1 });

  res.json({
    ok: true,
    data: { favorites: favorites.filter((item) => item.product) },
  });
});

const add = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.body.productId,
    visible: true,
  }).select('_id');
  if (!product) throw ApiError.notFound('Producto no encontrado');

  await Favorite.updateOne(
    { user: req.user._id, product: product._id },
    { $setOnInsert: { user: req.user._id, product: product._id } },
    { upsert: true }
  );

  res.status(201).json({ ok: true, message: 'Producto agregado a favoritos' });
});

const remove = asyncHandler(async (req, res) => {
  await Favorite.deleteOne({ user: req.user._id, product: req.params.productId });
  res.json({ ok: true, message: 'Producto eliminado de favoritos' });
});

module.exports = { list, add, remove };
