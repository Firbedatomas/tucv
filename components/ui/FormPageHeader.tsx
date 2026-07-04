// Banda oscura con badge inclinado -- mismo lenguaje visual del hero de la
// home. Deja el contenido de abajo (el form de quien la use, que ya trae su
// propio <Card>) superpuesto con un margen negativo, para que la card
// "flote" sobre el límite entre la banda oscura y el fondo claro.
export function FormPageHeader({
  accent,
  eyebrow,
  title,
  subtitle,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-4 pt-10 pb-12 sm:pt-14 sm:pb-16" style={{ backgroundColor: "var(--tucv-text)" }}>
      <div className="max-w-lg mx-auto text-center">
        <p
          className="inline-block text-xs font-bold uppercase tracking-wide mb-4 px-3 py-1.5 rounded-[var(--tucv-radius)] -rotate-2"
          style={{
            backgroundColor: accent,
            color: "#fff",
            border: "2px solid var(--tucv-border)",
            boxShadow: "3px 3px 0 var(--tucv-border)",
          }}
        >
          {eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-balance" style={{ color: "var(--tucv-bg)" }}>
          {title}
        </h1>
        <p className="text-sm sm:text-base" style={{ color: "#C9C1B4" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
