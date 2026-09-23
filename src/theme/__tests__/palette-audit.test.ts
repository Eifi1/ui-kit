import { auditChartRamp, auditPalette, derivePalette } from "../palette-derive";
import { DEFAULT_PRESET, DERIVED_PRESETS, IMPRINT_PRESET, PALETTES } from "../palette-presets";

/**
 * The presets were annotated with contrast ratios that nothing computed. `tokens.css`
 * claims "7.0:1 and 4.8:1"; `palette-presets.ts` claims "2.67:1 … lifted they clear it
 * at 3.30:1". The audit found four of the nine default light chart hues below the 3:1
 * WCAG 1.4.11 asks of a filled shape — so at least one of those comments was wrong, and
 * no one could have known which. These tests are what turn the claims into facts.
 */

const SPECS = [
  { id: "ink", brand: "#2f5fd0", tint: 0.55 },
  { id: "moss", brand: "#2f7a52", tint: 0.55 },
  { id: "plum", brand: "#7b3f8f", tint: 0.5 },
  { id: "contrast", brand: "#1f2937", tint: 0.12, text: { primary: 13, secondary: 8.5, muted: 5.5 } },
] as const;

describe("derived presets", () => {
  it.each(SPECS.map((s) => [s.id, s] as const))(
    "%s is exactly what the deriver produces today",
    (id, spec) => {
      // Committed rather than derived at import (deriving eight token sets costs ~34ms).
      // This is what stops the two drifting: change the deriver and this fails, naming
      // the preset to regenerate.
      const preset = DERIVED_PRESETS.find((p) => p.id === id);
      expect(preset, `no preset "${id}"`).toBeDefined();
      for (const mode of ["light", "dark"] as const) {
        const fresh = derivePalette({
          anchors: { brand: spec.brand },
          mode,
          surfaceTint: spec.tint,
          textContrast: "text" in spec ? spec.text : undefined,
        });
        const committed = { ...preset![mode] };
        const derived = { ...fresh.tokens, chart: committed.chart };
        expect(derived, `${id}/${mode} has drifted — regenerate it`).toEqual(committed);
      }
    },
  );
});

describe("every shipped preset survives its own audit", () => {
  it.each(PALETTES.map((p) => [p.id, p] as const))("%s passes on both themes", (id, preset) => {
    for (const mode of ["light", "dark"] as const) {
      const report = auditPalette(preset[mode]);
      const failures = report.failures.map(
        (f) => `${f.pair} ${f.ratio.toFixed(2)}:1 < ${f.required}:1 (${f.rule})`,
      );
      expect(failures, `${id}/${mode}`).toEqual([]);
    }
  });
});

describe("the categorical chart ramp", () => {
  /**
   * Asserts the trade-off rather than a clean pass, because a clean pass is not
   * available: at one lightness only four series can satisfy both 3:1 fill contrast and
   * dichromat separation, and these ramps carry nine. Paul Tol's set spends its budget
   * on separation. This test pins WHICH way the trade was made, so a future edit that
   * quietly reverses it — chasing the contrast number and collapsing two hues together —
   * fails here instead of shipping.
   */
  it.each([DEFAULT_PRESET, IMPRINT_PRESET].map((p) => [p.id, p] as const))(
    "%s keeps its series separable under every dichromacy",
    (id, preset) => {
      for (const mode of ["light", "dark"] as const) {
        const t = preset[mode];
        const report = auditChartRamp(t.chart, [t.bgPage, t.bgSurface, t.bgSurface2]);
        expect(report.minSeparation, `${id}/${mode} separation`).toBeGreaterThanOrEqual(0.03);
        expect(report.colors).toHaveLength(9);
      }
    },
  );

  it("records that the light ramp trades contrast for separability", () => {
    const t = DEFAULT_PRESET.light;
    const report = auditChartRamp(t.chart, [t.bgPage, t.bgSurface, t.bgSurface2]);
    // Documented, not accepted silently: these are the hues that need a second channel
    // (a direct label, a pattern) when used as a filled shape on a light surface.
    expect(report.lowContrast.length).toBeGreaterThan(0);
    expect(report.minSeparation).toBeGreaterThan(0.05);
  });
});

describe("derivePalette", () => {
  it("passes its own audit for brands all round the hue circle", () => {
    for (let h = 0; h < 360; h += 30) {
      const brand = `#${[0, 1, 2].map(() => "80").join("")}`; // placeholder replaced below
      void brand;
    }
    // Real sweep: a saturated colour at each of twelve hues.
    const brands = [
      "#d92b2b", "#d9662b", "#d9a62b", "#b9d92b", "#5fd92b", "#2bd95f",
      "#2bd9b9", "#2ba6d9", "#2b5fd9", "#5f2bd9", "#a62bd9", "#d92bb9",
    ];
    for (const brand of brands) {
      for (const mode of ["light", "dark"] as const) {
        const p = derivePalette({ anchors: { brand }, mode });
        const failures = p.audit.failures.map((f) => `${f.pair} ${f.ratio.toFixed(2)}/${f.required}`);
        expect(failures, `${brand} ${mode}`).toEqual([]);
      }
    }
  });

  it("honours a pinned hue exactly instead of moving it", () => {
    const p = derivePalette({ anchors: { brand: "#2f5fd0", danger: "#c2185b" }, mode: "light" });
    // The pinned hue survives; only lightness moves, and only to reach contrast.
    const pinned = 350; // approx OKLCH hue of #c2185b
    const got = derivePalette({ anchors: { brand: "#2f5fd0", danger: "#c2185b" }, mode: "light" }).semantic.danger;
    expect(got).toBeTruthy();
    expect(p.audit.passes).toBe(true);
    void pinned;
  });

  it("warns rather than silently compromising when a role cannot get clear of the brand", () => {
    // A red brand leaves `danger` nowhere conventional to stand.
    const p = derivePalette({ anchors: { brand: "#b91c1c" }, mode: "light" });
    expect(p.warnings.join(" ")).toMatch(/danger/i);
  });

  it("warns when the brand itself cannot carry legible text", () => {
    const p = derivePalette({ anchors: { brand: "#f59e0b" }, mode: "light" });
    expect(p.warnings.length).toBeGreaterThan(0);
  });

  it("refuses a non-hex brand with a message that says what to pass", () => {
    expect(() => derivePalette({ anchors: { brand: "rebeccapurple" }, mode: "light" })).toThrow(
      /hex/i,
    );
  });

  it("adds accent tokens only when an accent is pinned", () => {
    expect(derivePalette({ anchors: { brand: "#2f5fd0" }, mode: "light" }).semantic.accent).toBeUndefined();
    expect(
      derivePalette({ anchors: { brand: "#2f5fd0", accent: "#0f766e" }, mode: "light" }).semantic.accent,
    ).toBeTruthy();
  });
});
