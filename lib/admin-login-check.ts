// Si el usuario que se acaba de loguear con Google es el ADMIN, establece la
// sesión de admin (cookie httpOnly, del lado del servidor) y devuelve true para
// que el caller lo redirija directo a /admin. Así el admin puede entrar desde
// CUALQUIER login (/admin/login, /empresa/login, /postulante/login) y termina
// siempre en el panel de admin, sin tener que acordarse de la ruta.
//
// La decisión "sos admin sí/no" la toma el server: /api/admin/session revalida
// el token de PocketBase contra ADMIN_EMAIL (nunca se expone el email del admin
// al cliente ni se confía en nada del front). Para cualquier otro usuario
// devuelve 403 -> false, y el login sigue su flujo normal.
export async function trySetAdminSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
