"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { buttonBaseClass } from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/negocios", label: "Negocios" },
  { href: "/admin/postulantes", label: "Postulantes" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/embudo", label: "Embudo" },
  { href: "/admin/visitas", label: "Visitas" },
  { href: "/admin/correo", label: "Correo" },
];

// Un solo admin usa esto -- polling simple alcanza, no hace falta
// WebSockets/SSE para un contador de no leídos.
const UNREAD_POLL_MS = 20_000;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      fetch("/api/admin/email/unread-count")
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setUnread(d.count ?? 0);
        })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, UNREAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside
      className="w-56 shrink-0 p-4 flex flex-col gap-1"
      style={{ borderRight: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2 px-3"
        style={{ color: "var(--tucv-muted)" }}
      >
        Admin
      </p>
      {NAV_ITEMS.map((item) => {
        // Match exacto para "/admin" (si no, "startsWith" lo marcaría activo
        // en cualquier subruta) y startsWith para el resto.
        const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        const showUnread = item.href === "/admin/correo" && unread > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2 rounded-[var(--tucv-radius)] text-sm flex items-center justify-between"
            style={{
              color: active ? "var(--tucv-primary-text)" : "var(--tucv-text)",
              backgroundColor: active ? "var(--tucv-primary)" : "transparent",
              fontWeight: active ? 600 : 500,
            }}
          >
            {item.label}
            {showUnread && (
              <span
                className="text-xs px-1.5 rounded-full"
                style={{
                  backgroundColor: active ? "var(--tucv-primary-text)" : "var(--tucv-accent)",
                  color: "var(--tucv-text)",
                }}
              >
                {unread}
              </span>
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={handleLogout}
        className={`${buttonBaseClass} mt-4 justify-start px-3 py-2 text-sm`}
        style={{ backgroundColor: "transparent", color: "var(--tucv-muted)" }}
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
