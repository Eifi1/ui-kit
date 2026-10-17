import { describe, expect, it } from "vitest";
import { doneCount, earnedPoints, isTourDone, isTourNew, isTourReset } from "../tour-info";

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

  // The suite runs in Europe/Berlin (vitest.config), as Zurich: UTC+2 in October.
  it("a completion from before the update is reset, and no longer done", () => {
    // 23:59 local on the 9th.
    expect(isTourReset(tour, "2026-10-09T21:59:00Z")).toBe(true);
    expect(isTourDone(tour, "2026-10-09T21:59:00Z")).toBe(false);
  });

  it("compares instants against the local start of the update day, not UTC days (keksdose K-S2)", () => {
    // 00:30 local on the update day: its UTC day is the 9th, and it still counts.
    expect(isTourReset(tour, "2026-10-09T22:30:00Z")).toBe(false);
    expect(isTourDone(tour, "2026-10-09T22:30:00Z")).toBe(true);
    // An offset timestamp is read as the instant it names.
    expect(isTourDone(tour, "2026-10-10T00:30:00+02:00")).toBe(true);
    // A bare day is that local day: the update's own day counts, the one before does not.
    expect(isTourDone(tour, "2026-10-10")).toBe(true);
    expect(isTourDone(tour, "2026-10-09")).toBe(false);
  });

  it("reads the update's date alone: a reason (or a reason key) is not needed", () => {
    const keyed = { updated: { date: "2026-10-10", reasonKey: "tours.goals.moved" } };
    expect(isTourDone(keyed, "2026-10-09T21:59:00Z")).toBe(false);
    expect(isTourDone({ updated: { date: "2026-10-10" } }, "2026-10-11T09:00:00Z")).toBe(true);
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

describe("doneCount / earnedPoints (§6.1, §8; kastlan A3, keksdose K-S5)", () => {
  const tours = [
    { id: "a", points: 10 },
    { id: "b", points: 20, updated: { date: "2026-10-10" } },
    { id: "c" },
    { id: "d", points: 5 },
  ];

  it("counts the done tours, a reset one not until it is taken again", () => {
    const completed = { a: "2026-09-01T10:00:00Z", b: "2026-09-01T10:00:00Z", c: null };
    expect(doneCount(tours, completed)).toBe(2);
    expect(earnedPoints(tours, completed)).toBe(10);
    const again = { ...completed, b: "2026-10-11T08:00:00Z" };
    expect(doneCount(tours, again)).toBe(3);
    expect(earnedPoints(tours, again)).toBe(30);
  });

  it("nothing done: zero", () => {
    expect(doneCount(tours, {})).toBe(0);
    expect(earnedPoints(tours, {})).toBe(0);
  });
});
