import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildCompanyDailyJobDigestEmail(data: {
  businessName: string;
  newApplicantsCount: number;
  jobsSummary: string;
  panelUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = `Impacto diario: ${data.newApplicantsCount} nuevo${data.newApplicantsCount === 1 ? "" : "s"} postulante${data.newApplicantsCount === 1 ? "" : "s"}`;
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola${data.businessName ? ` ${data.businessName}` : ""},</p>
    <p style="margin: 0;">${data.jobsSummary}</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.newApplicantsCount} nuevos postulantes en tus búsquedas activas.`,
    heading: "Impacto diario",
    metric: { value: String(data.newApplicantsCount), label: "nuevos postulantes hoy" },
    bodyHtml,
    ctaLabel: "Ver postulantes",
    ctaHref: data.panelUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.panelUrl}`) };
}
