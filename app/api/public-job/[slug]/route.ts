import { NextResponse } from "next/server";
import { getPublicJob } from "@/lib/public-job";

// Ver la nota en app/b/[slug]/page.tsx -- mismo riesgo de cacheo de Next.js
// sobre el fetch interno del SDK de PocketBase.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getPublicJob(slug);
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(job);
}
