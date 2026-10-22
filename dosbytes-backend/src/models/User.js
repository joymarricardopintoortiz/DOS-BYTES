'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const ROLES = ['customer', 'employee', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 180 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'customer', index: true },
    phone: { type: String, trim: true, maxlength: 30, default: '' },

    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationExpiresAt: { type: Date },
    verificationSentAt: { type: Date },

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date },

    mustChangePassword: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    tokenVersion: { type: Number, default: 0, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.verificationTokenHash;
        delete ret.passwordResetTokenHash;
        delete ret.tokenVersion;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// El correo es único SOLO entre cuentas activas: permite re-registro tras eliminar (RF-24).
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false }, name: 'email_unique_active' }
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, env.bcryptRounds);
  return this.passwordHash;
};

/**
 * Anonimiza los datos personales conservando el _id para no romper
 * referencias en órdenes, opiniones y preguntas (RF-27).
 */
userSchema.methods.anonymize = function anonymize() {
  this.name = 'Cuenta eliminada';
  this.email = `eliminado_${this._id}@dosbytes.invalid`;
  this.phone = '';
  this.emailVerified = false;
  this.active = false;
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.mustChangePassword = false;
  this.tokenVersion = (this.tokenVersion || 0) + 1;
  this.verificationTokenHash = undefined;
  this.verificationExpiresAt = undefined;
  this.passwordResetTokenHash = undefined;
  this.passwordResetExpiresAt = undefined;
  return this;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
