import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

// Aviso a una empresa DETECTADA (no registrada en TuCV) de que hay candidatos
// de su zona interesados en trabajar ahí.
//
// Es el único mail que TuCV le manda a alguien que no se registró, así que el
// tono importa: se dice de entrada de dónde salieron sus datos, no se simula
// una relación previa, y la baja está a un clic. Si esto se siente como spam,
// no sirve -- el objetivo es que el dueño quiera ver quién lo está buscando.
export function buildSourcedInterestOutreachEmail(data: {
  businessName: string;
  interested: number;
  cityZone: string;
  claimUrl: string;
  optOutUrl: string;
}): RenderedEmail {
  const gente =
    data.interested === 1
      ? "1 persona de tu zona quiere"
      : `${data.interested} personas de tu zona quieren`;
  const subject =
    data.interested === 1
      ? `Alguien quiere trabajar en ${data.businessName}`
      : `${data.interested} personas quieren trabajar en ${data.businessName}`;

  const zona = data.cityZone ? ` en ${data.cityZone}` : "";
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">Hola,</p>
    <p style="margin: 0 0 12px 0;">
      Somos TuCV, una plataforma de empleo de cercanía en Argentina.
      <strong>${gente} trabajar en ${data.businessName}</strong>${zona}.
    </p>
    <p style="margin: 0 0 12px 0;">
      Armamos una ficha de tu negocio a partir de información pública para que esas personas
      pudieran marcarlo. Todavía no la administra nadie: si la reclamás, vas a poder ver
      quiénes son y contactarlos. Es gratis y no hace falta publicar nada.
    </p>
    <p style="margin: 0;">
      Si no te interesa, con el enlace de abajo damos de baja la ficha y no te escribimos más.
    </p>
  `;

  const html = renderEmailLayout({
    preheader: `${gente} trabajar en ${data.businessName}.`,
    heading: "Hay gente que quiere trabajar con vos",
    bodyHtml,
    ctaLabel: "Ver quiénes están interesados",
    ctaHref: data.claimUrl,
    unsubscribeHref: data.optOutUrl,
  });

  return {
    subject,
    html,
    text: stripHtmlForText(`${bodyHtml}\n\n${data.claimUrl}\n\nDar de baja: ${data.optOutUrl}`),
  };
}
