import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

// Email al candidato cuando una empresa solicita contactarlo. Si acepta, se le
// revela su WhatsApp a esa empresa. El CTA lleva a su editor, donde ve la
// solicitud y puede aceptar o rechazar.
export function buildContactRequestEmail(data: {
  name: string;
  businessName: string;
  jobTitle: string;
  reason: string;
  inboxUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const forPart = data.jobTitle ? ` por <strong>${data.jobTitle}</strong>` : "";
  const subject = `${data.businessName} quiere contactarte`;
  const reasonHtml = data.reason?.trim()
    ? `<p style="margin: 0 0 12px 0; padding: 12px 16px; border-left: 3px solid #ddd;">${data.reason.trim()}</p>`
    : "";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola ${data.name || ""},</p>
    <p style="margin: 0 0 12px 0;"><strong>${data.businessName}</strong> quiere contactarte${forPart}.</p>
    ${reasonHtml}
    <p style="margin: 0;">Si te interesa, aceptá desde tu perfil y le compartimos tu WhatsApp. Si no, la podés rechazar; no se comparte nada sin tu ok.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.businessName} quiere contactarte por una oportunidad.`,
    heading: "Una empresa quiere contactarte",
    bodyHtml,
    ctaLabel: "Ver la solicitud",
    ctaHref: data.inboxUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.inboxUrl}`) };
}
