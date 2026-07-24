import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { verificarTokenBaja } from "@/lib/sourced-optout";

export const dynamic = "force-dynamic";

// Baja de un clic para una empresa detectada. Sin login, sin cuenta, sin
// contestar un mail: le escribimos a alguien que no se registró, así que
// salir tiene que ser más fácil que entrar.
//
// GET a propósito (es un link en un mail). El token es un HMAC del id, así
// que nadie puede dar de baja a un negocio ajeno -- ver lib/sourced-optout.ts.
function pagina(titulo: string, texto: string, status = 200): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titulo} · TuCV</title></head>
<body style="font-family:system-ui,sans-serif;background:#FBF3E3;color:#151515;margin:0;padding:48px 20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border:2px solid #151515;border-radius:4px;box-shadow:3px 3px 0 #151515;padding:32px">
<h1 style="font-size:20px;margin:0 0 12px">${titulo}</h1>
<p style="margin:0;line-height:1.6">${texto}</p>
</div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const businessId = verificarTokenBaja(token);
  if (!businessId) {
    return pagina("Enlace inválido", "Ese enlace no es válido o ya venció. Escribinos a hola@tucv.ar y lo resolvemos.", 400);
  }

  try {
    const admin = await pbAdmin();
    await admin.collection("sourced_businesses").update(businessId, { status: "opted_out" });
  } catch {
    return pagina("No pudimos procesarlo", "Hubo un problema al dar de baja la ficha. Escribinos a hola@tucv.ar y lo hacemos a mano.", 500);
  }

  return pagina(
    "Listo, dimos de baja la ficha",
    "No vas a recibir más mails nuestros y la ficha deja de estar disponible. Gracias por avisarnos.",
  );
}
