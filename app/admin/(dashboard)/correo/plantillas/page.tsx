import { LinkButton } from "@/components/ui/Button";
import { TemplatesManager } from "@/components/admin/TemplatesManager";

export default function AdminCorreoPlantillasPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plantillas de correo</h1>
        <LinkButton href="/admin/correo" variant="secondary">
          Volver al correo
        </LinkButton>
      </div>
      <TemplatesManager />
    </div>
  );
}
