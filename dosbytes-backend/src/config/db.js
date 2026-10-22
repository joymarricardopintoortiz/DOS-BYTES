'use strict';

const mongoose = require('mongoose');
const env = require('./env');

// No se activa sanitizeFilter global: neutraliza los operadores internos que
// usa la API ($gte, $in, $or...). Por eso todos los filtros se construyen con
// campos y valores controlados por el servidor, nunca con req.query directo.
mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
    });
    console.log(`MongoDB conectado (${mongoose.connection.name})`);
    return mongoose.connection;
  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message);
    throw err;
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
};

module.exports = { connectDB, disconnectDB };
