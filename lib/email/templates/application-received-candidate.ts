import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildApplicationReceivedCandidateEmail(data: {
  name: string;
  jobTitle: string;
  businessName: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = "Recibimos tu postulación";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola ${data.name || ""},</p>
    <p style="margin: 0;">Tu postulación a <strong>${data.jobTitle}</strong> en ${data.businessName} ya le llegó al negocio. Te vamos a avisar por acá si te contactan.</p>
  `;
  const html = renderEmailLayout({
    preheader: `Tu postulación a ${data.jobTitle} ya salió.`,
    heading: "Postulación enviada",
    bodyHtml,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(bodyHtml) };
}
