'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Interfaz de pagos para la Fase 4.
 * Se deja preparada para conectar Wompi, Mercado Pago u otro proveedor
 * sin cambiar los controladores de pedidos.
 */
const createCheckoutSession = async (_order) => {
  throw ApiError.notImplemented('Los pagos en línea todavía no están disponibles');
};

const handleWebhook = async (_req) => {
  throw ApiError.notImplemented('Los pagos en línea todavía no están disponibles');
};

const isConfigured = () => false;

module.exports = { createCheckoutSession, handleWebhook, isConfigured };
