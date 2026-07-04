import { SHARE_IMAGE_SIZE, renderJobShareImage } from "@/lib/job-share-image";

// Variante vertical (1080x1350) pensada para el flujo de Web Share API hacia
// Instagram -- a diferencia de opengraph-image.tsx (que Next conecta solo al
// og:image/Twitter Card), esta ruta se fetchea a mano desde
// ShareButtons.tsx para adjuntar la imagen como archivo real, porque
// Instagram no tiene link unfurling.
//
// Ver también la nota en app/b/[slug]/page.tsx -- mismo riesgo de cacheo
// del fetch interno de getPublicJob() si falta este export.
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderJobShareImage({
    identifier: slug,
    canonicalPath: `/b/${slug}`,
    variant: "portrait",
    size: SHARE_IMAGE_SIZE,
  });
}
