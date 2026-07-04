import { Card } from "@/components/ui/Card";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
        {updated && (
          <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
            Última actualización: {updated}
          </p>
        )}
        <Card>
          <div className="prose-legal text-sm leading-relaxed space-y-4">{children}</div>
        </Card>
      </div>
    </main>
  );
}
