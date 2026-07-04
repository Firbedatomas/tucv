import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildWelcomeCandidateEmail(data: {
  name: string;
  profileUrl: string;
  preferencesUrl: string;
}): RenderedEmail {
  const subject = "Ya podés empezar a buscar laburo con TuCV";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola ${data.name || ""},</p>
    <p style="margin: 0 0 12px 0;">Tu cuenta de TuCV ya está creada. Ahora cargá tu perfil laboral: experiencia, disponibilidad y la zona donde buscás trabajar. Te toma unos minutos.</p>
    <p style="margin: 0;">Cuando lo completes vas a poder compartirlo por WhatsApp y aparecer para negocios cerca tuyo.</p>
  `;
  const html = renderEmailLayout({
    preheader: "Cargá tu perfil laboral en unos minutos.",
    heading: "Bienvenido a TuCV",
    bodyHtml,
    ctaLabel: "Completar mi perfil",
    ctaHref: data.profileUrl,
    preferencesHref: data.preferencesUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.profileUrl}`) };
}
