'use strict';

const Product = require('../models/Product');
const Category = require('../models/Category');
const Service = require('../models/Service');
const SiteConfig = require('../models/SiteConfig');
const asyncHandler = require('../utils/asyncHandler');

const groupByLine = (services) =>
  services.reduce((groups, service) => {
    if (!groups[service.line]) groups[service.line] = [];
    groups[service.line].push(service);
    return groups;
  }, {});

/**
 * Portada tipo Mercado Libre: todo lo necesario en una sola petición (RNF-01).
 */
const getHome = asyncHandler(async (_req, res) => {
  const visibleProducts = { visible: true };

  const [config, categories, services, offers, featured, newest, topRated] = await Promise.all([
    SiteConfig.getConfig(),
    Category.aggregate([
      { $match: { visible: true } },
      {
        $lookup: {
          from: 'products',
          let: { categoryId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$category', '$$categoryId'] },
                    { $eq: ['$visible', true] },
                  ],
                },
              },
            },
            { $count: 'n' },
          ],
          as: 'productCounts',
        },
      },
      {
        $addFields: {
          productCount: { $ifNull: [{ $arrayElemAt: ['$productCounts.n', 0] }, 0] },
        },
      },
      { $project: { productCounts: 0 } },
      { $sort: { order: 1, name: 1 } },
    ]),
    Service.find({ visible: true }).sort({ order: 1, name: 1 }),
    Product.find({ ...visibleProducts, isOffer: true }).sort({ createdAt: -1 }).limit(8),
    Product.find({ ...visibleProducts, featured: true }).sort({ soldCount: -1 }).limit(8),
    Product.find(visibleProducts).sort({ createdAt: -1 }).limit(8),
    Product.find({ ...visibleProducts, ratingCount: { $gt: 0 } })
      .sort({ ratingAvg: -1, ratingCount: -1 })
      .limit(8),
  ]);

  res.json({
    ok: true,
    data: {
      config,
      categories,
      services: groupByLine(services),
      sections: {
        offers,
        featured,
        newest,
        topRated,
      },
    },
  });
});

module.exports = { getHome };
