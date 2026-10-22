'use strict';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPagination = (query = {}, defaults = {}) => {
  const page = parsePositiveInt(query.page, 1);
  const defaultLimit = defaults.limit || 20;
  const maxLimit = defaults.maxLimit || 100;
  const limit = Math.min(parsePositiveInt(query.limit, defaultLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const buildMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

module.exports = { getPagination, buildMeta };
