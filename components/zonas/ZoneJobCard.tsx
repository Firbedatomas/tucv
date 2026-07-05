import Link from "next/link";
import type { PublicApiJob } from "@/lib/public-api";

// Card server-render para las páginas de zona. No reusa components/landing
// JobCard porque ese pide el shape completo JobCardData (turnos, sueldo,
// perks...) y acá la fuente es getPublicJobsForApi(), que devuelve el shape
// acotado PublicApiJob (pensado para terceros). Con lo que hay alcanza para
// autoseleccionarse de un vistazo: puesto, negocio, rubro y zona. Es un
// simple Link, así que no necesita ser client component (mejor para SEO).
export function ZoneJobCard({ job }: { job: PublicApiJob }) {
  // job.url es absoluta (https://tucv.ar/b/...). La pasamos a path relativo
  // para que Next haga navegación de cliente en vez de recarga completa.
  let href = job.url;
  try {
    href = new URL(job.url).pathname;
  } catch {
    /* si por lo que sea no es una URL válida, dejamos el valor tal cual */
  }

  return (
    <Link
      href={href}
      className="block p-4 rounded-[var(--tucv-radius)] transition hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--tucv-surface)",
        border: "2px solid var(--tucv-border)",
        boxShadow: "var(--tucv-shadow)",
      }}
    >
      <p className="font-bold truncate">{job.title}</p>
      <p className="text-sm truncate" style={{ color: "var(--tucv-muted)" }}>
        {job.business ? `${job.business} · ` : ""}
        {job.categoryLabel}
        {job.zone ? ` · ${job.zone}` : ""}
      </p>
      <div className="mt-2.5">
        <span
          className="inline-block text-xs font-semibold px-2 py-1 rounded-[var(--tucv-radius)]"
          style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }}
        >
          {job.categoryLabel}
        </span>
      </div>
    </Link>
  );
}
