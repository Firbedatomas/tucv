import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildPublicProfileEnabledEmail(data: {
  name: string;
  publicProfileUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = "Tu perfil laboral ya se puede compartir";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola ${data.name || ""},</p>
    <p style="margin: 0 0 12px 0;">Activaste la visibilidad pública de tu perfil. Ahora podés compartirlo por WhatsApp, bajarlo en QR o imprimirlo, y va a aparecer en la sección de postulantes de tu zona.</p>
    <p style="margin: 0;">Recordá que nunca mostramos tu teléfono, DNI ni dirección exacta -- podés desactivarlo cuando quieras desde tu perfil.</p>
  `;
  const html = renderEmailLayout({
    preheader: "Compartilo por WhatsApp, QR o cartel impreso.",
    heading: "Tu perfil ya es público",
    bodyHtml,
    ctaLabel: "Compartir mi perfil",
    ctaHref: data.publicProfileUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.publicProfileUrl}`) };
}
