import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

// Email que recibe un candidato cuando una empresa lo invita a postularse a
// una búsqueda concreta. El CTA lo lleva a su editor de perfil, donde ve la
// invitación y puede aceptarla (crea la postulación) o descartarla.
export function buildCandidateInvitationEmail(data: {
  name: string;
  businessName: string;
  jobTitle: string;
  message: string;
  invitationsUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = `${data.businessName} quiere que te postules a ${data.jobTitle}`;
  const customMessage = data.message?.trim()
    ? `<p style="margin: 0 0 12px 0; padding: 12px 16px; border-left: 3px solid #ddd;">${data.message.trim()}</p>`
    : "";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola ${data.name || ""},</p>
    <p style="margin: 0 0 12px 0;"><strong>${data.businessName}</strong> vio tu perfil en TuCV y te invitó a postularte a <strong>${data.jobTitle}</strong>.</p>
    ${customMessage}
    <p style="margin: 0;">Si te interesa, aceptá la invitación desde tu perfil y tu postulación le llega directo. Si no, la podés descartar.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.businessName} te invitó a postularte a ${data.jobTitle}.`,
    heading: "Te invitaron a una búsqueda",
    bodyHtml,
    ctaLabel: "Ver la invitación",
    ctaHref: data.invitationsUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.invitationsUrl}`) };
}
