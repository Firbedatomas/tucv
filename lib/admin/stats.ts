import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import {
  computeCandidateBreakdown,
  CANDIDATE_BREAKDOWN_FIELDS,
  type CandidateBreakdownInput,
} from "@/lib/candidate-stats";
import { CATEGORIES, labelFor } from "@/lib/constants";

// Argentina no tiene horario de verano hace años -> UTC-3 fijo alcanza para
// calcular "hoy" sin depender de la timezone del contenedor (que corre en
// UTC) ni sumar una librería de fechas.
function startOfTodayArgentinaISO(): string {
  const now = new Date();
  const arNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(arNow.getUTCFullYear(), arNow.getUTCMonth(), arNow.getUTCDate(), 3, 0, 0)
  ).toISOString();
}

export type DashboardStats = {
  negocios: { total: number; hoy: number };
  postulantes: {
    total: number;
    hoy: number;
    visiblesEmpresas: number;
    perfilPublico: number;
    incompletos: number;
    ocultos: number;
  };
  postulaciones: { total: number; hoy: number };
  avisosActivos: number;
  pagos: {
    totalAprobado: number;
    hoyAprobado: number;
    cantidadHoy: number;
    porTipo: Record<string, number>;
  };
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = await pbAdmin();
  const todayISO = startOfTodayArgentinaISO();
  const nowISO = new Date().toISOString();
  const todayFilter = admin.filter("created >= {:today}", { today: todayISO });

  const [
    businessesTotal,
    businessesToday,
    candidates,
    applicationsTotal,
    applicationsToday,
    activeJobs,
    approvedPayments,
  ] = await Promise.all([
    admin.collection("business_accounts").getList(1, 1, { requestKey: null }),
    admin.collection("business_accounts").getList(1, 1, { filter: todayFilter, requestKey: null }),
    admin.collection("candidate_profiles").getFullList<CandidateBreakdownInput & { created: string }>({
      fields: CANDIDATE_BREAKDOWN_FIELDS,
      requestKey: null,
    }),
    admin.collection("applications").getList(1, 1, { requestKey: null }),
    admin.collection("applications").getList(1, 1, { filter: todayFilter, requestKey: null }),
    admin.collection("job_posts").getList(1, 1, {
      filter: admin.filter("active = true && expires_at > {:now}", { now: nowISO }),
      requestKey: null,
    }),
    admin.collection("payments").getFullList<{ amount: number; type: string; created: string }>({
      filter: "status = 'approved'",
      fields: "amount,type,created",
      requestKey: null,
    }),
  ]);

  const candidateBreakdown = computeCandidateBreakdown(candidates);
  const candidatesToday = candidates.filter((c) => c.created >= todayISO).length;
  const paymentsToday = approvedPayments.filter((p) => p.created >= todayISO);
  const porTipo: Record<string, number> = {};
  for (const p of approvedPayments) {
    porTipo[p.type] = (porTipo[p.type] ?? 0) + (p.amount ?? 0);
  }

  return {
    negocios: { total: businessesTotal.totalItems, hoy: businessesToday.totalItems },
    postulantes: {
      total: candidateBreakdown.total,
      hoy: candidatesToday,
      visiblesEmpresas: candidateBreakdown.visiblesEmpresas,
      perfilPublico: candidateBreakdown.perfilPublico,
      incompletos: candidateBreakdown.incompletos,
      ocultos: candidateBreakdown.ocultos,
    },
    postulaciones: { total: applicationsTotal.totalItems, hoy: applicationsToday.totalItems },
    avisosActivos: activeJobs.totalItems,
    pagos: {
      totalAprobado: approvedPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0),
      hoyAprobado: paymentsToday.reduce((sum, p) => sum + (p.amount ?? 0), 0),
      cantidadHoy: paymentsToday.length,
      porTipo,
    },
  };
}

const PLAN_LABEL: Record<string, string> = { free: "Gratis", pro: "Pro", multi_local: "Equipo" };

export type BusinessMetrics = {
  planCounts: { label: string; value: number }[];
  conversionRate: number; // % de negocios en un plan pago (pro o multi_local)
  // Ingresos históricos de payments aprobados, agrupados por el plan ACTUAL
  // del negocio que pagó (no por tipo de pago -- eso ya está en
  // DashboardStats.pagos.porTipo). Un negocio que pagó Pro y después subió a
  // Equipo suma todo su historial al lado de Equipo, no de Pro -- es "cuánto
  // generó este segmento de negocios hasta hoy", no un corte histórico
  // congelado en el momento de cada pago.
  revenueByPlan: { label: string; value: number }[];
  activeJobsByCategory: { label: string; value: number }[];
  activeJobsByCity: { label: string; value: number }[];
  candidatesByCategory: { label: string; value: number }[];
};

export async function getBusinessMetrics(): Promise<BusinessMetrics> {
  const admin = await pbAdmin();
  const nowISO = new Date().toISOString();

  const [businesses, approvedPayments, activeJobs, candidates] = await Promise.all([
    admin.collection("business_accounts").getFullList<{ id: string; plan: string }>({
      fields: "id,plan",
      requestKey: null,
    }),
    admin.collection("payments").getFullList<{ amount: number; business: string }>({
      filter: "status = 'approved'",
      fields: "amount,business",
      requestKey: null,
    }),
    admin.collection("job_posts").getFullList<{ category: string; city: string }>({
      filter: admin.filter("active = true && expires_at > {:now}", { now: nowISO }),
      fields: "category,city",
      requestKey: null,
    }),
    admin.collection("candidate_profiles").getFullList<{ categories: string[] }>({
      fields: "categories",
      requestKey: null,
    }),
  ]);

  const planById = new Map<string, string>();
  const planCountsMap: Record<string, number> = { free: 0, pro: 0, multi_local: 0 };
  for (const b of businesses) {
    const plan = b.plan || "free";
    planById.set(b.id, plan);
    planCountsMap[plan] = (planCountsMap[plan] ?? 0) + 1;
  }
  const paidCount = businesses.length - (planCountsMap.free ?? 0);
  const conversionRate = businesses.length > 0 ? (paidCount / businesses.length) * 100 : 0;

  const revenueByPlanMap: Record<string, number> = {};
  for (const p of approvedPayments) {
    // Sin negocio encontrado (borrado, payments.business no cascadea a
    // propósito -- ver 1783159999_created_payments.js) cae en "Otro" en vez
    // de perderse silenciosamente del total.
    const plan = planById.get(p.business) ?? "otro";
    revenueByPlanMap[plan] = (revenueByPlanMap[plan] ?? 0) + (p.amount ?? 0);
  }

  const jobsByCategory: Record<string, number> = {};
  const jobsByCity: Record<string, number> = {};
  for (const j of activeJobs) {
    const cat = j.category || "otro";
    jobsByCategory[cat] = (jobsByCategory[cat] ?? 0) + 1;
    const city = j.city?.trim() || "Sin especificar";
    jobsByCity[city] = (jobsByCity[city] ?? 0) + 1;
  }

  const candidatesByCategory: Record<string, number> = {};
  for (const c of candidates) {
    for (const cat of c.categories ?? []) {
      candidatesByCategory[cat] = (candidatesByCategory[cat] ?? 0) + 1;
    }
  }

  const toSortedRows = (rec: Record<string, number>, labelOf: (k: string) => string) =>
    Object.entries(rec)
      .map(([key, value]) => ({ label: labelOf(key), value }))
      .sort((a, b) => b.value - a.value);

  return {
    planCounts: [
      { label: "Gratis", value: planCountsMap.free ?? 0 },
      { label: "Pro", value: planCountsMap.pro ?? 0 },
      { label: "Equipo", value: planCountsMap.multi_local ?? 0 },
    ],
    conversionRate,
    revenueByPlan: toSortedRows(revenueByPlanMap, (k) => PLAN_LABEL[k] ?? "Otro"),
    activeJobsByCategory: toSortedRows(jobsByCategory, (k) => (k === "otro" ? "Otro" : labelFor(CATEGORIES, k))),
    activeJobsByCity: toSortedRows(jobsByCity, (k) => k),
    candidatesByCategory: toSortedRows(candidatesByCategory, (k) => labelFor(CATEGORIES, k)),
  };
}
