import { getPublicJobsForApi } from "@/lib/public-api";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// RSS 2.0 de búsquedas activas por ciudad -> /feed/cordoba.xml (o /feed/cordoba).
// Sirve a sitios barriales, newsletters, bots y páginas de municipios que
// quieran republicar búsquedas de su zona. Solo contenido público de avisos.
export async function GET(_req: Request, { params }: { params: Promise<{ city: string }> }) {
  const raw = (await params).city || "";
  const city = decodeURIComponent(raw).replace(/\.xml$/i, "").trim();
  const cityLabel = city ? titleCase(city) : "todo el país";

  let itemsXml = "";
  try {
    const jobs = await getPublicJobsForApi(city, 50);
    itemsXml = jobs
      .map((j) => {
        const pubDate = new Date(j.createdAt).toUTCString();
        return `    <item>
      <title>${escapeXml(`${j.title} — ${j.business || "TuCV"}`)}</title>
      <link>${escapeXml(j.url)}</link>
      <guid isPermaLink="true">${escapeXml(j.url)}</guid>
      <category>${escapeXml(j.categoryLabel)}</category>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(`${j.categoryLabel} en ${j.zone}`)}</description>
    </item>`;
      })
      .join("\n");
  } catch {
    itemsXml = "";
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TuCV — Búsquedas en ${escapeXml(cityLabel)}</title>
    <link>${BASE_URL}/busquedas</link>
    <description>Búsquedas laborales activas en ${escapeXml(cityLabel)} publicadas en TuCV.</description>
    <language>es-AR</language>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
