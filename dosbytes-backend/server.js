'use strict';

const env = require('./src/config/env');
const app = require('./app');
const { connectDB, disconnectDB } = require('./src/config/db');

let server;

const start = async () => {
  await connectDB();
  server = app.listen(env.port, () => {
    console.log(`Servidor en puerto ${env.port} (${env.nodeEnv})`);
  });
};

const shutdown = async (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada sin manejar:', reason);
});

start().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
