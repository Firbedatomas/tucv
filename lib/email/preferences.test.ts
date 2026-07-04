import { describe, expect, it, vi, beforeEach } from "vitest";
import { createFakeAdmin } from "@/lib/email/test-fake-admin";

const { fakeAdmin } = vi.hoisted(() => ({ fakeAdmin: { current: null as ReturnType<typeof createFakeAdmin> | null } }));
vi.mock("@/lib/pocketbase-admin", () => ({
  pbAdmin: async () => fakeAdmin.current,
}));

import { getOrCreatePreferences, getPreferencesByUnsubscribeToken } from "@/lib/email/preferences";

describe("notification preferences", () => {
  beforeEach(() => {
    fakeAdmin.current = createFakeAdmin();
  });

  it("creates a row with sane defaults the first time a user is looked up", async () => {
    const prefs = await getOrCreatePreferences("user_1");
    expect(prefs.user).toBe("user_1");
    expect(prefs.applicationsFrequency).toBe("instant");
    expect(prefs.companyDigestFrequency).toBe("daily");
    expect(prefs.profileViewsFrequency).toBe("weekly");
    expect(prefs.profileTips).toBe(true);
    expect(prefs.marketing).toBe(false);
  });

  it("returns the SAME row on a second lookup instead of creating a duplicate", async () => {
    const first = await getOrCreatePreferences("user_2");
    const second = await getOrCreatePreferences("user_2");
    expect(second.id).toBe(first.id);
    const admin = fakeAdmin.current!;
    const rows = (admin as unknown as { _store: Record<string, unknown[]> })._store.notification_preferences;
    expect(rows).toHaveLength(1);
  });

  it("falls back to sane defaults if a stored field is missing/blank (old rows, partial writes)", async () => {
    fakeAdmin.current = createFakeAdmin({
      notification_preferences: [
        { id: "np_1", user: "user_3", unsubscribe_token: "tok123" } as Record<string, unknown> & { id: string },
      ],
    });
    const prefs = await getOrCreatePreferences("user_3");
    expect(prefs.applicationsFrequency).toBe("instant");
    expect(prefs.companyDigestFrequency).toBe("daily");
    expect(prefs.profileViewsFrequency).toBe("weekly");
    expect(prefs.profileTips).toBe(true);
  });

  it("respects an explicit profile_tips=false instead of always defaulting to true", async () => {
    fakeAdmin.current = createFakeAdmin({
      notification_preferences: [
        { id: "np_2", user: "user_4", profile_tips: false, unsubscribe_token: "tok456" } as Record<string, unknown> & {
          id: string;
        },
      ],
    });
    const prefs = await getOrCreatePreferences("user_4");
    expect(prefs.profileTips).toBe(false);
  });

  it("looks up preferences by their unsubscribe token", async () => {
    const created = await getOrCreatePreferences("user_5");
    const found = await getPreferencesByUnsubscribeToken(created.unsubscribeToken);
    expect(found?.user).toBe("user_5");
  });

  it("returns null for an unknown unsubscribe token instead of throwing", async () => {
    expect(await getPreferencesByUnsubscribeToken("no-existe")).toBeNull();
  });
});
