import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";

async function isTaken(base: string, excludeId: string | null): Promise<boolean> {
  const client = await pbAdmin();
  const filter = excludeId
    ? client.filter("profile_slug = {:slug} && id != {:id}", { slug: base, id: excludeId })
    : client.filter("profile_slug = {:slug}", { slug: base });
  const result = await client.collection("candidate_profiles").getList(1, 1, { filter });
  return result.totalItems > 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const base = (searchParams.get("base") || "").trim();
  const excludeId = searchParams.get("excludeId");

  if (!base) {
    return NextResponse.json({ error: "missing_base" }, { status: 400 });
  }

  try {
    if (!(await isTaken(base, excludeId))) {
      return NextResponse.json({ slug: base, changed: false });
    }
    for (let i = 2; i <= 50; i++) {
      const candidate = `${base}-${i}`;
      if (!(await isTaken(candidate, excludeId))) {
        return NextResponse.json({ slug: candidate, changed: true });
      }
    }
    return NextResponse.json({ slug: `${base}-${Date.now().toString().slice(-6)}`, changed: true });
  } catch {
    return NextResponse.json({ slug: base, changed: false });
  }
}
