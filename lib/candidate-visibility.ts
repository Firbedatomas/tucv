// Reglas de visibilidad de un candidato, centralizadas para que TODO endpoint
// nuevo de la capa de interacción (referencias, recomendaciones, contacto) use
// el mismo criterio y no filtre datos por accidente. Funciones puras (sin
// server-only) para poder testearlas y reusarlas donde haga falta.

// Campos que NUNCA se devuelven en una respuesta pública, sin importar el
// endpoint. Cualquier proyección pública debe excluirlos.
export const NEVER_PUBLIC_FIELDS = [
  "whatsapp",
  "birth_date",
  "age_manual",
  "dni",
  "email",
  "cv_file",
  "references",
  "references_text",
  "edit_token",
  "reference_token",
  "user",
] as const;

// "Juan Pérez García" -> "Juan P." : nombre de pila + inicial del primer
// apellido. Nunca el apellido completo en superficies públicas.
export function publicDisplayName(fullName: string): string {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Alguien";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

// ¿Se puede revelar el WhatsApp del candidato a quien está mirando?
// Regla: solo a una EMPRESA logueada, y solo si el candidato aceptó contacto
// directo (consent_contact) O aceptó una solicitud de contacto puntual.
export function canRevealWhatsApp(ctx: {
  viewerIsCompany: boolean;
  consentContact: boolean;
  hasAcceptedContactRequest?: boolean;
}): boolean {
  if (!ctx.viewerIsCompany) return false;
  return Boolean(ctx.consentContact) || Boolean(ctx.hasAcceptedContactRequest);
}

// Quita del objeto cualquier campo sensible antes de mandarlo a un cliente
// público. Defensa en profundidad: aunque un endpoint haga un select amplio,
// esto lo limpia.
export function stripSensitive<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const clone: Record<string, unknown> = { ...obj };
  for (const f of NEVER_PUBLIC_FIELDS) delete clone[f];
  return clone as Partial<T>;
}
