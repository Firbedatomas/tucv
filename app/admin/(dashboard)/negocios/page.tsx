import { pbAdmin } from "@/lib/pocketbase-admin";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";

const PAGE_SIZE = 50;

export default async function AdminNegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const admin = await pbAdmin();
  const [list, jobPosts] = await Promise.all([
    admin.collection("business_accounts").getList(page, PAGE_SIZE, { sort: "-created", requestKey: null }),
    admin.collection("job_posts").getFullList<{ business: string }>({ fields: "business", requestKey: null }),
  ]);

  const jobCountByBusiness = new Map<string, number>();
  for (const job of jobPosts) {
    jobCountByBusiness.set(job.business, (jobCountByBusiness.get(job.business) ?? 0) + 1);
  }

  const rows = list.items.map((b) => ({
    id: b.id,
    businessName: (b.business_name as string) || "—",
    contactName: (b.contact_name as string) || "—",
    phone: (b.phone as string) || "—",
    cityZone: (b.city_zone as string) || "—",
    plan: (b.plan as string) || "free",
    jobPosts: jobCountByBusiness.get(b.id) ?? 0,
    created: new Date(b.created as string).toLocaleDateString("es-AR"),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Negocios</h1>
        <span className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          {list.totalItems} en total
        </span>
      </div>
      <DataTable
        rows={rows}
        emptyLabel="Todavía no hay negocios registrados."
        columns={[
          { key: "businessName", label: "Negocio" },
          { key: "contactName", label: "Contacto" },
          { key: "phone", label: "Teléfono" },
          { key: "cityZone", label: "Zona" },
          { key: "plan", label: "Plan" },
          { key: "jobPosts", label: "Avisos", align: "right" },
          { key: "created", label: "Alta" },
        ]}
      />
      <Pagination page={list.page} totalPages={list.totalPages} basePath="/admin/negocios" />
    </div>
  );
}
