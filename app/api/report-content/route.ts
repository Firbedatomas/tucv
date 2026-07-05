import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const CONTENT_TYPES = new Set(["reference", "recommendation"]);
const REASONS = new Set(["falsa", "ofensiva", "spam", "otro"]);
const HOUR = 60 * 60 * 1000;

// Un visitante reporta una referencia/recomendación puntual de un perfil
// público. Sin cuenta: rate-limit por IP para frenar spam. Queda pending para
// que el admin lo revise (nada se oculta solo).
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => ({}));
  const contentType = CONTENT_TYPES.has(body.contentType) ? body.contentType : "";
  const contentId = typeof body.contentId === "string" ? body.contentId.trim().slice(0, 40) : "";
  const reason = REASONS.has(body.reason) ? body.reason : "";
  const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 800) : "";

  if (!contentType || !contentId || !reason) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const rl = checkRateLimit({ key: `content_report_ip:${ip}`, limit: 10, windowMs: HOUR });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Demasiados reportes. Probá más tarde." }, { status: 429 });
  }

  try {
    const admin = await pbAdmin();
    await admin.collection("content_reports").create({
      content_type: contentType,
      content_id: contentId,
      reason,
      detail,
      reporter_ip: ip,
      status: "pending",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el reporte." }, { status: 500 });
  }
}
