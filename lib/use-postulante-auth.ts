"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";

export type CandidateProfileSummary = {
  id: string;
  name: string;
  photoUrl: string | null;
  profileSlug: string;
};

// Ver el comentario en use-business-auth.ts: postulantes y empresas comparten
// la misma colección `users`, así que `isValid` acá exige además un
// candidate_profiles propio (requireRole:false para saltear ese chequeo
// donde hace falta solo la sesión cruda, ej. al crear el primer perfil).
export function usePostulanteAuth({ redirectIfLoggedOut = true, requireRole = true } = {}) {
  const router = useRouter();
  const client = pb();
  // Arranca en `false` a propósito -- ver el comentario en useBusinessAuth
  // (mismo hook hermano): evita el hydration mismatch que sale en cada
  // carga de un usuario logueado si este estado inicial lee la sesión real.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<CandidateProfileSummary | null>(null);
  // Distingue "todavía no until miré el authStore real" de "miré y no hay
  // sesión" -- si el efecto de redirect de abajo corriera con el `false`
  // inicial (puesto ahí solo para matchear el SSR), mandaría a cualquier
  // usuario YA logueado de vuelta al login antes de que este efecto llegue
  // a confirmar la sesión real.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = client.authStore.onChange((_token, record) => {
      setIsAuthenticated(!!record);
      if (!record) {
        setHasProfile(null);
        setProfile(null);
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
    client
      .collection("candidate_profiles")
      // requestKey:null -- ver el comentario equivalente en use-business-auth.ts
      .getFirstListItem(`user="${userId}"`, { requestKey: null })
      .then((record) => {
        setHasProfile(true);
        setProfile({
          id: record.id,
          name: record.name,
          photoUrl: record.photo ? client.files.getURL(record, record.photo) : null,
          profileSlug: record.profile_slug ?? "",
        });
      })
      .catch(() => {
        setHasProfile(false);
        setProfile(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, requireRole]);

  const isValid = requireRole ? isAuthenticated && hasProfile === true : isAuthenticated;

  useEffect(() => {
    if (!redirectIfLoggedOut || !checked) return;
    if (!isAuthenticated) {
      router.replace("/postulante/login");
    } else if (requireRole && hasProfile === false) {
      router.replace("/postulante/nuevo");
    }
  }, [checked, isAuthenticated, hasProfile, requireRole, redirectIfLoggedOut, router]);

  function logout() {
    client.authStore.clear();
    router.push("/postulante/login");
  }

  return {
    isValid,
    isAuthenticated,
    userId: client.authStore.record?.id as string | undefined,
    profile,
    logout,
  };
}
