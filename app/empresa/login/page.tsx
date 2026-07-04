import { LoginForm } from "@/components/empresa/LoginForm";
import { AuthLoginScreen } from "@/components/auth/AuthLoginScreen";

export const metadata = {
  title: "Ingresá — TuCV",
  description: "Ingresá con Google para publicar búsquedas y gestionar tus postulantes en TuCV.",
};

export default function LoginEmpresaPage() {
  return (
    <AuthLoginScreen
      accent="#128C4A"
      accentSoft="#DCFCE7"
      eyebrow="Buscás empleados"
      title="Encontrá a tu próximo empleado"
      subtitle="Ingresá con tu cuenta de Google. Si es tu primera vez, este mismo paso crea tu cuenta."
      bullets={[
        "Publicá tu búsqueda y compartí el QR donde quieras",
        "Recibí postulantes ordenados por zona, experiencia y disponibilidad",
        "Gestioná todo desde un panel simple, sin planillas sueltas",
      ]}
    >
      <LoginForm />
    </AuthLoginScreen>
  );
}
