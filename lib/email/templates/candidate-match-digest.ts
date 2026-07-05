import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

// Digest Pro: candidatos compatibles con las búsquedas activas del negocio que
// aparecieron/actualizaron desde el último aviso. "Compatible" = el rubro del
// candidato coincide con el de alguna de tus búsquedas activas (mismo criterio
// que la marca "Coincide con tu búsqueda" del panel).
export function buildCandidateMatchDigestEmail(data: {
  businessName: string;
  count: number;
  candidatesUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const plural = data.count === 1 ? "" : "s";
  const subject = `${data.count} candidato${plural} compatible${plural} con tus búsquedas`;
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola${data.businessName ? ` ${data.businessName}` : ""},</p>
    <p style="margin: 0;">Aparecieron ${data.count} candidato${plural} que coincide${data.count === 1 ? "" : "n"} con el rubro de tus búsquedas activas y eligieron ser visibles para negocios. Están marcados y primero en tu lista de candidatos.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.count} candidato${plural} compatible${plural} con tus búsquedas activas.`,
    heading: "Candidatos compatibles",
    metric: { value: String(data.count), label: `candidato${plural} compatible${plural}` },
    bodyHtml,
    ctaLabel: "Ver candidatos",
    ctaHref: data.candidatesUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.candidatesUrl}`) };
}
