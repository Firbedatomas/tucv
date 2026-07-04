import { NextRequest, NextResponse } from "next/server";
import "server-only";

// Proxy a Places API (New) -- la API key queda solo acá server-side, nunca
// llega al browser. No pedimos Place Details ni guardamos lat/lng (decisión
// de producto: por ahora el autocomplete solo mejora el texto libre de
// zona/dirección, no habilita búsqueda por cercanía).
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();
  const sessionToken = searchParams.get("sessiontoken") || undefined;

  if (!API_KEY || !input || input.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["ar"],
      languageCode: "es",
      sessionToken,
    }),
  });

  // Si Google Places falla por lo que sea, no rompemos el formulario -- el
  // campo sigue siendo texto libre, simplemente no hay sugerencias.
  if (!res.ok) {
    return NextResponse.json({ suggestions: [] });
  }

  const data = await res.json();
  const suggestions = (data.suggestions ?? [])
    .map((s: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => s.placePrediction)
    .filter((p: unknown): p is { placeId: string; text?: { text?: string } } => !!p)
    .map((p: { placeId: string; text?: { text?: string } }) => ({ placeId: p.placeId, text: p.text?.text ?? "" }))
    .filter((s: { text: string }) => s.text);

  return NextResponse.json({ suggestions });
}
