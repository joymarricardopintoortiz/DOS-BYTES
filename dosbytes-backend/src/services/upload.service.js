'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const LOCAL_DIR = path.resolve(__dirname, '..', '..', 'uploads');

const extensionFromMime = (mime) => {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
};

const signParams = (params) => {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(`${sorted}${env.cloudinary.apiSecret}`)
    .digest('hex');
};

const isLocal = (publicId = '') => publicId.startsWith('local:');

const saveLocal = async (buffer, mimetype) => {
  if (env.isProd) {
    throw ApiError.serviceUnavailable(
      'El almacenamiento de imágenes no está configurado (Cloudinary)'
    );
  }
  await fs.promises.mkdir(LOCAL_DIR, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extensionFromMime(
    mimetype
  )}`;
  await fs.promises.writeFile(path.join(LOCAL_DIR, filename), buffer);
  return {
    url: `/uploads/${filename}`,
    publicId: `local:${filename}`,
    width: null,
    height: null,
    storage: 'local',
  };
};

/**
 * Sube una imagen a Cloudinary con firma generada en el servidor.
 * En desarrollo, si no hay credenciales, guarda en disco local.
 */
const uploadImage = async (buffer, { mimetype, folder } = {}) => {
  if (!buffer || !buffer.length) throw ApiError.badRequest('No se recibió ninguna imagen');

  if (!env.cloudinary.configured) {
    return saveLocal(buffer, mimetype);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const targetFolder = folder || env.cloudinary.folder;
  const params = { folder: targetFolder, timestamp };
  const signature = signParams(params);

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimetype || 'image/jpeg' }), 'image');
  form.append('api_key', env.cloudinary.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', targetFolder);
  form.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    { method: 'POST', body: form }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[cloudinary] error de subida:', data);
    throw ApiError.serviceUnavailable('No se pudo subir la imagen');
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width || null,
    height: data.height || null,
    storage: 'cloudinary',
  };
};

const deleteImage = async (publicId) => {
  if (!publicId) return { ok: true, skipped: true };

  if (isLocal(publicId)) {
    const filename = publicId.replace('local:', '');
    const filePath = path.join(LOCAL_DIR, path.basename(filename));
    await fs.promises.unlink(filePath).catch(() => {});
    return { ok: true };
  }

  if (!env.cloudinary.configured) return { ok: true, skipped: true };

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const signature = signParams(params);

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', env.cloudinary.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/destroy`,
    { method: 'POST', body: form }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[cloudinary] error al eliminar:', detail);
    return { ok: false };
  }

  return { ok: true };
};

module.exports = { uploadImage, deleteImage, LOCAL_DIR };
