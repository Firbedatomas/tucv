import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildJobExpiringEmail(data: {
  businessName: string;
  jobTitle: string;
  expiresInDays: number;
  renewUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = `Tu búsqueda "${data.jobTitle}" vence pronto`;
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola${data.businessName ? ` ${data.businessName}` : ""},</p>
    <p style="margin: 0;">Tu búsqueda <strong>${data.jobTitle}</strong> vence en ${data.expiresInDays === 1 ? "1 día" : `${data.expiresInDays} días`}. Si todavía necesitás cubrir el puesto, renovala para seguir recibiendo postulantes.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.jobTitle} vence en ${data.expiresInDays} días.`,
    heading: "Tu búsqueda vence pronto",
    bodyHtml,
    ctaLabel: "Renovar búsqueda",
    ctaHref: data.renewUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.renewUrl}`) };
}
