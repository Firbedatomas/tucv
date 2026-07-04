import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";
import type { RenderedEmail } from "@/lib/email/types";

export function buildTeamInviteEmail(data: { businessName: string; inviteUrl: string }): RenderedEmail {
  const subject = `${data.businessName} te invitó a sumarte en TuCV`;
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;"><strong>${data.businessName}</strong> te invitó a colaborar en su cuenta de TuCV.</p>
    <p style="margin: 0 0 12px 0;">Vas a poder ver sus búsquedas activas y revisar postulantes -- marcar contactado,
    entrevista, contratado o descartado. No vas a poder editar ni crear búsquedas, ni tocar el plan o los datos del
    negocio, eso sigue siendo solo del dueño.</p>
    <p style="margin: 0;">Para aceptar, entrá con tu propia cuenta de Google.</p>
  `;
  const html = renderEmailLayout({
    preheader: `${data.businessName} te invitó a revisar búsquedas y postulantes en TuCV.`,
    heading: "Te invitaron a un equipo en TuCV",
    bodyHtml,
    ctaLabel: "Aceptar invitación",
    ctaHref: data.inviteUrl,
  });
  return { subject, html, text: stripHtmlForText(`${bodyHtml}\n\n${data.inviteUrl}`) };
}
