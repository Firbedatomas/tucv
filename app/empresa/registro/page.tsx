import { RegistroForm } from "@/components/empresa/RegistroForm";
import { FormPageHeader } from "@/components/ui/FormPageHeader";

export const metadata = {
  title: "Completá los datos de tu negocio — TuCV",
  description:
    "Creá tu cuenta de negocio y empezá a publicar búsquedas gratis: recibí postulantes ordenados por zona, experiencia y disponibilidad, sin CVs sueltos por mail.",
};

export default function RegistroEmpresaPage() {
  return (
    <main className="flex-1">
      <FormPageHeader
        accent="#128C4A"
        eyebrow="Último paso"
        title="Completá los datos de tu negocio"
        subtitle="Un último paso para publicar búsquedas y ver a tus postulantes."
      />
      <div className="px-4 -mt-8 sm:-mt-10 pb-14">
        <div className="max-w-lg mx-auto">
          <RegistroForm />
        </div>
      </div>
    </main>
  );
}
