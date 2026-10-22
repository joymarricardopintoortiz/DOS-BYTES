'use strict';

class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }

  static badRequest(message = 'Solicitud inválida', errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'No autenticado') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'No tienes permisos para realizar esta acción') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }

  static conflict(message = 'El recurso ya existe') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Datos inválidos', errors) {
    return new ApiError(422, message, errors);
  }

  static tooMany(message = 'Demasiadas solicitudes, intenta más tarde') {
    return new ApiError(429, message);
  }

  static notImplemented(message = 'Función no disponible todavía') {
    return new ApiError(501, message);
  }

  static serviceUnavailable(message = 'Servicio no disponible') {
    return new ApiError(503, message);
  }
}

module.exports = ApiError;
