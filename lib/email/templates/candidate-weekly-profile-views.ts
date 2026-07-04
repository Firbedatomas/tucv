import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildCandidateWeeklyProfileViewsEmail(data: {
  name: string;
  viewsCount: number;
  profileUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = "Impacto semanal: quién vio tu perfil laboral";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola ${data.name || ""},</p>
    <p style="margin: 0;">Esta semana tu perfil recibió visitas. Si todavía no lo hiciste, compartilo por WhatsApp o activá tu visibilidad pública para que más negocios de tu zona lo encuentren.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.viewsCount} visitas a tu perfil esta semana.`,
    heading: "Tu perfil está en movimiento",
    metric: { value: String(data.viewsCount), label: data.viewsCount === 1 ? "visita esta semana" : "visitas esta semana" },
    bodyHtml,
    ctaLabel: "Ver mi perfil",
    ctaHref: data.profileUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.profileUrl}`) };
}
