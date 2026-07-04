import { SHARE_IMAGE_SIZE, renderCandidateShareImage } from "@/lib/candidate-share-image";

// Variante vertical (1080x1350) para el flujo de Web Share API hacia
// Instagram -- ver la nota en app/b/[slug]/share-image/route.tsx, mismo
// patrón exacto.
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderCandidateShareImage({ slug, variant: "portrait", size: SHARE_IMAGE_SIZE });
}
