import { OG_IMAGE_SIZE, renderJobShareImage } from "@/lib/job-share-image";

// Ver la nota en app/b/[slug]/opengraph-image.tsx -- mismo riesgo de cacheo
// del fetch interno de getPublicJob() si falta este export.
export const dynamic = "force-dynamic";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug: businessSlug, code } = await params;
  return renderJobShareImage({
    identifier: code,
    canonicalPath: `/b/${businessSlug}/${code}`,
    variant: "landscape",
    size,
  });
}
