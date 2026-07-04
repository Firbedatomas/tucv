import { describe, expect, it, vi, beforeEach } from "vitest";
import { createFakeAdmin } from "@/lib/email/test-fake-admin";

const { fakeAdmin } = vi.hoisted(() => ({ fakeAdmin: { current: null as ReturnType<typeof createFakeAdmin> | null } }));
vi.mock("@/lib/pocketbase-admin", () => ({
  pbAdmin: async () => fakeAdmin.current,
}));

import { isSuppressed, suppress } from "@/lib/email/suppression";

describe("email suppression", () => {
  beforeEach(() => {
    fakeAdmin.current = createFakeAdmin();
  });

  it("reports an email as not suppressed when it has never bounced/complained", async () => {
    expect(await isSuppressed("nadie@ejemplo.com")).toBe(false);
  });

  it("suppresses an email and then reports it as suppressed", async () => {
    await suppress("Alguien@Ejemplo.com", "bounced", "hard bounce");
    expect(await isSuppressed("alguien@ejemplo.com")).toBe(true);
  });

  it("normalizes email casing/whitespace so a suppression matches regardless of how it's later checked", async () => {
    await suppress("  Persona@Ejemplo.COM  ", "complained");
    expect(await isSuppressed("persona@ejemplo.com")).toBe(true);
  });

  it("does not create a duplicate suppression row for the same email", async () => {
    await suppress("dup@ejemplo.com", "bounced");
    await suppress("dup@ejemplo.com", "bounced");
    const admin = fakeAdmin.current!;
    const rows = (admin as unknown as { _store: Record<string, unknown[]> })._store.email_suppressions;
    expect(rows).toHaveLength(1);
  });
});
