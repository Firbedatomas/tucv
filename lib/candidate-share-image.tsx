import { ImageResponse } from "next/og";
import { getPublicCandidateCard } from "@/lib/public-candidates-list";
import { CandidateShareCard } from "@/lib/candidate-share-card";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const SHARE_IMAGE_SIZE = { width: 1080, height: 1350 };

// La imagen cambia poco (solo si el perfil cambia). Cachearla evita re-renderizar
// con Satori en cada request -> carga mucho más rápida al compartir en X/IG y
// en el CDN/crawlers de las redes.
const SHARE_IMAGE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

// Mismo patrón que lib/job-share-image.tsx: compartido entre
// opengraph-image.tsx y share-image/route.tsx para no repetir el fetch +
// fallback + ImageResponse dos veces.
export async function renderCandidateShareImage({
  slug,
  variant,
  size,
}: {
  slug: string;
  variant: "landscape" | "portrait";
  size: { width: number; height: number };
}): Promise<ImageResponse> {
  const candidate = await getPublicCandidateCard(slug);

  if (!candidate) {
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
      { ...size, headers: SHARE_IMAGE_HEADERS },
    );
  }

  return new ImageResponse(
    <CandidateShareCard candidate={candidate} url={`${BASE_URL}/p/${slug}`} variant={variant} />,
    { ...size, headers: SHARE_IMAGE_HEADERS },
  );
}
