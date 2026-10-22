'use strict';

/* eslint-disable no-console */

const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Service = require('../models/Service');
const Product = require('../models/Product');
const SiteConfig = require('../models/SiteConfig');
const { slugify } = require('../utils/slugify');
const { generateProductCode, generateToken } = require('../utils/tokens');

const ensureAdmin = async (data, label) => {
  if (!data.email) {
    console.warn(
      `[seed] ${label}: define SEED_ADMIN_${label}_EMAIL en .env para crear este administrador`
    );
    return null;
  }

  let user = await User.findOne({ email: data.email, isDeleted: false });

  if (user) {
    if (user.role !== 'admin') {
      user.role = 'admin';
      user.emailVerified = true;
      user.active = true;
      await user.save();
      console.log(`[seed] ${data.email} promovido a administrador`);
    } else {
      console.log(`[seed] administrador existente: ${data.email}`);
    }
    return user;
  }

  const password = data.password || `Db-${generateToken(4)}`;
  user = new User({
    name: data.name,
    email: data.email,
    role: 'admin',
    emailVerified: true,
    active: true,
  });
  await user.setPassword(password);
  await user.save();

  console.log(`[seed] administrador creado: ${data.email}`);
  if (!data.password) {
    console.log(`[seed] contraseña generada para ${data.email}: ${password}`);
  }
  return user;
};

const ensureCategories = async () => {
  const names = [
    'Accesorios',
    'Periféricos',
    'Consolas',
    'Videojuegos',
    'Papelería',
    'Repuestos',
    'Impresión',
  ];

  const categories = {};
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const slug = slugify(name);
    // eslint-disable-next-line no-await-in-loop
    const category = await Category.findOneAndUpdate(
      { slug },
      {
        $setOnInsert: {
          name,
          slug,
          order: index,
          visible: true,
          description: `${name} disponibles en DOS BYTES`,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    categories[slug] = category;
  }
  console.log(`[seed] categorías listas (${Object.keys(categories).length})`);
  return categories;
};

const ensureServices = async () => {
  const services = [
    {
      name: 'Diagnóstico de consola',
      line: 'tecnico',
      price: 30000,
      priceUnit: 'servicio',
      description: 'Revisión completa y diagnóstico del equipo.',
      warrantyDays: 30,
    },
    {
      name: 'Mantenimiento de PC',
      line: 'tecnico',
      price: 80000,
      priceUnit: 'servicio',
      description: 'Limpieza, cambio de pasta térmica y revisión de software.',
      warrantyDays: 30,
    },
    {
      name: 'Reparación de laptop',
      line: 'tecnico',
      price: 120000,
      priceUnit: 'servicio',
      description: 'Reparación según diagnóstico. La cotización se confirma con el cliente.',
      warrantyDays: 90,
    },
    {
      name: 'Internet por hora',
      line: 'cibercafe',
      price: 2000,
      priceUnit: 'hora',
      description: 'Equipo con Linux o Windows, navegador y soporte.',
    },
    {
      name: 'Impresión blanco y negro',
      line: 'impresion',
      price: 300,
      priceUnit: 'pagina',
      description: 'Impresión de documentos en tamaño carta.',
    },
    {
      name: 'Impresión a color',
      line: 'impresion',
      price: 700,
      priceUnit: 'pagina',
      description: 'Impresión a color en tamaño carta.',
    },
    {
      name: 'Copias',
      line: 'impresion',
      price: 200,
      priceUnit: 'pagina',
      description: 'Fotocopias blanco y negro.',
    },
  ];

  for (let index = 0; index < services.length; index += 1) {
    const service = services[index];
    const slug = slugify(service.name);
    // eslint-disable-next-line no-await-in-loop
    await Service.findOneAndUpdate(
      { slug },
      { $setOnInsert: { ...service, slug, order: index, visible: true } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
  console.log(`[seed] servicios/tarifas listos (${services.length})`);
};

const ensureConfig = async () => {
  const adminEmails = [env.seed.admin1.email, env.seed.admin2.email].filter(Boolean);
  await SiteConfig.findOneAndUpdate(
    { key: 'main' },
    {
      $setOnInsert: {
        key: 'main',
        businessName: 'DOS BYTES',
        description:
          'Servicio técnico, cibercafé, papelería y accesorios de tecnología en un solo lugar.',
        schedule: 'Lunes a sábado, 9:00 a 19:00',
        adminEmails,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log('[seed] configuración del sitio lista');
};

const ensureDemoProducts = async (categories) => {
  const demo = [
    {
      name: 'Control inalámbrico para consola',
      category: 'accesorios',
      price: 95000,
      compareAtPrice: 120000,
      stock: 8,
      featured: true,
      isOffer: true,
      description: 'Control inalámbrico compatible con consolas modernas.',
    },
    {
      name: 'Audífonos gamer con micrófono',
      category: 'perifericos',
      price: 85000,
      compareAtPrice: 0,
      stock: 12,
      featured: true,
      description: 'Audífonos con sonido envolvente y micrófono ajustable.',
    },
    {
      name: 'Teclado mecánico RGB',
      category: 'perifericos',
      price: 145000,
      compareAtPrice: 170000,
      stock: 5,
      isOffer: true,
      description: 'Teclado mecánico con iluminación RGB y switches táctiles.',
    },
    {
      name: 'Cuaderno universitario 100 hojas',
      category: 'papeleria',
      price: 6500,
      stock: 40,
      description: 'Cuaderno cosido de 100 hojas, ideal para clases.',
    },
    {
      name: 'Mouse inalámbrico',
      category: 'accesorios',
      price: 35000,
      stock: 20,
      featured: true,
      description: 'Mouse inalámbrico ergonómico con receptor USB.',
    },
    {
      name: 'Videojuego de aventura',
      category: 'videojuegos',
      price: 180000,
      stock: 3,
      description: 'Título de aventura para consola, licencia legítima.',
    },
  ];

  for (const item of demo) {
    const slug = slugify(item.name);
    const exists = await Product.findOne({ slug });
    if (exists) continue;

    // eslint-disable-next-line no-await-in-loop
    await Product.create({
      code: generateProductCode(),
      name: item.name,
      slug,
      description: item.description,
      category: categories[item.category]._id,
      price: item.price,
      compareAtPrice: item.compareAtPrice || 0,
      isOffer: Boolean(item.isOffer),
      featured: Boolean(item.featured),
      stock: item.stock,
      visible: true,
      images: [
        {
          url: `https://placehold.co/600x600/f3f4f6/111827?text=${encodeURIComponent('DOS BYTES')}`,
          publicId: '',
          alt: item.name,
          order: 0,
        },
      ],
    });
  }
  console.log(`[seed] productos de demostración listos (${demo.length})`);
};

const run = async () => {
  await connectDB();

  await ensureAdmin(env.seed.admin1, '1');
  await ensureAdmin(env.seed.admin2, '2');

  const categories = await ensureCategories();
  await ensureServices();
  await ensureConfig();

  if (process.argv.includes('--demo')) {
    await ensureDemoProducts(categories);
  }

  console.log('[seed] terminado');
  await disconnectDB();
};

run().catch(async (err) => {
  console.error('[seed] error:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
