import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildCompanyWeeklyJobDigestEmail(data: {
  businessName: string;
  newApplicantsCount: number;
  activeJobsCount: number;
  panelUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = `Impacto semanal: ${data.newApplicantsCount} postulante${data.newApplicantsCount === 1 ? "" : "s"} esta semana`;
  const jobsLine = data.activeJobsCount
    ? `Tenés ${data.activeJobsCount} ${data.activeJobsCount === 1 ? "búsqueda activa" : "búsquedas activas"} recibiendo postulantes.`
    : "Tus búsquedas ya no están activas -- publicá una nueva para seguir recibiendo postulantes.";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola${data.businessName ? ` ${data.businessName}` : ""},</p>
    <p style="margin: 0 0 12px 0;">${
      data.newApplicantsCount
        ? `Esta semana recibiste ${data.newApplicantsCount} ${data.newApplicantsCount === 1 ? "postulante nuevo" : "postulantes nuevos"}.`
        : "Esta semana no recibiste postulantes nuevos."
    }</p>
    <p style="margin: 0;">${jobsLine}</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.newApplicantsCount} postulantes nuevos esta semana en tus búsquedas.`,
    heading: "Impacto semanal",
    metric: { value: String(data.newApplicantsCount), label: "postulantes esta semana" },
    bodyHtml,
    ctaLabel: "Ver postulantes",
    ctaHref: data.panelUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.panelUrl}`) };
}
