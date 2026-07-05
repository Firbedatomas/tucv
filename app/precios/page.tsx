import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

const PLAN_PRO_PRICE_ARS = Number(process.env.MERCADOPAGO_PLAN_PRO_PRICE || "9900");
const JOB_BOOST_PRICE_ARS = Number(process.env.MERCADOPAGO_JOB_BOOST_PRICE || "4900");
const MULTI_LOCAL_PRICE_ARS = Number(process.env.MERCADOPAGO_MULTI_LOCAL_PRICE || "39900");
const fmt = (n: number) => new Intl.NumberFormat("es-AR").format(n);

export const metadata: Metadata = {
  title: "Precios y planes — TuCV",
  description:
    "Buscar trabajo es gratis. Publicar una búsqueda básica también. Pagás solo si querés más visibilidad o publicar varias búsquedas a la vez.",
  alternates: { canonical: "/precios" },
};

const FREE_FEATURES = [
  "1 búsqueda activa a la vez, dura 7 días",
  "1 búsqueda nueva por mes",
  "QR y link público para compartir",
  "Panel de postulantes ordenado, sin CVs sueltos por mail",
  "Filtros por rubro, zona, experiencia, disponibilidad y movilidad",
  "Buscar candidatos que ya cargaron su perfil",
];

const BOOST_FEATURES = [
  "Tu búsqueda destacada en la home por 7 días",
  "Más visibilidad frente a las demás búsquedas activas",
  "Preguntas filtro para ordenar postulantes",
  "Ranking automático de quien responde mejor",
];

const PRO_FEATURES = [
  "Búsquedas activas ilimitadas al mismo tiempo, sin límite de 1 por mes",
  "Cada búsqueda dura 30 días (no 7) y arranca destacada, sin pagar boost aparte",
  "Más contactos e invitaciones por día",
  "Alertas de candidatos compatibles con tus búsquedas",
  "Mini-CRM completo: guardá candidatos con notas y estados",
  "Prioridad en tu zona y rubro",
  "Todo lo del plan Gratis",
];

const MULTI_LOCAL_FEATURES = [
  "Hasta 10 búsquedas activas al mismo tiempo",
  "Cada búsqueda nueva arranca destacada, sin pagar boost aparte",
  "Invitá hasta 10 miembros de tu equipo a revisar búsquedas y postulantes",
  "Base propia de candidatos y reporte por búsqueda",
  "Soporte prioritario",
  "Todo lo del plan Pro",
];

export default function PreciosPage() {
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">
          Precios simples para contratar más rápido
        </h1>
        <p className="text-sm mb-10 text-center" style={{ color: "var(--tucv-muted)" }}>
          Buscar trabajo es gratis. Publicar una búsqueda básica también. Pagás solo si querés más
          visibilidad, más velocidad o más búsquedas activas.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-muted)" }}>
              Postulantes
            </p>
            <h2 className="text-xl font-bold mb-1">Siempre gratis</h2>
            <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
              Cargá tu perfil una vez y postulate a los trabajos que quieras cerca tuyo.
            </p>
            <LinkButton href="/postulante/nuevo" className="w-full">
              Crear mi perfil
            </LinkButton>
          </Card>

          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-muted)" }}>
              Negocios · plan Gratis
            </p>
            <h2 className="text-xl font-bold mb-1">$0</h2>
            <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
              Probá TuCV con una búsqueda simple y recibí postulantes ordenados.
            </p>
            <ul className="text-sm space-y-2 mb-5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span style={{ color: "var(--tucv-primary)" }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <LinkButton href="/empresa/registro" variant="secondary" className="w-full">
              Crear búsqueda gratis
            </LinkButton>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-muted)" }}>
              Búsqueda destacada
            </p>
            <h2 className="text-xl font-bold mb-1">${fmt(JOB_BOOST_PRICE_ARS)}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
              Para cuando necesitás cubrir el puesto rápido.
            </p>
            <ul className="text-sm space-y-2 mb-5">
              {BOOST_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span style={{ color: "var(--tucv-primary)" }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Se activa desde el panel de tu búsqueda, pagando con Mercado Pago.
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tucv-muted)" }}>
                Negocios · plan Pro
              </p>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
              >
                Pro
              </span>
            </div>
            <h2 className="text-xl font-bold mb-1">${fmt(PLAN_PRO_PRICE_ARS)} / mes</h2>
            <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
              Para cubrir puestos más rápido y contratar seguido.
            </p>
            <ul className="text-sm space-y-2 mb-5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span style={{ color: "var(--tucv-primary)" }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Se activa desde{" "}
              <Link href="/empresa/perfil" className="font-semibold underline" style={{ color: "var(--tucv-primary)" }}>
                Mi negocio
              </Link>
              , pagando con Mercado Pago. Necesitás una cuenta de negocio creada primero.
            </p>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="mb-4 sm:mb-0">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-muted)" }}>
                Para franquicias, sucursales o equipos que contratan seguido
              </p>
              <h2 className="text-lg font-bold mb-1">
                Plan Equipo — ${fmt(MULTI_LOCAL_PRICE_ARS)} / mes
              </h2>
              <ul className="text-sm space-y-1 mb-3 sm:mb-0" style={{ color: "var(--tucv-muted)" }}>
                {MULTI_LOCAL_FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                Se activa desde{" "}
                <Link href="/empresa/perfil" className="font-semibold underline" style={{ color: "var(--tucv-primary)" }}>
                  Mi negocio
                </Link>
                , pagando con Mercado Pago.
              </p>
            </div>
            <LinkButton href="/empresa/perfil" variant="secondary" className="shrink-0">
              Actualizar a Plan Equipo
            </LinkButton>
          </Card>
        </div>
      </div>
    </main>
  );
}
