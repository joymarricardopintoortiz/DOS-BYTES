'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getTokenFromHeader = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
};

const resolveUser = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    throw ApiError.unauthorized('Sesión inválida o expirada');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.isDeleted) throw ApiError.unauthorized('Sesión inválida o expirada');
  if (!user.active) throw ApiError.forbidden('Tu cuenta está desactivada');
  if (!user.emailVerified) throw ApiError.forbidden('Debes verificar tu correo electrónico');

  // Invalida tokens viejos cuando cambia la contraseña o se cierra sesión global.
  if ((payload.v || 0) !== (user.tokenVersion || 0)) {
    throw ApiError.unauthorized('La sesión expiró, inicia sesión de nuevo');
  }

  return user;
};

const authenticate = asyncHandler(async (req, _res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) throw ApiError.unauthorized('No autenticado');
  req.user = await resolveUser(token);
  next();
});

/**
 * Para rutas públicas que cambian de comportamiento si hay sesión
 * (por ejemplo, isFavorite en el detalle de un producto).
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await resolveUser(token);
  } catch {
    req.user = null;
  }
  return next();
});

module.exports = { authenticate, optionalAuth, getTokenFromHeader };
