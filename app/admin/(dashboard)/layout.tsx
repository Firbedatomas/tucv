import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookieValue } from "@/lib/admin-session";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  robots: { index: false, follow: false },
};

// Defensa en profundidad: middleware.ts ya bloquea esto, pero un layout
// server-side que vuelve a validar la cookie evita depender de un solo punto
// de enforcement para datos tan sensibles (pagos, negocios, postulantes).
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const email = await verifyAdminSessionCookieValue(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (!email) redirect("/admin/login");

  return (
    <div className="flex flex-col sm:flex-row min-h-screen">
      <AdminNav />
      {/* min-w-0 -- sin esto, un <table> ancho adentro empuja el ancho de
          este flex item más allá del viewport en vez de dejar que el
          overflow-x-auto de DataTable haga su scroll horizontal. */}
      <main className="flex-1 min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
