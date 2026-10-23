# DOS BYTES

Plataforma web de **DOS BYTES**, un negocio de tecnología con servicio técnico, cibercafé, papelería, impresión y accesorios. La página funciona como vitrina del negocio, canal para solicitar y seguir reparaciones, tienda en línea con reserva de productos y panel de administración.

> La web apoya al local físico, no lo reemplaza. El control de tiempo y cobro de los computadores del cibercafé se maneja en el local.

## ¿En qué consiste la página?

### Líneas de negocio
1. **Servicio técnico:** reparación de consolas, laptops, PC y otros equipos, con diagnóstico, cotización y garantía.
2. **Cibercafé:** equipos con internet para consultas, trámites e impresión.
3. **Papelería y accesorios:** periféricos, cargadores, controles, videojuegos, lápices y útiles.
4. **Impresión y copias:** tarifas por página.
5. **Cibervideojuegos:** línea prevista, pendiente de definir.

### Qué puede hacer cada persona

| Actor | Qué hace en la web |
|---|---|
| **Visitante** | Ve el catálogo, servicios y tarifas, solicita un servicio técnico y consulta el estado de su reparación con un código (`SRV-XXXXXX`), sin iniciar sesión. |
| **Cliente** (cuenta verificada por correo) | Arma un carrito y reserva productos para recoger y pagar en tienda, sigue sus pedidos y reparaciones, guarda favoritos, deja opiniones de 1 a 5 estrellas, hace preguntas en los productos y puede eliminar su cuenta. |
| **Empleado** | Registra y gestiona órdenes de servicio (diagnóstico, cotización, repuestos, estados), pedidos, productos, fotos e inventario, y responde preguntas y modera opiniones. |
| **Administrador** (los dos fundadores) | Todo lo anterior, más cuentas de empleados, tarifas de servicios, usuarios y configuración del sitio. |

### Secciones principales
- **Inicio:** portada tipo tienda en línea, con buscador con sugerencias, ofertas, destacados, novedades, mejor calificados y líneas de servicio.
- **Catálogo:** búsqueda por texto o código, filtros (categoría, precio, disponibilidad, calificación) y orden (relevancia, precio, calificación, novedad). El detalle del producto tiene galería con zoom, opiniones, preguntas y productos relacionados.
- **Servicios y tarifas / Servicio técnico / Seguimiento:** solicitud de reparación con confirmación por correo y consulta del estado por código.
- **Mi cuenta:** pedidos, reparaciones, favoritos, opiniones y preguntas.
- **Panel de administración (`/panel`):** órdenes, pedidos, productos, inventario bajo, categorías, tarifas, moderación, usuarios y configuración.
- **Páginas informativas:** Nosotros, Contacto, Privacidad y Términos. El pie de página muestra dirección, horario y correos de contacto.

### Flujo de una reparación
`Recibido → En diagnóstico → Esperando aprobación → En reparación → Listo para entrega → Entregado` (o `No reparable`).
Al quedar el equipo *listo* se avisa al cliente por correo y se registra la garantía.

### Flujo de un pedido
`Reservado → Listo para recoger → Entregado` (o `Cancelado`). El pago se hace en la tienda.

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | Vue 3, Vite, Quasar, Pinia (con persistencia), Vue Router |
| Backend | Node.js, Express 5, Mongoose 9 (CommonJS) |
| Base de datos | MongoDB Atlas |
| Autenticación | JWT con roles (`customer`, `employee`, `admin`) |
| Imágenes | Cloudinary (o disco local en desarrollo) |
| Correo | Resend o Brevo, por API |

## Estructura del repositorio

```
DOS-BYTES/
├── dosbytes-backend/     API REST (Express + MongoDB)
├── dosbytes-frontend/    Aplicación web (Vue 3 + Quasar)
└── DOS-BYTES-Requerimientos.docx   Especificación de requerimientos (v1.1)
```

Cada carpeta tiene su propio README con más detalle.

## Puesta en marcha (desarrollo)

Requisitos: Node.js 18 o superior y una base de datos en MongoDB Atlas.

**1. Backend**
```bash
cd dosbytes-backend
npm install
copy .env.example .env    # en Windows (CMD)
```
Si usas Mac o Linux, duplica el archivo `.env.example` desde tu explorador de archivos y renombra la copia a `.env`.

Luego completa `MONGO_URI`, `JWT_SECRET` y los datos de los administradores:
```bash
npm run seed              # crea administradores, categorías, tarifas y configuración
npm run dev               # http://localhost:3000
```

**2. Frontend** (en otra terminal)
```bash
cd dosbytes-frontend
npm install
npm run dev               # http://localhost:5173
```

En desarrollo, Vite redirige `/api` y `/uploads` al backend, por lo que no hace falta configurar nada más.

## Despliegue

Frontend y backend se despliegan juntos en un solo Web Service (por ejemplo, Render):

```bash
cd dosbytes-frontend && npm install && npm run build   # genera dosbytes-frontend/dist
cd ../dosbytes-backend && npm install && npm start
```

Express sirve la API en `/api` y los archivos compilados de `dosbytes-frontend/dist`. En producción, Cloudinary es obligatorio, porque el disco de Render no es permanente.

## Fases del proyecto

1. **Fase 1:** servicio técnico, consulta por código, tarifas, cuentas de empleados y administradores, y panel.
2. **Fase 2:** cuentas de clientes, catálogo con galería, búsqueda, garantías e historial.
3. **Fase 3:** carrito con reserva, inventario, avisos por correo, opiniones, favoritos y eliminación de cuenta.
4. **Fase 4 (preparada):** reserva de equipos del cibercafé, impresión en línea y pagos.

## Seguridad y privacidad

- Contraseñas cifradas con bcrypt; el backend valida token y rol en cada petición protegida.
- Los secretos van en `.env` (nunca en el repositorio); `.env.example` no lleva valores reales.
- Política de tratamiento de datos (Ley 1581 de 2012) y garantías según el Estatuto del Consumidor (Ley 1480 de 2011).