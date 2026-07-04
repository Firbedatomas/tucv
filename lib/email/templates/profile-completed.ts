import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildProfileCompletedEmail(data: {
  name: string;
  profileUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = "Tu perfil ya está listo para generar oportunidades";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola ${data.name || ""},</p>
    <p style="margin: 0 0 12px 0;">Terminaste de cargar tu perfil laboral. Ya tiene todo lo que un negocio necesita para decidir si contactarte: experiencia, disponibilidad y zona.</p>
    <p style="margin: 0;">Si además activás la visibilidad pública, tu perfil puede aparecer en <strong>Gente lista para laburar cerca tuyo</strong> y compartirse por WhatsApp.</p>
  `;
  const html = renderEmailLayout({
    preheader: "Tu perfil ya tiene todo lo que un negocio necesita para decidir.",
    heading: "Perfil completo",
    bodyHtml,
    ctaLabel: "Ver mi perfil",
    ctaHref: data.profileUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.profileUrl}`) };
}
