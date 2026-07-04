// Puente de una sola lectura entre el login con Google y la pantalla
// siguiente (completar perfil): authWithOAuth2 devuelve nombre/foto en
// `meta`, pero eso se pierde en la navegación de página a página -- lo
// guardamos acá un instante y se borra al leerlo, para no dejar datos
// viejos de una sesión anterior prellenando un formulario nuevo.
const KEY = "tucv_google_profile_hint";

export type GoogleProfileHint = { name?: string; avatarUrl?: string };

export function stashGoogleProfile(hint: GoogleProfileHint) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(hint));
  } catch {
    // sessionStorage puede fallar en navegación privada; no es crítico, el
    // formulario simplemente no se prellena.
  }
}

export function consumeGoogleProfile(): GoogleProfileHint | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as GoogleProfileHint;
  } catch {
    return null;
  }
}
