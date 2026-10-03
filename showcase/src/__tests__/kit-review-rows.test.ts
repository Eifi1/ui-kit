import { DEFAULT_UI_KIT_LABELS, flattenStrings, kitLabelStrings } from "@eifi1/ui-kit";
import type { TranslationReview, UiKitLabels } from "@eifi1/ui-kit";
import { UI_KIT_LABELS_DE_CH } from "@eifi1/ui-kit/i18n/de-CH";
import { uiKitLabelsFr } from "@eifi1/ui-kit/i18n/fr";
import { uiKitLabelsIt } from "@eifi1/ui-kit/i18n/it";
import {
  buildKitRows,
  kitCatalogues,
  kitStrings,
  namespaceOf,
  neededLocales,
  referenceLocaleFor,
  sourceOf,
} from "../kit-review/rows";

/**
 * The kit review shares keksdose's database rows, so its rows must be keksdose's: the
 * same `kit.` keys (or a verdict lands on a row the other page never shows) and the same
 * TEXTS (or every verdict reads `changed` on the other page). keksdose builds them in
 * `features/translations/translations-page.tsx` from `kitLabelsFor(code) ??
 * DEFAULT_UI_KIT_LABELS` (`shared/i18n/kit-labels.tsx`), which is restated here as the
 * expectation.
 */

/** keksdose's `kitLabelsFor(code) ?? DEFAULT_UI_KIT_LABELS`, verbatim in effect. */
function keksdoseCatalogue(code: string): UiKitLabels {
  const lang = code.slice(0, 2);
  if (lang === "de") return UI_KIT_LABELS_DE_CH;
  if (lang === "fr") return uiKitLabelsFr(code);
  if (lang === "it") return uiKitLabelsIt(code);
  return DEFAULT_UI_KIT_LABELS;
}
const keksdoseKitStrings = (code: string) => flattenStrings(kitLabelStrings(keksdoseCatalogue(code)), "kit.");

describe("the kit rows keksdose shows", () => {
  it.each(["de-CH", "en", "fr", "it"])("%s: the same keys and the same texts", (code) => {
    const ours = kitStrings(code);
    expect(ours).toEqual(keksdoseKitStrings(code));
    expect(Object.keys(ours).length).toBeGreaterThan(500);
    expect(Object.keys(ours).every((key) => key.startsWith("kit."))).toBe(true);
  });

  it("English is the bare defaults, not the en-GB catalogue (whose counts differ)", () => {
    const en = kitStrings("en");
    expect(en["kit.dataTable.rowCount(1240)"]).toBe(kitLabelStrings(DEFAULT_UI_KIT_LABELS)["dataTable.rowCount(1240)"]);
  });

  it("reads every locale against English, and English against de-CH", () => {
    expect(referenceLocaleFor("fr")).toBe("en");
    expect(referenceLocaleFor("de-CH")).toBe("en");
    expect(referenceLocaleFor("en")).toBe("de-CH");
    expect(neededLocales(["fr", "en"])).toEqual(["de-CH", "en", "fr"]);
  });

  it("groups a kit key by its kit namespace and calls its source kit", () => {
    expect(namespaceOf("kit.dataTable.rowCount(1240)")).toBe("kit.dataTable");
    expect(namespaceOf("budget.rta")).toBe("budget");
    expect(sourceOf("kit.common.close")).toBe("kit");
    expect(sourceOf("budget.rta")).toBe("app");
  });
});

describe("buildKitRows", () => {
  const at = "2026-10-03T08:00:00Z";
  const verdict = (locale: string, key: string, text: string, referenceText: string): TranslationReview => ({
    locale,
    key,
    text,
    referenceText,
    verdict: "APPROVED",
    note: null,
    suggestion: null,
    reviewerName: "R",
    reviewedAt: at,
  });

  it("joins keksdose's verdicts on kit keys and ignores its app keys", () => {
    const strings = kitCatalogues(["fr"]);
    const close = "kit.common.close";
    const reviews = [
      verdict("fr", close, strings.fr[close], strings.en[close]),
      verdict("fr", "budget.rta", "À attribuer", "Ready to Assign"),
    ];
    const rows = buildKitRows(["fr"], strings, reviews, null).get("fr")!;
    expect(rows.find((r) => r.key === close)?.status).toBe("approved");
    expect(rows.find((r) => r.key === "budget.rta")).toBeUndefined();
    expect(rows.every((r) => r.source === "kit" && r.namespace.startsWith("kit."))).toBe(true);
    expect(rows[0].id).toBe(`fr|${rows[0].key}`);
  });

  it("a verdict on older wording reads changed, as on keksdose's page", () => {
    const strings = kitCatalogues(["fr"]);
    const close = "kit.common.close";
    const rows = buildKitRows(["fr"], strings, [verdict("fr", close, "Fermez", strings.en[close])], null).get("fr")!;
    expect(rows.find((r) => r.key === close)?.status).toBe("changed");
  });

  it("a reviewer limited to the legal area gets no kit rows", () => {
    const strings = kitCatalogues(["fr"]);
    expect(buildKitRows(["fr"], strings, [], ["legal"]).get("fr")).toEqual([]);
  });
});
