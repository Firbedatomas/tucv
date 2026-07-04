"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DismissReportButton({ id, collection }: { id: string; collection: "profile_reports" | "business_reports" }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      await fetch(`/api/admin/reports/${id}?collection=${collection}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDismissing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDismiss}
      disabled={dismissing}
      className="text-xs font-semibold underline hover:opacity-70 transition disabled:opacity-50"
      style={{ color: "var(--tucv-muted)" }}
    >
      {dismissing ? "..." : "Descartar"}
    </button>
  );
}
