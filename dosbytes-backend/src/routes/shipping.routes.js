'use strict';

const router = require('express').Router();
const shipping = require('../services/shipping');

// Tarifas de envío: una sola fuente de verdad para el checkout y el servidor.
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    data: {
      departments: shipping.DEPARTMENTS,
      zones: shipping.ZONES.map(({ id, label, cost, departments }) => ({
        id,
        label,
        cost,
        departments,
      })),
      freeShippingMin: shipping.FREE_SHIPPING_MIN,
    },
  });
});

module.exports = router;
