import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicJob, incrementJobViews, buildJobMetadata, buildJobJsonLd } from "@/lib/public-job";
import { serializeJsonLd } from "@/lib/json-ld";
import { PublicJobClient } from "@/components/public-job/PublicJobClient";

// Sin esto, Next.js puede cachear el resultado de getPublicJob() (usa fetch
// por debajo, vía el SDK de PocketBase) como si esta página fuera
// estática -- si la primera visita a un slug pasó ANTES de que la búsqueda
// existiera (ej. mientras se armaba, o justo tras crearla), esa respuesta
// "no encontrada" quedaba cacheada para siempre y la página real nunca se
// veía (reportado en producción: una búsqueda real y activa devolvía 404).
export const dynamic = "force-dynamic";

// Formato heredado: un solo segmento (/b/negocio-puesto-a-b1c2d). Sigue
// funcionando tal cual para no romper links/QRs ya impresos o compartidos
// con esta forma -- el formato nuevo (dos segmentos, más legible) vive en
// app/b/[slug]/[code]/page.tsx. Ambas rutas resuelven el mismo job
// vía getPublicJob() (busca por slug O por short_code).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublicJob(slug);
  return buildJobMetadata(job);
}

export default async function PublicJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getPublicJob(slug);
  if (!job) notFound();
  incrementJobViews(job.id);

  const jsonLd = buildJobJsonLd(job);

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      )}
      <PublicJobClient publicPath={slug} initialJob={job} />
    </>
  );
}
