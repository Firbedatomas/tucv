import { AuthLoginScreen } from "@/components/auth/AuthLoginScreen";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = {
  title: "Admin — TuCV",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <AuthLoginScreen
      accent="#151515"
      accentSoft="#FFC300"
      eyebrow="Panel interno"
      title="Acceso de administración"
      subtitle="Solo la cuenta de Google autorizada puede entrar acá."
      bullets={[
        "Negocios, postulantes y pagos en un solo lugar",
        "Embudo completo: de la visita al pago",
        "Correo interno de @tucv.ar",
      ]}
    >
      <AdminLoginForm />
    </AuthLoginScreen>
  );
}
