'use strict';

const ApiError = require('../utils/ApiError');

const allow = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('No autenticado'));
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('No tienes permisos para realizar esta acción'));
  }
  return next();
};

const allowStaff = allow('employee', 'admin');
const allowAdmin = allow('admin');
const allowCustomer = allow('customer');

/**
 * Bloquea el resto de la API mientras el empleado no cambie
 * su contraseña temporal (RF-19).
 */
const requirePasswordChanged = (req, _res, next) => {
  if (req.user?.mustChangePassword) {
    return next(
      new ApiError(
        403,
        'Debes cambiar tu contraseña temporal antes de continuar',
        [{ field: 'password', code: 'PASSWORD_CHANGE_REQUIRED' }]
      )
    );
  }
  return next();
};

module.exports = { allow, allowStaff, allowAdmin, allowCustomer, requirePasswordChanged };
