'use strict';

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 140, default: '' },
    subtitle: { type: String, trim: true, maxlength: 240, default: '' },
    image: { type: String, trim: true, default: '' },
    link: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const siteConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },

    businessName: { type: String, default: 'DOS BYTES', trim: true, maxlength: 80 },
    logoUrl: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true, maxlength: 500 },

    address: { type: String, default: '', trim: true, maxlength: 240 },
    schedule: { type: String, default: '', trim: true, maxlength: 240 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },

    // Los dos correos de los fundadores (RF-21).
    adminEmails: {
      type: [{ type: String, lowercase: true, trim: true }],
      default: [],
      validate: {
        validator: (value) => !value || value.length <= 2,
        message: 'Solo se permiten dos correos de administrador',
      },
    },
    employeeEmail: { type: String, default: '', lowercase: true, trim: true },

    banners: { type: [bannerSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

siteConfigSchema.statics.getConfig = async function getConfig() {
  let config = await this.findOne({ key: 'main' });
  if (!config) config = await this.create({ key: 'main' });
  return config;
};

const SiteConfig = mongoose.model('SiteConfig', siteConfigSchema);

module.exports = SiteConfig;
