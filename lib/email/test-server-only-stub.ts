// Vitest corre en Node, no a través del bundler de Next -- así que nunca
// aplica la condición "browser"/"react-server" que hace que
// `import "server-only"` sea un no-op fuera de un Server Component. Sin
// este stub, cualquier módulo que lo importe (pocketbase-admin.ts,
// send.ts, etc.) tira su error a propósito ("This module cannot be
// imported from a Client Component") apenas se lo importa en un test.
export {};
