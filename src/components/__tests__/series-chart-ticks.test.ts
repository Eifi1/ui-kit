import { describe, expect, it } from "vitest";
import { niceStep, niceTicks } from "../series-chart-ticks";

describe("niceStep", () => {
  it("rounds to 1, 2 or 5 × 10^n", () => {
    expect(niceStep(100)).toBe(20);
    expect(niceStep(922)).toBe(200);
    expect(niceStep(1)).toBe(0.2);
    expect(niceStep(30)).toBe(5);
    expect(niceStep(80)).toBe(20);
    expect(niceStep(0.004)).toBeCloseTo(0.001, 12);
  });
});

describe("niceTicks", () => {
  it("puts round ticks inside the padded band, never recharts' equal split", () => {
    // [89, 1011] is what the fit made of data running 126…974; split evenly it printed
    // 89, 289, 489 … which nobody can read a value against.
    expect(niceTicks([89, 1011])).toEqual([200, 400, 600, 800, 1000]);
    expect(niceTicks([-4, 104])).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("keeps every tick inside the domain", () => {
    for (const domain of [
      [-11, 811],
      [0.37, 0.92],
      [-1e6, 3e6],
      [1234.5, 1234.9],
    ] as [number, number][]) {
      const ticks = niceTicks(domain)!;
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      for (const t of ticks) {
        expect(t).toBeGreaterThanOrEqual(domain[0]);
        expect(t).toBeLessThanOrEqual(domain[1]);
      }
    }
  });

  it("gives a zoom window finer round ticks, with no float noise", () => {
    expect(niceTicks([0.1, 0.62])).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
    expect(niceTicks([412.3, 418.9])).toEqual([413, 414, 415, 416, 417, 418]);
  });

  it("prints zero, not negative zero", () => {
    expect(niceTicks([-0.3, 0.3])).toContain(0);
    for (const t of niceTicks([-1, 1])!) expect(Object.is(t, -0)).toBe(false);
  });

  it("leaves the choice to recharts when there is no span", () => {
    expect(niceTicks(undefined)).toBeUndefined();
    expect(niceTicks([5, 5])).toBeUndefined();
    expect(niceTicks([5, 1])).toBeUndefined();
    expect(niceTicks([NaN, 1])).toBeUndefined();
    expect(niceTicks([0, Infinity])).toBeUndefined();
  });
});
