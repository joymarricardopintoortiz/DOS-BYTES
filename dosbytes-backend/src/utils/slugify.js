'use strict';

const slugify = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/**
 * Devuelve un slug libre para el modelo dado, agregando -2, -3...
 */
const uniqueSlug = async (Model, base, excludeId = null) => {
  const root = slugify(base) || 'item';
  let candidate = root;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    counter += 1;
    candidate = `${root}-${counter}`.slice(0, 90);
  }
  return candidate;
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { slugify, uniqueSlug, escapeRegex };
