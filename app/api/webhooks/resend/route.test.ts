import { describe, expect, it, vi, beforeEach } from "vitest";
import { createFakeAdmin } from "@/lib/email/test-fake-admin";

const { fakeAdmin, verifyMock } = vi.hoisted(() => ({
  fakeAdmin: { current: null as ReturnType<typeof createFakeAdmin> | null },
  verifyMock: vi.fn(),
}));
vi.mock("@/lib/pocketbase-admin", () => ({
  pbAdmin: async () => fakeAdmin.current,
}));
vi.mock("svix", () => ({
  // Constructor real (no arrow function) -- vi.fn().mockImplementation(() =>
  // ...) con una arrow function rompe silenciosamente cuando el código bajo
  // prueba hace `new Webhook(secret)` (una arrow function no es
  // constructible), y termina resolviendo `wh.verify` como undefined.
  Webhook: vi.fn().mockImplementation(function Webhook() {
    return { verify: verifyMock };
  }),
}));

process.env.RESEND_WEBHOOK_SECRET = "whsec_test";

function makeRequest(): Request {
  return new Request("https://tucv.ar/api/webhooks/resend", {
    method: "POST",
    headers: { "svix-id": "1", "svix-timestamp": "2", "svix-signature": "3" },
    body: "{}",
  });
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    fakeAdmin.current = createFakeAdmin({
      email_events: [{ id: "ev_1", provider_message_id: "msg_1", status: "sent", email: "juan@ejemplo.com" } as Record<string, unknown> & { id: string }],
    });
    verifyMock.mockReset();
  });

  it("rejects a request whose signature fails verification", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("maps email.delivered to a 'delivered' status update on the matching email_event", async () => {
    verifyMock.mockReturnValue({ type: "email.delivered", data: { email_id: "msg_1" } });
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const admin = fakeAdmin.current!;
    const events = (admin as unknown as { _store: Record<string, unknown[]> })._store.email_events;
    expect((events[0] as Record<string, unknown>).status).toBe("delivered");
  });

  it("maps email.bounced to a 'bounced' status AND suppresses the recipient", async () => {
    verifyMock.mockReturnValue({
      type: "email.bounced",
      data: { email_id: "msg_1", to: ["juan@ejemplo.com"], bounce: { message: "mailbox full" } },
    });
    const { POST } = await import("@/app/api/webhooks/resend/route");
    await POST(makeRequest());
    const admin = fakeAdmin.current!;
    const store = (admin as unknown as { _store: Record<string, unknown[]> })._store;
    expect((store.email_events[0] as Record<string, unknown>).status).toBe("bounced");
    expect(store.email_suppressions).toHaveLength(1);
    expect((store.email_suppressions[0] as Record<string, unknown>).reason).toBe("bounced");
  });

  it("maps email.complained to 'complained' and suppresses the recipient", async () => {
    verifyMock.mockReturnValue({ type: "email.complained", data: { email_id: "msg_1", to: ["juan@ejemplo.com"] } });
    const { POST } = await import("@/app/api/webhooks/resend/route");
    await POST(makeRequest());
    const admin = fakeAdmin.current!;
    const store = (admin as unknown as { _store: Record<string, unknown[]> })._store;
    expect((store.email_events[0] as Record<string, unknown>).status).toBe("complained");
    expect(store.email_suppressions).toHaveLength(1);
    expect((store.email_suppressions[0] as Record<string, unknown>).reason).toBe("complained");
  });

  it("ignores an unknown event type without crashing", async () => {
    verifyMock.mockReturnValue({ type: "email.delivery_delayed", data: { email_id: "msg_1" } });
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const admin = fakeAdmin.current!;
    const events = (admin as unknown as { _store: Record<string, unknown[]> })._store.email_events;
    expect((events[0] as Record<string, unknown>).status).toBe("sent");
  });
});
