"use client";

import { useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { waLink } from "@/lib/whatsapp";
import { emptyCandidateFilters, matchesCandidateFilters } from "@/lib/candidate-filters";
import { Card } from "@/components/ui/Card";
import { CandidateFilterBar } from "@/components/empresa/CandidateFilterBar";
import { CandidateAvatar, CandidateCardBody, type CandidateLike } from "@/components/empresa/CandidateCardBody";

type CandidateCounts = {
  total: number;
  visiblesEmpresas: number;
  perfilPublico: number;
  incompletos: number;
  ocultos: number;
};

export function CandidateSearch() {
  const [candidates, setCandidates] = useState<CandidateLike[] | null>(null);
  const [counts, setCounts] = useState<CandidateCounts | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revealedContactId, setRevealedContactId] = useState<string | null>(null);
  const [filters, setFilters] = useState(emptyCandidateFilters);

  useEffect(() => {
    pb()
      .collection("candidate_profiles")
      .getFullList<CandidateLike>({ filter: "consent_zone_visible = true", sort: "-created" })
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, []);

  // Desglose agregado (total registrados vs visibles) desde el server: el
  // cliente business solo puede leer los consent_zone_visible, así que el
  // "4 registrados en TuCV" sale de /api/candidate-counts (pbAdmin, solo conteos).
  useEffect(() => {
    fetch("/api/candidate-counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCounts(data))
      .catch(() => setCounts(null));
  }, []);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    return candidates.filter((c) => matchesCandidateFilters(c, filters));
  }, [candidates, filters]);

  if (!candidates) {
    return (
      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        Buscando candidatos...
      </p>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="font-bold mb-2">Todavía no hay candidatos visibles en tu zona</h2>
        <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          Cuando alguien cargue su perfil y elija que negocios de su zona lo vean, va a aparecer
          acá, aunque no se haya postulado a ninguna de tus búsquedas.
        </p>
      </Card>
    );
  }

  return (
    <div>
      {(() => {
        const visibles = candidates.length;
        const filteredView = filtered.length !== visibles;
        const noSeMuestran = counts ? Math.max(0, counts.total - counts.visiblesEmpresas) : null;
        return (
          <div className="mb-5">
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              <span className="text-lg font-bold" style={{ color: "var(--tucv-text)" }}>
                {filtered.length}
              </span>{" "}
              {filteredView ? `de ${visibles} ` : ""}
              candidato{(filteredView ? visibles : filtered.length) === 1 ? "" : "s"} visible
              {(filteredView ? visibles : filtered.length) === 1 ? "" : "s"}
              {counts ? (
                <>
                  {" · "}
                  <span style={{ color: "var(--tucv-text)" }}>{counts.total}</span> registrado
                  {counts.total === 1 ? "" : "s"} en TuCV
                </>
              ) : null}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
              Solo aparecen personas que eligieron ser visibles para empresas.
              {noSeMuestran && noSeMuestran > 0
                ? ` ${noSeMuestran} todavía no se muestran públicamente o tienen el perfil incompleto.`
                : ""}
            </p>
          </div>
        );
      })()}

      <CandidateFilterBar value={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Ningún candidato coincide con esos filtros.
          </p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const expanded = expandedId === c.id;
            return (
              <Card key={c.id} className={expanded ? "lg:col-span-2" : undefined}>
                <div className="flex gap-4">
                  <CandidateAvatar candidate={c} />
                  <div className="min-w-0 flex-1">
                    <CandidateCardBody candidate={c} expanded={expanded} />

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : c.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
                        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
                      >
                        {expanded ? "Ocultar perfil" : "Ver perfil"}
                      </button>
                      {c.consent_contact ? (
                        revealedContactId === c.id ? (
                          <a
                            href={waLink(c.whatsapp, `Hola ${c.name}, te contacto desde TuCV.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                            style={{ backgroundColor: "#128C4A", color: "#fff" }}
                          >
                            Escribir por WhatsApp
                          </a>
                        ) : (
                          // El WhatsApp no se muestra de una: primero "Contactar".
                          // El candidato ya aceptó (consent_contact) -> revelarlo
                          // acá es un paso deliberado, no una base de teléfonos.
                          <button
                            type="button"
                            onClick={() => setRevealedContactId(c.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                            style={{ backgroundColor: "var(--tucv-primary)", color: "#fff" }}
                          >
                            Contactar
                          </button>
                        )
                      ) : (
                        <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                          Todavía no habilitó contacto directo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
