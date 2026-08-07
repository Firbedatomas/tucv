import { ImageResponse } from "next/og";
import { getMemberNumber } from "@/lib/member-number";
import { isMemberKind } from "@/lib/member-card";
import { MemberShareCard, MEMBER_CARD_SIZE } from "@/lib/member-share-card";
import { withContentLength } from "@/lib/share-image-response";

export const dynamic = "force-dynamic";

// PNG vertical (1080x1350) de la tarjeta de miembro: es lo que se descarga y lo
// que se adjunta al compartir por la Web Share API hacia Instagram/historias
// -- mismo formato y mismo patrón que app/p/[slug]/share-image/route.tsx.
//
// La tarjeta de un miembro no cambia nunca (número y fecha quedan fijos), así
// que se puede cachear fuerte y evitar re-renderizar con Satori en cada
// descarga o reintento de compartir.
const HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const id = searchParams.get("id");

  if (!isMemberKind(kind) || !id) {
    return new Response("Parámetros inválidos.", { status: 400 });
  }

  const member = await getMemberNumber(kind, id);
  if (!member) return new Response("No encontrado.", { status: 404 });

  return withContentLength(
    new ImageResponse(
      <MemberShareCard kind={member.kind} number={member.number} joinedAt={member.joinedAt} />,
      { ...MEMBER_CARD_SIZE, headers: HEADERS },
    ),
  );
}
