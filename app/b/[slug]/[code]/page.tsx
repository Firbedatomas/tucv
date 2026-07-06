import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicJob, incrementJobViews, buildJobMetadata, buildJobJsonLd } from "@/lib/public-job";
import { serializeJsonLd } from "@/lib/json-ld";
import { PublicJobClient } from "@/components/public-job/PublicJobClient";

// Ver la nota en app/b/[slug]/page.tsx -- mismo riesgo de cacheo de Next.js
// sobre el fetch interno del SDK de PocketBase.
export const dynamic = "force-dynamic";

// Formato nuevo, más legible: /b/{negocio}/{código corto} en vez del slug
// largo de un solo segmento (/b/negocio-puesto-a-b1c2d). `businessSlug` es
// puramente cosmético/SEO -- la búsqueda real es por `code` (short_code,
// único), así que aunque el negocio cambie de nombre después el link viejo
// sigue resolviendo (getPublicJob busca por slug O por short_code, ver
// lib/public-job.ts).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const job = await getPublicJob(code);
  return buildJobMetadata(job);
}

export default async function PublicJobPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug: businessSlug, code } = await params;
  const job = await getPublicJob(code);
  if (!job) notFound();
  incrementJobViews(job.id);

  const jsonLd = buildJobJsonLd(job);

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      )}
      <PublicJobClient publicPath={`${businessSlug}/${code}`} initialJob={job} />
    </>
  );
}
