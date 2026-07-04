import "server-only";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "TuCV <impacto@tucv.ar>";

let cachedClient: Resend | null = null;

// Igual criterio que MERCADOPAGO_ACCESS_TOKEN en lib/mercadopago-pricing.ts:
// sin la key seteada, las rutas que dependen de esto devuelven un estado
// claro en vez de romper el resto del sitio (útil en dev/local sin
// credenciales de Resend todavía).
export function getResendClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(RESEND_API_KEY);
  return cachedClient;
}
