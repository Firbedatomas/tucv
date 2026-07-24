import { createHmac, timingSafeEqual } from "node:crypto";

// Token de baja para los emails a empresas detectadas.
//
// Estas empresas NUNCA se registraron en TuCV: el perfil se creó a partir de
// datos públicos. Por eso el mail tiene que traer una forma de decir "no me
// escribas más" que funcione de un clic, sin cuenta, sin login y sin
// contestar un mail. Es la contrapartida mínima de escribirle a alguien que no
// lo pidió.
//
// HMAC en vez de guardar un token por fila: no hace falta migrar la colección
// (una migración la aprueba una persona, ver lib/intelligence/policy.ts) y no
// se puede adivinar el token de otro negocio a partir del propio.

function secreto(): string {
  return process.env.SOURCED_OPTOUT_SECRET || "";
}

export function generarTokenBaja(businessId: string, clave = secreto()): string {
  if (!clave || !businessId) return "";
  const firma = createHmac("sha256", clave).update(businessId).digest("base64url").slice(0, 32);
  return `${businessId}.${firma}`;
}

/**
 * Devuelve el id del negocio si el token es válido, o null.
 *
 * Comparación en tiempo constante: sin eso, se podría inferir la firma byte a
 * byte midiendo cuánto tarda en rechazar.
 */
export function verificarTokenBaja(token: string, clave = secreto()): string | null {
  if (!clave || !token) return null;
  const punto = token.lastIndexOf(".");
  if (punto <= 0) return null;

  const businessId = token.slice(0, punto);
  const recibida = token.slice(punto + 1);
  const esperada = createHmac("sha256", clave).update(businessId).digest("base64url").slice(0, 32);

  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? businessId : null;
}
