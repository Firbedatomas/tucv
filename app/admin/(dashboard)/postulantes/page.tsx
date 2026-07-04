import { pbAdmin } from "@/lib/pocketbase-admin";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";

const PAGE_SIZE = 50;

export default async function AdminPostulantesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const admin = await pbAdmin();
  const list = await admin.collection("candidate_profiles").getList(page, PAGE_SIZE, {
    sort: "-created",
    requestKey: null,
  });

  const rows = list.items.map((c) => {
    const fullName =
      (c.name as string) ||
      [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ") ||
      "—";
    const categories = Array.isArray(c.categories) ? (c.categories as string[]).join(", ") : "—";
    return {
      id: c.id,
      name: fullName,
      whatsapp: (c.whatsapp as string) || "—",
      cityZone: (c.city_zone as string) || "—",
      categories: categories || "—",
      visible: c.consent_zone_visible ? "Sí" : "No",
      created: new Date(c.created as string).toLocaleDateString("es-AR"),
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Postulantes</h1>
        <span className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          {list.totalItems} en total
        </span>
      </div>
      <DataTable
        rows={rows}
        emptyLabel="Todavía no hay postulantes registrados."
        columns={[
          { key: "name", label: "Nombre" },
          { key: "whatsapp", label: "WhatsApp" },
          { key: "cityZone", label: "Zona" },
          { key: "categories", label: "Categorías" },
          { key: "visible", label: "Visible en zona" },
          { key: "created", label: "Alta" },
        ]}
      />
      <Pagination page={list.page} totalPages={list.totalPages} basePath="/admin/postulantes" />
    </div>
  );
}
