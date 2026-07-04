import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

async function resolveOwnerBusiness(token: string) {
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  await client.collection("users").authRefresh();
  const userId = client.authStore.record?.id;
  if (!userId) throw new Error("no-user");
  return client.collection("business_accounts").getFirstListItem(`user="${userId}"`);
}

// Una celda CSV segura: comillas dobladas y el campo entre comillas si tiene
// coma, comilla o salto de línea. Prefijo ' ante =+-@ para evitar inyección de
// fórmulas si el CSV se abre en Excel/Sheets.
function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Export CSV de las postulaciones recibidas por la empresa (sus propias
// búsquedas). Datos que la empresa ya ve en su panel de postulantes -- es su
// data, para su CRM. No exporta perfiles ajenos.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let business;
  try {
    business = await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = await pbAdmin();
    const applications = await admin.collection("applications").getFullList({
      filter: admin.filter("job_post.business = {:b}", { b: business.id }),
      expand: "candidate,job_post",
      sort: "-created",
      requestKey: null,
    });

    const header = ["Fecha", "Búsqueda", "Candidato", "WhatsApp", "Zona", "Estado", "Puntaje"];
    const rows = applications.map((a) => {
      const c = (a.expand?.candidate ?? {}) as Record<string, unknown>;
      const j = (a.expand?.job_post ?? {}) as Record<string, unknown>;
      return [
        String(a.created).slice(0, 10),
        (j.role as string) || (j.name as string) || "",
        (c.name as string) || "",
        (c.whatsapp as string) || "",
        (c.city_zone as string) || "",
        (a.status as string) || "",
        a.score != null ? String(a.score) : "",
      ];
    });

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    // BOM para que Excel abra los acentos bien.
    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="postulaciones-tucv.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo exportar." }, { status: 500 });
  }
}
