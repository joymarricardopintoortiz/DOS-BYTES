'use strict';

const mongoose = require('mongoose');

const router = require('express').Router();

router.get('/health', (req, res) => {
  const states = ['desconectado', 'conectado', 'conectando', 'desconectando'];
  res.json({
    ok: true,
    data: {
      status: 'ok',
      database: states[mongoose.connection.readyState] || 'desconocido',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/home', require('./home.routes'));
router.use('/users', require('./user.routes'));
router.use('/categories', require('./category.routes'));
router.use('/products', require('./product.routes'));
router.use('/services', require('./service.routes'));
router.use('/service-orders', require('./serviceOrder.routes'));
router.use('/orders', require('./order.routes'));
router.use('/reviews', require('./review.routes'));
router.use('/favorites', require('./favorite.routes'));
router.use('/questions', require('./question.routes'));
router.use('/config', require('./config.routes'));
router.use('/uploads', require('./upload.routes'));
router.use('/stats', require('./stats.routes'));

module.exports = router;
