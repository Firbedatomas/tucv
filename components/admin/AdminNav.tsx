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
  { href: "/admin/viralidad", label: "Viralidad" },
  { href: "/admin/embudo", label: "Embudo" },
  { href: "/admin/visitas", label: "Visitas" },
  { href: "/admin/correo", label: "Correo" },
];

// Un solo admin usa esto -- polling simple alcanza, no hace falta
// WebSockets/SSE para un contador de no leídos.
const UNREAD_POLL_MS = 20_000;

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function NavLinks({
  pathname,
  unread,
  onNavigate,
}: {
  pathname: string;
  unread: number;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        // Match exacto para "/admin" (si no, "startsWith" lo marcaría activo
        // en cualquier subruta) y startsWith para el resto.
        const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        const showUnread = item.href === "/admin/correo" && unread > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
    </>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  // La sidebar fija (w-56) no entraba en una pantalla de celular -- se comía
  // ~60% del ancho y dejaba el contenido apretado en el resto, mismo
  // problema que ya se había resuelto en components/layout/Navbar.tsx con
  // este mismo patrón de toggle + menú colapsable.
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <>
      {/* Mobile: barra superior con toggle -- la sidebar de abajo queda oculta. */}
      <div
        className="sm:hidden flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tucv-muted)" }}>
          Admin
        </p>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          className="p-1"
          style={{ color: "var(--tucv-text)" }}
        >
          <MenuIcon open={mobileOpen} />
        </button>
      </div>
      {mobileOpen && (
        <nav
          className="sm:hidden flex flex-col gap-1 px-4 py-3"
          style={{ borderBottom: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
        >
          <NavLinks pathname={pathname} unread={unread} onNavigate={() => setMobileOpen(false)} />
          <button
            type="button"
            onClick={handleLogout}
            className={`${buttonBaseClass} mt-2 justify-start px-3 py-2 text-sm`}
            style={{ backgroundColor: "transparent", color: "var(--tucv-muted)" }}
          >
            Cerrar sesión
          </button>
        </nav>
      )}

      {/* Desktop: sidebar fija, sin cambios. */}
      <aside
        className="hidden sm:flex w-56 shrink-0 p-4 flex-col gap-1"
        style={{ borderRight: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-2 px-3"
          style={{ color: "var(--tucv-muted)" }}
        >
          Admin
        </p>
        <NavLinks pathname={pathname} unread={unread} />
        <button
          type="button"
          onClick={handleLogout}
          className={`${buttonBaseClass} mt-4 justify-start px-3 py-2 text-sm`}
          style={{ backgroundColor: "transparent", color: "var(--tucv-muted)" }}
        >
          Cerrar sesión
        </button>
      </aside>
    </>
  );
}
