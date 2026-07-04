import { NextResponse } from "next/server";
import { getPublicJobsForApi } from "@/lib/public-api";

export const dynamic = "force-dynamic";

// API pública para terceros (widgets, sitios barriales, municipios). CORS
// abierto porque son búsquedas públicas de solo lectura; nunca expone
// postulantes. Cache corto para no pegarle a la base en cada embed.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = url.searchParams.get("city") || "";
  const limit = Number(url.searchParams.get("limit")) || 50;
  try {
    const jobs = await getPublicJobsForApi(city, limit);
    return NextResponse.json({ city: city || null, count: jobs.length, jobs }, { headers: CORS });
  } catch {
    return NextResponse.json({ city: city || null, count: 0, jobs: [] }, { headers: CORS, status: 200 });
  }
}
