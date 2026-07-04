"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import type { BusinessRecord } from "@/lib/use-business-auth";
import { maxTeamMembers } from "@/lib/plan-limits";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Member = { id: string; email: string; created: string };
type Invite = { id: string; email: string; status: string; expires: string; created: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  revoked: "Revocada",
};

// Invitar a alguien de tu equipo (dueño únicamente) -- ver
// no está en Pro ni Gratis, es la diferencia real del plan Equipo. Un
// colaborador invitado puede ver búsquedas y postulantes, y marcar el
// estado de un postulante, pero no puede tocar esto (ver ApplicantsPanel/
// JobPostCard con role="viewer").
export function TeamSection({ business }: { business: BusinessRecord }) {
  const limit = maxTeamMembers(business.plan);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    const token = pb().authStore.token;
    fetch("/api/business-invites", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setInvites((data.invites ?? []).filter((i: Invite) => i.status !== "revoked"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Si el plan no incluye equipo (limit === 0), el componente devuelve la
  // tarjeta de upsell más abajo sin llegar a leer `loading`/`members`/
  // `invites` -- no hace falta pedir nada en ese caso.
  useEffect(() => {
    if (limit > 0) refresh();
  }, [limit]);

  const pendingCount = invites.filter((i) => i.status === "pending").length;
  const used = members.length + pendingCount;

  async function handleInvite(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setNotice(null);
    setInviting(true);
    try {
      const token = pb().authStore.token;
      const res = await fetch("/api/business-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No pudimos enviar la invitación.");
      setEmail("");
      setNotice(`Invitación enviada a ${data.email}.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar la invitación.");
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(id: string) {
    await pb().collection("business_invites").update(id, { status: "revoked" });
    refresh();
  }

  async function removeMember(id: string) {
    await pb().collection("business_members").delete(id);
    refresh();
  }

  if (limit === 0) {
    return (
      <Card className="mb-6">
        <h2 className="font-bold mb-2">Equipo</h2>
        <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          Invitá a alguien de tu equipo a revisar búsquedas y postulantes con su propia cuenta de Google -- disponible
          en el plan Equipo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-bold">Equipo</h2>
        <span className="text-xs font-semibold" style={{ color: "var(--tucv-muted)" }}>
          {used}/{limit} cupos usados
        </span>
      </div>

      {used < limit ? (
        <form onSubmit={handleInvite} className="mb-4">
          <Field label="Invitar por email">
            <div className="flex gap-2">
              <input
                className={inputClass}
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@ejemplo.com"
                required
              />
              <Button type="submit" disabled={inviting} className="shrink-0">
                {inviting ? "Enviando..." : "Invitar"}
              </Button>
            </div>
          </Field>
        </form>
      ) : (
        <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
          Ya usaste tus {limit} cupos de equipo.
        </p>
      )}

      {error && (
        <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm mb-3 font-medium" style={{ color: "var(--tucv-primary)" }}>
          {notice}
        </p>
      )}

      {!loading && members.length === 0 && pendingCount === 0 && (
        <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          Todavía no invitaste a nadie.
        </p>
      )}

      {members.length > 0 && (
        <ul className="text-sm space-y-2 mb-3">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span>{m.email}</span>
              <button
                type="button"
                onClick={() => removeMember(m.id)}
                className="text-xs font-semibold underline"
                style={{ color: "var(--tucv-muted)" }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {invites.length > 0 && (
        <ul className="text-sm space-y-2">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span>
                {i.email} <span style={{ color: "var(--tucv-muted)" }}>· {STATUS_LABEL[i.status] ?? i.status}</span>
              </span>
              {i.status === "pending" && (
                <button
                  type="button"
                  onClick={() => revokeInvite(i.id)}
                  className="text-xs font-semibold underline"
                  style={{ color: "var(--tucv-muted)" }}
                >
                  Revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
