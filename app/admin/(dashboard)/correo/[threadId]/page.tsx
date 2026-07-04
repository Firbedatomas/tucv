import { notFound } from "next/navigation";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { sanitizeInboundEmailHtml } from "@/lib/admin/sanitize-email";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { MarkThreadRead } from "@/components/admin/MarkThreadRead";
import { ReplyComposer } from "@/components/admin/ReplyComposer";

type MessageRow = {
  id: string;
  direction: "in" | "out";
  from_email: string;
  subject: string;
  html_body: string;
  text_body: string;
  created: string;
};

export default async function AdminCorreoThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const admin = await pbAdmin();
  const thread = await admin.collection("email_threads").getOne(threadId).catch(() => null);
  if (!thread) notFound();

  const messages = await admin.collection("email_messages").getFullList<MessageRow>({
    filter: admin.filter("thread = {:id}", { id: threadId }),
    sort: "created",
    requestKey: null,
  });

  return (
    <div>
      <MarkThreadRead threadId={thread.id} />
      <LinkButton href="/admin/correo" variant="ghost" className="mb-4 px-0 py-0">
        ← Volver al correo
      </LinkButton>
      <h1 className="text-2xl font-bold mb-1">{thread.subject || "(sin asunto)"}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
        {thread.counterparty_name ? `${thread.counterparty_name} · ` : ""}
        {thread.counterparty_email} · {thread.section}@tucv.ar
      </p>

      <div className="space-y-4 mb-6">
        {messages.map((m) => (
          <Card key={m.id} className={m.direction === "out" ? "sm:ml-8" : "sm:mr-8"}>
            <div className="flex items-center justify-between mb-2 text-xs" style={{ color: "var(--tucv-muted)" }}>
              <span className="font-medium" style={{ color: "var(--tucv-text)" }}>
                {m.direction === "out" ? "Vos" : thread.counterparty_name || thread.counterparty_email}
              </span>
              <span>{new Date(m.created).toLocaleString("es-AR")}</span>
            </div>
            {m.html_body ? (
              // Sanitizado de nuevo acá aunque ya se sanitizó al guardar
              // (webhook) -- nunca confiamos en HTML de un desconocido
              // solo porque ya está en la base.
              <div dangerouslySetInnerHTML={{ __html: sanitizeInboundEmailHtml(m.html_body) }} />
            ) : (
              <p style={{ whiteSpace: "pre-wrap" }}>{m.text_body || "(sin contenido)"}</p>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold mb-4">Responder</h2>
        <ReplyComposer threadId={thread.id} defaultSubject={`Re: ${thread.subject || "sin asunto"}`} />
      </Card>
    </div>
  );
}
