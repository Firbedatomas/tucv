export function FunnelBar({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const dropOff = prev && prev > 0 ? Math.round((1 - step.value / prev) * 100) : null;
        const width = Math.max(4, Math.round((step.value / max) * 100));
        return (
          <div key={step.label}>
            <div className="flex items-baseline justify-between mb-1 text-sm">
              <span className="font-medium" style={{ color: "var(--tucv-text)" }}>
                {step.label}
              </span>
              <span style={{ color: "var(--tucv-muted)" }}>
                {step.value.toLocaleString("es-AR")}
                {dropOff !== null && dropOff > 0 && ` · -${dropOff}%`}
              </span>
            </div>
            <div
              className="h-8 rounded-[var(--tucv-radius)] overflow-hidden"
              style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
            >
              <div className="h-full" style={{ width: `${width}%`, backgroundColor: "var(--tucv-primary)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
