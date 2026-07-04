import { LoginForm } from "@/components/postulante/LoginForm";
import { AuthLoginScreen } from "@/components/auth/AuthLoginScreen";

export const metadata = {
  title: "Ingresá — TuCV",
  description: "Ingresá con Google para crear o editar tu perfil de postulante y postularte a búsquedas cerca tuyo.",
};

export default async function LoginPostulantePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthLoginScreen
      accent="#2563EB"
      accentSoft="#DBEAFE"
      eyebrow="Buscás trabajo"
      title="Cargá tu perfil una vez, postulate cuando quieras"
      subtitle="Ingresá con tu cuenta de Google. Si es tu primera vez, este mismo paso crea tu cuenta."
      bullets={[
        "Nombre, WhatsApp, zona, experiencia y disponibilidad, una sola vez",
        "Postulate a búsquedas con un solo clic",
        "Tu perfil público, como un CV digital, listo para compartir",
      ]}
    >
      <LoginForm next={next} />
    </AuthLoginScreen>
  );
}
