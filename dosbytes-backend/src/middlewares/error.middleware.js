'use strict';

const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let errors = err.errors;

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Datos inválidos';
    errors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  // ObjectId inválido
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Valor inválido para ${err.path}`;
  }

  // Índice único duplicado
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'campo';
    message = `Ya existe un registro con ese ${field}`;
  }

  // Errores de Multer
  if (err.name === 'MulterError') {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `La imagen supera el límite de ${env.upload.maxMb} MB`
        : `Error al subir el archivo: ${err.message}`;
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'La sesión expiró, inicia sesión de nuevo';
  }

  // JSON mal formado en el cuerpo de la petición
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'El cuerpo de la petición no es JSON válido';
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = { ok: false, message };
  if (errors) body.errors = errors;
  if (!env.isProd && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
