import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { getOrCreatePreferences } from "@/lib/email/preferences";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

// Mismo patrón de validación que app/api/mercadopago/checkout/route.ts:
// autentica el token del propio usuario contra PocketBase en vez de
// reinventar verificación de JWT.
async function resolveUserId(token: string): Promise<string> {
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  await client.collection("users").authRefresh();
  const userId = client.authStore.record?.id;
  if (!userId) throw new Error("no-user");
  return userId;
}

// getOrCreatePreferences() cubre el único caso que el cliente no puede
// resolver solo: notification_preferences.createRule es null (server-only)
// porque la fila normalmente ya existe -- la crea sola
// onRecordAfterCreateSuccess("users") en pb_hooks/main.pb.js -- pero
// cuentas creadas ANTES de que ese hook existiera no la tienen. Leer/editar
// la fila ya existente, en cambio, lo hace directo el cliente con su propio
// token (listRule/updateRule = "user = @request.auth.id"), sin pasar por
// acá.
export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: null }));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const userId = await resolveUserId(token);
    const prefs = await getOrCreatePreferences(userId);
    return NextResponse.json(prefs);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
