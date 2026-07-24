// `ImageResponse` (next/og) devuelve el PNG como stream, así que Next lo sirve
// siempre con `Transfer-Encoding: chunked` y sin `Content-Length`. Los crawlers
// de imagen de X/Facebook/WhatsApp son quisquillosos con eso y a veces descartan
// la respuesta -- síntoma: la card sale con título y dominio pero con el
// placeholder gris en lugar de la imagen (2026-07-24, /b/bonafide/oz3p1g en X).
//
// Bufereamos el PNG una sola vez (son ~70 KB, ya se generó entero en memoria de
// todas formas) y lo devolvemos con el largo explícito. Caddy no comprime
// image/png, así que el header sobrevive el reverse proxy.
//
// Solo sirve en rutas `force-dynamic`. En una ruta de imagen prerenderizada
// (app/opengraph-image.tsx, el OG global) Next guarda el content-length en el
// .meta pero lo descarta al servir el body cacheado, así que ahí no se usa.
export async function withContentLength(image: Response): Promise<Response> {
  const body = await image.arrayBuffer();
  const headers = new Headers(image.headers);
  headers.set("Content-Length", String(body.byteLength));

  return new Response(body, { status: image.status, headers });
}
