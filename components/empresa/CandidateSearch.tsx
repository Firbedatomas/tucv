"use client";

import { useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { waLink } from "@/lib/whatsapp";
import { emptyCandidateFilters, matchesCandidateFilters, narrowByZoneCascade } from "@/lib/candidate-filters";
import { Card } from "@/components/ui/Card";
import { CandidateFilterBar } from "@/components/empresa/CandidateFilterBar";
import { CandidateAvatar, CandidateCardBody, type CandidateLike } from "@/components/empresa/CandidateCardBody";
import {
  SavedCandidateControls,
  type SavedRecord,
  type SavedStatus,
} from "@/components/empresa/SavedCandidateControls";
import { InviteCandidateControls, type InviteJob } from "@/components/empresa/InviteCandidateControls";
import { ContactRequestControls } from "@/components/empresa/ContactRequestControls";

type CandidateCounts = {
  total: number;
  visiblesEmpresas: number;
  perfilPublico: number;
  incompletos: number;
  ocultos: number;
};

export function CandidateSearch({
  businessId,
  businessCity,
  businessProvince,
}: {
  businessId: string;
  businessCity: string;
  businessProvince: string;
}) {
  const [candidates, setCandidates] = useState<CandidateLike[] | null>(null);
  const [counts, setCounts] = useState<CandidateCounts | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // WhatsApp revelado por candidato (traído del server tras autorizar).
  const [revealedWhatsapp, setRevealedWhatsapp] = useState<Map<string, string>>(new Map());
  const [filters, setFilters] = useState(emptyCandidateFilters);
  // Mini-CRM: candidatos guardados por este negocio, indexados por candidate id.
  const [saved, setSaved] = useState<Map<string, SavedRecord>>(new Map());
  // Búsquedas activas del negocio (para invitar) y candidatos ya invitados
  // (candidate id -> etiqueta de la búsqueda) para reflejar el estado.
  const [jobs, setJobs] = useState<InviteJob[]>([]);
  const [invited, setInvited] = useState<Map<string, string>>(new Map());
  // Estado de solicitud de contacto por candidato: pending / accepted / rejected.
  const [contactStatus, setContactStatus] = useState<Map<string, string>>(new Map());

  // Los candidatos ya NO se leen directo de PocketBase (eso mandaba whatsapp/
  // fecha-nac/cv de todos a cualquier logueado). Se piden a un endpoint server
  // que devuelve una proyección segura (sin whatsapp; edad en vez de DOB).
  useEffect(() => {
    fetch("/api/empresa/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pb().authStore.token }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCandidates((d?.candidates as CandidateLike[]) ?? []))
      .catch(() => setCandidates([]));
  }, []);

  useEffect(() => {
    pb()
      .collection("saved_candidates")
      .getFullList<{ id: string; candidate: string; status: SavedStatus; note: string }>({
        filter: `business = "${businessId}"`,
        requestKey: null,
      })
      .then((rows) => {
        setSaved(new Map(rows.map((r) => [r.candidate, { id: r.id, status: r.status || "guardado", note: r.note || "" }])));
      })
      .catch(() => setSaved(new Map()));
  }, [businessId]);

  useEffect(() => {
    const now = new Date().toISOString();
    pb()
      .collection("job_posts")
      .getFullList<{ id: string; role: string; name: string }>({
        filter: `business = "${businessId}" && active = true && expires_at > "${now}"`,
        fields: "id,role,name",
        requestKey: null,
      })
      .then((rows) => setJobs(rows.map((j) => ({ id: j.id, label: j.role || j.name || "Búsqueda" }))))
      .catch(() => setJobs([]));
  }, [businessId]);

  useEffect(() => {
    pb()
      .collection("contact_requests")
      .getFullList<{ candidate: string; status: string }>({ requestKey: null })
      .then((rows) => setContactStatus(new Map(rows.map((r) => [r.candidate, r.status]))))
      .catch(() => setContactStatus(new Map()));
  }, []);

  async function requestContact(candidateId: string, jobPostId: string, reason: string) {
    // Optimista: mostramos "pendiente" al toque; revertimos si el server falla.
    setContactStatus((prev) => new Map(prev).set(candidateId, "pending"));
    try {
      const res = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId, jobPostId, reason }),
      });
      if (!res.ok) {
        setContactStatus((prev) => new Map(prev).set(candidateId, ""));
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: (data as { error?: string }).error };
      }
      return { ok: true };
    } catch {
      setContactStatus((prev) => new Map(prev).set(candidateId, ""));
      return { ok: false, error: "No se pudo enviar la solicitud. Reintentá." };
    }
  }

  // Trae el WhatsApp desde el server SOLO si está autorizado (consent_contact o
  // solicitud aceptada); el server valida y audita (contact_revealed). El número
  // ya no viaja en el listado.
  async function revealContact(candidateId: string) {
    try {
      const res = await fetch("/api/contact-requests/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data as { whatsapp?: string }).whatsapp) {
        const wa = (data as { whatsapp: string }).whatsapp;
        setRevealedWhatsapp((prev) => new Map(prev).set(candidateId, wa));
      }
    } catch {
      // silencioso
    }
  }

  async function inviteCandidate(candidateId: string, jobPostId: string, message: string) {
    const job = jobs.find((j) => j.id === jobPostId);
    try {
      const res = await fetch("/api/candidate-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId, jobPostId, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInvited((prev) => new Map(prev).set(candidateId, job?.label ?? "tu búsqueda"));
        return { ok: true };
      }
      return { ok: false, error: (data as { error?: string }).error };
    } catch {
      return { ok: false, error: "No se pudo invitar. Reintentá." };
    }
  }

  function upsertSaved(candidateId: string, record: SavedRecord | null) {
    setSaved((prev) => {
      const next = new Map(prev);
      if (record) next.set(candidateId, record);
      else next.delete(candidateId);
      return next;
    });
  }

  async function saveCandidate(candidateId: string) {
    try {
      const rec = await pb()
        .collection("saved_candidates")
        .create<{ id: string; status: SavedStatus; note: string }>({
          business: businessId,
          candidate: candidateId,
          status: "guardado",
        });
      upsertSaved(candidateId, { id: rec.id, status: rec.status || "guardado", note: rec.note || "" });
    } catch {
      // Si ya existe (índice único) o falla la red, no rompemos la vista.
    }
  }

  async function patchSaved(candidateId: string, patch: Partial<Pick<SavedRecord, "status" | "note">>) {
    const current = saved.get(candidateId);
    if (!current) return;
    // Optimista: reflejamos el cambio y lo revertimos si el server falla.
    upsertSaved(candidateId, { ...current, ...patch });
    try {
      await pb().collection("saved_candidates").update(current.id, patch);
    } catch {
      upsertSaved(candidateId, current);
    }
  }

  async function removeSaved(candidateId: string) {
    const current = saved.get(candidateId);
    if (!current) return;
    upsertSaved(candidateId, null);
    try {
      await pb().collection("saved_candidates").delete(current.id);
    } catch {
      upsertSaved(candidateId, current);
    }
  }

  // Desglose agregado (total registrados vs visibles) desde el server: el
  // cliente business solo puede leer los consent_zone_visible, así que el
  // "4 registrados en TuCV" sale de /api/candidate-counts (pbAdmin, solo conteos).
  useEffect(() => {
    fetch("/api/candidate-counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCounts(data))
      .catch(() => setCounts(null));
  }, []);

  // Sin zona tipeada a mano, arrancamos por la ciudad del negocio; si no hay
  // nadie ahí, ampliamos a la provincia; si tampoco, no restringe (ver
  // narrowByZoneCascade). En cuanto la empresa escribe algo en el filtro de
  // zona, toma el control y esto se ignora -- mismo comportamiento de
  // siempre en ese caso.
  const zoneCascade = useMemo(() => {
    if (!candidates || filters.zone) return null;
    return narrowByZoneCascade(candidates, businessCity, businessProvince);
  }, [candidates, filters.zone, businessCity, businessProvince]);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    const base = zoneCascade ? zoneCascade.candidates : candidates;
    return base.filter((c) => matchesCandidateFilters(c, filters));
  }, [candidates, zoneCascade, filters]);

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
            {zoneCascade && zoneCascade.tier !== "country" && (
              <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
                {zoneCascade.tier === "city"
                  ? `Mostrando candidatos de ${businessCity}.`
                  : `No hay candidatos en ${businessCity || "tu ciudad"} -- mostrando toda ${businessProvince}.`}
              </p>
            )}
            {zoneCascade && zoneCascade.tier === "country" && (businessCity || businessProvince) && (
              <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
                No hay candidatos en tu zona todavía -- mostrando de todo el país.
              </p>
            )}
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
                    <CandidateCardBody candidate={c} expanded={expanded} revealedWhatsapp={revealedWhatsapp.get(c.id)} />

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : c.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
                        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
                      >
                        {expanded ? "Ocultar perfil" : "Ver perfil"}
                      </button>
                      {(() => {
                        const cstatus = contactStatus.get(c.id);
                        // Se puede revelar WhatsApp si el candidato tiene contacto
                        // directo, o si aceptó una solicitud puntual de esta empresa.
                        const canReveal = c.consent_contact || cstatus === "accepted";
                        if (canReveal) {
                          const wa = revealedWhatsapp.get(c.id);
                          return wa ? (
                            <a
                              href={waLink(wa, `Hola ${c.name}, te contacto desde TuCV.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                              style={{ backgroundColor: "#128C4A", color: "#fff" }}
                            >
                              Escribir por WhatsApp
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => revealContact(c.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                              style={{ backgroundColor: "var(--tucv-primary)", color: "#fff" }}
                            >
                              Contactar
                            </button>
                          );
                        }
                        // El candidato no habilitó contacto directo: se puede
                        // pedir eligiendo búsqueda y motivo (opcionales).
                        return (
                          <ContactRequestControls
                            jobs={jobs}
                            status={cstatus}
                            onRequest={(jobPostId, reason) => requestContact(c.id, jobPostId, reason)}
                          />
                        );
                      })()}
                      <SavedCandidateControls
                        saved={saved.get(c.id) ?? null}
                        expanded={expanded}
                        onSave={() => saveCandidate(c.id)}
                        onStatus={(status) => patchSaved(c.id, { status })}
                        onNote={(note) => patchSaved(c.id, { note })}
                        onRemove={() => removeSaved(c.id)}
                      />
                      <InviteCandidateControls
                        jobs={jobs}
                        invitedLabel={invited.get(c.id) ?? null}
                        onInvite={(jobPostId, message) => inviteCandidate(c.id, jobPostId, message)}
                      />
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
