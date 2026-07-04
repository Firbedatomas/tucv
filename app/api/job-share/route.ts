import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { logActivity } from "@/lib/activity";
import { coarseLocality } from "@/lib/anonymize";

const VALID_PLATFORMS = new Set(["whatsapp", "x", "instagram"]);

// Sin login a propósito -- compartir un link público no requiere sesión.
// Es un contador best-effort (ver nota en la migración de share_counts),
// no algo que necesite estar a prueba de abuso.
export async function POST(req: Request) {
  const { jobId, platform } = await req.json().catch(() => ({ jobId: null, platform: null }));
  if (!jobId || !VALID_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  try {
    const admin = await pbAdmin();
    const job = await admin.collection("job_posts").getOne(jobId, { requestKey: null });
    const counts = { whatsapp: 0, x: 0, instagram: 0, ...(job.share_counts ?? {}) };
    counts[platform] = (counts[platform] ?? 0) + 1;
    await admin.collection("job_posts").update(jobId, { share_counts: counts });
    // Evento público para el feed "en vivo" -- anonimizado al leer (nunca el
    // negocio, solo rubro/zona).
    await logActivity(admin, {
      type: "job_shared",
      actorType: "company",
      zone: coarseLocality((job.address_zone as string) || "", true),
      jobId,
      visibility: "public",
      metadata: { platform, category: (job.category as string) || "" },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "no pudimos registrar el share" }, { status: 500 });
  }
}
