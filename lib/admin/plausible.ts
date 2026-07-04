import "server-only";

const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY;
const PLAUSIBLE_BASE_URL = process.env.PLAUSIBLE_BASE_URL || "https://analytics.tucv.ar";
const PLAUSIBLE_SITE_ID = process.env.PLAUSIBLE_SITE_ID || "tucv.ar";

export function isPlausibleConfigured(): boolean {
  return Boolean(PLAUSIBLE_API_KEY);
}

type QueryResult = { results: { dimensions: string[]; metrics: number[] }[] };

async function queryPlausible(body: Record<string, unknown>): Promise<QueryResult | null> {
  if (!PLAUSIBLE_API_KEY) return null;
  try {
    const res = await fetch(`${PLAUSIBLE_BASE_URL}/api/v2/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PLAUSIBLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: PLAUSIBLE_SITE_ID, ...body }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as QueryResult;
  } catch {
    return null;
  }
}

export type VisitStats = { visitors: number; pageviews: number; bounceRate: number | null };

export async function getVisitStats(dateRange: string | [string, string] = "30d"): Promise<VisitStats | null> {
  const data = await queryPlausible({ metrics: ["visitors", "pageviews", "bounce_rate"], date_range: dateRange });
  const row = data?.results?.[0];
  if (!row) return null;
  const [visitors, pageviews, bounceRate] = row.metrics;
  return { visitors: visitors ?? 0, pageviews: pageviews ?? 0, bounceRate: bounceRate ?? null };
}

export type TimeseriesPoint = { date: string; visitors: number; pageviews: number };

export async function getVisitsTimeseries(
  dateRange: string | [string, string] = "30d"
): Promise<TimeseriesPoint[] | null> {
  const data = await queryPlausible({
    metrics: ["visitors", "pageviews"],
    dimensions: ["time:day"],
    date_range: dateRange,
  });
  if (!data) return null;
  return data.results.map((r) => ({
    date: r.dimensions[0],
    visitors: r.metrics[0] ?? 0,
    pageviews: r.metrics[1] ?? 0,
  }));
}

export type GoalCounts = Record<string, { visitors: number; events: number }>;

// Ojo: para que un evento custom aparezca acá, además de mandarse con
// plausible(nombre) (ver lib/track.ts y lib/plausible-server.ts) hay que
// darlo de alta como "Custom Event Goal" en Site Settings -> Goals de
// analytics.tucv.ar con el mismo nombre exacto -- si no, Plausible lo
// guarda pero esta consulta no lo va a traer.
export async function getGoalCounts(
  goals: string[],
  dateRange: string | [string, string] = "30d"
): Promise<GoalCounts | null> {
  const data = await queryPlausible({
    metrics: ["visitors", "events"],
    dimensions: ["event:goal"],
    date_range: dateRange,
    filters: [["is", "event:goal", goals]],
  });
  if (!data) return null;
  const byGoal: GoalCounts = {};
  for (const goal of goals) byGoal[goal] = { visitors: 0, events: 0 };
  for (const row of data.results) {
    const [goal] = row.dimensions;
    byGoal[goal] = { visitors: row.metrics[0] ?? 0, events: row.metrics[1] ?? 0 };
  }
  return byGoal;
}
