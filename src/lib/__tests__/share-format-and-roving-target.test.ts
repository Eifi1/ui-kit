import { describe, expect, it } from "vitest";
import { shareFormat } from "../share-format";
import { rovingTarget } from "../direction";

/**
 * The share format and the key mapping PieChart and Treemap each held a copy of (0.52
 * code review of treemap.tsx, finding 9). The copies already disagreed at the ends: the
 * pie wrapped and the map held — kept, now said at the call (`wrap`).
 */

describe("shareFormat", () => {
  it("says a share under 10 % to one decimal, and a larger one whole", () => {
    const say = shareFormat("en-US");
    expect(say(0.004)).toBe("0.4%");
    expect(say(0.0999)).toBe("10%");
    expect(say(0.6)).toBe("60%");
    expect(say(0.125)).toBe("13%");
  });

  it("follows the locale", () => {
    expect(shareFormat("de-CH")(0.6)).toBe(new Intl.NumberFormat("de-CH", { style: "percent" }).format(0.6));
  });
});

describe("rovingTarget", () => {
  it("steps along the direction it is given, and down and up as next and previous", () => {
    expect(rovingTarget("ArrowRight", "ltr", 1, 4, false)).toBe(2);
    expect(rovingTarget("ArrowLeft", "ltr", 1, 4, false)).toBe(0);
    expect(rovingTarget("ArrowDown", "ltr", 1, 4, false)).toBe(2);
    expect(rovingTarget("ArrowUp", "ltr", 1, 4, false)).toBe(0);
    expect(rovingTarget("ArrowRight", "rtl", 1, 4, false)).toBe(0);
    expect(rovingTarget("ArrowLeft", "rtl", 1, 4, false)).toBe(2);
    expect(rovingTarget("ArrowDown", "rtl", 1, 4, false)).toBe(2);
  });

  it("goes to the ends on Home and End, and moves nothing for another key", () => {
    expect(rovingTarget("Home", "ltr", 2, 4, false)).toBe(0);
    expect(rovingTarget("End", "ltr", 0, 4, false)).toBe(3);
    expect(rovingTarget("Enter", "ltr", 0, 4, false)).toBeUndefined();
    expect(rovingTarget("End", "ltr", 0, 0, false)).toBeUndefined();
  });

  it("holds at the ends without `wrap`, and goes round with it", () => {
    expect(rovingTarget("ArrowDown", "ltr", 3, 4, false)).toBe(3);
    expect(rovingTarget("ArrowUp", "ltr", 0, 4, false)).toBe(0);
    expect(rovingTarget("ArrowDown", "ltr", 3, 4, true)).toBe(0);
    expect(rovingTarget("ArrowUp", "ltr", 0, 4, true)).toBe(3);
  });
});
