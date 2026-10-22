'use strict';

const Review = require('../models/Review');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildMeta } = require('../utils/pagination');
const { recomputeProductRating, getRatingBreakdown } = require('../utils/rating');

const isStaff = (user) => user && (user.role === 'employee' || user.role === 'admin');

const sortMap = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  rating_desc: { rating: -1, createdAt: -1 },
  rating_asc: { rating: 1, createdAt: -1 },
};

/**
 * Opiniones públicas con promedio y desglose de estrellas (tipo Mercado Libre).
 */
const listByProduct = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!isStaff(req.user)) filter.visible = true;

  const product = await Product.findOne(filter).select('_id name slug ratingAvg ratingCount');
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const { page, limit, skip } = getPagination(req.query, { limit: 10, maxLimit: 50 });

  const reviewFilter = { product: product._id, visible: true };
  if (req.query.rating) {
    const rating = Number(req.query.rating);
    if (rating >= 1 && rating <= 5) reviewFilter.rating = rating;
  }

  const [reviews, total, breakdown] = await Promise.all([
    Review.find(reviewFilter)
      .populate('user', 'name')
      .sort(sortMap[req.query.sort] || sortMap.recent)
      .skip(skip)
      .limit(limit),
    Review.countDocuments(reviewFilter),
    getRatingBreakdown(product._id),
  ]);

  res.json({
    ok: true,
    data: {
      reviews,
      summary: {
        average: product.ratingAvg,
        count: product.ratingCount,
        breakdown,
      },
    },
    meta: buildMeta(total, page, limit),
  });
});

const create = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, visible: true });
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const existing = await Review.findOne({ product: product._id, user: req.user._id });
  if (existing) {
    throw ApiError.conflict('Ya opinaste sobre este producto. Puedes editar tu opinión.');
  }

  let review;
  try {
    review = await Review.create({
      product: product._id,
      user: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment || '',
    });
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict('Ya opinaste sobre este producto. Puedes editar tu opinión.');
    }
    throw err;
  }

  await recomputeProductRating(product._id);
  await review.populate('user', 'name');

  res.status(201).json({ ok: true, message: 'Opinión publicada', data: { review } });
});

const update = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Opinión no encontrada');

  if (String(review.user) !== String(req.user._id)) {
    throw ApiError.forbidden('Solo puedes editar tu propia opinión');
  }

  if (req.body.rating !== undefined && req.body.rating !== review.rating) {
    review.rating = req.body.rating;
  }
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  review.editedAt = new Date();

  await review.save();
  await recomputeProductRating(review.product);
  await review.populate('user', 'name');

  res.json({ ok: true, message: 'Opinión actualizada', data: { review } });
});

const remove = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Opinión no encontrada');

  const owner = String(review.user) === String(req.user._id);
  if (!owner && req.user.role !== 'admin') {
    throw ApiError.forbidden('Solo puedes eliminar tu propia opinión');
  }

  const productId = review.product;
  await review.deleteOne();
  await recomputeProductRating(productId);

  res.json({ ok: true, message: 'Opinión eliminada' });
});

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 50 });

  const [reviews, total] = await Promise.all([
    Review.find({ user: req.user._id })
      .populate('product', 'name slug code price images visible')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ user: req.user._id }),
  ]);

  res.json({ ok: true, data: { reviews }, meta: buildMeta(total, page, limit) });
});

const listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 100 });
  const filter = {};

  if (req.query.product) filter.product = req.query.product;
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.visible !== undefined) filter.visible = req.query.visible === 'true';

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('product', 'name slug code')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.json({ ok: true, data: { reviews }, meta: buildMeta(total, page, limit) });
});

const setVisibility = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $set: { visible: req.body.visible } },
    { returnDocument: 'after' }
  );
  if (!review) throw ApiError.notFound('Opinión no encontrada');

  await recomputeProductRating(review.product);

  res.json({
    ok: true,
    message: review.visible ? 'Opinión visible' : 'Opinión oculta',
    data: { review },
  });
});

module.exports = { listByProduct, create, update, remove, listMine, listAll, setVisibility };
