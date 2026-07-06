// Serializa un objeto para inyectar como <script type="application/ld+json">.
// JSON.stringify NO escapa "<", asi que un campo controlado por el usuario (ej.
// el puesto de la busqueda, el nombre del negocio, la zona) podria contener
// "</script><script>alert(document.cookie)</script>" y romper el tag para
// ejecutar JS (XSS stored) en la pagina publica /b/... para cualquier visitante
// -- explotable incluso escribiendo directo a PocketBase, saltandose el form.
// Escapamos los caracteres que cierran el tag / cambian de contexto ("<", ">",
// "&") y los separadores de linea U+2028/U+2029 (validos en JSON, rompen JS).
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
