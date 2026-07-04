const POINTS = [
  {
    title: "QR + plantilla lista para imprimir",
    body: "Te damos un QR y una plantilla con tu puesto ya cargado. La imprimís, la pegás en el local, y quien pasa solo escanea y manda sus datos.",
  },
  {
    title: "Ahorrás tiempo y plata filtrando",
    body: "Nada de leer CVs sueltos por mail o WhatsApp: filtrás por zona, experiencia, disponibilidad y movilidad, y solo hablás con quien realmente sirve.",
  },
  {
    title: "Se muestra en tucv.ar automáticamente",
    body: "Tu búsqueda aparece sola en nuestra web, sin pagar nada. Si necesitás cubrir el puesto más rápido, después podés pagar para que aparezca primero en tu zona.",
  },
];

export function JobPostSellingPoints() {
  return (
    <div className="space-y-4">
      {POINTS.map((p) => (
        <div
          key={p.title}
          className="p-4 rounded-[var(--tucv-radius)]"
          style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)", boxShadow: "var(--tucv-shadow)" }}
        >
          <p className="font-bold text-sm mb-1">{p.title}</p>
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            {p.body}
          </p>
        </div>
      ))}
    </div>
  );
}
