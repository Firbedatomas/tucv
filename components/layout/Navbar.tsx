"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { canManageJobs, canSourceCandidates, canManageBusiness, roleLabel } from "@/lib/business-permissions";
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
  contextLabel,
  personalAccount,
  onLogout,
}: {
  name: string;
  photoUrl?: string | null;
  profileHref: string;
  profileLabel: string;
  // Rol dentro del negocio ("Revisor", "Administrador"...) -- da contexto de
  // "en qué estás usando TuCV ahora mismo". null para dueño/postulante/admin
  // de sitio, donde el nombre solo ya alcanza.
  contextLabel?: string | null;
  // Si esta misma persona además tiene perfil de postulante, acceso directo a
  // su cuenta personal desde el contexto de negocio (un usuario puede ser
  // colaborador de un equipo Y postulante, son vidas separadas).
  personalAccount?: { href: string; label: string } | null;
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
        <span className="hidden sm:flex flex-col items-start leading-tight min-w-0">
          <span className="text-sm font-semibold truncate max-w-[10rem]" style={{ color: "var(--tucv-text)" }}>
            {name}
          </span>
          {contextLabel && (
            <span className="text-xs font-semibold truncate max-w-[10rem]" style={{ color: "var(--tucv-muted)" }}>
              {contextLabel}
            </span>
          )}
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
          {/* En mobile el nombre no se ve en el botón (solo el avatar), así que
              el contexto "negocio · rol" vive acá arriba del menú. */}
          {contextLabel && (
            <div className="px-3 pt-1 pb-2 mb-1" style={{ borderBottom: "1.5px solid var(--tucv-border)" }}>
              <p className="text-sm font-bold truncate" style={{ color: "var(--tucv-text)" }}>
                {name}
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--tucv-muted)" }}>
                {contextLabel}
              </p>
            </div>
          )}
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-semibold hover:opacity-70 transition"
            style={{ color: "var(--tucv-text)" }}
          >
            {profileLabel}
          </Link>
          {personalAccount && (
            <Link
              href={personalAccount.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm font-semibold hover:opacity-70 transition"
              style={{ color: "var(--tucv-text)" }}
            >
              {personalAccount.label}
            </Link>
          )}
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

  // La sesión de admin es una cookie httpOnly aparte (tucv_admin_session,
  // ver lib/admin-session.ts) -- este Navbar no la puede leer directo, así
  // que la consulta a /api/admin/session. Antes de esto, un admin navegando
  // el sitio público (login de Google real en `users`, sin business_accounts
  // ni candidate_profiles) hacía que isAuthenticated diera true pero
  // isBusiness/postulanteProfile quedaran vacíos -- el navbar renderizaba la
  // rama "autenticado" sin nada adentro (ni links, ni identidad, ni el link
  // a /admin), en vez de mostrar algo útil o caer al navbar público.
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data: { isAdmin: boolean; email: string | null }) => {
        setIsAdmin(data.isAdmin);
        setAdminEmail(data.email);
      })
      .catch(() => {});
  }, []);

  async function handleAdminLogout() {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    window.location.href = "/";
  }

  // Ni dueño/colaborador de negocio, ni postulante, ni admin -- no hay nada
  // "autenticado" que mostrar (aunque isAuthenticated sea true por alguna
  // sesión de Google residual), así que cae al navbar público en vez de un
  // shell vacío.
  const showAuthedNav = isAdmin || isBusiness || Boolean(postulanteProfile);

  const navLinks = isAdmin ? (
    <Link
      href="/admin"
      className="text-sm font-bold px-3 py-1.5 text-center"
      style={{
        backgroundColor: "var(--tucv-accent)",
        color: "var(--tucv-text)",
        border: "2px solid var(--tucv-border)",
        borderRadius: "var(--tucv-radius)",
        boxShadow: "2px 2px 0 var(--tucv-border)",
      }}
      onClick={() => setMenuOpen(false)}
    >
      Panel admin
    </Link>
  ) : isBusiness ? (
    <>
      <Link href="/empresa/panel" className={linkClass} style={{ color: "var(--tucv-text)" }} onClick={() => setMenuOpen(false)}>
        Mis búsquedas
      </Link>
      {canSourceCandidates(role) && (
        <Link href="/empresa/candidatos" className={linkClass} style={{ color: "var(--tucv-text)" }} onClick={() => setMenuOpen(false)}>
          Buscar candidatos
        </Link>
      )}
      <Link href="/postulantes" className={linkClass} style={{ color: "var(--tucv-text)" }} onClick={() => setMenuOpen(false)}>
        Postulantes
      </Link>
      {canManageJobs(role) && (
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

  const identity = isAdmin ? (
    <IdentityDropdown
      name={adminEmail ?? "Admin"}
      profileHref="/admin"
      profileLabel="Panel admin"
      onLogout={handleAdminLogout}
    />
  ) : isBusiness
    ? business && (
        <IdentityDropdown
          name={business.business_name}
          photoUrl={business.logoUrl}
          profileHref="/empresa/perfil"
          profileLabel={canManageBusiness(role) ? "Los datos de mi negocio" : "Mi cuenta"}
          // El rol como contexto, solo para colaboradores (el dueño ES su
          // negocio, no necesita la etiqueta).
          contextLabel={role && role !== "owner" ? roleLabel(role) : null}
          // Si la misma persona además es postulante, un salto directo a su
          // vida personal sin cerrar sesión ni perder el contexto de negocio.
          personalAccount={
            postulanteProfile
              ? {
                  href: postulanteProfile.profileSlug ? `/p/${postulanteProfile.profileSlug}` : "/postulante/editar",
                  label: "Mi cuenta personal",
                }
              : null
          }
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

        {showAuthedNav ? (
          <>
            {/* Mobile: dropdown (sin nombre, ya se ve como avatar solo) + toggle de links. Todo en una línea. */}
            <div className="flex sm:hidden items-center gap-3">
              {identity}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-xs font-bold px-2 py-1"
                  style={{
                    backgroundColor: "var(--tucv-accent)",
                    color: "var(--tucv-text)",
                    border: "2px solid var(--tucv-border)",
                    borderRadius: "var(--tucv-radius)",
                  }}
                >
                  Panel admin
                </Link>
              )}
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
