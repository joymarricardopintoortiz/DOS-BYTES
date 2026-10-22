'use strict';

/* eslint-disable no-console */

/**
 * Pruebas de humo contra un servidor en ejecución.
 * Uso: npm run smoke   (o BASE_URL=https://mi-servicio.onrender.com npm run smoke)
 */

const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminEmail = process.env.SEED_ADMIN_1_EMAIL || '';
const adminPassword = process.env.SEED_ADMIN_1_PASSWORD || '';

let failures = 0;

const request = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
};

const check = (name, condition, detail = '') => {
  if (condition) {
    console.log(`  OK   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`);
  }
};

const run = async () => {
  console.log(`Pruebas de humo contra ${baseUrl}\n`);

  const health = await request('GET', '/api/health');
  check('health responde 200', health.status === 200, `status ${health.status}`);
  check('base de datos conectada', health.data?.data?.database === 'conectado');

  const home = await request('GET', '/api/home');
  check('home responde 200', home.status === 200, `status ${home.status}`);
  check('home trae configuración', Boolean(home.data?.data?.config));
  check('home trae categorías', Array.isArray(home.data?.data?.categories));
  check('home trae secciones', Boolean(home.data?.data?.sections));

  const categories = await request('GET', '/api/categories');
  check('categorías responden 200', categories.status === 200);

  const services = await request('GET', '/api/services');
  check('servicios responden 200', services.status === 200);

  const products = await request('GET', '/api/products?limit=1');
  check('productos responden 200', products.status === 200);

  const suggestions = await request('GET', '/api/products/suggestions?q=control');
  check('sugerencias responden 200', suggestions.status === 200);

  const config = await request('GET', '/api/config');
  check('configuración responde 200', config.status === 200);
  check(
    'máximo dos correos de administrador',
    (config.data?.data?.config?.adminEmails || []).length <= 2
  );

  if (adminEmail && adminPassword) {
    console.log('\n  Probando sesión de administrador...');
    const login = await request('POST', '/api/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    check('login admin 200', login.status === 200, `status ${login.status}`);

    if (login.status === 200) {
      const token = login.data.data.token;
      const me = await request('GET', '/api/auth/me', { token });
      check('auth/me 200', me.status === 200);

      const stats = await request('GET', '/api/stats', { token });
      check('stats 200', stats.status === 200);

      const lowStock = await request('GET', '/api/products/low-stock/list', { token });
      check('stock bajo 200', lowStock.status === 200);
    }
  } else {
    console.log('\n  (Sin credenciales de administrador: se omiten pruebas privadas)');
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} prueba(s) fallaron`);
    process.exitCode = 1;
  } else {
    console.log('Todas las pruebas pasaron');
  }
};

run().catch((err) => {
  console.error('Error ejecutando pruebas:', err);
  process.exitCode = 1;
});
