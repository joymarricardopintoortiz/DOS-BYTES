# DOS BYTES — Backend

API de la plataforma de **DOS BYTES**: servicio técnico, cibercafé, papelería, catálogo tipo Mercado Libre, pedidos, opiniones, favoritos y preguntas.

- **Node.js + Express 5** (CommonJS)
- **MongoDB Atlas + Mongoose 9**
- **JWT + roles** (`customer`, `employee`, `admin`)
- **Imágenes** en Cloudinary (o disco local en desarrollo)
- **Correo transaccional** por API (Resend o Brevo)
- **Sin dependencias extra**: las integraciones usan `fetch` nativo

## 1. Instalación

```bash
cd dosbytes-backend
npm install
copy .env.example .env   # en Windows (CMD)
```

Si usas Mac o Linux, duplica el archivo `.env.example` desde tu explorador de archivos y renombra la copia a `.env`.

Completa `.env` con `MONGO_URI`, `JWT_SECRET`, los dos administradores y, si ya las tienes, las claves de correo y Cloudinary.

```bash
npm run dev      # desarrollo con nodemon
npm start        # producción
npm run seed     # crea los dos administradores, categorías, tarifas y configuración
npm run seed:demo  # además crea productos de demostración
npm run smoke    # pruebas de humo contra el servidor en ejecución
```

## 2. Variables de entorno

| Variable | Uso |
|---|---|
| `PORT`, `NODE_ENV` | Puerto y entorno (`development`/`production`) |
| `MONGO_URI` | Cadena de MongoDB Atlas |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma y duración de la sesión |
| `RESET_TOKEN_EXPIRES_MINUTES` | Vigencia del enlace de recuperación (60) |
| `VERIFICATION_TOKEN_EXPIRES_HOURS` | Vigencia de la verificación de correo (24) |
| `BCRYPT_ROUNDS` | Rondas de bcrypt (12) |
| `CLIENT_URL` | URL del frontend para enlaces de correo y CORS |
| `APP_URL` | URL pública del backend |
| `EMAIL_PROVIDER` | `resend` o `brevo` |
| `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Correo transaccional |
| `EMAIL_ADMIN_COPY` | Copias internas opcionales, separadas por coma |
| `CLOUDINARY_*` | Almacenamiento de imágenes (obligatorio en producción) |
| `UPLOAD_MAX_MB`, `MAX_IMAGES_PER_PRODUCT` | Límites de imágenes |
| `SEED_ADMIN_1_*`, `SEED_ADMIN_2_*` | Los dos fundadores (solo para `npm run seed`) |

Sin `EMAIL_API_KEY` los correos se imprimen en consola. Sin credenciales de Cloudinary las imágenes se guardan en `uploads/` **solo en desarrollo**; en producción la API responde `503` para evitar perder archivos.

## 3. Roles y permisos

| Acción | Visitante | Cliente | Empleado | Admin |
|---|---|---|---|---|
| Ver catálogo, servicios, opiniones y preguntas | Sí | Sí | Sí | Sí |
| Consultar estado por código | Sí | Sí | Sí | Sí |
| Solicitar servicio técnico | Sí | Sí | — | — |
| Registrarse / verificar / recuperar contraseña | Sí | — | — | — |
| Opiniones, favoritos, preguntas y pedidos | — | Sí | — | — |
| Eliminar su cuenta | — | Sí | — | — |
| Órdenes de servicio (registrar, diagnosticar, estados) | — | — | Sí | Sí |
| Productos, fotos e inventario | — | — | Sí | Sí |
| Pedidos y su estado | — | Solo los propios | Sí | Sí |
| Cuentas de empleados, tarifas de servicios y configuración | — | — | — | Sí |
| Moderar opiniones y preguntas | — | — | Sí | Sí |

El backend valida token **y** rol en cada petición protegida; el frontend solo decide qué mostrar.

## 4. Flujos principales

### Cliente
1. `POST /api/auth/register` → correo de verificación (24 h).
2. `GET /api/auth/verify/:token` → habilita el login.
3. `POST /api/auth/login` → devuelve JWT.
4. `GET /api/products` / `GET /api/products/:slug` → catálogo y detalle.
5. `POST /api/products/:slug/reviews` → crea su opinión; `PATCH /api/reviews/:id` la edita.
6. `POST /api/favorites` / `DELETE /api/favorites/:productId` → favoritos.
7. `POST /api/products/:slug/questions` → pregunta al negocio.
8. `POST /api/orders` → reserva con pago en tienda.
9. `DELETE /api/users/me` → elimina su cuenta si no tiene trámites pendientes.

### Servicio técnico
1. `POST /api/service-orders` (público) → código `SRV-XXXXXX` y correo de confirmación.
2. `GET /api/service-orders/track/:code` (público) → estado sin datos personales.
3. Empleado registra diagnóstico/cotización: `PATCH /api/service-orders/:id`.
4. Cliente aprueba o rechaza: `POST /api/service-orders/track/:code/quote`.
5. Empleado cambia estado: `PATCH /api/service-orders/:id/status`. Al pasar a `listo` se envía el aviso por correo y se registra la garantía.

### Empleado
1. Admin crea la cuenta: `POST /api/users/employees` → contraseña temporal por correo.
2. Primer login devuelve `mustChangePassword: true`.
3. `PATCH /api/auth/change-password` → nueva contraseña y token nuevo.

## 5. Endpoints

### Público
```
GET    /api/health
GET    /api/home
GET    /api/config
GET    /api/categories
GET    /api/categories/:slug
GET    /api/services?line=tecnico|cibercafe|impresion|...
GET    /api/services/:slug
GET    /api/products?q=&category=&minPrice=&maxPrice=&available=&minRating=&sort=&page=&limit=
GET    /api/products/suggestions?q=
GET    /api/products/code/:code
GET    /api/products/:slug
GET    /api/products/:slug/related
GET    /api/products/:slug/reviews?page=&rating=&sort=
GET    /api/products/:slug/questions?page=
POST   /api/service-orders
GET    /api/service-orders/track/:code
POST   /api/service-orders/track/:code/quote
POST   /api/auth/register
GET    /api/auth/verify/:token
POST   /api/auth/resend-verification
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password/:token
```

`sort` admite `relevance`, `price_asc`, `price_desc`, `rating`, `newest`.

### Cliente (JWT)
```
GET    /api/auth/me
POST   /api/auth/logout
PATCH  /api/auth/change-password
PATCH  /api/users/me
DELETE /api/users/me
GET    /api/users/me/favorites
GET    /api/users/me/reviews
GET    /api/users/me/questions
GET    /api/service-orders/me
POST   /api/orders
GET    /api/orders/me
GET    /api/orders/:code
PATCH  /api/orders/:code/cancel
POST   /api/products/:slug/reviews
PATCH  /api/reviews/:id
DELETE /api/reviews/:id
POST   /api/favorites
DELETE /api/favorites/:productId
POST   /api/products/:slug/questions
DELETE /api/questions/:id
```

### Empleado / administrador
```
GET    /api/stats
GET    /api/users
POST   /api/users/employees
PATCH  /api/users/:id
GET    /api/users/deletion-stats
GET    /api/service-orders?status=&q=&from=&to=&page=
POST   /api/service-orders/local
GET    /api/service-orders/history?customerId=|email=|serial=
GET    /api/service-orders/:id
PATCH  /api/service-orders/:id
PATCH  /api/service-orders/:id/status
GET    /api/orders?status=&q=
PATCH  /api/orders/:id/status
POST   /api/categories
PATCH  /api/categories/:id
POST   /api/products
PATCH  /api/products/:id
PATCH  /api/products/:id/stock
DELETE /api/products/:id
GET    /api/products/low-stock/list
POST   /api/products/:id/images
PATCH  /api/products/:id/images/order
PATCH  /api/products/:id/images/main
DELETE /api/products/:id/images
POST   /api/uploads
DELETE /api/uploads
GET    /api/reviews
PATCH  /api/questions/:id/answer
PATCH  /api/questions/:id/visibility
```

### Solo administrador
```
DELETE /api/categories/:id
POST   /api/services
PATCH  /api/services/:id
DELETE /api/services/:id
PATCH  /api/config
PATCH  /api/reviews/:id/visibility
```

## 6. Respuestas

Éxito:
```json
{ "ok": true, "data": { "...": "..." }, "meta": { "total": 0, "page": 1 } }
```

Error:
```json
{ "ok": false, "message": "Descripción", "errors": [{ "field": "email", "message": "Correo inválido" }] }
```

## 7. Seguridad aplicada

- Contraseñas con bcrypt (12 rondas) y `passwordHash` nunca se serializa.
- JWT con versión (`tokenVersion`): cambiar contraseña, cerrar sesión o desactivar una cuenta invalida los tokens.
- Verificación de correo obligatoria antes del login.
- `mustChangePassword` bloquea toda la API hasta cambiar la contraseña temporal.
- Rate limits globales y específicos para login, registro, verificación, consulta de estado y escritura.
- Validación de todas las entradas con `express-validator`.
- `helmet` con CSP en producción, CORS restringido y `mongoose.set('sanitizeFilter', true)`.
- Códigos de producto, orden y pedido generados con alfabeto sin caracteres ambiguos.
- Índice único parcial en `email`: el correo solo es único entre cuentas activas, lo que permite el re-registro tras eliminar.

## 8. Estructura

```
app.js, server.js
src/
  config/          env, conexión a MongoDB
  models/          User, Product, Category, Service, ServiceOrder, Order,
                   Review, Favorite, Question, SiteConfig, DeletionReason
  controllers/     lógica de cada módulo
  routes/          routers por módulo
  middlewares/     auth, roles, validación, uploads, rate limit, errores
  validators/      reglas de entrada
  services/        email, Cloudinary, pagos (Fase 4)
  utils/           errores, paginación, tokens, slugs, rating
  scripts/         seed y pruebas de humo
```

## 9. Fases

- **Fase 1:** servicio técnico, consulta por código, tarifas, cuentas de empleados/admins y panel.
- **Fase 2:** cuentas de clientes verificadas, catálogo con galería, búsqueda, garantías e historial.
- **Fase 3:** pedidos con reserva, inventario, avisos por correo, opiniones, favoritos, preguntas, contador de vendidos y eliminación de cuenta.
- **Fase 4 (preparada):** reserva de equipos del cibercafé, impresión en línea y pagos. Las rutas de pago responden `501` hasta definir proveedor.

## 10. Pendientes operativos

1. Completar `SEED_ADMIN_1_*` y `SEED_ADMIN_2_*` y ejecutar `npm run seed`.
2. Configurar `EMAIL_API_KEY` y verificar el dominio remitente para evitar spam.
3. Configurar Cloudinary antes de desplegar en Render.
4. Definir dirección, horario y los dos correos de administrador con `PATCH /api/config`.
5. Revisar con un asesor legal la política de tratamiento de datos y el tiempo de conservación de registros.
