import {
  contrast,
  deltaE,
  hexToOklch,
  luminance,
  oklchToHex,
  parseHex,

  simulateCvd,
  solveLightness,
} from "../color";

describe("sRGB ↔ OKLCH", () => {
  it("round-trips every in-gamut colour it is given", () => {
    // A grid rather than a handful: a conversion can be right for grey and wrong for
    // saturated blue, which is exactly where the cube-root terms bite.
    const samples: string[] = [];
    for (const r of [0, 64, 128, 200, 255])
      for (const g of [0, 64, 128, 200, 255])
        for (const b of [0, 64, 128, 200, 255])
          samples.push(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`);

    for (const hex of samples) {
      const back = oklchToHex(hexToOklch(hex)!);
      const a = parseHex(hex)!;
      const z = parseHex(back)!;
      // One 8-bit step of slack for the two gamma round-trips.
      expect(Math.abs(a.r - z.r), `${hex} → ${back}`).toBeLessThanOrEqual(1);
      expect(Math.abs(a.g - z.g), `${hex} → ${back}`).toBeLessThanOrEqual(1);
      expect(Math.abs(a.b - z.b), `${hex} → ${back}`).toBeLessThanOrEqual(1);
    }
  });

  it("puts white and black at the ends of the lightness range", () => {
    expect(hexToOklch("#ffffff")!.l).toBeCloseTo(1, 2);
    expect(hexToOklch("#000000")!.l).toBeCloseTo(0, 2);
  });

  it("reports greys as having no chroma", () => {
    expect(hexToOklch("#808080")!.c).toBeLessThan(0.001);
  });

  it("gives hues that match where the colour actually sits", () => {
    // Red near 29°, green near 142°, blue near 264° in OKLCH.
    expect(hexToOklch("#ff0000")!.h).toBeGreaterThan(20);
    expect(hexToOklch("#ff0000")!.h).toBeLessThan(40);
    expect(hexToOklch("#00ff00")!.h).toBeGreaterThan(130);
    expect(hexToOklch("#00ff00")!.h).toBeLessThan(150);
    expect(hexToOklch("#0000ff")!.h).toBeGreaterThan(250);
    expect(hexToOklch("#0000ff")!.h).toBeLessThan(275);
  });

  it("keeps hue and lightness when it has to give up chroma to fit the gamut", () => {
    // Far outside sRGB: chroma must be reduced, but the result must still be that hue.
    const wanted = { l: 0.5, c: 0.4, h: 150 };
    const got = hexToOklch(oklchToHex(wanted))!;
    expect(got.h).toBeCloseTo(150, 0);
    expect(got.l).toBeCloseTo(0.5, 1);
    expect(got.c).toBeLessThan(0.4);
  });
});

describe("WCAG contrast", () => {
  it("matches the published extremes", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("agrees with known reference pairs", () => {
    // Values from the WCAG formula, rounded to 2dp.
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
    expect(contrast("#0000ff", "#ffffff")).toBeCloseTo(8.59, 1);
  });

  it("is order-independent", () => {
    expect(contrast("#123456", "#abcdef")).toBeCloseTo(contrast("#abcdef", "#123456"), 6);
  });

  it("puts white's luminance at 1 and black's at 0", () => {
    expect(luminance(parseHex("#ffffff")!)).toBeCloseTo(1, 5);
    expect(luminance(parseHex("#000000")!)).toBeCloseTo(0, 5);
  });
});

describe("solveLightness", () => {
  it("hits the requested ratio against a light background", () => {
    const bg = parseHex("#f6ecd9")!;
    for (const target of [3, 4.5, 7]) {
      const l = solveLightness(target, bg, 250, 0.05, "darker");
      const got = contrast(oklchToHex({ l, c: 0.05, h: 250 }), bg);
      expect(got, `target ${target} got ${got.toFixed(2)}`).toBeGreaterThanOrEqual(target - 0.1);
    }
  });

  it("hits the requested ratio against a dark background", () => {
    const bg = parseHex("#181a2c")!;
    for (const target of [3, 4.5, 7]) {
      const l = solveLightness(target, bg, 40, 0.05, "lighter");
      const got = contrast(oklchToHex({ l, c: 0.05, h: 40 }), bg);
      expect(got, `target ${target} got ${got.toFixed(2)}`).toBeGreaterThanOrEqual(target - 0.1);
    }
  });

  it("returns the extreme rather than throwing when a target is unreachable", () => {
    // 21:1 against mid-grey is impossible at any lightness.
    const l = solveLightness(21, parseHex("#808080")!, 200, 0.1, "darker");
    expect(Number.isFinite(l)).toBe(true);
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
  });
});

describe("colour-vision deficiency", () => {
  it("collapses red and green toward each other for a deuteranope", () => {
    const red = parseHex("#d62728")!;
    const green = parseHex("#2ca02c")!;
    const before = deltaE(red, green);
    const after = deltaE(simulateCvd(red, "deuteranopia"), simulateCvd(green, "deuteranopia"));
    expect(after).toBeLessThan(before * 0.5);
  });

  it("leaves a blue/orange pair largely alone for a deuteranope", () => {
    // The reason the money trio is teal/amber/violet rather than green/red.
    const blue = parseHex("#1f77b4")!;
    const orange = parseHex("#ff7f0e")!;
    const before = deltaE(blue, orange);
    const after = deltaE(simulateCvd(blue, "deuteranopia"), simulateCvd(orange, "deuteranopia"));
    expect(after).toBeGreaterThan(before * 0.6);
  });

  it("does not move a grey", () => {
    const grey = parseHex("#808080")!;
    for (const type of ["protanopia", "deuteranopia", "tritanopia"] as const) {
      expect(deltaE(grey, simulateCvd(grey, type))).toBeLessThan(0.02);
    }
  });
});

describe("parseHex", () => {
  it("takes both lengths and tolerates a missing hash", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("abc")).toEqual({ r: 170, g: 187, b: 204 });
  });

  it("returns null rather than NaNs for anything else", () => {
    // The failure `chart-palette.ts` shipped: NaNs propagated into a label colour and
    // painted near-white text on a near-white cell.
    for (const bad of ["", "#12", "rgba(0,0,0,0.5)", "not a colour", "#12345g"]) {
      expect(parseHex(bad), bad).toBeNull();
    }
  });
});
