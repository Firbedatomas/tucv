import { SHARE_IMAGE_SIZE, renderJobShareImage } from "@/lib/job-share-image";

// Ver la nota en app/b/[slug]/share-image/route.tsx -- misma variante
// vertical para Web Share/Instagram, para el formato nuevo de URL
// (/b/{negocio}/{código}).
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; code: string }> },
) {
  const { slug: businessSlug, code } = await params;
  return renderJobShareImage({
    identifier: code,
    canonicalPath: `/b/${businessSlug}/${code}`,
    variant: "portrait",
    size: SHARE_IMAGE_SIZE,
  });
}
