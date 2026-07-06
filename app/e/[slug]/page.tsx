import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSourcedBusinessBySlug } from "@/lib/sourced";
import { UnverifiedBusiness } from "@/components/sourced/UnverifiedBusiness";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const biz = await getSourcedBusinessBySlug(slug);
  if (!biz) return { title: "Empresa no encontrada · TuCV" };
  return {
    title: `${biz.name} · TuCV`,
    description: `${biz.name}${biz.cityZone ? ` — ${biz.cityZone}` : ""}. Perfil detectado públicamente, sin verificar.`,
    // Perfil no verificado: no lo queremos indexado como si fuera contenido
    // oficial de la empresa hasta que lo reclamen.
    robots: { index: false, follow: false },
  };
}

export default async function SourcedBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const biz = await getSourcedBusinessBySlug(slug);
  if (!biz) notFound();

  const sourceLabel = SOURCE_LABELS[biz.sourceType] || "una fuente pública";
  const detectedDate = new Date(biz.detectedAt).toLocaleDateString("es-AR");

  return (
    <main className="flex-1 px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto">
        {/* Encabezado del negocio */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="shrink-0 w-12 h-12 rounded-[var(--tucv-radius)] flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)", color: "var(--tucv-muted)" }}
            aria-hidden
          >
            {biz.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{biz.name}</h1>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              {[biz.rubro, biz.cityZone].filter(Boolean).join(" · ") || "Empresa"}
            </p>
          </div>
        </div>

        {biz.claimed ? (
          <div
            className="rounded-[var(--tucv-radius)] px-4 py-3 mb-6 text-sm font-semibold"
            style={{ backgroundColor: "#E4F2E9", color: "#12854A", border: "1.5px solid #12854A" }}
          >
            ✓ Esta empresa ya administra su página en TuCV.
          </div>
        ) : (
          <div
            className="rounded-[var(--tucv-radius)] px-4 py-3 mb-6 text-sm"
            style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
          >
            <strong>Perfil no verificado.</strong> Lo armamos a partir de {sourceLabel} para conectar a esta
            empresa con candidatos de su zona. ¿Sos el dueño?{" "}
            <a
              href={`/empresa/login?next=${encodeURIComponent(`/e/${biz.slug}`)}`}
              className="font-bold underline"
              style={{ color: "var(--tucv-text)" }}
            >
              Reclamá tu página gratis
            </a>
            .
          </div>
        )}

        <UnverifiedBusiness businessName={biz.name} claimed={biz.claimed} jobs={biz.jobs} />

        <p className="text-xs mt-6" style={{ color: "var(--tucv-muted)" }}>
          Detectado en {sourceLabel} · {detectedDate}. Si sos el dueño y no querés aparecer,{" "}
          <a href="/contacto" className="underline">
            escribinos
          </a>{" "}
          y lo damos de baja.
        </p>
      </div>
    </main>
  );
}
