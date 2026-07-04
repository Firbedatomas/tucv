"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Derecho de acceso/portabilidad (descargar) y de supresión (eliminar) de
// la Ley 25.326 -- ver /privacidad. Reutilizable entre postulante y
// empresa: ambos flujos son "bajate un JSON de tu propio registro" +
// "borrá tu cuenta con confirmación", solo cambia qué se borra.
//
// "Eliminar mi perfil" arranca como link chico y sin color de alarma --
// no es la acción principal de esta pantalla (CLAUDE.md: una acción
// destructiva que no es la primaria de la pantalla no debería competir
// visualmente con la que sí lo es). El rojo sólido y grande queda
// reservado para el botón de "Sí, eliminar" del paso de confirmación,
// que ahí sí es la única acción real de esa mini-pantalla.
export function DataRightsCard({
  data,
  fileNamePrefix,
  onDelete,
  deleteLabel,
  deleteConfirmText,
}: {
  data: Record<string, unknown>;
  fileNamePrefix: string;
  onDelete: () => Promise<void>;
  deleteLabel: string;
  deleteConfirmText: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  function downloadData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNamePrefix}-tucv.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    setDeleting(true);
    setError(false);
    try {
      await onDelete();
    } catch {
      setError(true);
      setDeleting(false);
    }
  }

  return (
    <Card className="mt-4">
      <p className="text-sm font-semibold mb-1">Tus datos</p>
      <p className="text-xs mb-3" style={{ color: "var(--tucv-muted)" }}>
        Derechos de acceso y supresión de datos personales (Ley 25.326) -- ver{" "}
        <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">
          Política de Privacidad
        </a>
        .
      </p>
      <div className="mb-3">
        <Button type="button" variant="secondary" onClick={downloadData}>
          Descargar mis datos
        </Button>
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs underline hover:opacity-70 transition"
          style={{ color: "var(--tucv-muted)" }}
        >
          {deleteLabel}
        </button>
      ) : (
        <div
          className="p-3 rounded-[var(--tucv-radius)] text-sm"
          style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
        >
          <p className="mb-3">{deleteConfirmText}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-bold px-4 py-2 rounded-[var(--tucv-radius)] disabled:opacity-50"
              style={{ backgroundColor: "#DC2626", color: "#fff", border: "2px solid var(--tucv-border)" }}
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-xs underline"
              style={{ color: "var(--tucv-muted)" }}
            >
              Cancelar
            </button>
          </div>
          {error && (
            <p className="text-xs mt-2 font-medium" style={{ color: "#DC2626" }}>
              No pudimos eliminarlo. Probá de nuevo.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
