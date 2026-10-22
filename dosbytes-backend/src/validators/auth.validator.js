'use strict';

const { body, param } = require('express-validator');

const emailRule = (field = 'email') =>
  body(field).trim().isEmail().withMessage('Correo inválido').normalizeEmail();

const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('La contraseña debe tener entre 8 y 72 caracteres');

const register = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('El nombre es obligatorio'),
  emailRule(),
  passwordRule(),
  body('phone').optional().trim().isLength({ max: 30 }),
];

const login = [emailRule(), body('password').isString().notEmpty().withMessage('La contraseña es obligatoria')];

const verify = [param('token').isString().isLength({ min: 20 }).withMessage('Token inválido')];

const resendVerification = [emailRule()];

const forgotPassword = [emailRule()];

const resetPassword = [
  param('token').isString().isLength({ min: 20 }).withMessage('Token inválido'),
  passwordRule('password'),
];

const changePassword = [
  body('currentPassword').isString().notEmpty().withMessage('La contraseña actual es obligatoria'),
  passwordRule('newPassword'),
];

const logout = [];

module.exports = {
  register,
  login,
  verify,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
};
