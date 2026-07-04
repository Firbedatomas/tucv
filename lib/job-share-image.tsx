import { ImageResponse } from "next/og";
import { getPublicJob } from "@/lib/public-job";
import { JobShareCard } from "@/lib/job-share-card";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const SHARE_IMAGE_SIZE = { width: 1080, height: 1350 };

// Compartido entre las 4 rutas de imagen (opengraph-image.tsx y
// share-image/route.tsx, una vez por cada formato de URL -- legado
// /b/[slug] y nuevo /b/[slug]/[code], ver lib/public-job.ts) para no
// repetir 4 veces el mismo fetch + fallback + ImageResponse.
export async function renderJobShareImage({
  identifier,
  canonicalPath,
  variant,
  size,
}: {
  identifier: string;
  canonicalPath: string;
  variant: "landscape" | "portrait";
  size: { width: number; height: number };
}): Promise<ImageResponse> {
  const job = await getPublicJob(identifier);

  // Búsqueda no encontrada/vencida -- fondo de marca liso en vez de romper
  // el fetch (de la Twitter Card o del Web Share de Instagram) con un 404.
  if (!job) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FBF3E3",
            fontSize: 56,
            fontWeight: 800,
            color: "#151515",
          }}
        >
          TuCV
        </div>
      ),
      size,
    );
  }

  return new ImageResponse(<JobShareCard job={job} url={`${BASE_URL}${canonicalPath}`} variant={variant} />, size);
}
