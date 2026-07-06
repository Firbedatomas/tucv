import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSourcedBusinessBySlug } from "@/lib/sourced";
import { UnverifiedBusiness } from "@/components/sourced/UnverifiedBusiness";
import { ShareRow } from "@/components/sourced/ShareRow";
import { LogoImg } from "@/components/sourced/LogoImg";
import { TrackView } from "@/components/TrackView";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

const SOURCE_LABELS: Record<string, string> = {
  website: "su sitio web",
  gmaps: "Google Maps",
  instagram: "su Instagram público",
  facebook: "su Facebook público",
  google_jobs: "un aviso público",
  camara: "la cámara de comercio",
  municipio: "una bolsa de empleo pública",
  otro: "una fuente pública",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const biz = await getSourcedBusinessBySlug(slug);
  if (!biz) return { title: "Empresa no encontrada · TuCV" };
  return {
    title: `${biz.name} · TuCV`,
    description: `${biz.name}${biz.cityZone ? ` — ${biz.cityZone}` : ""}. Perfil detectado públicamente, sin verificar.`,
    robots: { index: false, follow: false },
  };
}

function igUrl(ig: string): string {
  if (!ig) return "";
  if (ig.startsWith("http")) return ig;
  return `https://instagram.com/${ig.replace(/^@/, "")}`;
}

export default async function SourcedBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const biz = await getSourcedBusinessBySlug(slug);
  if (!biz) notFound();

  const sourceLabel = SOURCE_LABELS[biz.sourceType] || "una fuente pública";
  const detectedDate = new Date(biz.detectedAt).toLocaleDateString("es-AR");
  const pageUrl = `${BASE_URL}/e/${biz.slug}`;
  const ig = igUrl(biz.instagram);

  return (
    <main className="flex-1 px-4 py-8 sm:py-12">
      <TrackView event="sourced_ver" />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <LogoImg src={biz.logoUrl} name={biz.name} size={64} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{biz.name}</h1>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              {[biz.rubro, biz.cityZone].filter(Boolean).join(" · ") || "Empresa"}
            </p>
          </div>
        </div>

        {/* Estado: reclamada o no verificada */}
        {biz.claimed ? (
          <div className="rounded-[var(--tucv-radius)] px-4 py-3 mb-5 text-sm font-semibold" style={{ backgroundColor: "#E4F2E9", color: "#12854A", border: "1.5px solid #12854A" }}>
            ✓ Esta empresa ya administra su página en TuCV.
          </div>
        ) : (
          <div className="rounded-[var(--tucv-radius)] px-4 py-3 mb-5 text-sm" style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}>
            <strong>Perfil no verificado.</strong> Lo armamos a partir de {sourceLabel} para conectar a esta
            empresa con candidatos de su zona.{" "}
            <a href={`/e/${biz.slug}/reclamar`} className="font-bold underline" style={{ color: "var(--tucv-text)" }}>
              ¿Sos el dueño? Reclamalo gratis
            </a>
            .
          </div>
        )}

        {/* Prueba social */}
        {biz.totalInterest > 0 && (
          <div className="rounded-[var(--tucv-radius)] px-4 py-3 mb-5 text-sm font-semibold" style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)", color: "var(--tucv-text)" }}>
            <span style={{ color: "#128C4A" }}>{biz.totalInterest} persona{biz.totalInterest !== 1 ? "s" : ""}</span>{" "}
            de la zona ya mostr{biz.totalInterest !== 1 ? "aron" : "ó"} interés en esta empresa.
          </div>
        )}

        {/* Búsquedas + Me interesa */}
        <UnverifiedBusiness businessName={biz.name} claimed={biz.claimed} jobs={biz.jobs} />

        {/* Sobre la empresa */}
        <section className="mt-7">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
            Sobre esta empresa
          </h2>
          <div className="rounded-[var(--tucv-radius)] p-4 text-sm space-y-1.5" style={{ border: "2px solid var(--tucv-border)" }}>
            {biz.rubro && <p><span style={{ color: "var(--tucv-muted)" }}>Rubro:</span> {biz.rubro}</p>}
            {biz.cityZone && <p><span style={{ color: "var(--tucv-muted)" }}>Zona:</span> {biz.cityZone}</p>}
            <p style={{ color: "var(--tucv-muted)" }}>
              Detectada en {sourceLabel} · {detectedDate}
              {biz.sourceUrl ? (
                <>
                  {" · "}
                  <a href={biz.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline" style={{ color: "var(--tucv-text)" }}>
                    ver la fuente
                  </a>
                </>
              ) : null}
            </p>
            {(biz.website || ig) && (
              <p className="flex gap-3 pt-1">
                {biz.website && (
                  <a href={biz.website.startsWith("http") ? biz.website : `https://${biz.website}`} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline">
                    Sitio web
                  </a>
                )}
                {ig && (
                  <a href={ig} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline">
                    Instagram
                  </a>
                )}
              </p>
            )}
          </div>
        </section>

        {/* Herramientas: compartir */}
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
            Compartila
          </h2>
          <ShareRow url={pageUrl} text={`Vi que ${biz.name} está buscando personal en TuCV:`} />
        </section>

        {/* Reclamo (dueño) */}
        {!biz.claimed && (
          <section className="mt-6 rounded-[var(--tucv-radius)] p-4" style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}>
            <p className="font-bold mb-1">¿Trabajás acá o sos el dueño?</p>
            <p className="text-sm mb-3" style={{ color: "var(--tucv-muted)" }}>
              Reclamá esta página gratis, tomá el control de tus búsquedas y contactá a los candidatos interesados.
            </p>
            <a
              href={`/e/${biz.slug}/reclamar`}
              className="inline-block text-sm font-bold px-5 py-3 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", border: "2px solid var(--tucv-border)" }}
            >
              Reclamar mi empresa
            </a>
          </section>
        )}

        <p className="text-xs mt-6" style={{ color: "var(--tucv-muted)" }}>
          Perfil generado a partir de información pública. Si sos el dueño y no querés aparecer,{" "}
          <a href="/contacto" className="underline">escribinos</a> y lo damos de baja.
        </p>
      </div>
    </main>
  );
}
