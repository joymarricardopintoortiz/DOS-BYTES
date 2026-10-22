'use strict';

const User = require('../models/User');
const ServiceOrder = require('../models/ServiceOrder');
const Order = require('../models/Order');
const Favorite = require('../models/Favorite');
const DeletionReason = require('../models/DeletionReason');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/slugify');
const { generateToken } = require('../utils/tokens');
const emailService = require('../services/email.service');

const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.unauthorized();

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;

  await user.save();
  res.json({ ok: true, data: { user } });
});

/**
 * RF-22 a RF-27: eliminación de cuenta con anonimización.
 */
const deleteMe = asyncHandler(async (req, res) => {
  const { password, reason, comment } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');
  if (!user) throw ApiError.unauthorized();

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('La contraseña no es correcta');

  // RF-25: no se puede eliminar con trámites pendientes.
  const [pendingServices, pendingOrders] = await Promise.all([
    ServiceOrder.countDocuments({
      $or: [{ customer: user._id }, { 'customerSnapshot.email': user.email }],
      status: { $nin: ['entregado', 'no_reparable'] },
    }),
    Order.countDocuments({
      customer: user._id,
      status: { $nin: ['entregado', 'cancelado'] },
    }),
  ]);

  if (pendingServices > 0 || pendingOrders > 0) {
    throw ApiError.conflict(
      'No puedes eliminar la cuenta mientras tengas una reparación o un pedido pendiente'
    );
  }

  const originalEmail = user.email;
  const originalName = user.name;

  // RF-26: motivo anónimo, sin referencia al usuario.
  await DeletionReason.create({ reason, comment: comment || '' });

  // Correo de confirmación antes de anonimizar (RF-23).
  const tpl = emailService.templates.accountDeleted({ name: originalName });
  await emailService.send({ to: originalEmail, ...tpl });

  // RF-27: se conservan órdenes y montos, se limpian los datos personales.
  await ServiceOrder.updateMany(
    { $or: [{ customer: user._id }, { 'customerSnapshot.email': originalEmail }] },
    {
      $set: {
        'customerSnapshot.name': 'Cuenta eliminada',
        'customerSnapshot.email': '',
        'customerSnapshot.phone': '',
      },
    }
  );

  // Los favoritos son preferencia, no registro contable.
  await Favorite.deleteMany({ user: user._id });

  user.anonymize();
  await user.save();

  res.json({
    ok: true,
    message:
      'Tu cuenta fue eliminada. Puedes crear una nueva cuenta con el mismo correo cuando quieras.',
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 100 });
  const filter = { isDeleted: false };

  if (req.query.role) filter.role = req.query.role;
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';

  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ ok: true, data: { users }, meta: buildMeta(total, page, limit) });
});

/**
 * RF-19: solo un administrador crea empleados, con contraseña temporal.
 */
const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, phone, tempPassword } = req.body;

  const existing = await User.findOne({ email, isDeleted: false });
  if (existing) throw ApiError.conflict('Ya existe una cuenta con este correo');

  const temporaryPassword = tempPassword || `Db-${generateToken(4)}`;

  const user = new User({
    name,
    email,
    phone: phone || '',
    role: 'employee',
    emailVerified: true,
    mustChangePassword: true,
    active: true,
  });
  await user.setPassword(temporaryPassword);
  await user.save();

  const tpl = emailService.templates.employeeWelcome({
    name: user.name,
    email: user.email,
    tempPassword: temporaryPassword,
  });
  await emailService.send({ to: user.email, ...tpl });

  res.status(201).json({
    ok: true,
    message: 'Empleado creado. Debe cambiar la contraseña en su primer ingreso.',
    data: { user, tempPassword: temporaryPassword },
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false }).select(
    '+tokenVersion'
  );
  if (!user) throw ApiError.notFound('Usuario no encontrado');

  if (user.role === 'admin') {
    throw ApiError.forbidden('Las cuentas de administrador no se gestionan desde este panel');
  }

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.active !== undefined) {
    user.active = req.body.active;
    // Al desactivar, se invalidan las sesiones abiertas.
    if (!user.active) user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  await user.save();
  res.json({ ok: true, data: { user } });
});

/**
 * Estadísticas de motivos de eliminación sin datos personales (RF-26).
 */
const deletionStats = asyncHandler(async (_req, res) => {
  const rows = await DeletionReason.aggregate([
    { $group: { _id: '$reason', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  res.json({
    ok: true,
    data: {
      total,
      reasons: rows.map((row) => ({ reason: row._id, count: row.count })),
    },
  });
});

module.exports = {
  updateMe,
  deleteMe,
  listUsers,
  createEmployee,
  updateUser,
  deletionStats,
};
