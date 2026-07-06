import { getVisitStats, getGoalCounts, isPlausibleConfigured } from "@/lib/admin/plausible";
import { FunnelBar } from "@/components/admin/FunnelBar";
import { Card } from "@/components/ui/Card";

const GOALS = [
  "Empresa: registro completado",
  "Empresa: aviso publicado",
  "Postulante: registro completado",
  "Postulante: postulacion enviada",
  "Pago aprobado",
  // Embudo recruiter (panel /empresa/candidatos) -- instrumentado para medir
  // cuánto tarda un dueño en contactar y dónde abandona.
  "recruiter_panel",
  "recruiter_abrir_perfil",
  "recruiter_marcar_visto",
  "recruiter_guardar",
  "recruiter_contactar",
] as const;

export default async function AdminEmbudoPage() {
  const configured = isPlausibleConfigured();
  const [visits, goals] = configured
    ? await Promise.all([getVisitStats("30d"), getGoalCounts([...GOALS], "30d")])
    : [null, null];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Embudo</h1>
      <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
        Últimos 30 días · de dónde viene el usuario hasta dónde abandona.
      </p>

      {!configured && (
        <Card>
          <p className="text-sm" style={{ color: "var(--tucv-text)" }}>
            Falta configurar <code>PLAUSIBLE_API_KEY</code> para ver estos datos. Se genera en{" "}
            analytics.tucv.ar → Settings → API Keys, y además cada evento (
            {GOALS.join(", ")}) tiene que estar dado de alta como Custom Event Goal en Site
            Settings → Goals de ese mismo sitio.
          </p>
        </Card>
      )}

      {configured && (!visits || !goals) && (
        <Card>
          <p className="text-sm">No pudimos consultar Plausible ahora mismo. Probá de nuevo en un rato.</p>
        </Card>
      )}

      {visits && goals && (
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold mb-4">Negocios</h2>
            <p className="text-xs mb-3" style={{ color: "var(--tucv-muted)" }}>
              De la visita a pagar un plan -- todo el recorrido de un negocio, un solo embudo.
            </p>
            <FunnelBar
              steps={[
                { label: "Visitas", value: visits.visitors },
                { label: "Registro completado", value: goals["Empresa: registro completado"].visitors },
                { label: "Publicó un aviso", value: goals["Empresa: aviso publicado"].visitors },
                { label: "Pagó un plan", value: goals["Pago aprobado"].visitors },
              ]}
            />
          </Card>
          <Card>
            <h2 className="font-semibold mb-4">Postulantes</h2>
            <FunnelBar
              steps={[
                { label: "Visitas", value: visits.visitors },
                { label: "Registro completado", value: goals["Postulante: registro completado"].visitors },
                { label: "Envió una postulación", value: goals["Postulante: postulacion enviada"].visitors },
              ]}
            />
          </Card>
          <Card>
            <h2 className="font-semibold mb-4">Recruiter (panel de candidatos)</h2>
            <p className="text-xs mb-3" style={{ color: "var(--tucv-muted)" }}>
              Del panel al contacto -- dónde se cae el dueño antes de contactar. Cada paso es
              visitantes únicos que dispararon ese evento.
            </p>
            <FunnelBar
              steps={[
                { label: "Entró al panel", value: goals["recruiter_panel"].visitors },
                { label: "Abrió un perfil", value: goals["recruiter_abrir_perfil"].visitors },
                { label: "Marcó visto", value: goals["recruiter_marcar_visto"].visitors },
                { label: "Guardó", value: goals["recruiter_guardar"].visitors },
                { label: "Contactó", value: goals["recruiter_contactar"].visitors },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
