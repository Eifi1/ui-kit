import { describe, expect, it } from "vitest";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { missingKitLabels } from "../kit-labels";
import { UI_KIT_LABELS_DE, uiKitLabelsDe } from "../locales/de";
import { UI_KIT_LABELS_DE_CH } from "../locales/de-CH";
import { UI_KIT_LABELS_DE_CH_INFORMAL } from "../locales/de-CH-informal";
import { UI_KIT_LABELS_DE_INFORMAL, uiKitLabelsDeInformal } from "../locales/de-informal";
import { UI_KIT_LABELS_ES } from "../locales/es";
import { UI_KIT_LABELS_FR } from "../locales/fr";
import { UI_KIT_LABELS_HU } from "../locales/hu";
import { UI_KIT_LABELS_IT } from "../locales/it";
import { UI_KIT_LABELS_ZH } from "../locales/zh";

/**
 * The shipped translations (`@eifi1/ui-kit/i18n/<code>`). The type already demands every
 * key; these pin what the type cannot: that no key quietly equals the English default
 * object, and that the derived Swiss variant really is respelled.
 */
const LOCALES = {
  de: UI_KIT_LABELS_DE,
  "de-CH": UI_KIT_LABELS_DE_CH,
  "de-informal": UI_KIT_LABELS_DE_INFORMAL,
  "de-CH-informal": UI_KIT_LABELS_DE_CH_INFORMAL,
  es: UI_KIT_LABELS_ES,
  fr: UI_KIT_LABELS_FR,
  hu: UI_KIT_LABELS_HU,
  it: UI_KIT_LABELS_IT,
  zh: UI_KIT_LABELS_ZH,
};

/** Every leaf, as text: functions are called with plausible arguments. */
function leaves(tree: unknown, path = ""): Array<[string, string]> {
  if (typeof tree === "string") return [[path, tree]];
  if (typeof tree === "function") {
    const args = Array.from({ length: tree.length }, (_, i) => (i === 0 ? 1234 : 2));
    const out = (tree as (...a: unknown[]) => unknown)(...args);
    return typeof out === "string" ? [[path, out]] : [];
  }
  if (tree && typeof tree === "object") {
    return Object.entries(tree).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe.each(Object.entries(LOCALES))("@eifi1/ui-kit/i18n/%s", (_code, labels) => {
  it("covers every key of the English defaults", () => {
    expect(missingKitLabels(labels, DEFAULT_UI_KIT_LABELS)).toEqual([]);
  });

  it("is not the English defaults under another name", () => {
    const english = new Map(leaves(DEFAULT_UI_KIT_LABELS));
    const same = leaves(labels).filter(([k, v]) => english.get(k) === v && /[a-z]{4}/i.test(v));
    // A few words are the same in both (e.g. "Text", "Tooltip"); a whole namespace is not.
    expect(same.length).toBeLessThan(leaves(labels).length / 10);
  });
});

describe("de-CH", () => {
  it("has no ß anywhere, and formats numbers the Swiss way", () => {
    const text = leaves(UI_KIT_LABELS_DE_CH).map(([, v]) => v);
    expect(text.join(" ")).not.toMatch(/ß/);
    expect(leaves(UI_KIT_LABELS_DE).some(([, v]) => v.includes("ß"))).toBe(true);
    expect(UI_KIT_LABELS_DE_CH.dataTable.rowCount(1234)).toBe(
      new Intl.NumberFormat("de-CH").format(1234),
    );
  });

  it("the factory takes a number locale without changing the words", () => {
    const swissDigits = uiKitLabelsDe("de-CH");
    expect(swissDigits.dataTable.rowCount(1234)).toBe(new Intl.NumberFormat("de-CH").format(1234));
    expect(swissDigits.dataTable.pageChanged(1, 2)).toBe(
      UI_KIT_LABELS_DE.dataTable.pageChanged(1, 2),
    );
  });
});

describe("de-informal", () => {
  // Formal address: "Sie" and every form of the possessive "Ihr". The informal catalogue
  // has no plural "ihr" either, so a capitalised "Ihr" at a sentence start is caught too.
  const FORMAL = /\bSie\b|\bIhr(e|en|er|em|es)?\b/;

  it("the check bites: the formal catalogue does address the reader as Sie", () => {
    expect(leaves(UI_KIT_LABELS_DE).some(([, v]) => FORMAL.test(v))).toBe(true);
  });

  it.each([
    ["de-informal", UI_KIT_LABELS_DE_INFORMAL],
    ["de-CH-informal", UI_KIT_LABELS_DE_CH_INFORMAL],
  ])("%s never addresses the reader formally", (_code, labels) => {
    const formal = leaves(labels).filter(([, v]) => FORMAL.test(v));
    expect(formal).toEqual([]);
  });

  it("changes only sentences that address the reader; the rest is the German catalogue", () => {
    const formal = new Map(leaves(UI_KIT_LABELS_DE));
    const changed = leaves(UI_KIT_LABELS_DE_INFORMAL)
      .filter(([k, v]) => formal.get(k) !== v)
      .map(([k]) => k);
    expect(changed.sort()).toEqual(
      [
        "dangerConfirm.phrase",
        "miniCalendar.rangeSelected",
        "miniCalendar.startSelected",
        "signaturePad.instructions",
        "signaturePad.typedFallbackHint",
        "tour.awaitClickHint",
        "wizard.confirmCancel",
        "wizard.missingRequired",
      ].sort(),
    );
  });

  it("the factory takes a number locale; the Swiss variant is respelled", () => {
    expect(uiKitLabelsDeInformal("de-CH").dataTable.rowCount(1234)).toBe(
      new Intl.NumberFormat("de-CH").format(1234),
    );
    expect(UI_KIT_LABELS_DE_CH_INFORMAL.dataTable.rowCount(1234)).toBe(
      new Intl.NumberFormat("de-CH").format(1234),
    );
    expect(leaves(UI_KIT_LABELS_DE_CH_INFORMAL).map(([, v]) => v).join(" ")).not.toMatch(/ß/);
    const phrase = UI_KIT_LABELS_DE_CH_INFORMAL.dangerConfirm.phrase;
    expect(typeof phrase === "function" ? phrase("Schließen") : phrase).toBe(
      "Gib zur Bestätigung „Schliessen“ ein",
    );
  });
});
