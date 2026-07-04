// Encabezado de sección para formularios largos -- mismo lenguaje visual que
// los pasos numerados de "Cómo funciona" en la landing (círculo sólido +
// número), para que un formulario de muchos campos se sienta organizado en
// pasos en vez de una sola lista continua.
export function FormSection({
  number,
  title,
  hint,
}: {
  number: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
        style={{ backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)" }}
      >
        {number}
      </div>
      <div>
        <h2 className="font-bold text-lg leading-tight">{title}</h2>
        {hint && (
          <p className="text-xs leading-tight" style={{ color: "var(--tucv-muted)" }}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
