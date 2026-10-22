'use strict';

const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const ServiceOrder = require('../models/ServiceOrder');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Métricas del panel de administración.
 */
const getStats = asyncHandler(async (_req, res) => {
  const [
    products,
    lowStock,
    customers,
    employees,
    pendingServiceOrders,
    pendingOrders,
    revenueResult,
    serviceStatusRows,
  ] = await Promise.all([
    Product.countDocuments({ visible: true }),
    Product.countDocuments({
      visible: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }),
    User.countDocuments({ role: 'customer', active: true, isDeleted: false }),
    User.countDocuments({ role: 'employee', active: true, isDeleted: false }),
    ServiceOrder.countDocuments({ status: { $nin: ['entregado', 'no_reparable'] } }),
    Order.countDocuments({ status: { $in: ['reservado', 'listo'] } }),
    Order.aggregate([
      { $match: { status: 'entregado' } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    ServiceOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const revenue = revenueResult[0] || { total: 0, count: 0 };

  res.json({
    ok: true,
    data: {
      products,
      lowStock,
      customers,
      employees,
      pendingServiceOrders,
      pendingOrders,
      deliveredOrders: revenue.count,
      revenue: revenue.total,
      serviceOrdersByStatus: serviceStatusRows.map((row) => ({
        status: row._id,
        count: row.count,
      })),
    },
  });
});

module.exports = { getStats };
