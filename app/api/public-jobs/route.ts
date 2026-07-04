import { NextResponse } from "next/server";
import { listPublicJobs } from "@/lib/public-jobs-list";

// Sin segmentos dinámicos en la URL, Next.js puede tratar esta ruta como
// estática y cachear la respuesta -- el feed en vivo de la home necesita
// datos frescos en cada pedido (el refetch dispara por evento de tiempo
// real, no tiene sentido si devuelve siempre la misma foto vieja).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await listPublicJobs();
    return NextResponse.json(jobs);
  } catch {
    // Un 503 (no un 500 sin cuerpo, y no un 200 con lista vacía) para que
    // LiveJobsFeed pueda distinguir "todavía no hay búsquedas" de "el
    // backend no responde" -- si no, un error transitorio de PocketBase se
    // ve exactamente igual que un día tranquilo sin publicaciones nuevas.
    return NextResponse.json({ error: "No pudimos cargar las búsquedas." }, { status: 503 });
  }
}
