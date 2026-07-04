"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";

export function FavoriteButton({ jobPostId, candidateId }: { jobPostId: string; candidateId: string }) {
  const [favoriteRecordId, setFavoriteRecordId] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pb()
      .collection("favorites")
      .getFirstListItem(`candidate="${candidateId}" && job_post="${jobPostId}"`, { requestKey: null })
      .then((record) => {
        if (!cancelled) setFavoriteRecordId(record.id);
      })
      .catch(() => {
        if (!cancelled) setFavoriteRecordId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId, jobPostId]);

  async function toggle() {
    setBusy(true);
    try {
      if (favoriteRecordId) {
        await pb().collection("favorites").delete(favoriteRecordId);
        setFavoriteRecordId(null);
      } else {
        const record = await pb().collection("favorites").create({ candidate: candidateId, job_post: jobPostId });
        setFavoriteRecordId(record.id);
      }
    } catch {
      // Best-effort -- si falla (ej. ya lo habías guardado desde otra
      // pestaña) simplemente no cambia el estado visual.
    } finally {
      setBusy(false);
    }
  }

  if (favoriteRecordId === undefined) return null;

  const saved = Boolean(favoriteRecordId);
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="text-xs font-semibold px-2.5 py-1.5 rounded-[var(--tucv-radius)] transition disabled:opacity-50"
      style={
        saved
          ? { backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", border: "2px solid var(--tucv-border)" }
          : { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }
      }
    >
      {saved ? "Guardada" : "Guardar para más tarde"}
    </button>
  );
}
