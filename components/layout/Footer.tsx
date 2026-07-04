import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Postulantes",
    links: [
      { href: "/postulante/login", label: "Busco trabajo" },
      { href: "/postulante/nuevo", label: "Crear mi perfil" },
      { href: "/postulante/editar", label: "Editar mi perfil" },
      { href: "/postulantes", label: "Ver postulantes" },
    ],
  },
  {
    title: "Empresas",
    links: [
      { href: "/empresa/login", label: "Busco empleados" },
      { href: "/empresa/busquedas/nueva", label: "Crear búsqueda" },
      { href: "/precios", label: "Precios" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terminos", label: "Términos y condiciones" },
      { href: "/privacidad", label: "Privacidad" },
      { href: "/cookies", label: "Cookies" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--tucv-text)", borderTop: "4px solid var(--tucv-border)" }}>
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="lg:col-span-1">
            <span className="inline-flex items-center gap-2 mb-3">
              <LogoMark size={32} />
              <span className="font-bold text-xl" style={{ color: "var(--tucv-bg)" }}>
                TuCV
              </span>
            </span>
            <p
              className="inline-block text-xs font-bold uppercase tracking-wide mb-3 px-2 py-1 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)" }}
            >
              Donde hay laburo, TuCV late.
            </p>
            <p className="text-sm" style={{ color: "#C9C1B4" }}>
              Perfil laboral simple para trabajos de cercanía. Nada de CVs sueltos por mail.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--tucv-accent)" }}>
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-semibold hover:opacity-70 transition"
                      style={{ color: "var(--tucv-bg)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-6 text-xs"
          style={{ borderTop: "1.5px solid #4A4436", color: "#948B7E" }}
        >
          <span>© {new Date().getFullYear()} TuCV — perfil laboral simple para trabajos de cercanía.</span>
        </div>
      </div>
    </footer>
  );
}
