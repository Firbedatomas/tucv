import { describe, expect, it, vi, beforeEach } from "vitest";
import { createFakeAdmin } from "@/lib/email/test-fake-admin";

const { fakeAdmin, fakeResend } = vi.hoisted(() => ({
  fakeAdmin: { current: null as ReturnType<typeof createFakeAdmin> | null },
  fakeResend: { current: null as { emails: { send: ReturnType<typeof vi.fn> } } | null },
}));
vi.mock("@/lib/pocketbase-admin", () => ({
  pbAdmin: async () => fakeAdmin.current,
}));
vi.mock("@/lib/email/client", () => ({
  EMAIL_FROM: "TuCV <impacto@tucv.ar>",
  getResendClient: () => fakeResend.current,
}));

import { sendTransactionalEmail } from "@/lib/email/send";
import type { RenderedEmail } from "@/lib/email/types";

const RENDERED: RenderedEmail = { subject: "Asunto", html: "<p>Hola</p>", text: "Hola" };

describe("sendTransactionalEmail", () => {
  beforeEach(() => {
    fakeAdmin.current = createFakeAdmin();
    fakeResend.current = { emails: { send: vi.fn().mockResolvedValue({ data: { id: "msg_123" }, error: null }) } };
  });

  it("sends and logs a 'sent' event when everything is in order", async () => {
    const result = await sendTransactionalEmail({ type: "welcome_candidate", to: "juan@ejemplo.com", rendered: RENDERED });
    expect(result.sent).toBe(true);
    expect(fakeResend.current!.emails.send).toHaveBeenCalledTimes(1);
    const admin = fakeAdmin.current!;
    const events = (admin as unknown as { _store: Record<string, unknown[]> })._store.email_events;
    expect(events).toHaveLength(1);
    expect((events[0] as Record<string, unknown>).status).toBe("sent");
  });

  it("never sends to a suppressed (bounced) email, and logs it as suppressed instead", async () => {
    fakeAdmin.current = createFakeAdmin({
      email_suppressions: [{ id: "s1", email: "rebotado@ejemplo.com", reason: "bounced" }],
    });
    const result = await sendTransactionalEmail({ type: "welcome_candidate", to: "rebotado@ejemplo.com", rendered: RENDERED });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("suppressed");
    expect(fakeResend.current!.emails.send).not.toHaveBeenCalled();
  });

  it("skips a gated email type when the user's preference says 'never'", async () => {
    fakeAdmin.current = createFakeAdmin({
      notification_preferences: [
        { id: "np_1", user: "user_1", applications_frequency: "never", unsubscribe_token: "tok" },
      ],
    });
    const result = await sendTransactionalEmail({
      type: "application_received_candidate",
      to: "juan@ejemplo.com",
      userId: "user_1",
      rendered: RENDERED,
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("preference");
    expect(fakeResend.current!.emails.send).not.toHaveBeenCalled();
  });

  it("sends an instant application email when the preference is 'instant'", async () => {
    fakeAdmin.current = createFakeAdmin({
      notification_preferences: [
        { id: "np_2", user: "user_2", applications_frequency: "instant", unsubscribe_token: "tok" },
      ],
    });
    const result = await sendTransactionalEmail({
      type: "application_received_candidate",
      to: "juan@ejemplo.com",
      userId: "user_2",
      rendered: RENDERED,
    });
    expect(result.sent).toBe(true);
  });

  it("never gates an ungated type like welcome_candidate, even with no userId", async () => {
    const result = await sendTransactionalEmail({ type: "welcome_candidate", to: "juan@ejemplo.com", rendered: RENDERED });
    expect(result.sent).toBe(true);
  });

  it("logs a 'failed' event and does not throw when RESEND_API_KEY isn't configured", async () => {
    fakeResend.current = null;
    const result = await sendTransactionalEmail({ type: "welcome_candidate", to: "juan@ejemplo.com", rendered: RENDERED });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("no_client");
  });

  it("logs a 'failed' event when Resend itself returns an error", async () => {
    fakeResend.current = { emails: { send: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }) } };
    const result = await sendTransactionalEmail({ type: "welcome_candidate", to: "juan@ejemplo.com", rendered: RENDERED });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("error");
    const admin = fakeAdmin.current!;
    const events = (admin as unknown as { _store: Record<string, unknown[]> })._store.email_events;
    expect((events[events.length - 1] as Record<string, unknown>).status).toBe("failed");
  });

  it("adds List-Unsubscribe headers when an unsubscribeUrl is given", async () => {
    await sendTransactionalEmail({
      type: "welcome_candidate",
      to: "juan@ejemplo.com",
      rendered: RENDERED,
      unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
    });
    const call = fakeResend.current!.emails.send.mock.calls[0][0];
    expect(call.headers["List-Unsubscribe"]).toContain("https://tucv.ar/api/email/unsubscribe?token=abc");
    expect(call.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("defers an email into the queue instead of sending when inside quiet hours", async () => {
    fakeAdmin.current = createFakeAdmin({
      notification_preferences: [
        {
          id: "np_q",
          user: "user_q",
          applications_frequency: "instant",
          quiet_hours_start: 20,
          quiet_hours_end: 8,
          unsubscribe_token: "tok",
        },
      ],
    });
    // 01:00 UTC = 22:00 en Argentina -> dentro de la ventana 20-08.
    const result = await sendTransactionalEmail({
      type: "application_received_candidate",
      to: "juan@ejemplo.com",
      userId: "user_q",
      rendered: RENDERED,
      now: new Date("2026-07-05T01:00:00Z"),
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("deferred");
    expect(fakeResend.current!.emails.send).not.toHaveBeenCalled();
    const store = (fakeAdmin.current as unknown as { _store: Record<string, unknown[]> })._store;
    expect(store.email_queue).toHaveLength(1);
    const events = store.email_events as Record<string, unknown>[];
    expect(events[events.length - 1].status).toBe("queued");
  });

  it("sends normally (no defer) when outside the quiet-hours window", async () => {
    fakeAdmin.current = createFakeAdmin({
      notification_preferences: [
        {
          id: "np_q2",
          user: "user_q2",
          applications_frequency: "instant",
          quiet_hours_start: 20,
          quiet_hours_end: 8,
          unsubscribe_token: "tok",
        },
      ],
    });
    // 12:00 UTC = 09:00 en Argentina -> fuera de la ventana 20-08.
    const result = await sendTransactionalEmail({
      type: "application_received_candidate",
      to: "juan@ejemplo.com",
      userId: "user_q2",
      rendered: RENDERED,
      now: new Date("2026-07-05T12:00:00Z"),
    });
    expect(result.sent).toBe(true);
    expect(fakeResend.current!.emails.send).toHaveBeenCalledTimes(1);
  });
});
