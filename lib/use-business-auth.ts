"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { resolveBusinessAccess, type BusinessAccess } from "@/lib/business-access";

export type { BusinessRecord, BusinessRole } from "@/lib/business-access";

// Empresas y postulantes autentican contra la MISMA colección `users` de
// PocketBase (Google no distingue "tipo de cuenta") -- por eso `isValid` acá
// no es solo "hay sesión", sino "hay sesión Y hay acceso a un negocio (como
// dueño o como miembro invitado) para ese usuario". Si no se hiciera esta
// distinción, un postulante logueado también pasaría como "empresa válida"
// al compartir el mismo authStore. requireRole:false se usa donde hace
// falta la sesión cruda sin ese chequeo (ej. el propio formulario que crea
// el business_accounts).
export function useBusinessAuth({ redirectIfLoggedOut = true, requireRole = true } = {}) {
  const router = useRouter();
  const client = pb();
  // Arranca en `false` a propósito, aunque `client.authStore.isValid` ya
  // tenga la sesión real disponible acá: el server siempre renderiza sin
  // sesión (no hay localStorage en SSR), así que si este estado inicial lee
  // el valor real, el primer render del cliente no matchea el del server y
  // React tira un hydration mismatch en cada carga de un usuario logueado.
  // El valor real llega igual, un tick después, vía el onChange de abajo.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // null = todavía no se chequeó; false = chequeado, sin acceso; objeto =
  // acceso resuelto (dueño o miembro).
  const [access, setAccess] = useState<BusinessAccess | false | null>(null);
  // Distingue "todavía no miré el authStore real" de "miré y no hay sesión"
  // -- si el efecto de redirect de abajo corriera con el `false` inicial
  // (puesto ahí solo para matchear el SSR), mandaría a cualquier usuario YA
  // logueado de vuelta al login antes de que este efecto confirme la sesión
  // real.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = client.authStore.onChange((_token, record) => {
      setIsAuthenticated(!!record);
      if (!record) {
        setAccess(null);
      }
      setChecked(true);
    }, true);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!requireRole) return;
    const userId = client.authStore.record?.id;
    if (!isAuthenticated || !userId) return;
    resolveBusinessAccess(client, userId)
      .then((resolved) => setAccess(resolved ?? false))
      .catch(() => setAccess(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, requireRole]);

  const isValid = requireRole ? isAuthenticated && !!access : isAuthenticated;

  useEffect(() => {
    if (!redirectIfLoggedOut || !checked) return;
    if (!isAuthenticated) {
      router.replace("/empresa/login");
    } else if (requireRole && access === false) {
      router.replace("/empresa/registro");
    }
  }, [checked, isAuthenticated, access, requireRole, redirectIfLoggedOut, router]);

  function logout() {
    client.authStore.clear();
    router.push("/empresa/login");
  }

  return {
    isValid,
    isAuthenticated,
    userId: client.authStore.record?.id as string | undefined,
    business: access ? access.business : null,
    role: access ? access.role : null,
    membershipId: access ? access.membershipId : null,
    logout,
  };
}
