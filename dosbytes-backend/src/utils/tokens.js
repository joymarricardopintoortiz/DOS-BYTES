'use strict';

const crypto = require('crypto');

const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Código legible y difícil de adivinar (sin caracteres ambiguos como 0/O/1/I).
 */
const generateCode = (prefix = 'DB', length = 6) => {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix}-${out}`;
};

const generateProductCode = () => generateCode('DB', 6);
const generateServiceOrderCode = () => generateCode('SRV', 6);
const generateOrderCode = () => generateCode('PED', 6);

const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

module.exports = {
  generateToken,
  hashToken,
  generateCode,
  generateProductCode,
  generateServiceOrderCode,
  generateOrderCode,
  timingSafeEqual,
};
