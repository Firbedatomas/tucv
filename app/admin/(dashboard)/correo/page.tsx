import Link from "next/link";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

type ThreadRow = {
  id: string;
  section: string;
  subject: string;
  counterparty_name: string;
  counterparty_email: string;
  last_message_at: string;
  unread: boolean;
};

function SectionPill({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-[var(--tucv-radius)] text-sm inline-flex items-center gap-2"
      style={{
        border: "2px solid var(--tucv-border)",
        backgroundColor: active ? "var(--tucv-primary)" : "var(--tucv-surface)",
        color: active ? "var(--tucv-primary-text)" : "var(--tucv-text)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
      {count > 0 && (
        <span
          className="text-xs px-1.5 rounded-full"
          style={{
            backgroundColor: active ? "var(--tucv-primary-text)" : "var(--tucv-accent)",
            color: "var(--tucv-text)",
          }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export default async function AdminCorreoPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: sectionFilter } = await searchParams;
  const admin = await pbAdmin();
  const threads = await admin.collection("email_threads").getFullList<ThreadRow>({
    sort: "-last_message_at",
    requestKey: null,
  });

  const sections = Array.from(new Set(threads.map((t) => t.section))).sort();
  const unreadBySection = new Map<string, number>();
  for (const t of threads) {
    if (t.unread) unreadBySection.set(t.section, (unreadBySection.get(t.section) ?? 0) + 1);
  }
  const totalUnread = threads.filter((t) => t.unread).length;
  const visibleThreads = sectionFilter ? threads.filter((t) => t.section === sectionFilter) : threads;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Correo</h1>
        <LinkButton href="/admin/correo/plantillas" variant="secondary">
          Plantillas
        </LinkButton>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <SectionPill label="Todos" count={totalUnread} active={!sectionFilter} href="/admin/correo" />
        {sections.map((s) => (
          <SectionPill
            key={s}
            label={`${s}@tucv.ar`}
            count={unreadBySection.get(s) ?? 0}
            active={sectionFilter === s}
            href={`/admin/correo?section=${encodeURIComponent(s)}`}
          />
        ))}
      </div>

      {visibleThreads.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Todavía no llegó ningún correo acá.
          </p>
        </Card>
      ) : (
        <div
          className="rounded-[var(--tucv-radius)] overflow-hidden"
          style={{ border: "2px solid var(--tucv-border)" }}
        >
          {visibleThreads.map((t, i) => (
            <Link
              key={t.id}
              href={`/admin/correo/${t.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3"
              style={{
                borderTop: i > 0 ? "1px solid var(--tucv-border)" : undefined,
                backgroundColor: t.unread ? "var(--tucv-surface)" : "var(--tucv-bg)",
              }}
            >
              <div className="min-w-0">
                <p className="truncate" style={{ fontWeight: t.unread ? 700 : 500, color: "var(--tucv-text)" }}>
                  {t.counterparty_name || t.counterparty_email}
                </p>
                <p className="truncate text-sm" style={{ color: "var(--tucv-muted)" }}>
                  {t.subject || "(sin asunto)"}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs" style={{ color: "var(--tucv-muted)" }}>
                <div>{t.section}@tucv.ar</div>
                <div>{t.last_message_at ? new Date(t.last_message_at).toLocaleDateString("es-AR") : ""}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
