'use strict';

/* eslint-disable no-console */

/**
 * Prueba integral de la API contra un servidor en ejecución.
 * Crea datos temporales identificados con "qa-<timestamp>" y los elimina al final.
 *
 * Uso: npm run test:e2e
 */

const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Question = require('../models/Question');
const Order = require('../models/Order');
const ServiceOrder = require('../models/ServiceOrder');
const DeletionReason = require('../models/DeletionReason');
const { generateToken, hashToken } = require('../utils/tokens');

const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const marker = `qa-${suffix}`;

const adminEmail = `qa.admin.${suffix}@dosbytes.invalid`;
const customerEmail = `qa.user.${suffix}@dosbytes.invalid`;
const employeeEmail = `qa.employee.${suffix}@dosbytes.invalid`;
const password = 'QaPass1234!';

const ids = {
  admin: null,
  customer: null,
  employee: null,
  reRegistered: null,
};

let failures = 0;
const created = { productCode: null, serviceCode: null, orderCode: null };

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

const section = (title) => console.log(`\n${title}`);

const createUser = async ({ email, name, role }) => {
  const user = new User({ name, email, role, emailVerified: true, active: true });
  await user.setPassword(password);
  await user.save();
  return user;
};

const login = (email, pass = password) =>
  request('POST', '/api/auth/login', { body: { email, password: pass } });

const cleanup = async () => {
  console.log('\nLimpiando datos de prueba...');

  if (created.orderCode) await Order.deleteMany({ code: created.orderCode });
  if (ids.customer) await Order.deleteMany({ customer: ids.customer });

  if (created.serviceCode) await ServiceOrder.deleteMany({ code: created.serviceCode });
  if (ids.customer) await ServiceOrder.deleteMany({ customer: ids.customer });
  await ServiceOrder.deleteMany({ 'customerSnapshot.email': customerEmail });

  if (ids.customer) {
    await Review.deleteMany({ user: ids.customer });
    await Favorite.deleteMany({ user: ids.customer });
    await Question.deleteMany({ user: ids.customer });
  }
  if (created.productCode) {
    const product = await Product.findOne({ code: created.productCode }).select('_id');
    if (product) {
      await Review.deleteMany({ product: product._id });
      await Question.deleteMany({ product: product._id });
      await Favorite.deleteMany({ product: product._id });
      await Product.deleteOne({ _id: product._id });
    }
  }

  await DeletionReason.deleteMany({ comment: marker });
  const userIds = [ids.admin, ids.customer, ids.employee, ids.reRegistered].filter(Boolean);
  if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
  await User.deleteMany({ email: { $in: [adminEmail, employeeEmail] } });
  await User.deleteMany({ email: customerEmail });

  console.log('Datos de prueba eliminados');
};

const run = async () => {
  console.log(`Prueba integral contra ${baseUrl}\nSufijo: ${suffix}`);
  await connectDB();

  const admin = await createUser({ email: adminEmail, name: 'QA Admin', role: 'admin' });
  ids.admin = admin._id;
  const adminLogin = await login(adminEmail);
  check('login de administrador', adminLogin.status === 200, `status ${adminLogin.status}`);
  const adminToken = adminLogin.data?.data?.token;

  section('Catálogo y códigos de producto');
  const categories = await request('GET', '/api/categories');
  const category = categories.data?.data?.categories?.[0];
  check('hay una categoría para la prueba', Boolean(category));

  const productCode = `QA-${suffix.toUpperCase()}`;
  const productRes = await request('POST', '/api/products', {
    token: adminToken,
    body: {
      code: productCode,
      name: `Producto ${marker}`,
      description: 'Producto temporal de prueba',
      category: category?._id,
      price: 10000,
      compareAtPrice: 15000,
      stock: 5,
      isOffer: true,
      featured: true,
    },
  });
  check('crear producto con código', productRes.status === 201, `status ${productRes.status}`);
  const product = productRes.data?.data?.product;
  created.productCode = productCode;
  check('el producto nace con código único', product?.code === productCode);
  check('descuento calculado', product?.discountPercent === 33);

  const search = await request('GET', `/api/products?q=${productCode}`);
  check('búsqueda por código', search.data?.data?.products?.length === 1);

  const byCode = await request('GET', `/api/products/code/${productCode}`);
  check('detalle por código', byCode.status === 200);

  const bySlug = await request('GET', `/api/products/${product?.slug}`);
  check('detalle por slug', bySlug.status === 200);
  check('producto sin opiniones', bySlug.data?.data?.rating?.count === 0);

  const suggestions = await request('GET', `/api/products/suggestions?q=${productCode}`);
  check('autocompletado por código', suggestions.data?.data?.products?.length === 1);

  section('Registro, verificación y sesión de cliente');
  const register = await request('POST', '/api/auth/register', {
    body: { name: 'QA Cliente', email: customerEmail, password, phone: '3000000000' },
  });
  check('registro público', register.status === 201, `status ${register.status}`);

  const pendingUser = await User.findOne({ email: customerEmail });
  ids.customer = pendingUser._id;

  const plainToken = generateToken();
  pendingUser.verificationTokenHash = hashToken(plainToken);
  pendingUser.verificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await pendingUser.save();

  const blockedLogin = await login(customerEmail);
  check('login bloqueado sin verificar', blockedLogin.status === 403);

  const verified = await request('GET', `/api/auth/verify/${plainToken}`);
  check('verificación de correo', verified.status === 200, `status ${verified.status}`);

  const customerLogin = await login(customerEmail);
  check('login de cliente verificado', customerLogin.status === 200);
  const customerToken = customerLogin.data?.data?.token;

  const profile = await request('PATCH', '/api/users/me', {
    token: customerToken,
    body: { name: 'QA Cliente Actualizado' },
  });
  check('actualizar perfil', profile.status === 200);

  section('Opiniones, favoritos y preguntas');
  const reviewCreate = await request('POST', `/api/products/${product.slug}/reviews`, {
    token: customerToken,
    body: { rating: 5, comment: 'Excelente producto' },
  });
  check('crear opinión', reviewCreate.status === 201, `status ${reviewCreate.status}`);
  const reviewId = reviewCreate.data?.data?.review?._id;

  const duplicate = await request('POST', `/api/products/${product.slug}/reviews`, {
    token: customerToken,
    body: { rating: 3, comment: 'Repetida' },
  });
  check('una opinión por producto (409)', duplicate.status === 409);

  const reviewUpdate = await request('PATCH', `/api/reviews/${reviewId}`, {
    token: customerToken,
    body: { rating: 4, comment: 'Buena relación precio calidad' },
  });
  check('editar propia opinión', reviewUpdate.status === 200);

  const reviewList = await request('GET', `/api/products/${product.slug}/reviews`);
  check('promedio recalculado', reviewList.data?.data?.summary?.average === 4);
  check('desglose de estrellas', reviewList.data?.data?.summary?.breakdown?.['4'] === 1);

  const favoriteAdd = await request('POST', '/api/favorites', {
    token: customerToken,
    body: { productId: product._id },
  });
  check('agregar favorito', favoriteAdd.status === 201);

  const favoriteList = await request('GET', '/api/users/me/favorites', {
    token: customerToken,
  });
  check('listar favoritos', favoriteList.data?.data?.favorites?.length === 1);

  const favoriteRemove = await request('DELETE', `/api/favorites/${product._id}`, {
    token: customerToken,
  });
  check('eliminar favorito', favoriteRemove.status === 200);

  const questionCreate = await request('POST', `/api/products/${product.slug}/questions`, {
    token: customerToken,
    body: { text: '¿Tiene garantía?' },
  });
  check('crear pregunta', questionCreate.status === 201);
  const questionId = questionCreate.data?.data?.question?._id;

  const answer = await request('PATCH', `/api/questions/${questionId}/answer`, {
    token: adminToken,
    body: { answer: 'Sí, 30 días de garantía.' },
  });
  check('responder pregunta como admin', answer.status === 200);

  const publicQuestions = await request('GET', `/api/products/${product.slug}/questions`);
  check(
    'pregunta visible con respuesta',
    publicQuestions.data?.data?.questions?.[0]?.answer?.text?.includes('garantía')
  );

  section('Ordenes de servicio');
  const serviceCreate = await request('POST', '/api/service-orders', {
    body: {
      customerSnapshot: {
        name: 'QA Cliente',
        email: customerEmail,
        phone: '3000000000',
      },
      equipment: { type: 'laptop', brand: 'Dell', model: 'Latitude', serial: marker },
      reportedIssue: 'No enciende después de una caída',
    },
  });
  check('crear orden desde la web', serviceCreate.status === 201, `status ${serviceCreate.status}`);
  const serviceCode = serviceCreate.data?.data?.code;
  created.serviceCode = serviceCode;

  const track = await request('GET', `/api/service-orders/track/${serviceCode}`);
  check('consulta pública por código', track.status === 200);
  check('seguimiento sin datos personales', !track.data?.data?.order?.customerSnapshot);

  const staffList = await request('GET', '/api/service-orders?status=recibido', {
    token: adminToken,
  });
  const serviceOrder = staffList.data?.data?.orders?.find((item) => item.code === serviceCode);
  check('orden visible en el panel', Boolean(serviceOrder));
  const serviceId = serviceOrder?._id;

  const diagnose = await request('PATCH', `/api/service-orders/${serviceId}/status`, {
    token: adminToken,
    body: { status: 'diagnostico', note: 'En revisión' },
  });
  check('pasar a diagnóstico', diagnose.status === 200);

  const quote = await request('PATCH', `/api/service-orders/${serviceId}`, {
    token: adminToken,
    body: { diagnosis: 'Corto en la placa', quote: { amount: 50000, notes: 'Cambio de placa' } },
  });
  check('registrar diagnóstico y cotización', quote.status === 200);

  await request('PATCH', `/api/service-orders/${serviceId}/status`, {
    token: adminToken,
    body: { status: 'esperando_aprobacion' },
  });

  const decision = await request('POST', `/api/service-orders/track/${serviceCode}/quote`, {
    body: { decision: 'aprobada' },
  });
  check('cliente aprueba cotización', decision.status === 200);

  const warranty = await request('PATCH', `/api/service-orders/${serviceId}`, {
    token: adminToken,
    body: { warranty: { days: 30 } },
  });
  check('registrar garantía', warranty.status === 200);

  const ready = await request('PATCH', `/api/service-orders/${serviceId}/status`, {
    token: adminToken,
    body: { status: 'listo' },
  });
  check('equipo listo', ready.status === 200);
  check(
    'garantía con vencimiento',
    Boolean(ready.data?.data?.order?.warranty?.expiresAt)
  );

  const deliveredService = await request('PATCH', `/api/service-orders/${serviceId}/status`, {
    token: adminToken,
    body: { status: 'entregado' },
  });
  check('equipo entregado', deliveredService.status === 200);

  section('Pedidos e inventario');
  const orderCreate = await request('POST', '/api/orders', {
    token: customerToken,
    body: { items: [{ product: product._id, quantity: 2 }] },
  });
  check('crear pedido', orderCreate.status === 201, `status ${orderCreate.status}`);
  const order = orderCreate.data?.data?.order;
  created.orderCode = order?.code;
  check('total calculado', order?.total === 20000);

  const afterOrder = await request('GET', `/api/products/code/${productCode}`);
  check('stock reservado', afterOrder.data?.data?.product?.stock === 3);

  await request('PATCH', `/api/orders/${order._id}/status`, {
    token: adminToken,
    body: { status: 'listo' },
  });
  const deliveredOrder = await request('PATCH', `/api/orders/${order._id}/status`, {
    token: adminToken,
    body: { status: 'entregado' },
  });
  check('pedido entregado', deliveredOrder.status === 200);

  const sold = await request('GET', `/api/products/code/${productCode}`);
  check('contador de vendidos', sold.data?.data?.product?.soldCount === 2);

  section('Empleados y permisos');
  const employeeCreate = await request('POST', '/api/users/employees', {
    token: adminToken,
    body: { name: 'QA Empleado', email: employeeEmail, tempPassword: 'Temporal1234' },
  });
  check('admin crea empleado', employeeCreate.status === 201);
  ids.employee = employeeCreate.data?.data?.user?._id;

  const employeeLogin = await login(employeeEmail, 'Temporal1234');
  check('empleado inicia con temporal', employeeLogin.status === 200);
  check('debe cambiar contraseña', employeeLogin.data?.data?.mustChangePassword === true);
  const tempToken = employeeLogin.data?.data?.token;

  const blocked = await request('GET', '/api/stats', { token: tempToken });
  check('API bloqueada hasta cambiar contraseña', blocked.status === 403);

  const changed = await request('PATCH', '/api/auth/change-password', {
    token: tempToken,
    body: { currentPassword: 'Temporal1234', newPassword: 'NuevaPass1234' },
  });
  check('cambio de contraseña temporal', changed.status === 200);
  const employeeToken = changed.data?.data?.token;

  const stats = await request('GET', '/api/stats', { token: employeeToken });
  check('empleado accede a métricas', stats.status === 200);

  const forbiddenService = await request('POST', '/api/services', {
    token: employeeToken,
    body: { name: 'Tarifa no permitida', price: 1000 },
  });
  check('empleado no gestiona tarifas (403)', forbiddenService.status === 403);

  const forbiddenUsers = await request('GET', '/api/users', { token: employeeToken });
  check('empleado no gestiona cuentas (403)', forbiddenUsers.status === 403);

  const forbiddenConfig = await request('PATCH', '/api/config', {
    token: employeeToken,
    body: { address: 'No permitido' },
  });
  check('empleado no cambia configuración (403)', forbiddenConfig.status === 403);

  await request('PATCH', `/api/users/${ids.employee}`, {
    token: adminToken,
    body: { active: false },
  });
  const deactivated = await login(employeeEmail, 'NuevaPass1234');
  check('empleado desactivado no puede entrar', deactivated.status === 403);

  section('Eliminación y re-registro de cuenta');
  const deleted = await request('DELETE', '/api/users/me', {
    token: customerToken,
    body: { password, reason: 'no_uso', comment: marker },
  });
  check('eliminar cuenta sin pendientes', deleted.status === 200, `status ${deleted.status}`);

  const oldLogin = await login(customerEmail);
  check('cuenta eliminada no puede iniciar sesión', oldLogin.status === 401);

  const reRegister = await request('POST', '/api/auth/register', {
    body: { name: 'QA Cliente Nuevo', email: customerEmail, password },
  });
  check('re-registro con el mismo correo', reRegister.status === 201);

  const reUser = await User.findOne({ email: customerEmail });
  ids.reRegistered = reUser?._id;

  const deletedUser = await User.findById(ids.customer);
  check('datos personales anonimizados', deletedUser?.name === 'Cuenta eliminada');
  check('correo original liberado', deletedUser?.email?.endsWith('@dosbytes.invalid'));

  const reason = await DeletionReason.findOne({ comment: marker });
  check('motivo guardado sin usuario', Boolean(reason) && !reason.user);

  console.log('');
  if (failures > 0) {
    console.error(`${failures} prueba(s) fallaron`);
    process.exitCode = 1;
  } else {
    console.log('Todas las pruebas integrales pasaron');
  }
};

run()
  .catch((err) => {
    console.error('Error ejecutando la prueba integral:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((err) => console.error('Error limpiando:', err));
    await disconnectDB().catch(() => {});
  });
