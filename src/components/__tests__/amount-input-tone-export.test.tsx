import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AMOUNT_TONE_CLASS, AmountInput } from "../amount-input";

/**
 * The signed figure's tone map, public since 0.52 (MOD-8, refactor audit 2026-10-30).
 *
 * keksdose's receipt lines paint a figure the way the field over it does (dev#556), and
 * its tests got the map by regexing `const TONE_CLASS` out of the kit's built
 * dist/components/amount-input.js — the one reach into dist in three apps. The export is
 * what they assert against now; the field must paint exactly it.
 */
describe("AMOUNT_TONE_CLASS", () => {
  it.each(["outflow", "inflow"] as const)("is the class AmountInput paints a %s with", (tone) => {
    render(<AmountInput aria-label="Amount" value="12.50" onChange={vi.fn()} tone={tone} calculator={false} />);
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveClass(AMOUNT_TONE_CLASS[tone]);
  });

  it("names every tone, neutral as no class", () => {
    expect(AMOUNT_TONE_CLASS).toEqual({ neutral: "", outflow: "text-money-neg", inflow: "text-money-pos" });
  });

  it("keeps its local name until keksdose imports it, so the bump breaks no regex", () => {
    // keksdose invoice-line-helpers.test.ts reads `/const TONE_CLASS[^=]*=\s*\{…/` out of
    // the built module; the build strips only the type annotation. Drop this case (and
    // rename freely) once keksdose's adopt note for 0.52 is done.
    const source = readFileSync(join(__dirname, "..", "amount-input.tsx"), "utf8");
    expect(source).toMatch(/^const TONE_CLASS\b/m);
  });
});
