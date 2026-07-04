import { describe, expect, it } from "vitest";
import { currentHourInArgentina, isWithinQuietHours, nextQuietHoursEndUtc } from "@/lib/email/quiet-hours";

describe("currentHourInArgentina", () => {
  it("converts a UTC instant to Argentina local hour (UTC-3)", () => {
    // 12:00 UTC = 09:00 en Argentina
    expect(currentHourInArgentina(new Date("2026-07-04T12:00:00Z"))).toBe(9);
  });

  it("wraps correctly across midnight (01:00 UTC = 22:00 del día anterior en AR)", () => {
    expect(currentHourInArgentina(new Date("2026-07-04T01:00:00Z"))).toBe(22);
  });
});

describe("isWithinQuietHours", () => {
  it("is false when quiet hours are disabled (null)", () => {
    expect(isWithinQuietHours(3, null, null)).toBe(false);
    expect(isWithinQuietHours(3, 20, null)).toBe(false);
  });

  it("is false when start equals end (treated as disabled)", () => {
    expect(isWithinQuietHours(10, 8, 8)).toBe(false);
  });

  it("handles a window that crosses midnight (20 to 8)", () => {
    expect(isWithinQuietHours(22, 20, 8)).toBe(true);
    expect(isWithinQuietHours(2, 20, 8)).toBe(true);
    expect(isWithinQuietHours(7, 20, 8)).toBe(true);
    expect(isWithinQuietHours(8, 20, 8)).toBe(false); // end is exclusive
    expect(isWithinQuietHours(12, 20, 8)).toBe(false);
    expect(isWithinQuietHours(20, 20, 8)).toBe(true); // start is inclusive
  });

  it("handles a same-day window (8 to 20)", () => {
    expect(isWithinQuietHours(10, 8, 20)).toBe(true);
    expect(isWithinQuietHours(8, 8, 20)).toBe(true);
    expect(isWithinQuietHours(20, 8, 20)).toBe(false);
    expect(isWithinQuietHours(2, 8, 20)).toBe(false);
  });
});

describe("nextQuietHoursEndUtc", () => {
  it("returns today's end hour (in UTC) when it is still ahead", () => {
    // 22:00 AR = 01:00 UTC (2026-07-05). Window 20-08, end=08 AR = 11:00 UTC.
    // 11:00 UTC of the 5th is ahead of 01:00 UTC of the 5th.
    const now = new Date("2026-07-05T01:00:00Z");
    const end = nextQuietHoursEndUtc(now, 8);
    expect(end.toISOString()).toBe("2026-07-05T11:00:00.000Z");
  });

  it("rolls to the next day when the end hour already passed today", () => {
    // 12:00 UTC, end=08 AR = 11:00 UTC which is already past today.
    const now = new Date("2026-07-05T12:00:00Z");
    const end = nextQuietHoursEndUtc(now, 8);
    expect(end.toISOString()).toBe("2026-07-06T11:00:00.000Z");
  });
});
