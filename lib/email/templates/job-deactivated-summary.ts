import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildJobDeactivatedSummaryEmail(data: {
  businessName: string;
  jobTitle: string;
  totalApplicants: number;
  renewUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = `Tu búsqueda "${data.jobTitle}" venció`;
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola${data.businessName ? ` ${data.businessName}` : ""},</p>
    <p style="margin: 0;">Tu búsqueda <strong>${data.jobTitle}</strong> venció y dejó de recibir postulantes. Si todavía necesitás cubrir el puesto, podés volver a publicarla en un par de clics.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.jobTitle} venció -- ${data.totalApplicants} postulantes en total.`,
    heading: "Tu búsqueda venció",
    metric: { value: String(data.totalApplicants), label: data.totalApplicants === 1 ? "postulante recibido" : "postulantes recibidos" },
    bodyHtml,
    ctaLabel: "Publicar de nuevo",
    ctaHref: data.renewUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.renewUrl}`) };
}
