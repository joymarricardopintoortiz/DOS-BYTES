'use strict';

const SiteConfig = require('../models/SiteConfig');
const asyncHandler = require('../utils/asyncHandler');

const get = asyncHandler(async (_req, res) => {
  const config = await SiteConfig.getConfig();
  res.json({ ok: true, data: { config } });
});

const update = asyncHandler(async (req, res) => {
  const config = await SiteConfig.getConfig();

  const editable = [
    'businessName',
    'logoUrl',
    'description',
    'address',
    'schedule',
    'phone',
    'employeeEmail',
    'banners',
  ];

  editable.forEach((field) => {
    if (req.body[field] !== undefined) config[field] = req.body[field];
  });

  if (req.body.adminEmails !== undefined) {
    // Los dos correos de los fundadores, sin duplicados.
    config.adminEmails = [...new Set(req.body.adminEmails.filter(Boolean))].slice(0, 2);
  }

  config.updatedBy = req.user._id;
  await config.save();

  res.json({ ok: true, message: 'Configuración actualizada', data: { config } });
});

module.exports = { get, update };
