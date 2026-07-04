export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      className="rounded-[var(--tucv-radius)] p-5"
      style={{
        backgroundColor: "var(--tucv-surface)",
        border: "2px solid var(--tucv-border)",
        boxShadow: "var(--tucv-shadow)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tucv-muted)" }}>
        {label}
      </p>
      <p className="text-3xl font-bold mt-1" style={{ color: "var(--tucv-text)" }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
