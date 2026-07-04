"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { Logo } from "@/components/ui/Logo";

const linkClass = "text-sm font-semibold hover:opacity-70 transition";

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="transition"
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// El nombre de usuario, en un extremo del navbar, abre este dropdown en vez
// de tener "Cerrar sesión" suelto como un link más -- así el navbar queda
// con una sola acción de cuenta agrupada, no dispersa entre los links de
// navegación.
function IdentityDropdown({
  name,
  photoUrl,
  profileHref,
  profileLabel,
  onLogout,
}: {
  name: string;
  photoUrl?: string | null;
  profileHref: string;
  profileLabel: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        // -m-2 p-2 agranda el área táctil sin mover nada visualmente (el
        // avatar solo medía 28px, bien por debajo del mínimo recomendado
        // para tocar con el dedo) -- reportado como "el dropdown no
        // funciona" cuando en realidad el toque simplemente no acertaba.
        className="inline-flex items-center gap-2 hover:opacity-80 transition -m-2 p-2"
        aria-expanded={open}
        aria-label={`Cuenta de ${name}`}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            width={28}
            height={28}
            unoptimized
            className="w-7 h-7 rounded-full object-cover shrink-0"
            style={{ border: "2px solid var(--tucv-border)" }}
          />
        ) : (
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }}
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span
          className="text-sm font-semibold hidden sm:inline truncate max-w-[10rem]"
          style={{ color: "var(--tucv-text)" }}
        >
          {name}
        </span>
        {/* La flechita siempre visible, también en mobile -- sin ella (antes
            solo aparecía en sm:+) el avatar no tenía ninguna señal de que
            fuera clickeable, y "cerrar sesión" parecía haber desaparecido. */}
        <span style={{ color: "var(--tucv-muted)" }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[10rem] py-1.5 z-20"
          style={{
            backgroundColor: "var(--tucv-surface)",
            border: "2px solid var(--tucv-border)",
            borderRadius: "var(--tucv-radius)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-semibold hover:opacity-70 transition"
            style={{ color: "var(--tucv-text)" }}
          >
            {profileLabel}
          </Link>
          <Link
            href="/configuracion/notificaciones"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-semibold hover:opacity-70 transition"
            style={{ color: "var(--tucv-text)" }}
          >
            Notificaciones
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="block w-full text-left px-3 py-2 text-sm font-semibold hover:opacity-70 transition"
            style={{ color: "var(--tucv-muted)" }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  // logout() solo limpia el authStore compartido -- sirve igual para cerrar
  // sesión de empresa o de postulante.
  const { isValid: isBusiness, isAuthenticated, business, role, logout } = useBusinessAuth({
    redirectIfLoggedOut: false,
  });
  // requireRole por default (true): para una empresa esto simplemente no
  // encuentra candidate_profiles y queda en null, sin costo real más que
  // una consulta extra -- necesitamos el fetch completo (no solo el
  // booleano) para poder mostrar foto/nombre acá.
  const { profile: postulanteProfile } = usePostulanteAuth({ redirectIfLoggedOut: false });
  // El navbar completo (links + dropdown) no entra en una línea en mobile,
  // que es ~90% del uso real -- ahí colapsamos todo menos el logo y el
  // dropdown atrás de este toggle. En sm:+ se ve todo inline como antes.
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = isBusiness ? (
    <>
      <Link href="/empresa/panel" className={linkClass} style={{ color: "var(--tucv-text)" }} onClick={() => setMenuOpen(false)}>
        Mis búsquedas
      </Link>
      {role === "owner" && (
        <Link href="/empresa/candidatos" className={linkClass} style={{ color: "var(--tucv-text)" }} onClick={() => setMenuOpen(false)}>
          Buscar candidatos
        </Link>
      )}
      <Link href="/postulantes" className={linkClass} style={{ color: "var(--tucv-text)" }} onClick={() => setMenuOpen(false)}>
        Postulantes
      </Link>
      {role === "owner" && (
        <Link
          href="/empresa/busquedas/nueva"
          className="text-sm font-bold px-3 py-1.5 text-center"
          style={{
            backgroundColor: "var(--tucv-primary)",
            color: "var(--tucv-primary-text)",
            border: "2px solid var(--tucv-border)",
            borderRadius: "var(--tucv-radius)",
            boxShadow: "2px 2px 0 var(--tucv-border)",
          }}
          onClick={() => setMenuOpen(false)}
        >
          Crear búsqueda
        </Link>
      )}
    </>
  ) : null;

  const identity = isBusiness
    ? business && (
        <IdentityDropdown
          name={business.business_name}
          photoUrl={business.logoUrl}
          profileHref="/empresa/perfil"
          profileLabel={role === "owner" ? "Los datos de mi negocio" : "Mi cuenta"}
          onLogout={logout}
        />
      )
    : postulanteProfile && (
        <IdentityDropdown
          name={postulanteProfile.name}
          photoUrl={postulanteProfile.photoUrl}
          profileHref={postulanteProfile.profileSlug ? `/p/${postulanteProfile.profileSlug}` : "/postulante/editar"}
          profileLabel="Mi perfil"
          onLogout={logout}
        />
      );

  return (
    <header
      className="sticky top-0 z-10"
      style={{ backgroundColor: "var(--tucv-surface)", borderBottom: "3px solid var(--tucv-border)" }}
    >
      <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        {isAuthenticated ? (
          <>
            {/* Mobile: dropdown (sin nombre, ya se ve como avatar solo) + toggle de links. Todo en una línea. */}
            <div className="flex sm:hidden items-center gap-3">
              {identity}
              {isBusiness && (
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                  className="p-1"
                  style={{ color: "var(--tucv-text)" }}
                >
                  <MenuIcon open={menuOpen} />
                </button>
              )}
            </div>

            {/* Desktop: links de navegación a la izquierda, dropdown de cuenta en el extremo derecho. */}
            <div className="hidden sm:flex items-center gap-4 ml-auto">
              {navLinks}
              {identity}
            </div>
          </>
        ) : (
          <>
            <div className="flex sm:hidden items-center gap-2">
              <Link href="/postulantes" className="text-xs font-semibold" style={{ color: "var(--tucv-text)" }}>
                Postulantes
              </Link>
              <Link href="/postulante/login" className="text-xs font-semibold" style={{ color: "var(--tucv-text)" }}>
                Busco trabajo
              </Link>
              <Link
                href="/empresa/login"
                className="text-xs font-bold px-2.5 py-1.5"
                style={{
                  backgroundColor: "var(--tucv-primary)",
                  color: "var(--tucv-primary-text)",
                  border: "2px solid var(--tucv-border)",
                  borderRadius: "var(--tucv-radius)",
                  boxShadow: "2px 2px 0 var(--tucv-border)",
                }}
              >
                Busco empleados
              </Link>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/postulantes" className={linkClass} style={{ color: "var(--tucv-text)" }}>
                Postulantes
              </Link>
              <Link href="/postulante/login" className={linkClass} style={{ color: "var(--tucv-text)" }}>
                Busco trabajo
              </Link>
              <Link
                href="/empresa/login"
                className="text-sm font-bold px-3 py-1.5"
                style={{
                  backgroundColor: "var(--tucv-primary)",
                  color: "var(--tucv-primary-text)",
                  border: "2px solid var(--tucv-border)",
                  borderRadius: "var(--tucv-radius)",
                  boxShadow: "2px 2px 0 var(--tucv-border)",
                }}
              >
                Busco empleados
              </Link>
            </div>
          </>
        )}
      </nav>

      {isAuthenticated && isBusiness && menuOpen && (
        <div className="sm:hidden px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "2px solid var(--tucv-border)" }}>
          <div className="pt-3" />
          {navLinks}
        </div>
      )}
    </header>
  );
}
