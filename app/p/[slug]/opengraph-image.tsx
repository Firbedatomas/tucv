import { OG_IMAGE_SIZE, renderCandidateShareImage } from "@/lib/candidate-share-image";

// Ver la nota en app/b/[slug]/opengraph-image.tsx -- mismo riesgo: sin esto
// Next puede cachear el fetch interno de getPublicCandidateCard() como si
// esta imagen fuera estática.
export const dynamic = "force-dynamic";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderCandidateShareImage({ slug, variant: "landscape", size });
}
