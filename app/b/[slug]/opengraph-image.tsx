import { OG_IMAGE_SIZE, renderJobShareImage } from "@/lib/job-share-image";

// Ver la nota en app/b/[slug]/page.tsx -- mismo riesgo: sin esto, Next
// puede cachear el fetch interno de getPublicJob() (vía PocketBase) como si
// esta imagen fuera estática. Reproducido en la práctica: al compartir una
// búsqueda recién publicada, la primera carga de la imagen podía quedar
// pegada en blanco/no encontrada, y recién la 2da o 3ra visita mostraba el
// resultado correcto.
export const dynamic = "force-dynamic";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderJobShareImage({
    identifier: slug,
    canonicalPath: `/b/${slug}`,
    variant: "landscape",
    size,
  });
}
