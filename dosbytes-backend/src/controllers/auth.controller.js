'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken, hashToken } = require('../utils/tokens');
const emailService = require('../services/email.service');

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role, v: user.tokenVersion || 0 },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn, issuer: 'dosbytes' }
  );

const buildVerification = (user) => {
  const token = generateToken();
  user.verificationTokenHash = hashToken(token);
  user.verificationExpiresAt = new Date(
    Date.now() + env.jwt.verificationExpiresHours * 60 * 60 * 1000
  );
  user.verificationSentAt = new Date();
  return token;
};

const sendVerification = async (user, token) => {
  const tpl = emailService.templates.verifyEmail({ name: user.name, token });
  await emailService.send({ to: user.email, ...tpl });
};

/**
 * RF-18: registro público. Solo crea clientes y exige verificar el correo.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email, isDeleted: false });
  if (existing) throw ApiError.conflict('Ya existe una cuenta con este correo');

  const user = new User({ name, email, phone: phone || '', role: 'customer' });
  await user.setPassword(password);
  const token = buildVerification(user);
  await user.save();

  await sendVerification(user, token);

  res.status(201).json({
    ok: true,
    message:
      'Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesión.',
    data: { user },
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.params.token);

  const user = await User.findOne({
    verificationTokenHash: tokenHash,
    verificationExpiresAt: { $gt: new Date() },
    isDeleted: false,
  }).select('+verificationTokenHash');

  if (!user) {
    throw ApiError.badRequest('El enlace de verificación es inválido o ya venció');
  }

  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpiresAt = undefined;
  await user.save();

  res.json({ ok: true, message: 'Correo verificado. Ya puedes iniciar sesión.' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, isDeleted: false }).select(
    '+verificationTokenHash'
  );

  const canResend =
    user &&
    !user.emailVerified &&
    (!user.verificationSentAt || Date.now() - user.verificationSentAt.getTime() > 60 * 1000);

  if (canResend) {
    const token = buildVerification(user);
    await user.save();
    await sendVerification(user, token);
  }

  // Respuesta genérica para no revelar si el correo existe.
  res.json({
    ok: true,
    message: 'Si el correo existe y no está verificado, enviamos un nuevo enlace.',
  });
});

/**
 * Login. Bloquea cuentas sin verificar, inactivas o eliminadas (RF-18, RF-19).
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');

  if (!user || user.isDeleted) {
    throw ApiError.unauthorized('Correo o contraseña incorrectos');
  }

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Correo o contraseña incorrectos');

  if (!user.active) {
    throw ApiError.forbidden('Tu cuenta está desactivada. Contacta a un administrador.');
  }

  if (!user.emailVerified) {
    throw new ApiError(403, 'Debes verificar tu correo antes de iniciar sesión', [
      { field: 'email', code: 'EMAIL_NOT_VERIFIED' },
    ]);
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    ok: true,
    data: {
      token: signAccessToken(user),
      user: user.toJSON(),
      mustChangePassword: user.mustChangePassword,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: { user: req.user } });
});

const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ ok: true, message: 'Sesión cerrada' });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');
  if (!user) throw ApiError.unauthorized();

  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.badRequest('La contraseña actual no es correcta');
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('La nueva contraseña debe ser diferente a la actual');
  }

  await user.setPassword(newPassword);
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({
    ok: true,
    message: 'Contraseña actualizada correctamente',
    data: { token: signAccessToken(user) },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({
    email,
    isDeleted: false,
    active: true,
    emailVerified: true,
  }).select('+passwordResetTokenHash');

  if (user) {
    const token = generateToken();
    user.passwordResetTokenHash = hashToken(token);
    user.passwordResetExpiresAt = new Date(
      Date.now() + env.jwt.resetExpiresMinutes * 60 * 1000
    );
    await user.save();

    const tpl = emailService.templates.resetPassword({ name: user.name, token });
    await emailService.send({ to: user.email, ...tpl });
  }

  res.json({
    ok: true,
    message: 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.params.token);

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
    isDeleted: false,
  }).select('+passwordHash +passwordResetTokenHash +tokenVersion');

  if (!user) {
    throw ApiError.badRequest('El enlace de recuperación es inválido o ya venció');
  }

  await user.setPassword(req.body.password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  me,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
};
