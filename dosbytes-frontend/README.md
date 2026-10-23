# DOS BYTES — Frontend

Aplicación web de **DOS BYTES** (servicio técnico, cibercafé, papelería e impresión), construida con **Vue 3 + Vite + Quasar + Pinia**. Consume la API del backend (`dosbytes-backend`) bajo `/api`.

## ¿Qué es la página?

Una tienda en línea y vitrina de un negocio de tecnología, con cuatro áreas:

- **Pública:** inicio, catálogo, detalle de producto, servicios y tarifas, solicitud de servicio técnico, seguimiento de reparaciones por código, nosotros, contacto y páginas legales.
- **Autenticación:** registro con verificación por correo, ingreso, recuperación y cambio de contraseña.
- **Mi cuenta (clientes):** carrito, pedidos, reparaciones, favoritos, opiniones y preguntas.
- **Panel (empleados y administradores):** órdenes de servicio, pedidos, productos, inventario, categorías, tarifas, moderación, usuarios y configuración del sitio.

## Tecnologías

- [Vue 3](https://vuejs.org/) con `<script setup>`
- [Vite](https://vitejs.dev/)
- [Quasar](https://quasar.dev/) (componentes e iconos Material)
- [Pinia](https://pinia.vuejs.org/) con `pinia-plugin-persistedstate`
- [Vue Router](https://router.vuejs.org/) con vistas cargadas bajo demanda

## Scripts

```bash
npm install       # instala dependencias
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # compila a dist/
npm run preview   # previsualiza la compilación
```

> Requiere el backend corriendo en `http://localhost:3000`. Vite redirige `/api` y `/uploads` hacia él (ver `vite.config.js`).

## Variables de entorno

| Variable | Uso | Por defecto |
|---|---|---|
| `VITE_API_URL` | URL base de la API | `/api` |

En producción se deja sin definir: el backend sirve este frontend compilado (`dist/`) y la API en la misma dirección.

## Estructura

```
src/
├── api/           cliente HTTP (fetch, token, manejo de errores)
├── assets/        imágenes y placeholder
├── components/
│   ├── common/    StatCard, StarRating, PriceTag, StatusBadge, Logo, ...
│   ├── layout/    AppHeader, AppFooter, SearchAutocomplete
│   ├── product/   ProductCard, ProductGallery, ProductFilters, ReviewSection, QuestionSection, ...
│   ├── cart/      CartItemRow
│   └── panel/     PartsEditor, ImageManager
├── composables/   useSeo, useConfirm
├── layouts/       MainLayout, AuthLayout, AccountLayout, PanelLayout
├── router/        rutas y guardas de acceso por rol
├── stores/        Pinia: auth, cart, favorites, site, ui
├── utils/         constantes, formato (pesos colombianos), notificaciones, media
└── views/
    ├── public/    Home, Catalog, ProductDetail, Services, ServiceRequest, Track, About, Contact, Legal
    ├── auth/      Login, Register, ForgotPassword, ResetPassword, VerifyEmail, ...
    ├── account/   Cart, AccountHome, Orders, Repairs, Favorites, Reviews, Questions
    ├── panel/     Home, ServiceOrders, Orders, Products, Inventory, Categories, Services, Reviews, Questions, Users, Config
    └── errors/    NotFound, Forbidden
```

## Rutas principales

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Portada con ofertas, destacados y líneas de servicio |
| `/productos`, `/producto/:slug` | Público | Catálogo con filtros y detalle de producto |
| `/servicios`, `/servicio-tecnico` | Público | Tarifas y solicitud de reparación |
| `/seguimiento/:code?` | Público | Estado de una reparación por código |
| `/nosotros`, `/contacto`, `/privacidad`, `/terminos` | Público | Información del negocio |
| `/ingresar`, `/registro`, `/recuperar` | Invitados | Autenticación |
| `/carrito` | Público | Carrito de compras |
| `/mi-cuenta/*` | Cliente | Pedidos, reparaciones, favoritos, opiniones, preguntas |
| `/panel/*` | Empleado / Admin | Gestión del negocio |
| `/panel/servicios`, `/panel/usuarios`, `/panel/configuracion` | Solo Admin | Tarifas, usuarios y configuración |

## Decisiones de diseño

- **Control de acceso:** el router usa guardas por rol (`customer`, `employee`, `admin`) y fuerza el cambio de contraseña temporal. El frontend solo muestra u oculta opciones; la validación real la hace el backend.
- **Persistencia:** el navegador guarda solo estado no crítico (sesión, carrito, preferencias de interfaz) mediante Pinia con persistencia, sin usar `localStorage` directamente. Los datos críticos viven en MongoDB Atlas.
- **SEO:** título y descripción por página (`useSeo`), URLs con slug, `sitemap.xml`, `robots.txt` y datos estructurados. No modifiques ni borres `public/robots.txt`, `public/sitemap.xml` ni el archivo de verificación de Google.
- **Diseño:** responsive, pensado primero para celular, en español y con precios en pesos colombianos.