import { pbAdmin } from "@/lib/pocketbase-admin";
import { DataTable } from "@/components/admin/DataTable";
import { ModerateControls } from "@/components/admin/ModerateControls";

// Estados de la cola de moderación (ver migración 1783270015). Vacío = recién
// entrado, todavía sin tocar.
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  reviewing: "En revisión",
  resolved_no_action: "Sin acción",
  hidden: "Oculto",
  user_warned: "Advertido",
  user_blocked: "Bloqueado",
  reviewed: "Revisado",
  dismissed: "Descartado",
};

function StatusBadge({ status }: { status: string }) {
  const active = status !== "pending";
  return (
    <span
      className="text-xs font-semibold whitespace-nowrap"
      style={{ color: active ? "var(--tucv-text)" : "var(--tucv-muted)" }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// Sin paginación propia a propósito -- moderación básica, se espera bajo
// volumen (a diferencia de postulantes/negocios). Si algún día esto se
// llena, la señal correcta es sumar paginación, no subir el número de acá
// sin más (mismo criterio que PUBLIC_JOBS_LIMIT en lib/public-jobs-list.ts).
const REPORTS_LIMIT = 100;

const REASON_LABELS: Record<string, string> = {
  parece_falso: "Parece falso",
  contenido_inapropiado: "Contenido inapropiado",
  datos_incorrectos: "Datos incorrectos",
  pide_dinero_o_datos: "Pide dinero o datos",
  discriminatorio_u_ofensivo: "Discriminatorio u ofensivo",
  falsa: "Parece falsa",
  ofensiva: "Contenido ofensivo",
  spam: "Spam",
  otro: "Otro",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  reference: "Referencia",
  recommendation: "Recomendación",
};

export default async function AdminReportesPage() {
  const admin = await pbAdmin();

  const [profileReports, businessReports, contentReports] = await Promise.all([
    admin.collection("profile_reports").getList(1, REPORTS_LIMIT, {
      sort: "-created",
      expand: "candidate",
      requestKey: null,
    }),
    admin.collection("business_reports").getList(1, REPORTS_LIMIT, {
      sort: "-created",
      expand: "job_post,job_post.business",
      requestKey: null,
    }),
    admin.collection("content_reports").getList(1, REPORTS_LIMIT, {
      sort: "-created",
      requestKey: null,
    }),
  ]);

  const profileRows = profileReports.items.map((r) => {
    const candidate = r.expand?.candidate as Record<string, unknown> | undefined;
    return {
      id: r.id,
      profile: candidate ? (candidate.name as string) || "—" : "Perfil eliminado",
      profileSlug: candidate?.profile_slug as string | undefined,
      reason: REASON_LABELS[r.reason as string] || (r.reason as string),
      detail: (r.detail as string) || "—",
      status: (r.status as string) || "pending",
      created: new Date(r.created as string).toLocaleString("es-AR"),
    };
  });

  const businessRows = businessReports.items.map((r) => {
    const jobPost = r.expand?.job_post as { name?: string; expand?: { business?: { business_name?: string } } } | undefined;
    return {
      id: r.id,
      job: jobPost?.name || "Búsqueda eliminada",
      business: jobPost?.expand?.business?.business_name || "—",
      reason: REASON_LABELS[r.reason as string] || (r.reason as string),
      detail: (r.detail as string) || "—",
      status: (r.status as string) || "pending",
      created: new Date(r.created as string).toLocaleString("es-AR"),
    };
  });

  const contentRows = contentReports.items.map((r) => ({
    id: r.id,
    type: CONTENT_TYPE_LABELS[r.content_type as string] || (r.content_type as string),
    reason: REASON_LABELS[r.reason as string] || (r.reason as string),
    detail: (r.detail as string) || "—",
    status: (r.status as string) || "pending",
    created: new Date(r.created as string).toLocaleString("es-AR"),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <span className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          {profileReports.totalItems + businessReports.totalItems + contentReports.totalItems} en total
        </span>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Perfiles de postulantes
      </h2>
      <DataTable
        rows={profileRows}
        emptyLabel="Sin reportes de perfiles."
        columns={[
          {
            key: "profile",
            label: "Perfil",
            render: (row) =>
              row.profileSlug ? (
                <a href={`/p/${row.profileSlug}`} target="_blank" rel="noopener noreferrer" className="underline">
                  {row.profile}
                </a>
              ) : (
                row.profile
              ),
          },
          { key: "reason", label: "Motivo" },
          { key: "detail", label: "Detalle" },
          { key: "status", label: "Estado", render: (row) => <StatusBadge status={row.status} /> },
          { key: "created", label: "Fecha" },
          {
            key: "actions",
            label: "",
            render: (row) => <ModerateControls reportType="profile" reportId={row.id} />,
          },
        ]}
      />

      <div className="mt-10" />
      <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Negocios / búsquedas
      </h2>
      <DataTable
        rows={businessRows}
        emptyLabel="Sin reportes de negocios."
        columns={[
          { key: "job", label: "Búsqueda" },
          { key: "business", label: "Negocio" },
          { key: "reason", label: "Motivo" },
          { key: "detail", label: "Detalle" },
          { key: "status", label: "Estado", render: (row) => <StatusBadge status={row.status} /> },
          { key: "created", label: "Fecha" },
          {
            key: "actions",
            label: "",
            render: (row) => <ModerateControls reportType="business" reportId={row.id} />,
          },
        ]}
      />

      <div className="mt-10" />
      <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Reportes de contenido
      </h2>
      <DataTable
        rows={contentRows}
        emptyLabel="Sin reportes de contenido."
        columns={[
          { key: "type", label: "Tipo" },
          { key: "reason", label: "Motivo" },
          { key: "detail", label: "Detalle" },
          { key: "status", label: "Estado", render: (row) => <StatusBadge status={row.status} /> },
          { key: "created", label: "Fecha" },
          {
            key: "actions",
            label: "",
            render: (row) => <ModerateControls reportType="content" reportId={row.id} />,
          },
        ]}
      />
    </div>
  );
}
