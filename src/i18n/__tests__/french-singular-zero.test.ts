import { describe, expect, it } from "vitest";
import { uiKitLabelsFr } from "../locales/fr";

/**
 * French takes the singular for zero: CLDR's "one" covers 0 and 1, which is what fr.ts's
 * `plural()` (`count < 2`) says and what its other count labels follow. Nine of them
 * tested `count === 1` instead and printed "0 commentaires", "0 non lues", "0 étapes"
 * (refactor audit 2026-10-30, DOC-11).
 *
 * A sweep, not a list (refactor audit 2026-11-22, DOC-5): the nine were pinned by name, and
 * the next count label written with `count === 1` — the two-factor section's "Il reste 0
 * codes de secours." (0.64) — went by unnoticed. So every one-argument French label is
 * called with 1 and 0, and wherever 0 is printed as a number, it must read as the singular
 * does: the 1's text with "0" in its place.
 */
const fr = uiKitLabelsFr();

/** The labels whose "0" is not a count of things: a set of ids, which has one or more
 *  members wherever the label is drawn (`?ids=` with none is no filter). */
const NOT_A_COUNT = new Set(["feedbackPage.focusIds", "dataTable.keyFilter"]);

/** A whole "1" or "0", not part of a longer number. */
const ONE = /(^|\D)1(?!\d)/;
const ZERO = /(^|\D)0(?!\d)/;

/** Every one-argument label that prints a 0 it is given: [key, its text at 1, at 0]. */
function countLabels(): [string, string, string][] {
  const found: [string, string, string][] = [];
  const walk = (node: unknown, path: string) => {
    if (typeof node === "function") {
      if (node.length !== 1 || NOT_A_COUNT.has(path)) return;
      let one: unknown;
      let zero: unknown;
      try {
        one = node(1);
        zero = node(0);
      } catch {
        return; // Not a number's label.
      }
      if (typeof one === "string" && typeof zero === "string" && ZERO.test(zero)) found.push([path, one, zero]);
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
    }
  };
  walk(fr, "");
  return found;
}

describe("French count labels take the singular for 0", () => {
  const labels = countLabels();

  it("finds the count labels (a walk that found none would pass anything)", () => {
    expect(labels.length).toBeGreaterThan(40);
    expect(labels.map(([key]) => key)).toContain("accountSettings.twoFactor.backupLeft");
  });

  it.each(labels)("%s", (_key, one, zero) => {
    expect(zero).toBe(one.replace(ONE, "$10"));
  });

  it("the two-factor section's codes left (DOC-5)", () => {
    expect(fr.accountSettings.twoFactor.backupLeft(0)).toBe("Il reste 0 code de secours.");
    expect(fr.accountSettings.twoFactor.backupLeft(1)).toBe("Il reste 1 code de secours.");
    expect(fr.accountSettings.twoFactor.backupLeft(5)).toBe("Il reste 5 codes de secours.");
  });
});
