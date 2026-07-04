// Embed de Google Maps sin API key -- el formato "maps?q=...&output=embed"
// es el mismo que genera "Compartir > Insertar un mapa" desde Maps, sigue
// andando sin necesidad de una key nueva ni tocar la configuración de Cloud
// Console (la key que ya tenemos está restringida por IP para el proxy de
// autocomplete server-side, no serviría acá expuesta en un iframe).
export function LocationMap({ addressZone }: { addressZone: string }) {
  if (!addressZone.trim()) return null;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(addressZone)}&output=embed`;
  return (
    <div
      className="rounded-[var(--tucv-radius)] overflow-hidden"
      style={{ border: "2px solid var(--tucv-border)" }}
    >
      <iframe
        src={src}
        title={`Ubicación: ${addressZone}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-48 sm:h-56"
        style={{ border: 0 }}
      />
    </div>
  );
}
