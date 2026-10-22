'use strict';

const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slugify');

const isStaff = (user) => user && (user.role === 'employee' || user.role === 'admin');

/**
 * Categorías con conteo de productos visibles para el menú tipo Mercado Libre.
 */
const list = asyncHandler(async (req, res) => {
  const includeHidden = isStaff(req.user) && req.query.includeHidden === 'true';
  const match = includeHidden ? {} : { visible: true };

  const categories = await Category.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'products',
        let: { categoryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$category', '$$categoryId'] }, { $eq: ['$visible', true] }],
              },
            },
          },
          { $count: 'n' },
        ],
        as: 'productCounts',
      },
    },
    {
      $addFields: {
        productCount: {
          $ifNull: [{ $arrayElemAt: ['$productCounts.n', 0] }, 0],
        },
      },
    },
    { $project: { productCounts: 0 } },
    { $sort: { order: 1, name: 1 } },
  ]);

  res.json({ ok: true, data: { categories } });
});

const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!isStaff(req.user)) filter.visible = true;
  const category = await Category.findOne(filter);
  if (!category) throw ApiError.notFound('Categoría no encontrada');
  res.json({ ok: true, data: { category } });
});

const create = asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Category, req.body.slug || req.body.name);

  const category = await Category.create({
    name: req.body.name,
    slug,
    description: req.body.description || '',
    image: req.body.image || '',
    icon: req.body.icon || '',
    parent: req.body.parent || null,
    order: req.body.order || 0,
    visible: req.body.visible !== undefined ? Boolean(req.body.visible) : true,
  });

  res.status(201).json({ ok: true, data: { category } });
});

const update = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Categoría no encontrada');

  if (req.body.parent && String(req.body.parent) === String(category._id)) {
    throw ApiError.badRequest('Una categoría no puede ser su propia categoría padre');
  }

  const nameChanged = req.body.name !== undefined && req.body.name !== category.name;
  if (req.body.slug !== undefined || nameChanged) {
    category.slug = await uniqueSlug(
      Category,
      req.body.slug || req.body.name || category.name,
      category._id
    );
  }

  ['name', 'description', 'image', 'icon', 'parent', 'order', 'visible'].forEach((field) => {
    if (req.body[field] !== undefined) category[field] = req.body[field];
  });

  await category.save();
  res.json({ ok: true, data: { category } });
});

const remove = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Categoría no encontrada');

  const products = await Product.countDocuments({ category: category._id });
  if (products > 0) {
    throw ApiError.conflict(
      `No se puede eliminar: la categoría tiene ${products} productos asociados`
    );
  }

  await category.deleteOne();
  res.json({ ok: true, message: 'Categoría eliminada' });
});

module.exports = { list, getBySlug, create, update, remove };
