'use strict';

const Question = require('../models/Question');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildMeta } = require('../utils/pagination');

const isStaff = (user) => user && (user.role === 'employee' || user.role === 'admin');

const listByProduct = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!isStaff(req.user)) filter.visible = true;

  const product = await Product.findOne(filter).select('_id name slug');
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const { page, limit, skip } = getPagination(req.query, { limit: 10, maxLimit: 50 });

  const questionFilter = { product: product._id, visible: true };
  const [questions, total] = await Promise.all([
    Question.find(questionFilter)
      .populate('user', 'name')
      .populate('answer.answeredBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Question.countDocuments(questionFilter),
  ]);

  res.json({ ok: true, data: { questions }, meta: buildMeta(total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, visible: true }).select('_id');
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const question = await Question.create({
    product: product._id,
    user: req.user._id,
    text: req.body.text,
  });

  await question.populate('user', 'name');

  res.status(201).json({
    ok: true,
    message: 'Pregunta enviada. Te responderemos pronto.',
    data: { question },
  });
});

const answer = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw ApiError.notFound('Pregunta no encontrada');

  question.answer = {
    text: req.body.answer,
    answeredBy: req.user._id,
    answeredAt: new Date(),
  };
  question.visible = true;

  await question.save();
  await question.populate('user', 'name');
  await question.populate('answer.answeredBy', 'name');

  res.json({ ok: true, message: 'Respuesta publicada', data: { question } });
});

const setVisibility = asyncHandler(async (req, res) => {
  const question = await Question.findByIdAndUpdate(
    req.params.id,
    { $set: { visible: req.body.visible } },
    { returnDocument: 'after' }
  );
  if (!question) throw ApiError.notFound('Pregunta no encontrada');
  res.json({ ok: true, data: { question } });
});

const remove = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw ApiError.notFound('Pregunta no encontrada');

  const owner = String(question.user) === String(req.user._id);
  if (!owner && req.user.role !== 'admin') {
    throw ApiError.forbidden('Solo puedes eliminar tu propia pregunta');
  }

  await question.deleteOne();
  res.json({ ok: true, message: 'Pregunta eliminada' });
});

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 50 });

  const [questions, total] = await Promise.all([
    Question.find({ user: req.user._id })
      .populate('product', 'name slug code images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Question.countDocuments({ user: req.user._id }),
  ]);

  res.json({ ok: true, data: { questions }, meta: buildMeta(total, page, limit) });
});

module.exports = { listByProduct, create, answer, setVisibility, remove, listMine };
