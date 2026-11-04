'use strict';

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const SiteConfig = require('../models/SiteConfig');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/slugify');
const { generateOrderCode } = require('../utils/tokens');
const emailService = require('../services/email.service');
const shippingService = require('../services/shipping');
const { PAYMENT_METHODS } = require('../validators/order.validator');

const TRANSITIONS = {
  reservado: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta de débito/crédito',
  cuenta_bancaria: 'Cuenta bancaria',
  tienda: 'Pago en tienda',
};

// Referencia enmascarada: jamás se persiste el número completo ni el CVV.
const buildPaymentDetail = (method, payment = {}) => {
  if (method === 'tarjeta') {
    const digits = String(payment.cardNumber || '').replace(/\D/g, '');
    return digits ? `Tarjeta **** ${digits.slice(-4)}` : 'Tarjeta';
  }
  if (method === 'cuenta_bancaria') {
    const digits = String(payment.account || '').replace(/\D/g, '');
    const bank = String(payment.bank || '').trim();
    return digits ? `${bank || 'Cuenta'} · cuenta **** ${digits.slice(-4)}` : bank || 'Cuenta bancaria';
  }
  if (method === 'efectivo') return 'Efectivo al recibir';
  return '';
};

// Administradores configurados + empleados activos, sin duplicados.
const staffRecipients = async () => {
  try {
    const [config, users] = await Promise.all([
      SiteConfig.getConfig(),
      User.find({ role: { $in: ['admin', 'employee'] }, active: true, isDeleted: false })
        .select('email'),
    ]);
    const emails = [
      ...(config.adminEmails || []),
      config.employeeEmail,
      ...users.map((user) => user.email),
    ];
    return [...new Set(emails.filter(Boolean).map((email) => email.toLowerCase()))];
  } catch {
    return [];
  }
};

const isStaff = (user) => user && (user.role === 'employee' || user.role === 'admin');

const generateUniqueCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateOrderCode();
    // eslint-disable-next-line no-await-in-loop
    if (!(await Order.exists({ code }))) return code;
  }
  throw ApiError.serviceUnavailable('No se pudo generar el código del pedido');
};

const restoreStock = async (order) => {
  if (!order.stockApplied) return;
  await Product.bulkWrite(
    order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: item.quantity } },
      },
    }))
  );
};

const create = asyncHandler(async (req, res) => {
  // Une productos repetidos antes de validar stock.
  const merged = new Map();
  req.body.items.forEach((item) => {
    const key = String(item.product);
    if (merged.has(key)) merged.get(key).quantity += item.quantity;
    else merged.set(key, { product: key, quantity: item.quantity });
  });
  const items = [...merged.values()];

  const products = await Product.find({
    _id: { $in: items.map((item) => item.product) },
    visible: true,
  });

  if (products.length !== items.length) {
    throw ApiError.badRequest('Uno o más productos no están disponibles');
  }

  const decremented = [];
  let order = null;

  try {
    const orderItems = [];

    for (const item of items) {
      const product = products.find((doc) => String(doc._id) === item.product);

      // Descuento atómico: evita sobreventa con pedidos simultáneos.
      // eslint-disable-next-line no-await-in-loop
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, visible: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { returnDocument: 'after' }
      );

      if (!updated) {
        throw ApiError.conflict(`No hay stock suficiente de "${product.name}"`);
      }

      decremented.push(item);
      orderItems.push({
        product: product._id,
        code: product.code,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: product.price * item.quantity,
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // El envío se cotiza SIEMPRE en el servidor con la tabla fija de franjas:
    // el total del navegador nunca es el que se guarda.
    const department = String((req.body.shipping && req.body.shipping.department) || '').trim();
    const shippingQuote = shippingService.quote(department, subtotal);
    const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : 'tienda';
    const paymentDetail = buildPaymentDetail(paymentMethod, req.body.payment);
    const total = subtotal + shippingQuote.cost;

    const code = await generateUniqueCode();

    order = await Order.create({
      code,
      customer: req.user._id,
      items: orderItems,
      subtotal,
      total,
      status: 'reservado',
      paymentMethod,
      paymentDetail,
      shipping: {
        department,
        city: String((req.body.shipping && req.body.shipping.city) || '').trim(),
        address: String((req.body.shipping && req.body.shipping.address) || '').trim(),
        cost: shippingQuote.cost,
      },
      contact: {
        email: String((req.body.contact && req.body.contact.email) || req.user.email)
          .trim()
          .toLowerCase(),
        phone: String((req.body.contact && req.body.contact.phone) || '').trim(),
      },
      pickupNotes: req.body.pickupNotes || '',
      stockApplied: true,
      history: [{ status: 'reservado', note: 'Pedido confirmado por el cliente' }],
    });
  } catch (err) {
    // Rollback si algo falla a mitad de camino.
    await Promise.all(
      decremented.map((item) =>
        Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        )
      )
    );
    throw err;
  }

  // Correo al cliente y aviso al equipo en paralelo: ninguno de los dos debe
  // demorar ni romper la confirmación del pedido.
  const staffTo = await staffRecipients();
  await Promise.allSettled([
    emailService.send({
      to: req.user.email,
      ...emailService.templates.orderReceived({
        name: req.user.name,
        code: order.code,
        total: order.total,
        items: order.items,
        paymentLabel: PAYMENT_LABELS[order.paymentMethod] || 'Pago en tienda',
        shipping: order.shipping,
      }),
    }),
    staffTo.length
      ? emailService.send({
          to: staffTo,
          ...emailService.templates.orderCreatedStaff({
            code: order.code,
            total: order.total,
            customer: req.user.name,
            items: order.items,
            paymentLabel: PAYMENT_LABELS[order.paymentMethod] || 'Pago en tienda',
            paymentDetail: order.paymentDetail,
            shipping: order.shipping,
            contact: order.contact,
          }),
        })
      : Promise.resolve(),
  ]);

  res.status(201).json({
    ok: true,
    message: `Pedido ${order.code} confirmado.`,
    data: { order },
  });
});

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 50 });

  const [orders, total] = await Promise.all([
    Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ customer: req.user._id }),
  ]);

  res.json({ ok: true, data: { orders }, meta: buildMeta(total, page, limit) });
});

const getByCode = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ code: String(req.params.code).toUpperCase() })
    .populate('customer', 'name email phone')
    .populate('items.product', 'name slug code images');

  if (!order) throw ApiError.notFound('Pedido no encontrado');

  const owner = String(order.customer?._id || order.customer) === String(req.user._id);
  if (!owner && !isStaff(req.user)) {
    throw ApiError.forbidden('No tienes acceso a este pedido');
  }

  res.json({ ok: true, data: { order } });
});

/**
 * RF-15: cancelar reserva y devolver el stock.
 */
const cancel = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ code: String(req.params.code).toUpperCase() });
  if (!order) throw ApiError.notFound('Pedido no encontrado');

  const owner = String(order.customer) === String(req.user._id);
  if (!owner && !isStaff(req.user)) {
    throw ApiError.forbidden('No tienes acceso a este pedido');
  }

  if (!['reservado', 'listo'].includes(order.status)) {
    throw ApiError.conflict('Este pedido ya no se puede cancelar');
  }

  await restoreStock(order);

  order.status = 'cancelado';
  order.stockApplied = false;
  order.cancelledAt = new Date();
  order.history.push({
    status: 'cancelado',
    note: req.body?.note || 'Pedido cancelado',
    changedBy: req.user._id,
  });
  await order.save();

  res.json({ ok: true, message: 'Pedido cancelado y stock liberado', data: { order } });
});

const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 100 });
  const filter = {};

  if (req.query.status) filter.status = req.query.status;

  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ code: rx }, { 'items.name': rx }];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ ok: true, data: { orders }, meta: buildMeta(total, page, limit) });
});

/**
 * Cambio de estado del pedido. Al entregar sube el contador de vendidos una sola vez.
 */
const changeStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Pedido no encontrado');

  const next = req.body.status;
  if (next === order.status) {
    return res.json({ ok: true, message: 'El pedido ya está en ese estado', data: { order } });
  }

  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(next)) {
    throw ApiError.badRequest(
      `No se puede pasar de "${order.status}" a "${next}". Estados permitidos: ${
        allowed.length ? allowed.join(', ') : 'ninguno'
      }`
    );
  }

  if (next === 'cancelado') {
    await restoreStock(order);
    order.stockApplied = false;
    order.cancelledAt = new Date();
  }

  if (next === 'entregado') {
    if (!order.soldCounted) {
      await Product.bulkWrite(
        order.items.map((item) => ({
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { soldCount: item.quantity } },
          },
        }))
      );
      order.soldCounted = true;
    }
    order.deliveredAt = new Date();
  }

  order.status = next;
  order.history.push({
    status: next,
    note: req.body.note || '',
    changedBy: req.user._id,
  });
  await order.save();

  let emailSent = false;
  if (next === 'listo') {
    const customer = await order.populate('customer', 'name email');
    if (customer.customer?.email) {
      const tpl = emailService.templates.orderReady({
        name: customer.customer.name,
        code: order.code,
      });
      const result = await emailService.send({ to: customer.customer.email, ...tpl });
      emailSent = Boolean(result.ok);
    }
  }

  res.json({
    ok: true,
    message: `Pedido actualizado a ${next}${emailSent ? '. Se notificó al cliente.' : ''}`,
    data: { order },
  });
});

/**
 * Aviso para el panel: pedidos nuevos de las últimas 24 horas.
 */
const newCount = asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await Order.countDocuments({
    status: 'reservado',
    createdAt: { $gte: since },
  });
  res.json({ ok: true, data: { count } });
});

module.exports = {
  create,
  listMine,
  getByCode,
  cancel,
  listStaff,
  changeStatus,
  newCount,
};
