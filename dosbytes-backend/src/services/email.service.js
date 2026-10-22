'use strict';

const env = require('../config/env');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const layout = (title, content) => `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#111827;padding:20px 24px;color:#ffffff;">
                <strong style="font-size:20px;letter-spacing:1px;">DOS BYTES</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(title)}</h1>
                <div style="font-size:15px;line-height:1.6;color:#374151;">${content}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f9fafb;font-size:12px;color:#6b7280;">
                Este mensaje fue enviado automáticamente por la plataforma de DOS BYTES.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const button = (href, label) =>
  `<p style="margin:20px 0;"><a href="${href}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">${escapeHtml(label)}</a></p>`;

const parseFrom = () => {
  const raw = env.email.from || '';
  const match = raw.match(/^(.*)<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
  return { name: 'DOS BYTES', email: raw.trim() };
};

/**
 * Envía correo transaccional por API (Resend o Brevo) usando fetch nativo.
 * Nunca lanza: un fallo de correo no debe romper la operación del negocio.
 */
const send = async ({ to, subject, html, text, replyTo }) => {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return { skipped: true };

  if (!env.email.apiKey) {
    console.log(`[email:dev] (sin EMAIL_API_KEY) -> ${recipients.join(', ')} | ${subject}`);
    return { skipped: true };
  }

  try {
    let response;
    if (env.email.provider === 'brevo') {
      const sender = parseFrom();
      response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.email.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: recipients.map((email) => ({ email })),
          subject,
          htmlContent: html,
          textContent: text,
          replyTo: replyTo ? { email: replyTo } : undefined,
        }),
      });
    } else {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.email.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.email.from,
          to: recipients,
          subject,
          html,
          text,
          reply_to: replyTo || env.email.replyTo || undefined,
        }),
      });
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[email] error ${response.status}: ${detail}`);
      return { ok: false, status: response.status };
    }

    return { ok: true };
  } catch (err) {
    console.error('[email] no se pudo enviar:', err.message);
    return { ok: false, error: err.message };
  }
};

const templates = {
  verifyEmail: ({ name, token }) => {
    const link = `${env.clientUrl}/verificar?token=${encodeURIComponent(token)}`;
    return {
      subject: 'Verifica tu correo en DOS BYTES',
      html: layout(
        'Confirma tu cuenta',
        `<p>Hola ${escapeHtml(name)},</p>
         <p>Gracias por registrarte en DOS BYTES. Confirma tu correo para activar la cuenta. El enlace vence en ${env.jwt.verificationExpiresHours} horas.</p>
         ${button(link, 'Verificar mi correo')}
         <p style="font-size:13px;color:#6b7280;">Si no creaste esta cuenta, puedes ignorar el mensaje.</p>`
      ),
      text: `Verifica tu correo en DOS BYTES: ${link}`,
    };
  },

  resetPassword: ({ name, token }) => {
    const link = `${env.clientUrl}/restablecer?token=${encodeURIComponent(token)}`;
    return {
      subject: 'Recupera tu contraseña de DOS BYTES',
      html: layout(
        'Recuperación de contraseña',
        `<p>Hola ${escapeHtml(name)},</p>
         <p>Recibimos una solicitud para restablecer tu contraseña. El enlace vence en ${env.jwt.resetExpiresMinutes} minutos.</p>
         ${button(link, 'Crear nueva contraseña')}
         <p style="font-size:13px;color:#6b7280;">Si no solicitaste el cambio, ignora este correo.</p>`
      ),
      text: `Recupera tu contraseña de DOS BYTES: ${link}`,
    };
  },

  employeeWelcome: ({ name, email, tempPassword }) => ({
    subject: 'Bienvenido al equipo de DOS BYTES',
    html: layout(
      'Tu cuenta de empleado',
      `<p>Hola ${escapeHtml(name)},</p>
       <p>Un administrador creó tu cuenta de empleado.</p>
       <p><strong>Correo:</strong> ${escapeHtml(email)}<br />
          <strong>Contraseña temporal:</strong> ${escapeHtml(tempPassword)}</p>
       <p>Al iniciar sesión deberás cambiar la contraseña antes de continuar.</p>
       ${button(`${env.clientUrl}/ingresar`, 'Ingresar al panel')}`
    ),
    text: `Cuenta de empleado DOS BYTES. Correo: ${email} / Contraseña temporal: ${tempPassword}`,
  }),

  serviceOrderReceived: ({ name, code, equipment, issue }) => ({
    subject: `Recibimos tu solicitud de servicio ${code}`,
    html: layout(
      'Solicitud de servicio registrada',
      `<p>Hola ${escapeHtml(name)},</p>
       <p>Registramos tu solicitud con el código <strong>${escapeHtml(code)}</strong>.</p>
       <p><strong>Equipo:</strong> ${escapeHtml(equipment)}<br />
          <strong>Falla reportada:</strong> ${escapeHtml(issue)}</p>
       <p>Puedes consultar el estado en cualquier momento con tu código.</p>
       ${button(`${env.clientUrl}/seguimiento?codigo=${encodeURIComponent(code)}`, 'Consultar estado')}`
    ),
    text: `Solicitud ${code} registrada. Consulta el estado en ${env.clientUrl}/seguimiento?codigo=${code}`,
  }),

  serviceOrderReady: ({ name, code }) => ({
    subject: `Tu equipo está listo para entrega (${code})`,
    html: layout(
      'Equipo listo para entrega',
      `<p>Hola ${escapeHtml(name)},</p>
       <p>Tu equipo con la orden <strong>${escapeHtml(code)}</strong> ya está listo para recoger en el local.</p>
       ${button(`${env.clientUrl}/seguimiento?codigo=${encodeURIComponent(code)}`, 'Ver detalles')}`
    ),
    text: `Tu equipo de la orden ${code} está listo para entrega.`,
  }),

  orderReceived: ({ name, code, total, items }) => ({
    subject: `Reserva registrada ${code}`,
    html: layout(
      'Tu pedido quedó reservado',
      `<p>Hola ${escapeHtml(name)},</p>
       <p>Registramos tu pedido <strong>${escapeHtml(code)}</strong> por un total de <strong>$${Number(total).toLocaleString('es-CO')} COP</strong>.</p>
       <p>${items.map((item) => `${escapeHtml(item.name)} x${item.quantity}`).join('<br />')}</p>
       <p>El pago se realiza en el local al recoger los productos.</p>`
    ),
    text: `Pedido ${code} reservado por $${total} COP. Pago en tienda.`,
  }),

  orderReady: ({ name, code }) => ({
    subject: `Tu pedido está listo para recoger (${code})`,
    html: layout(
      'Pedido listo para recoger',
      `<p>Hola ${escapeHtml(name)},</p>
       <p>Tu pedido <strong>${escapeHtml(code)}</strong> está listo. Puedes recogerlo en el local y pagar en tienda.</p>`
    ),
    text: `Tu pedido ${code} está listo para recoger.`,
  }),

  accountDeleted: ({ name }) => ({
    subject: 'Tu cuenta de DOS BYTES fue eliminada',
    html: layout(
      'Cuenta eliminada',
      `<p>Hola ${escapeHtml(name)},</p>
       <p>Tu cuenta fue eliminada y tus datos personales fueron anonimizados. Conservamos el historial de órdenes y ventas necesario para garantías y contabilidad.</p>
       <p>Puedes crear una cuenta nueva con el mismo correo cuando quieras.</p>`
    ),
    text: 'Tu cuenta de DOS BYTES fue eliminada. Puedes registrarte de nuevo con el mismo correo.',
  }),
};

module.exports = {
  send,
  templates,
  escapeHtml,
};
