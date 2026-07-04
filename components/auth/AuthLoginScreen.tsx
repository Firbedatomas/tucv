import { Card } from "@/components/ui/Card";
import { FormPageHeader } from "@/components/ui/FormPageHeader";

export function AuthLoginScreen({
  accent,
  accentSoft,
  eyebrow,
  title,
  subtitle,
  bullets,
  children,
}: {
  accent: string;
  accentSoft: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: string[];
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <FormPageHeader accent={accent} eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <div className="px-4 -mt-8 sm:-mt-10 pb-14">
        <div className="max-w-lg mx-auto">
          <Card>
            {children}

            <ul className="mt-6 space-y-2.5" style={{ borderTop: "1.5px solid var(--tucv-border)", paddingTop: "1.25rem" }}>
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-[calc(var(--tucv-radius)/2)]"
                    style={{ backgroundColor: accentSoft, color: accent, border: `1.5px solid ${accent}` }}
                  >
                    ✓
                  </span>
                  <span style={{ color: "var(--tucv-text)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </main>
  );
}
