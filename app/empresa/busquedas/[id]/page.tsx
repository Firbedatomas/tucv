"use client";

import { use } from "react";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { ApplicantsPanel } from "@/components/empresa/ApplicantsPanel";
import { LinkButton } from "@/components/ui/Button";

export default function BusquedaPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isValid, role } = useBusinessAuth();

  if (!isValid) return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">
        <LinkButton href="/empresa/panel" variant="ghost" className="!px-0 !py-0 mb-4 text-sm">
          ← Volver a tus búsquedas
        </LinkButton>
        <ApplicantsPanel jobPostId={id} readOnly={role !== "owner"} />
      </div>
    </main>
  );
}
