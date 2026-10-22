'use strict';

const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slugify');

const isStaff = (user) => user && (user.role === 'employee' || user.role === 'admin');

/**
 * Servicios y tarifas del negocio (RF-09 y RF-16).
 */
const list = asyncHandler(async (req, res) => {
  const filter = {};
  const includeHidden = isStaff(req.user) && req.query.includeHidden === 'true';
  if (!includeHidden) filter.visible = true;
  if (req.query.line) filter.line = req.query.line;

  const services = await Service.find(filter).sort({ line: 1, order: 1, name: 1 });
  res.json({ ok: true, data: { services } });
});

const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!isStaff(req.user)) filter.visible = true;
  const service = await Service.findOne(filter);
  if (!service) throw ApiError.notFound('Servicio no encontrado');
  res.json({ ok: true, data: { service } });
});

const create = asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Service, req.body.slug || req.body.name);

  const service = await Service.create({
    name: req.body.name,
    slug,
    line: req.body.line || 'tecnico',
    description: req.body.description || '',
    price: req.body.price,
    priceUnit: req.body.priceUnit || 'servicio',
    icon: req.body.icon || '',
    warrantyDays: req.body.warrantyDays || 0,
    visible: req.body.visible !== undefined ? Boolean(req.body.visible) : true,
    order: req.body.order || 0,
  });

  res.status(201).json({ ok: true, data: { service } });
});

const update = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Servicio no encontrado');

  const nameChanged = req.body.name !== undefined && req.body.name !== service.name;
  if (req.body.slug !== undefined || nameChanged) {
    service.slug = await uniqueSlug(
      Service,
      req.body.slug || req.body.name || service.name,
      service._id
    );
  }

  [
    'name',
    'line',
    'description',
    'price',
    'priceUnit',
    'icon',
    'warrantyDays',
    'visible',
    'order',
  ].forEach((field) => {
    if (req.body[field] !== undefined) service[field] = req.body[field];
  });

  await service.save();
  res.json({ ok: true, data: { service } });
});

/**
 * Borrado lógico: ocultar la tarifa sin perder el historial del negocio.
 */
const remove = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { $set: { visible: false } },
    { returnDocument: 'after' }
  );
  if (!service) throw ApiError.notFound('Servicio no encontrado');
  res.json({ ok: true, message: 'Servicio oculto', data: { service } });
});

module.exports = { list, getBySlug, create, update, remove };
