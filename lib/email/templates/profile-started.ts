import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

// A diferencia del resto de los templates, este no dispara desde un hook de
// PocketBase -- no hay ningún evento de "empezó el perfil pero no lo
// terminó" en este modelo de datos (CandidateForm guarda todo el perfil de
// una sola vez, no hay borrador parcial). Dispara desde app/api/cron/daily:
// usuarios con cuenta de Google creada hace más de 24hs que todavía no
// tienen ni candidate_profiles ni business_accounts.
export function buildProfileStartedEmail(data: {
  createProfileUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const subject = "Te falta poco para aparecer mejor en TuCV";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola,</p>
    <p style="margin: 0;">Entraste a TuCV pero todavía no cargaste tu perfil laboral. Te toma unos minutos, y una vez listo podés compartirlo por WhatsApp o dejarlo visible para negocios de tu zona.</p>
  `;
  const html = renderEmailLayout({
    preheader: "Todavía no cargaste tu perfil laboral.",
    heading: "Te falta poco para aparecer mejor",
    bodyHtml,
    ctaLabel: "Completar mi perfil",
    ctaHref: data.createProfileUrl,
    preferencesHref: data.preferencesUrl,
    unsubscribeHref: data.unsubscribeUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.createProfileUrl}`) };
}
