import { describe, expect, it } from "vitest";
import { categoryTicks, niceStep, niceTicks, timeTicks, timeTicksWithUnit } from "../series-chart-ticks";

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

describe("categoryTicks", () => {
  it("ticks every whole slot inside the window, and nothing between", () => {
    expect(categoryTicks([-0.5, 3.5], 4)).toEqual([0, 1, 2, 3]);
    expect(categoryTicks([2.6, 8.3], 12)).toEqual([3, 4, 5, 6, 7, 8]);
    // Never a slot the rows do not have.
    expect(categoryTicks([-3, 20], 3)).toEqual([0, 1, 2]);
    expect(categoryTicks([0.2, 0.8], 3)).toBeUndefined();
    expect(categoryTicks(undefined, 3)).toBeUndefined();
  });
});

describe("timeTicks", () => {
  const local = (...parts: [number, number, number?, number?]) =>
    new Date(parts[0], parts[1], parts[2] ?? 1, parts[3] ?? 0).getTime();

  it("ticks month starts over half a year, at local midnight", () => {
    const got = timeTicksWithUnit([local(2026, 0, 10), local(2026, 5, 15)])!;
    expect(got.unit).toBe("month");
    for (const tick of got.ticks) {
      const at = new Date(tick);
      expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([1, 0, 0]);
    }
  });

  it("steps months with the calendar, not by thirty days", () => {
    // Quarter starts across a leap February: Jan, Apr, Jul, Oct — never the 3rd of March.
    const ticks = timeTicks([local(2028, 0, 1), local(2028, 11, 31)], 4)!;
    expect(ticks.map((tick) => new Date(tick).getMonth())).toEqual([0, 3, 6, 9]);
  });

  it("goes down to days and hours, and up to years", () => {
    expect(timeTicksWithUnit([local(2026, 2, 1), local(2026, 2, 6)])!.unit).toBe("day");
    expect(timeTicksWithUnit([local(2026, 2, 1, 0), local(2026, 2, 1, 12)])!.unit).toBe("hour");
    const years = timeTicksWithUnit([local(2010, 0, 1), local(2026, 0, 1)])!;
    expect(years.unit).toBe("year");
    for (const tick of years.ticks) expect(new Date(tick).getFullYear() % 5).toBe(0);
  });

  it("ticks weeks on Mondays", () => {
    const ticks = timeTicks([local(2026, 2, 4), local(2026, 3, 20)], 6)!;
    for (const tick of ticks) expect(new Date(tick).getDay()).toBe(1);
  });

  it("has nothing to say about no span", () => {
    expect(timeTicks(undefined)).toBeUndefined();
    expect(timeTicks([5, 5])).toBeUndefined();
  });
});
