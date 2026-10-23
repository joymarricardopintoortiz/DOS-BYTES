<script setup>
import { computed } from 'vue'
import { useSiteStore } from '../../stores/site'
import { useSeo } from '../../composables/useSeo'

const props = defineProps({
  document: { type: String, default: 'privacy', validator: (value) => ['privacy', 'terms'].includes(value) },
})

const site = useSiteStore()
const config = computed(() => site.siteConfig)
const businessName = computed(() => config.value.businessName || 'DOS BYTES')
const adminEmails = computed(() => (config.value.adminEmails || []).filter(Boolean))
const contactEmail = computed(
  () => config.value.employeeEmail || adminEmails.value[0] || ''
)

const isPrivacy = computed(() => props.document === 'privacy')
const title = computed(() =>
  isPrivacy.value ? 'Política de privacidad' : 'Términos y condiciones'
)
const intro = computed(() =>
  isPrivacy.value
    ? `En ${businessName.value} tratamos tus datos personales con respeto y conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Esta política explica qué información recolectamos, para qué la usamos y cómo puedes ejercer tus derechos.`
    : `Estos términos regulan el uso del sitio web de ${businessName.value}, la creación de cuentas, las reservas de productos y las órdenes de servicio técnico. Al usar la plataforma aceptas estas condiciones y la política de privacidad.`
)

useSeo(() => ({
  title: title.value,
  description: isPrivacy.value
    ? `Política de tratamiento de datos personales de ${businessName.value}: finalidades, derechos del titular, conservación y eliminación de la cuenta.`
    : `Términos y condiciones de ${businessName.value}: cuentas, precios, reservas, servicio técnico, garantías, devoluciones y propiedad intelectual.`,
  canonical: isPrivacy.value ? '/privacidad' : '/terminos',
}))
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>{{ title }}</span>
      </div>

      <div class="legal-content surface-card">
        <span class="eyebrow">Información legal</span>
        <h1 class="title-xl q-mt-xs">{{ title }}</h1>
        <p class="text-caption text-grey-7">Última actualización: octubre de 2026</p>

        <p class="q-mt-lg">{{ intro }}</p>

        <template v-if="isPrivacy">
          <h2>1. Responsable del tratamiento</h2>
          <p>
            El responsable es <strong>{{ businessName }}</strong>, con domicilio en
            <strong>{{ config.address || 'la dirección informada en el local' }}</strong>.
            Para asuntos de datos personales puedes escribir a
            <a v-if="contactEmail" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
            <span v-else>los correos publicados en el pie de página</span>.
          </p>

          <h2>2. Datos que recolectamos</h2>
          <ul>
            <li>
              <strong>Cuenta:</strong> nombre, correo electrónico y, opcionalmente, teléfono.
              La contraseña se guarda cifrada y no es visible para el personal.
            </li>
            <li>
              <strong>Pedidos y reservas:</strong> productos, cantidades, valor y estado del
              pedido. El pago se realiza en tienda; no almacenamos datos de tarjetas.
            </li>
            <li>
              <strong>Servicio técnico:</strong> nombre y datos de contacto, tipo de equipo,
              marca, modelo, número de serie, accesorios entregados y falla reportada.
            </li>
            <li>
              <strong>Comunidad:</strong> opiniones, calificaciones y preguntas públicas, y
              las respuestas del negocio.
            </li>
            <li>
              <strong>Uso del sitio:</strong> información técnica necesaria para operar la
              sesión y la seguridad de la plataforma.
            </li>
          </ul>

          <h2>3. Finalidades del tratamiento</h2>
          <ul>
            <li>Crear y administrar tu cuenta, verificar tu correo y autenticarte.</li>
            <li>Gestionar pedidos, reservas, entregas y su seguimiento.</li>
            <li>Registrar órdenes de servicio, diagnósticos, cotizaciones y garantías.</li>
            <li>Enviar correos transaccionales: verificación, recuperación de contraseña, confirmación de solicitud y aviso de equipo listo.</li>
            <li>Publicar opiniones y preguntas, moderar contenidos y responder solicitudes.</li>
            <li>Prevenir fraudes, atender requerimientos legales y mejorar el servicio.</li>
          </ul>

          <h2>4. Derechos del titular</h2>
          <p>Como titular de los datos puedes:</p>
          <ul>
            <li>Conocer, actualizar y rectificar tu información.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Ser informado sobre el uso que se da a tus datos.</li>
            <li>Revocar la autorización y solicitar la supresión cuando sea procedente.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
          </ul>
          <p>
            Puedes ejercer estos derechos escribiendo al correo de contacto indicado arriba.
            Responderemos en los términos legales. Si tu solicitud no se atiende, puedes
            acudir a la SIC.
          </p>

          <h2>5. Verificación y seguridad</h2>
          <p>
            Para usar las funciones de cliente debes verificar tu correo. Las sesiones usan
            un token con caducidad que se descarta al cerrar sesión. Aplicamos medidas
            técnicas y organizativas razonables, pero ningún sistema es completamente
            infalible.
          </p>

          <h2>6. Menores de edad</h2>
          <p>
            El sitio no está dirigido a menores de edad sin autorización de su representante
            legal. Si detectamos datos de un menor sin autorización, procederemos a
            eliminarlos.
          </p>

          <h2>7. Conservación y eliminación de la cuenta</h2>
          <p>
            Conservamos los datos mientras la cuenta esté activa y durante el tiempo
            necesario para atender garantías, obligaciones contables y legales. Si solicitas
            eliminar tu cuenta, se anonymizan tu nombre, correo y teléfono, se cierra la
            sesión y no podrás volver a ingresar con esa cuenta. Las opiniones y preguntas
            se conservan de forma anónima, y los registros de órdenes y ventas se mantienen
            cuando sean necesarios para garantías y contabilidad.
          </p>
          <p>
            No podrás eliminar la cuenta si tienes una reparación o un pedido pendiente,
            hasta que el trámite termine. Puedes crear una cuenta nueva y vacía con el mismo
            correo de una cuenta eliminada.
          </p>

          <h2>8. Cookies y almacenamiento en el navegador</h2>
          <p>
            Usamos almacenamiento de sesión para mantener tu inicio de sesión y
            almacenamiento local del navegador para el carrito y preferencias de interfaz.
            No usamos esos espacios para guardar contraseñas ni datos de pago.
          </p>

          <h2>9. Encargados y transferencias</h2>
          <p>
            Para operar la plataforma podemos apoyarnos en proveedores de base de datos,
            almacenamiento de imágenes y correo transaccional, que tratan la información
            por cuenta nuestra y bajo obligaciones de confidencialidad. No vendemos tus
            datos personales.
          </p>

          <h2>10. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política para reflejar cambios legales u operativos.
            Publicaremos la versión vigente en esta página con su fecha de actualización.
          </p>
        </template>

        <template v-else>
          <h2>1. Identificación</h2>
          <p>
            Este sitio es operado por <strong>{{ businessName }}</strong>, un negocio de
            tecnología con servicio técnico, cibercafé, papelería, impresión y accesorios.
            Los canales de contacto son los publicados en el pie de página y en la sección
            de contacto.
          </p>

          <h2>2. Uso del sitio y de la cuenta</h2>
          <ul>
            <li>Debes proporcionar información veraz y mantenerla actualizada.</li>
            <li>La cuenta es personal; no compartas tu contraseña ni permitas su uso por terceros.</li>
            <li>Debes verificar tu correo para acceder a las funciones de cliente.</li>
            <li>No está permitido usar el sitio para actividades ilícitas, intentos de fraude, extracción masiva de datos o interferencia con la plataforma.</li>
          </ul>

          <h2>3. Productos, precios y disponibilidad</h2>
          <p>
            Los precios se expresan en pesos colombianos (COP) e incluyen los impuestos
            aplicables, salvo indicación contraria. La disponibilidad se muestra en línea y
            puede variar por ventas simultáneas en el local. Las imágenes son ilustrativas;
            el producto entregado corresponde a la referencia publicada. Las ofertas tienen
            vigencia mientras se muestren en el catálogo o hasta agotar existencias.
          </p>

          <h2>4. Reservas y pedidos</h2>
          <ul>
            <li>El sitio permite reservar productos para recoger y pagar en la tienda.</li>
            <li>La reserva queda sujeta a confirmación y disponibilidad al momento del retiro.</li>
            <li>El pedido puede cancelarse antes de la entrega, según su estado.</li>
            <li>Si no se reclama el pedido en el plazo informado, podrá liberarse el inventario.</li>
            <li>No se procesan pagos en línea en esta versión del sitio.</li>
          </ul>

          <h2>5. Servicio técnico</h2>
          <ul>
            <li>La solicitud web genera un código de orden para consultar el estado.</li>
            <li>El diagnóstico y la cotización se registran antes de intervenir el equipo.</li>
            <li>La reparación solo inicia cuando el cliente aprueba la cotización.</li>
            <li>Los datos del equipo y de la falla reportada deben ser exactos. El cliente declara ser el propietario o estar autorizado para entregar el equipo.</li>
            <li>Los accesorios entregados se registran en la orden; se recomienda retirar tarjetas SIM, memorias y datos personales.</li>
            <li>Los equipos no reclamados se conservarán por el plazo informado y luego podrán ser entregados a la autoridad competente o disponerse conforme a la ley.</li>
          </ul>

          <h2>6. Garantías y devoluciones</h2>
          <p>
            Las garantías se rigen por la Ley 1480 de 2011 (Estatuto del Consumidor) y por
            las condiciones del fabricante o del servicio realizado. La garantía de una
            reparación se registra en la orden con su fecha de vencimiento y no cubre daños
            posteriores por golpes, humedad, manipulación de terceros o uso indebido.
          </p>
          <p>
            Para una reclamación, presenta el código de la orden, el comprobante y el
            producto o equipo. Evaluaremos el caso y daremos respuesta en los términos
            legales. También puedes acudir a la Superintendencia de Industria y Comercio.
          </p>

          <h2>7. Opiniones y preguntas</h2>
          <p>
            Solo los clientes con correo verificado pueden publicar opiniones y preguntas.
            El contenido debe ser respetuoso y relacionado con el producto o servicio. Nos
            reservamos el derecho de ocultar o eliminar contenidos ofensivos, ilegales,
            duplicados o que revelen datos personales de terceros. La moderación no altera
            la calificación promedio de las opiniones visibles.
          </p>

          <h2>8. Propiedad intelectual</h2>
          <p>
            El nombre, el logo, los textos, las fotografías y el diseño del sitio pertenecen
            a {{ businessName }} o se usan con autorización. No se permite su reproducción
            comercial sin permiso. Los productos y marcas de terceros pertenecen a sus
            titulares. Solo se comercializan productos y software con licencia legítima.
          </p>

          <h2>9. Responsabilidad y enlaces</h2>
          <p>
            Procuramos que la información publicada sea exacta y esté actualizada, pero
            pueden existir errores tipográficos o desactualizaciones. El sitio puede incluir
            enlaces a servicios de terceros, cuyo contenido y políticas no controlamos.
          </p>

          <h2>10. Tratamiento de datos personales</h2>
          <p>
            El tratamiento de datos se rige por nuestra
            <router-link to="/privacidad" class="text-primary text-weight-bold">
              Política de privacidad
            </router-link>
            , conforme a la Ley 1581 de 2012.
          </p>

          <h2>11. Ley aplicable y controversias</h2>
          <p>
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier
            controversia se atenderá primero por los canales de atención del negocio y,
            si no se resuelve, ante la Superintendencia de Industria y Comercio o la
            autoridad competente.
          </p>

          <h2>12. Contacto</h2>
          <p>
            Para consultas sobre estos términos escríbenos a
            <a v-if="contactEmail" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
            <span v-else>los correos publicados en el pie de página</span>
            <template v-if="config.phone"> o llámanos al {{ config.phone }}</template>.
          </p>
        </template>

        <div class="inline-actions q-mt-xl">
          <q-btn
            outline
            no-caps
            color="primary"
            icon="arrow_back"
            label="Volver al inicio"
            to="/"
          />
          <q-btn
            v-if="isPrivacy"
            flat
            no-caps
            color="primary"
            label="Ver términos y condiciones"
            to="/terminos"
          />
          <q-btn
            v-else
            flat
            no-caps
            color="primary"
            label="Ver política de privacidad"
            to="/privacidad"
          />
        </div>
      </div>
    </div>
  </div>
</template>
