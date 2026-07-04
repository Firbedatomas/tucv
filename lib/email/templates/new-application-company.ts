import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildNewApplicationCompanyEmail(data: {
  businessName: string;
  candidateName: string;
  jobTitle: string;
  applicantsPanelUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = "Nuevo postulante para tu búsqueda";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola${data.businessName ? ` ${data.businessName}` : ""},</p>
    <p style="margin: 0;"><strong>${data.candidateName}</strong> se postuló a tu búsqueda <strong>${data.jobTitle}</strong>. Entrá al panel para ver su perfil completo y contactarlo.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.candidateName} se postuló a ${data.jobTitle}.`,
    heading: "Nuevo postulante",
    bodyHtml,
    ctaLabel: "Ver postulante",
    ctaHref: data.applicantsPanelUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.applicantsPanelUrl}`) };
}
