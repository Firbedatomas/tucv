import { LinkButton } from "@/components/ui/Button";
import { CampaignForm } from "./campaign-form";

export default function AdminCampanasPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Campaña</h1>
        <LinkButton href="/admin/correo" variant="secondary">
          Volver a correo
        </LinkButton>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
        Envío masivo a un segmento. Respeta la baja de marketing y las direcciones suprimidas. Se encola
        y se manda por la cola robusta (rate-limit + reintentos), nunca todo de golpe.
      </p>
      <CampaignForm />
    </div>
  );
}
