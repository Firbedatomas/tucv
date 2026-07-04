import "server-only";

// Layout de email HTML basado en tabla + estilos inline (los clientes de
// mail no cargan CSS externo y Outlook de escritorio ignora flexbox/grid,
// box-shadow y buena parte de border-radius). El borde sólido de 2px hace
// de estructura principal -- universalmente soportado -- y el box-shadow va
// como mejora progresiva encima, siguiendo el mismo criterio de
// jerarquía/profundidad del resto del sitio (tema "impacto", ver
// lib/theme/tokens.ts) pero adaptado a lo que un email realmente puede
// renderizar.
const COLORS = {
  bg: "#FBF3E3",
  surface: "#FFFFFF",
  primary: "#FF4405",
  primaryText: "#FFFFFF",
  text: "#151515",
  muted: "#6B6259",
  border: "#151515",
  accent: "#FFC300",
};

export type EmailLayoutInput = {
  preheader?: string;
  heading: string;
  /** Una sola métrica destacada, opcional (ej. "23 postulantes activos hoy"). */
  metric?: { value: string; label: string };
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Link del centro de preferencias / unsubscribe de un click. */
  preferencesHref?: string;
  unsubscribeHref?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailLayout(input: EmailLayoutInput): string {
  const preheader = input.preheader ? escapeHtml(input.preheader) : "";

  const metricHtml = input.metric
    ? `
      <tr>
        <td style="padding: 0 0 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid ${COLORS.border}; border-radius: 4px;">
            <tr>
              <td style="padding: 20px 24px; text-align: left;">
                <div style="font-size: 32px; line-height: 1.1; font-weight: 700; color: ${COLORS.text};">${escapeHtml(input.metric.value)}</div>
                <div style="font-size: 14px; color: ${COLORS.muted}; margin-top: 4px;">${escapeHtml(input.metric.label)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const ctaHtml =
    input.ctaLabel && input.ctaHref
      ? `
      <tr>
        <td style="padding: 8px 0 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-radius: 4px; background-color: ${COLORS.primary};">
                <a href="${input.ctaHref}" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 700; color: ${COLORS.primaryText}; text-decoration: none; border-radius: 4px;">${escapeHtml(input.ctaLabel)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
      : "";

  const footerLinks: string[] = [];
  if (input.preferencesHref) {
    footerLinks.push(`<a href="${input.preferencesHref}" style="color: ${COLORS.muted}; text-decoration: underline;">Preferencias de notificación</a>`);
  }
  if (input.unsubscribeHref) {
    footerLinks.push(`<a href="${input.unsubscribeHref}" style="color: ${COLORS.muted}; text-decoration: underline;">Cancelar suscripción</a>`);
  }

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.heading)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${COLORS.bg}; font-family: 'Inter', system-ui, -apple-system, Arial, sans-serif;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.bg};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
            <tr>
              <td style="padding: 0 0 24px 0;">
                <span style="font-size: 20px; font-weight: 700; color: ${COLORS.text}; letter-spacing: -0.02em;">TuCV <span style="color: ${COLORS.primary};">late</span></span>
              </td>
            </tr>
            <tr>
              <td style="background-color: ${COLORS.surface}; border: 2px solid ${COLORS.border}; border-radius: 4px; box-shadow: 3px 3px 0 ${COLORS.border};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 32px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 0 0 16px 0;">
                            <h1 style="margin: 0; font-size: 24px; line-height: 1.3; font-weight: 700; color: ${COLORS.text};">${escapeHtml(input.heading)}</h1>
                          </td>
                        </tr>
                        ${metricHtml}
                        <tr>
                          <td style="padding: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
                            ${input.bodyHtml}
                          </td>
                        </tr>
                        ${ctaHtml}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 8px 0 8px; font-size: 12px; line-height: 1.6; color: ${COLORS.muted};">
                ${footerLinks.length ? `<p style="margin: 0 0 8px 0;">${footerLinks.join(" &middot; ")}</p>` : ""}
                <p style="margin: 0;">TuCV &mdash; conectamos gente que busca laburo con negocios cerca suyo.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Versión texto plano simple: se usa como fallback junto al HTML, no como diseño. */
export function stripHtmlForText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "-")
    .replace(/&middot;/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
