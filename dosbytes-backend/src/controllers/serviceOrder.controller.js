'use strict';

const ServiceOrder = require('../models/ServiceOrder');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/slugify');
const { generateServiceOrderCode } = require('../utils/tokens');
const emailService = require('../services/email.service');

const TRANSITIONS = {
  recibido: ['diagnostico', 'en_reparacion', 'no_reparable'],
  diagnostico: ['esperando_aprobacion', 'en_reparacion', 'no_reparable'],
  esperando_aprobacion: ['en_reparacion', 'no_reparable'],
  en_reparacion: ['listo', 'no_reparable'],
  listo: ['entregado', 'en_reparacion'],
  entregado: [],
  no_reparable: ['entregado'],
};

const generateUniqueCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateServiceOrderCode();
    // eslint-disable-next-line no-await-in-loop
    if (!(await ServiceOrder.exists({ code }))) return code;
  }
  throw ApiError.serviceUnavailable('No se pudo generar el código de la orden');
};

const pushStatus = (order, status, note, userId) => {
  order.status = status;
  order.statusHistory.push({
    status,
    note: note || '',
    changedBy: userId || null,
    at: new Date(),
  });
};

const applyWarranty = (order, baseDate = new Date()) => {
  if (order.warranty.days > 0) {
    if (!order.warranty.startsAt) order.warranty.startsAt = baseDate;
    const start = order.warranty.startsAt;
    order.warranty.expiresAt = new Date(
      start.getTime() + order.warranty.days * 24 * 60 * 60 * 1000
    );
  }
};

/**
 * Vista pública de seguimiento: sin datos personales ni notas internas.
 */
const publicView = (order) => ({
  code: order.code,
  status: order.status,
  receivedAt: order.receivedAt,
  promisedAt: order.promisedAt,
  deliveredAt: order.deliveredAt,
  equipment: {
    type: order.equipment.type,
    brand: order.equipment.brand,
    model: order.equipment.model,
  },
  reportedIssue: order.reportedIssue,
  diagnosis: order.diagnosis,
  quote: { amount: order.quote.amount, status: order.quote.status },
  finalCost: order.finalCost,
  warranty: order.warranty,
  statusHistory: order.statusHistory.map((item) => ({
    status: item.status,
    note: item.note,
    at: item.at,
  })),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const sendReceivedEmail = async (order) => {
  if (!order.customerSnapshot?.email) return;
  const equipment = [order.equipment.brand, order.equipment.model, order.equipment.type]
    .filter(Boolean)
    .join(' ');
  const tpl = emailService.templates.serviceOrderReceived({
    name: order.customerSnapshot.name,
    code: order.code,
    equipment,
    issue: order.reportedIssue,
  });
  await emailService.send({ to: order.customerSnapshot.email, ...tpl });
};

/**
 * RF-05: solicitud de servicio desde la web (público, sin login).
 */
const createPublic = asyncHandler(async (req, res) => {
  const code = await generateUniqueCode();

  const snapshot = {
    name: req.user?.name || req.body.customerSnapshot.name,
    email: req.user?.email || req.body.customerSnapshot.email,
    phone: req.body.customerSnapshot.phone || req.user?.phone || '',
  };

  const order = await ServiceOrder.create({
    code,
    source: 'web',
    customer: req.user?._id || null,
    customerSnapshot: snapshot,
    equipment: {
      type: req.body.equipment.type,
      brand: req.body.equipment.brand || '',
      model: req.body.equipment.model || '',
      serial: req.body.equipment.serial || '',
      accessories: req.body.equipment.accessories || [],
    },
    reportedIssue: req.body.reportedIssue,
    status: 'recibido',
    statusHistory: [{ status: 'recibido', note: 'Solicitud recibida desde la web' }],
    receivedAt: new Date(),
    createdBy: req.user?._id || null,
  });

  await sendReceivedEmail(order);

  res.status(201).json({
    ok: true,
    message: `Solicitud registrada con el código ${order.code}. Guarda el código para consultar el estado.`,
    data: { code: order.code, status: order.status },
  });
});

/**
 * Registro de orden en el local por empleado/administrador (RF-01).
 */
const createStaff = asyncHandler(async (req, res) => {
  let customer = null;
  if (req.body.customerId) {
    customer = await User.findOne({ _id: req.body.customerId, isDeleted: false });
    if (!customer) throw ApiError.notFound('Cliente no encontrado');
  }

  const snapshot = {
    name: req.body.customerSnapshot?.name || customer?.name || '',
    email: req.body.customerSnapshot?.email || customer?.email || '',
    phone: req.body.customerSnapshot?.phone || customer?.phone || '',
  };
  if (!snapshot.name) throw ApiError.badRequest('El nombre del cliente es obligatorio');

  const code = await generateUniqueCode();

  const order = await ServiceOrder.create({
    code,
    source: 'local',
    customer: customer?._id || null,
    customerSnapshot: snapshot,
    equipment: {
      type: req.body.equipment.type,
      brand: req.body.equipment.brand || '',
      model: req.body.equipment.model || '',
      serial: req.body.equipment.serial || '',
      accessories: req.body.equipment.accessories || [],
    },
    reportedIssue: req.body.reportedIssue,
    status: 'recibido',
    statusHistory: [
      { status: 'recibido', note: 'Equipo recibido en el local', changedBy: req.user._id },
    ],
    receivedAt: new Date(),
    createdBy: req.user._id,
  });

  res.status(201).json({ ok: true, data: { order } });
});

/**
 * RF-02: consulta pública por código.
 */
const track = asyncHandler(async (req, res) => {
  const order = await ServiceOrder.findOne({ code: String(req.params.code).toUpperCase() });
  if (!order) throw ApiError.notFound('No existe una orden con ese código');
  res.json({ ok: true, data: { order: publicView(order) } });
});

/**
 * Aprobación o rechazo de la cotización por parte del cliente con su código.
 */
const quoteDecision = asyncHandler(async (req, res) => {
  const order = await ServiceOrder.findOne({ code: String(req.params.code).toUpperCase() });
  if (!order) throw ApiError.notFound('No existe una orden con ese código');

  if (order.status !== 'esperando_aprobacion') {
    throw ApiError.conflict('La orden no está esperando aprobación de cotización');
  }

  const { decision, note } = req.body;
  order.quote.status = decision;
  order.quote.decidedAt = new Date();

  if (decision === 'aprobada') {
    pushStatus(
      order,
      'en_reparacion',
      note || 'Cotización aprobada por el cliente',
      null
    );
  } else {
    order.statusHistory.push({
      status: 'esperando_aprobacion',
      note: note || 'Cotización rechazada por el cliente',
      at: new Date(),
    });
  }

  await order.save();
  res.json({ ok: true, message: `Cotización ${decision}`, data: { status: order.status } });
});

const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 100 });
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;

  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [
      { code: rx },
      { 'customerSnapshot.name': rx },
      { 'customerSnapshot.email': rx },
      { 'equipment.serial': rx },
      { 'equipment.model': rx },
    ];
  }

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [orders, total] = await Promise.all([
    ServiceOrder.find(filter)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ServiceOrder.countDocuments(filter),
  ]);

  res.json({ ok: true, data: { orders }, meta: buildMeta(total, page, limit) });
});

const getById = asyncHandler(async (req, res) => {
  const order = await ServiceOrder.findById(req.params.id).populate(
    'customer',
    'name email phone'
  );
  if (!order) throw ApiError.notFound('Orden no encontrada');
  res.json({ ok: true, data: { order } });
});

/**
 * RF-04: diagnóstico, cotización, repuestos y costo final.
 */
const update = asyncHandler(async (req, res) => {
  const order = await ServiceOrder.findById(req.params.id);
  if (!order) throw ApiError.notFound('Orden no encontrada');

  if (req.body.diagnosis !== undefined) order.diagnosis = req.body.diagnosis;
  if (req.body.internalNotes !== undefined) order.internalNotes = req.body.internalNotes;
  if (req.body.finalCost !== undefined) order.finalCost = req.body.finalCost;
  if (req.body.promisedAt !== undefined) order.promisedAt = req.body.promisedAt;

  if (req.body.quote) {
    if (req.body.quote.amount !== undefined) order.quote.amount = req.body.quote.amount;
    if (req.body.quote.notes !== undefined) order.quote.notes = req.body.quote.notes;
    if (req.body.quote.status !== undefined) {
      order.quote.status = req.body.quote.status;
      order.quote.decidedAt = new Date();
    }
  }

  if (req.body.parts !== undefined) {
    order.parts = req.body.parts.map((part) => ({
      name: part.name,
      quantity: part.quantity ?? 1,
      unitCost: part.unitCost ?? 0,
    }));
  }

  if (req.body.equipment) {
    ['serial', 'brand', 'model'].forEach((field) => {
      if (req.body.equipment[field] !== undefined) {
        order.equipment[field] = req.body.equipment[field];
      }
    });
  }

  if (req.body.warranty?.days !== undefined) {
    order.warranty.days = req.body.warranty.days;
    if (order.warranty.startsAt) applyWarranty(order, order.warranty.startsAt);
  }

  await order.save();
  res.json({ ok: true, data: { order } });
});

/**
 * Cambio de estado con transiciones controladas y aviso de equipo listo (RF-03, RF-06).
 */
const changeStatus = asyncHandler(async (req, res) => {
  const order = await ServiceOrder.findById(req.params.id);
  if (!order) throw ApiError.notFound('Orden no encontrada');

  const next = req.body.status;
  if (next === order.status) {
    return res.json({ ok: true, message: 'La orden ya está en ese estado', data: { order } });
  }

  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(next)) {
    throw ApiError.badRequest(
      `No se puede pasar de "${order.status}" a "${next}". Estados permitidos: ${
        allowed.length ? allowed.join(', ') : 'ninguno'
      }`
    );
  }

  const previous = order.status;
  pushStatus(order, next, req.body.note, req.user._id);

  if (next === 'listo') {
    applyWarranty(order, new Date());
  }

  if (next === 'entregado') {
    order.deliveredAt = new Date();
    applyWarranty(order, order.deliveredAt);
  }

  await order.save();

  let emailSent = false;
  if (next === 'listo' && previous !== 'listo' && order.customerSnapshot?.email) {
    const tpl = emailService.templates.serviceOrderReady({
      name: order.customerSnapshot.name,
      code: order.code,
    });
    const result = await emailService.send({ to: order.customerSnapshot.email, ...tpl });
    if (result.ok) {
      order.notifiedReadyAt = new Date();
      await order.save();
      emailSent = true;
    }
  }

  res.json({
    ok: true,
    message: `Estado actualizado a ${next}${emailSent ? '. Se notificó al cliente.' : ''}`,
    data: { order },
  });
});

const history = asyncHandler(async (req, res) => {
  const { customerId, email, serial } = req.query;
  if (!customerId && !email && !serial) {
    throw ApiError.badRequest('Indica un cliente, un correo o un número de serie');
  }

  const filter = {};
  if (customerId) filter.customer = customerId;
  if (email) filter['customerSnapshot.email'] = String(email).toLowerCase();
  if (serial) filter['equipment.serial'] = new RegExp(escapeRegex(serial), 'i');

  const orders = await ServiceOrder.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ ok: true, data: { orders } });
});

/**
 * RF-08: historial propio del cliente autenticado.
 */
const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 50 });

  const filter = {
    $or: [{ customer: req.user._id }, { 'customerSnapshot.email': req.user.email }],
  };

  const [orders, total] = await Promise.all([
    ServiceOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ServiceOrder.countDocuments(filter),
  ]);

  res.json({ ok: true, data: { orders }, meta: buildMeta(total, page, limit) });
});

module.exports = {
  createPublic,
  createStaff,
  track,
  quoteDecision,
  listStaff,
  getById,
  update,
  changeStatus,
  history,
  listMine,
};
