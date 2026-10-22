'use strict';

const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Favorite = require('../models/Favorite');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildMeta } = require('../utils/pagination');
const { uniqueSlug, escapeRegex } = require('../utils/slugify');
const { generateProductCode } = require('../utils/tokens');
const { getRatingBreakdown } = require('../utils/rating');
const { uploadImage, deleteImage } = require('../services/upload.service');

const isStaff = (user) => user && (user.role === 'employee' || user.role === 'admin');

const resolveCategory = async (value) => {
  let category = null;
  if (mongoose.isValidObjectId(value)) category = await Category.findById(value);
  if (!category) category = await Category.findOne({ slug: String(value).toLowerCase() });
  if (!category) throw ApiError.badRequest('La categoría no existe');
  return category;
};

const generateUniqueProductCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateProductCode();
    // eslint-disable-next-line no-await-in-loop
    if (!(await Product.exists({ code }))) return code;
  }
  throw ApiError.serviceUnavailable('No se pudo generar el código del producto');
};

const buildSort = (sort) => {
  switch (sort) {
    case 'price_asc':
      return { price: 1 };
    case 'price_desc':
      return { price: -1 };
    case 'rating':
      return { ratingAvg: -1, ratingCount: -1 };
    case 'newest':
      return { createdAt: -1 };
    default:
      return { featured: -1, soldCount: -1, ratingAvg: -1, createdAt: -1 };
  }
};

/**
 * Catálogo tipo Mercado Libre: búsqueda, filtros, orden y paginación (RF-14).
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 60 });
  const staff = isStaff(req.user);

  const filter = {};
  if (!staff || req.query.visible !== undefined) {
    filter.visible = staff ? req.query.visible === 'true' : true;
  }

  if (req.query.category) {
    const category = await resolveCategory(req.query.category);
    filter.category = category._id;
  }

  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ name: rx }, { description: rx }, { code: rx }, { sku: rx }];
  }

  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.price = {};
    if (Number.isFinite(minPrice)) filter.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) filter.price.$lte = maxPrice;
  }

  if (req.query.available === 'true') filter.stock = { $gt: 0 };
  if (req.query.minRating) {
    const minRating = Number(req.query.minRating);
    if (Number.isFinite(minRating)) filter.ratingAvg = { $gte: minRating };
  }
  if (req.query.isOffer === 'true') filter.isOffer = true;
  if (req.query.featured === 'true') filter.featured = true;

  const sort = buildSort(req.query.sort);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ ok: true, data: { products }, meta: buildMeta(total, page, limit) });
});

/**
 * Autocompletado del buscador (máximo 8 resultados).
 */
const suggestions = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ ok: true, data: { products: [], categories: [] } });
  }

  const rx = new RegExp(escapeRegex(q), 'i');

  const [products, categories] = await Promise.all([
    Product.find({ visible: true, $or: [{ name: rx }, { code: rx }, { sku: rx }] })
      .select('name slug code price compareAtPrice images ratingAvg ratingCount stock')
      .sort({ soldCount: -1, ratingAvg: -1 })
      .limit(8),
    Category.find({ visible: true, name: rx }).select('name slug').limit(4),
  ]);

  res.json({
    ok: true,
    data: {
      products: products.map((product) => ({
        name: product.name,
        slug: product.slug,
        code: product.code,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        mainImage: product.mainImage,
        ratingAvg: product.ratingAvg,
        ratingCount: product.ratingCount,
        inStock: product.stock > 0,
      })),
      categories,
    },
  });
});

const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!isStaff(req.user)) filter.visible = true;

  const product = await Product.findOne(filter).populate('category', 'name slug');
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const breakdown = await getRatingBreakdown(product._id);
  let isFavorite = false;
  if (req.user) {
    isFavorite = Boolean(
      await Favorite.exists({ user: req.user._id, product: product._id })
    );
  }

  res.json({
    ok: true,
    data: {
      product,
      rating: {
        average: product.ratingAvg,
        count: product.ratingCount,
        breakdown,
      },
      isFavorite,
    },
  });
});

const getByCode = asyncHandler(async (req, res) => {
  const filter = { code: String(req.params.code).toUpperCase() };
  if (!isStaff(req.user)) filter.visible = true;

  const product = await Product.findOne(filter).populate('category', 'name slug');
  if (!product) throw ApiError.notFound('Producto no encontrado');

  res.json({ ok: true, data: { product } });
});

const related = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, visible: true }).select(
    'category'
  );
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const products = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    visible: true,
  })
    .sort({ soldCount: -1, ratingAvg: -1 })
    .limit(8);

  res.json({ ok: true, data: { products } });
});

const create = asyncHandler(async (req, res) => {
  const category = await resolveCategory(req.body.category);

  let code = req.body.code ? String(req.body.code).toUpperCase().trim() : null;
  if (code) {
    if (await Product.exists({ code })) throw ApiError.conflict('Ese código de producto ya existe');
  } else {
    code = await generateUniqueProductCode();
  }

  const slug = await uniqueSlug(Product, req.body.slug || req.body.name);

  const product = await Product.create({
    code,
    sku: req.body.sku || '',
    name: req.body.name,
    slug,
    description: req.body.description || '',
    category: category._id,
    price: req.body.price,
    compareAtPrice: req.body.compareAtPrice || 0,
    isOffer: Boolean(req.body.isOffer),
    featured: Boolean(req.body.featured),
    stock: req.body.stock || 0,
    lowStockThreshold: req.body.lowStockThreshold ?? 3,
    visible: req.body.visible !== undefined ? Boolean(req.body.visible) : true,
    images: [],
  });

  res.status(201).json({ ok: true, data: { product } });
});

const update = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  if (req.body.category !== undefined) {
    const category = await resolveCategory(req.body.category);
    product.category = category._id;
  }

  if (req.body.code !== undefined) {
    const code = String(req.body.code).toUpperCase().trim();
    if (code !== product.code) {
      if (await Product.exists({ code, _id: { $ne: product._id } })) {
        throw ApiError.conflict('Ese código de producto ya existe');
      }
      product.code = code;
    }
  }

  const nameChanged = req.body.name !== undefined && req.body.name !== product.name;
  if (req.body.slug !== undefined || nameChanged) {
    product.slug = await uniqueSlug(
      Product,
      req.body.slug || req.body.name || product.name,
      product._id
    );
  }

  const editable = [
    'name',
    'description',
    'price',
    'compareAtPrice',
    'isOffer',
    'featured',
    'stock',
    'lowStockThreshold',
    'visible',
    'sku',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  await product.save();
  res.json({ ok: true, data: { product } });
});

/**
 * Borrado lógico: el producto se oculta y conserva historial de ventas.
 */
const remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { visible: false } },
    { returnDocument: 'after' }
  );
  if (!product) throw ApiError.notFound('Producto no encontrado');
  res.json({ ok: true, message: 'Producto oculto del catálogo', data: { product } });
});

const updateStock = asyncHandler(async (req, res) => {
  const updateFields = { stock: req.body.stock };
  if (req.body.lowStockThreshold !== undefined) {
    updateFields.lowStockThreshold = req.body.lowStockThreshold;
  }

  const product = await Product.findByIdAndUpdate(req.params.id, updateFields, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!product) throw ApiError.notFound('Producto no encontrado');

  res.json({ ok: true, data: { product } });
});

const lowStock = asyncHandler(async (_req, res) => {
  const products = await Product.find({
    visible: true,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  })
    .sort({ stock: 1, name: 1 })
    .limit(100);

  res.json({ ok: true, data: { products } });
});

const addImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const files = req.files || [];
  if (files.length === 0) throw ApiError.badRequest('No se recibió ninguna imagen');

  const room = env.upload.maxImagesPerProduct - product.images.length;
  if (room <= 0) {
    throw ApiError.conflict(
      `El producto ya tiene el máximo de ${env.upload.maxImagesPerProduct} imágenes`
    );
  }

  const uploaded = [];
  for (const file of files.slice(0, room)) {
    // eslint-disable-next-line no-await-in-loop
    const result = await uploadImage(file.buffer, {
      mimetype: file.mimetype,
      folder: `${env.cloudinary.folder}/products`,
    });
    uploaded.push(result);
  }

  const start = product.images.length;
  uploaded.forEach((image, index) => {
    product.images.push({
      url: image.url,
      publicId: image.publicId,
      alt: product.name,
      order: start + index,
    });
  });

  await product.save();
  res.status(201).json({ ok: true, data: { product } });
});

const reorderImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const orderMap = new Map(req.body.images.map((item) => [item.publicId, item.order]));

  product.images.forEach((image) => {
    if (orderMap.has(image.publicId)) image.order = orderMap.get(image.publicId);
  });

  product.images.sort((a, b) => a.order - b.order);
  product.images.forEach((image, index) => {
    image.order = index;
  });

  await product.save();
  res.json({ ok: true, data: { product } });
});

const setMainImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const index = product.images.findIndex((image) => image.publicId === req.body.publicId);
  if (index === -1) throw ApiError.notFound('Imagen no encontrada');

  const [chosen] = product.images.splice(index, 1);
  product.images.unshift(chosen);
  product.images.forEach((image, position) => {
    image.order = position;
  });

  await product.save();
  res.json({ ok: true, message: 'Imagen principal actualizada', data: { product } });
});

const removeImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const index = product.images.findIndex((image) => image.publicId === req.body.publicId);
  if (index === -1) throw ApiError.notFound('Imagen no encontrada');

  const [removed] = product.images.splice(index, 1);
  product.images.forEach((image, position) => {
    image.order = position;
  });

  await product.save();
  await deleteImage(removed.publicId);

  res.json({ ok: true, message: 'Imagen eliminada', data: { product } });
});

module.exports = {
  list,
  suggestions,
  getBySlug,
  getByCode,
  related,
  create,
  update,
  remove,
  updateStock,
  lowStock,
  addImages,
  reorderImages,
  setMainImage,
  removeImage,
};
