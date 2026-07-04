import { CandidateForm } from "@/components/postulante/CandidateForm";
import { FormPageHeader } from "@/components/ui/FormPageHeader";

export const metadata = {
  title: "Creá tu perfil — TuCV",
  description:
    "Cargá tu perfil una sola vez con Google: nombre, WhatsApp, zona, rubros, experiencia y disponibilidad. Postulate con un clic a búsquedas cerca tuyo, gratis.",
};

export default async function NuevoPostulantePage({
  searchParams,
}: {
  searchParams: Promise<{ applyTo?: string }>;
}) {
  const { applyTo } = await searchParams;

  return (
    <main className="flex-1">
      <FormPageHeader
        accent="#2563EB"
        eyebrow={applyTo ? "Ya casi te postulás" : "Buscás trabajo"}
        title="Creá tu perfil"
        subtitle={
          applyTo
            ? "Completá tus datos y quedás postulado a esta búsqueda."
            : "Lo cargás una sola vez y lo usás para postularte a los trabajos que te interesen."
        }
      />
      <div className="px-4 -mt-8 sm:-mt-10 pb-14">
        <div className="max-w-lg mx-auto">
          <CandidateForm mode={{ kind: "create" }} applyToJobPostId={applyTo} />
        </div>
      </div>
    </main>
  );
}
