import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildWelcomeCompanyEmail(data: {
  businessName: string;
  panelUrl: string;
  preferencesUrl: string;
}): RenderedEmail {
  const subject = "Tu cuenta de empresa en TuCV ya está lista";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola${data.businessName ? ` ${data.businessName}` : ""},</p>
    <p style="margin: 0 0 12px 0;">Ya podés publicar tu primera búsqueda y empezar a recibir postulantes de tu zona.</p>
    <p style="margin: 0;">Te vamos a avisar apenas llegue el primer postulante.</p>
  `;
  const html = renderEmailLayout({
    preheader: "Publicá tu primera búsqueda y recibí postulantes de tu zona.",
    heading: "Tu cuenta ya está lista",
    bodyHtml,
    ctaLabel: "Publicar una búsqueda",
    ctaHref: data.panelUrl,
    preferencesHref: data.preferencesUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.panelUrl}`) };
}
