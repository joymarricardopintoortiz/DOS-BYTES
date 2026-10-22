'use strict';

/**
 * Envuelve un controlador async para que cualquier rechazo llegue al
 * manejador central de errores de Express 5.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
