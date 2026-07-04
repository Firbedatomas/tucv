import { NextResponse } from "next/server";
import { listPublicCandidates } from "@/lib/public-candidates-list";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listPublicCandidates();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [], stats: { totalVisible: 0, newToday: 0, activeToday: 0, topCategory: null } });
  }
}
