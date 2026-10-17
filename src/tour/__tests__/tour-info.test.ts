import { describe, expect, it } from "vitest";
import { isTourDone, isTourNew, isTourReset } from "../tour-info";

/** docs/tours-harmonization.md §2.4, §6.4 (NEW) and §8 (a tour updated or fixed). */

describe("isTourNew", () => {
  it("is NEW when it shipped after the account was opened, by calendar day, and is untaken", () => {
    expect(isTourNew({ since: "2026-10-02", joined: "2026-10-01T23:30:00Z" })).toBe(true);
    // Shipped ON the joining day: it was already there to be found (keksdose).
    expect(isTourNew({ since: "2026-10-01", joined: "2026-10-01T08:00:00Z" })).toBe(false);
    expect(isTourNew({ since: "2026-09-30", joined: "2026-10-01" })).toBe(false);
  });

  it("a taken tour is not NEW", () => {
    expect(isTourNew({ since: "2026-10-02", joined: "2026-10-01", completed: true })).toBe(false);
  });

  it("no since, or no joined date, is never NEW (KS, ka F7)", () => {
    expect(isTourNew({ joined: "2026-10-01" })).toBe(false);
    expect(isTourNew({ since: "2026-10-02", joined: null })).toBe(false);
    expect(isTourNew({ since: "2026-10-02" })).toBe(false);
  });
});

describe("isTourReset / isTourDone (§8)", () => {
  const tour = { updated: { date: "2026-10-10", reason: "The import screen moved." } };

  it("a completion from before the update is reset, and no longer done", () => {
    expect(isTourReset(tour, "2026-10-09T22:00:00Z")).toBe(true);
    expect(isTourDone(tour, "2026-10-09T22:00:00Z")).toBe(false);
  });

  it("a completion on or after the update's day counts", () => {
    expect(isTourReset(tour, "2026-10-10T09:00:00Z")).toBe(false);
    expect(isTourDone(tour, "2026-10-11T09:00:00Z")).toBe(true);
  });

  it("a completion without a date predates any update", () => {
    expect(isTourReset(tour, null)).toBe(true);
    expect(isTourDone({}, null)).toBe(true);
  });

  it("a tour never completed is never reset — there is nothing to reset", () => {
    expect(isTourReset(tour, undefined)).toBe(false);
    expect(isTourDone(tour, undefined)).toBe(false);
  });

  it("a tour without an update is done once completed", () => {
    expect(isTourReset({}, "2020-01-01")).toBe(false);
    expect(isTourDone({}, "2020-01-01")).toBe(true);
  });
});
