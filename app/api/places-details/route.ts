import { NextRequest, NextResponse } from "next/server";
import "server-only";

// Segundo paso del autocomplete: places:autocomplete (route.ts vecino) solo
// da predicciones de texto, nunca componentes estructurados -- para
// ciudad/provincia/país reales hace falta pedir Place Details por placeId
// una vez que la persona elige una sugerencia. Con esto se puede armar el
// fallback de zona (ciudad -> provincia -> país) sin depender de parsear el
// string libre a mano.
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export type PlaceDetails = { city: string; province: string; country: string };

type AddressComponent = { longText?: string; shortText?: string; types?: string[] };

function extractDetails(components: AddressComponent[]): PlaceDetails {
  const findByType = (type: string) => components.find((c) => c.types?.includes(type))?.longText ?? "";
  // CABA no siempre trae "locality" (a veces el barrio queda en
  // sublocality_level_1 y la ciudad real es la provincia/CABA misma) --
  // encadenamos fallbacks en vez de asumir que "locality" siempre está.
  const city = findByType("locality") || findByType("sublocality_level_1") || findByType("administrative_area_level_2");
  const province = findByType("administrative_area_level_1");
  const country = findByType("country");
  return { city, province, country };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim();
  const sessionToken = searchParams.get("sessiontoken") || undefined;

  if (!API_KEY || !placeId) {
    return NextResponse.json({ city: "", province: "", country: "" });
  }

  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "addressComponents",
    },
  });

  // Igual criterio que places-autocomplete: si Google falla, no rompemos el
  // formulario -- el campo de texto libre ya se guardó igual, esto solo suma
  // datos estructurados cuando están disponibles.
  if (!res.ok) {
    return NextResponse.json({ city: "", province: "", country: "" });
  }

  const data = await res.json();
  return NextResponse.json(extractDetails(data.addressComponents ?? []));
}
