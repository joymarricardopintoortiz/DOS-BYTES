'use strict';

const router = require('express').Router();
const { getStats } = require('../controllers/stats.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowStaff, requirePasswordChanged } = require('../middlewares/role.middleware');

router.get('/', authenticate, requirePasswordChanged, allowStaff, getStats);

module.exports = router;
