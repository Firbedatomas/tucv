import { pbAdmin } from "@/lib/pocketbase-admin";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";

const PAGE_SIZE = 50;

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  rejected: "Rechazado",
};

function formatARS(amount: number): string {
  return amount.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const admin = await pbAdmin();
  // Ordenar por `created` requiere la migración 1783225000_updated_payments.js
  // (agrega created/updated a una colección que se armó fuera de las
  // migraciones, sin esos campos). Si todavía no se aplicó en este entorno,
  // caemos a la lista sin ordenar en vez de romper la página entera.
  const list = await admin.collection("payments").getList(page, PAGE_SIZE, {
    sort: "-created",
    expand: "business",
    requestKey: null,
  }).catch(() =>
    admin.collection("payments").getList(page, PAGE_SIZE, { expand: "business", requestKey: null })
  );

  const rows = list.items.map((p) => ({
    id: p.id,
    business: (p.expand?.business as { business_name?: string } | undefined)?.business_name ?? "—",
    type: (p.type as string) || "—",
    amount: formatARS((p.amount as number) ?? 0),
    status: STATUS_LABEL[p.status as string] ?? (p.status as string),
    created: p.created ? new Date(p.created as string).toLocaleString("es-AR") : "—",
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pagos</h1>
        <span className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          {list.totalItems} en total
        </span>
      </div>
      <DataTable
        rows={rows}
        emptyLabel="Todavía no hay pagos registrados."
        columns={[
          { key: "business", label: "Negocio" },
          { key: "type", label: "Tipo" },
          { key: "amount", label: "Monto", align: "right" },
          { key: "status", label: "Estado" },
          { key: "created", label: "Fecha" },
        ]}
      />
      <Pagination page={list.page} totalPages={list.totalPages} basePath="/admin/pagos" />
    </div>
  );
}
