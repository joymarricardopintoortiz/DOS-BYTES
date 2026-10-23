'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./src/config/env');
const apiRoutes = require('./src/routes');
const { notFound, errorHandler } = require('./src/middlewares/error.middleware');
const { globalLimiter } = require('./src/middlewares/rateLimit.middleware');
const ApiError = require('./src/utils/ApiError');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Cabeceras de seguridad. En producción se activa la política CSP.
app.use(
  helmet({
    contentSecurityPolicy: env.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", env.clientUrl],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Orígenes que pueden llamar a la API (CLIENT_URL y APP_URL del entorno).
const allowedOrigins = new Set([env.clientUrl, env.appUrl].filter(Boolean));

// Opciones de CORS: solo se aceptan los orígenes permitidos.
const corsOptions = {
  origin(origin, callback) {
    // Sin origen: peticiones del mismo sitio, curl o apps móviles.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(ApiError.forbidden('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// CORRECCIÓN (pantalla en blanco en Render):
// Antes era app.use(cors({...})) y se aplicaba a TODO el sitio, incluidos los
// archivos /assets (.js y .css del frontend). El navegador manda la cabecera
// Origin en esos archivos y, si no coincidía con CLIENT_URL/APP_URL, el
// servidor respondía 403 (JSON) y la página quedaba en blanco.
// Ahora el CORS solo se aplica a la API; los archivos estáticos no se bloquean.
app.use('/api', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Registro simple de peticiones en desarrollo.
if (!env.isProd) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
}

// Imágenes locales cuando no hay Cloudinary configurado (solo desarrollo).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de la API (con límite global de peticiones).
app.use('/api', globalLimiter, apiRoutes);

// 404 en formato JSON para rutas de API desconocidas.
app.use('/api', notFound);

// Frontend compilado (Vue + Quasar) servido por el mismo Web Service.
const dist = path.join(__dirname, '..', 'dosbytes-frontend', 'dist');
const indexFile = path.join(dist, 'index.html');
if (fs.existsSync(indexFile)) {
  // Archivos estáticos del frontend (/assets, favicon, etc.).
  app.use(express.static(dist));

  // Cualquier otra ruta devuelve index.html para que Vue Router la resuelva.
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(indexFile);
  });
} else {
  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('text/plain')
      .send('DOS BYTES API funcionando. El frontend aún no está compilado en dist/.');
  });
}

app.use(errorHandler);

module.exports = app;