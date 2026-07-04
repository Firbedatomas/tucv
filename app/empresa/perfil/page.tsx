"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { canManageBusiness, canInviteTeam } from "@/lib/business-permissions";
import { EditBusinessForm } from "@/components/empresa/EditBusinessForm";
import { PlanUpgradeCard } from "@/components/empresa/PlanUpgradeCard";
import { TeamSection } from "@/components/empresa/TeamSection";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataRightsCard } from "@/components/ui/DataRightsCard";

function PagoBanner() {
  const params = useSearchParams();
  const pago = params.get("pago");
  if (!pago) return null;

  const messages: Record<string, { text: string; bg: string; color: string; border: string }> = {
    exito: {
      text: "¡Listo! Tu pago se acreditó y el plan Pro se activa en un momento.",
      bg: "#DCFCE7",
      color: "#128C4A",
      border: "#128C4A",
    },
    pendiente: {
      text: "Tu pago está pendiente de confirmación. Te avisamos apenas se acredite.",
      bg: "var(--tucv-bg)",
      color: "var(--tucv-muted)",
      border: "var(--tucv-border)",
    },
    error: {
      text: "No pudimos procesar el pago. Podés intentar de nuevo cuando quieras.",
      bg: "#FEE2E2",
      color: "#B42318",
      border: "#FCA5A5",
    },
  };
  const m = messages[pago];
  if (!m) return null;

  return (
    <div
      className="text-sm font-semibold px-3 py-2 mb-4 rounded-[var(--tucv-radius)]"
      style={{ backgroundColor: m.bg, color: m.color, border: `1.5px solid ${m.border}` }}
    >
      {m.text}
    </div>
  );
}

function LeaveTeamCard({ businessName, membershipId }: { businessName: string; membershipId: string | null }) {
  const router = useRouter();
  async function handleLeave() {
    if (!membershipId) return;
    await pb().collection("business_members").delete(membershipId);
    pb().authStore.clear();
    router.push("/empresa/login");
  }
  return (
    <Card>
      <h1 className="text-xl font-bold mb-2">
        Sos colaborador de <span style={{ color: "var(--tucv-primary)" }}>{businessName}</span>
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
        Podés ver sus búsquedas y revisar postulantes. Los datos del negocio, el plan y la facturación los maneja el
        dueño de la cuenta.
      </p>
      <Button type="button" variant="secondary" onClick={handleLeave}>
        Salir de este equipo
      </Button>
    </Card>
  );
}

export default function PerfilEmpresaPage() {
  const router = useRouter();
  const { isValid, business, role, membershipId } = useBusinessAuth();

  if (!isValid || !business) return null;

  // Colaborador (admin o reviewer): no gestiona los datos del negocio ni el
  // plan. Ve la tarjeta para salir del equipo y, si es admin, también el
  // panel de equipo para invitar/gestionar colaboradores.
  if (!canManageBusiness(role)) {
    return (
      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="max-w-lg mx-auto space-y-6">
          <LeaveTeamCard businessName={business.business_name} membershipId={membershipId} />
          {canInviteTeam(role) && <TeamSection business={business} />}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Los datos de tu negocio</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Esto es lo que ven los postulantes y lo que usamos para contactarte.
        </p>
        <Suspense fallback={null}>
          <PagoBanner />
        </Suspense>
        <PlanUpgradeCard business={business} />
        <TeamSection business={business} />
        <EditBusinessForm business={business} />
        <DataRightsCard
          data={business}
          fileNamePrefix="mi-negocio"
          deleteLabel="Eliminar mi cuenta de negocio"
          deleteConfirmText="Esto borra tu negocio de TuCV para siempre -- tus búsquedas publicadas, postulaciones recibidas y el equipo invitado dejan de existir. Tu historial de pagos se conserva por motivos contables. No se puede deshacer."
          onDelete={async () => {
            await pb().collection("business_accounts").delete(business.id);
            router.push("/");
          }}
        />
      </div>
    </main>
  );
}
