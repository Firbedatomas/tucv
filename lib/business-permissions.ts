import type { BusinessRole } from "@/lib/business-access";

// Matriz de permisos por rol dentro de un negocio. `owner` es el dueño (fila
// en business_accounts); `admin` y `reviewer` son colaboradores
// (business_members.role). Un mismo helper se usa en la UI (mostrar/ocultar
// acciones) y, donde hay datos o mutaciones sensibles, TAMBIÉN en el server
// (rutas con pbAdmin) -- ocultar un botón en la UI no es control de acceso.

export function canManageBusiness(role: BusinessRole | null): boolean {
  // Editar datos del negocio, cambiar el plan, borrar la cuenta. Solo dueño.
  return role === "owner";
}

export function canInviteTeam(role: BusinessRole | null): boolean {
  // Invitar / sacar colaboradores. Dueño y admin. (El server lo revalida en
  // /api/business-invites resolviendo la membresía del que llama.)
  return role === "owner" || role === "admin";
}

export function canSourceCandidates(role: BusinessRole | null): boolean {
  // Búsqueda proactiva de candidatos (/empresa/candidatos). Dueño y admin.
  return role === "owner" || role === "admin";
}

export function canManageJobs(role: BusinessRole | null): boolean {
  // Crear / editar / pausar / potenciar / borrar búsquedas.
  //
  // HOY: solo dueño. Las mutaciones de búsqueda todavía se hacen client-side
  // contra PocketBase, y las reglas de job_posts (create/update/delete) son
  // business.user = auth.id (solo dueño). No se puede abrir a `admin` a nivel
  // regla sin arriesgar escalación: una back-relation con `?=` no correlaciona
  // "esta fila es del que llama" con "esta fila es admin" en el MISMO registro,
  // así que un reviewer heredaría admin si el negocio tiene algún admin. Para
  // darle esto a admin de forma segura hay que mover las mutaciones de
  // búsqueda a rutas server que chequeen el rol en JS. Hasta entonces, admin
  // colabora (revisa postulantes, invita, busca candidatos) pero no edita
  // búsquedas.
  return role === "owner";
}

export function canReviewApplicants(role: BusinessRole | null): boolean {
  // Ver postulantes y cambiar su estado / dejar notas internas. Cualquier
  // rol con acceso al negocio. El server (/api/applications/[id]/status)
  // revalida la membresía antes de escribir.
  return role === "owner" || role === "admin" || role === "reviewer";
}

export function roleLabel(role: BusinessRole | null): string {
  switch (role) {
    case "owner":
      return "Dueño";
    case "admin":
      return "Administrador";
    case "reviewer":
      return "Revisor";
    default:
      return "";
  }
}
