import { describe, expect, it } from "vitest";

import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";
import { kitLabelStrings } from "../../i18n/review";
import {
  DEFAULT_TRANSLATION_REVIEW_SWIPE,
  TRANSLATION_REVIEW_SWIPE_ACTIONS,
  dropReviews,
  filterTranslationRows,
  flattenStrings,
  fromApiReview,
  groupTranslationRows,
  keyInAreas,
  keyInArea,
  mergeReviews,
  keyNamespace,
  placeholderMismatch,
  placeholderTokens,
  reviewStatus,
  reviewUndo,
  reviewWrite,
  summariseRows,
  toApiWrite,
  translationCorrections,
  translationReviewSwipePlan,
  translationRows,
  unreviewedRows,
} from "../translation-review";
import type { ApiTranslationReview, TranslationReview, TranslationReviewSwipeAction } from "../translation-review";

/**
 * The pure half of the translation review, ported from keksdose's and kastlan's
 * `translation-catalogue.test.ts` — both apps' cases, so neither loses one by adopting
 * the kit — and extended by what the kit adds: the reference and the areas as input, a
 * source per row, the kit's own `kit.` rows, and the wire mapping.
 */

function review(overrides: Partial<TranslationReview> = {}): TranslationReview {
  return {
    locale: "fr",
    key: "common.save",
    text: "Enregistrer",
    referenceText: "Save",
    verdict: "APPROVED",
    note: null,
    suggestion: null,
    reviewerName: "Amélie",
    reviewedAt: "2026-10-02T10:00:00Z",
    ...overrides,
  };
}

describe("flattenStrings", () => {
  it("turns the nested bundle into dotted keys, in the bundle's order", () => {
    expect(flattenStrings({ b: { y: "Y", x: "X" }, a: "A" })).toEqual({ "b.y": "Y", "b.x": "X", a: "A" });
    expect(Object.keys(flattenStrings({ b: { y: "Y", x: "X" }, a: "A" }))).toEqual(["b.y", "b.x", "a"]);
  });

  it("skips leaves that are not strings rather than inventing text", () => {
    expect(flattenStrings({ a: "A", n: 3, l: ["x"], z: null })).toEqual({ a: "A" });
  });

  it("puts the prefix in front as is, so it names its own separator (kastlan's ns:key)", () => {
    expect(flattenStrings({ actions: { save: "Speichern", n: 3 }, title: "Kastlan" }, "common:")).toEqual({
      "common:actions.save": "Speichern",
      "common:title": "Kastlan",
    });
  });

  it("files the kit's own words under kit.", () => {
    const rows = flattenStrings(kitLabelStrings(DEFAULT_UI_KIT_LABELS), "kit.");
    expect(rows["kit.common.close"]).toBe("Close");
    expect(rows["kit.combobox.resultCount(3)"]).toBe("3 results");
    expect(Object.keys(rows).every((key) => key.startsWith("kit."))).toBe(true);
  });
});

describe("keyNamespace", () => {
  it("is the part before the colon, else the first dotted segment", () => {
    expect(keyNamespace("budget.rta")).toBe("budget");
    expect(keyNamespace("common:actions.save")).toBe("common");
    expect(keyNamespace("doc_text.invoice:payment_note")).toBe("doc_text.invoice");
    expect(keyNamespace("kit.combobox.resultCount(3)")).toBe("kit");
    expect(keyNamespace("single")).toBe("single");
  });

  it("does not split on a colon inside a sample's arguments", () => {
    expect(keyNamespace('kit.filePicker.hint("a:b")')).toBe("kit");
  });
});

describe("placeholderTokens", () => {
  it("finds interpolations, numbered and named tags and nested $t()", () => {
    expect(placeholderTokens("{{count}} of {{ total, number }} <1>open</1> $t(common.save)")).toEqual(
      ["$t(common.save)", "<1>", "<1>", "{{count}}", "{{total}}"].sort(),
    );
  });

  it("finds a document text's Python fields (kastlan)", () => {
    expect(placeholderTokens("{{count, number}} <1>link</1> {date} $t(common:save)")).toEqual(
      ["$t(common:save)", "<1>", "<1>", "{date}", "{{count}}"].sort(),
    );
    expect(placeholderTokens("{0} and {amount:.2f} and {name!r}")).toEqual(["{0}", "{amount}", "{name}"]);
  });

  it("counts {{x}} once — never again as {x}", () => {
    expect(placeholderTokens("{{count}}")).toEqual(["{{count}}"]);
    expect(placeholderTokens("{{ count }} {count}")).toEqual(["{count}", "{{count}}"]);
  });

  it("ignores prose in angle brackets and a LaTeX command's argument", () => {
    expect(placeholderTokens("shown as <deleted user> and a < b")).toEqual([]);
    expect(placeholderTokens("\\textbf{total} and \\emph{note}")).toEqual([]);
  });

  it("calls a dropped or renamed placeholder a difference, a moved one not", () => {
    expect(placeholderMismatch("{{n}} items", "Éléments : {{n}}")).toBe(false);
    expect(placeholderMismatch("{{count}} items", "des éléments")).toBe(true);
    expect(placeholderMismatch("{{count}} items", "{{nombre}} éléments")).toBe(true);
    expect(placeholderMismatch("Fällig bis {date}", "Échéance")).toBe(true);
    expect(placeholderMismatch("Zahlbar bis {date}", "Payable jusqu’au {date}")).toBe(false);
  });
});

describe("reviewStatus", () => {
  it("is unreviewed with no verdict, missing when the locale lacks the string", () => {
    expect(reviewStatus(null, "Enregistrer", "Save")).toBe("unreviewed");
    expect(reviewStatus(undefined, "", "Save")).toBe("missing");
    // Both empty: nothing is missing, there is just nothing there.
    expect(reviewStatus(null, "", "")).toBe("unreviewed");
  });

  it("follows the verdict while the wording is the one it was given on", () => {
    expect(reviewStatus(review(), "Enregistrer", "Save")).toBe("approved");
    expect(reviewStatus(review({ verdict: "NEEDS_CHANGE" }), "Enregistrer", "Save")).toBe("needs_change");
  });

  it("is changed once the string OR its reference moved on, whatever the verdict", () => {
    expect(reviewStatus(review(), "Sauvegarder", "Save")).toBe("changed");
    expect(reviewStatus(review(), "Enregistrer", "Save changes")).toBe("changed");
    expect(reviewStatus(review({ verdict: "NEEDS_CHANGE" }), "Sauvegarder", "Save")).toBe("changed");
  });

  it("does not call a verdict without a stored reference changed by its reference", () => {
    expect(reviewStatus(review({ referenceText: null }), "Enregistrer", "Anything")).toBe("approved");
  });

  it("keeps a suggested translation for a missing string as needs_change, until it is added", () => {
    const suggested = review({ text: "", verdict: "NEEDS_CHANGE", suggestion: "Enregistrer" });
    expect(reviewStatus(suggested, "", "Save")).toBe("needs_change");
    expect(reviewStatus(suggested, "Enregistrer", "Save")).toBe("changed");
  });
});

describe("translationRows — keksdose's shape (dotted keys, one source)", () => {
  const rows = translationRows({
    locale: "fr",
    strings: { "common.save": "Enregistrer", "common.items": "des éléments", "budget.rta": "À attribuer" },
    reference: { "budget.rta": "Ready to Assign", "common.save": "Save", "common.items": "{{count}} items" },
    reviews: new Map([["common.save", review()]]),
  });

  it("lists the keys in the reference's order with namespace, status and the placeholder check", () => {
    expect(rows.map((r) => [r.id, r.namespace, r.source, r.status, r.placeholderMismatch])).toEqual([
      ["fr|budget.rta", "budget", "", "unreviewed", false],
      ["fr|common.save", "common", "", "approved", false],
      ["fr|common.items", "common", "", "unreviewed", true],
    ]);
  });

  it("summarises and filters", () => {
    expect(summariseRows(rows)).toEqual({
      missing: 0,
      unreviewed: 2,
      changed: 0,
      needs_change: 0,
      approved: 1,
      total: 3,
    });
    expect(filterTranslationRows(rows, { namespace: "common" }).map((r) => r.key)).toEqual([
      "common.save",
      "common.items",
    ]);
    expect(filterTranslationRows(rows, { status: "unreviewed", placeholdersOnly: true }).map((r) => r.key)).toEqual([
      "common.items",
    ]);
    // Key, translation and reference are all searched, case-insensitively.
    expect(filterTranslationRows(rows, { query: "ready" }).map((r) => r.key)).toEqual(["budget.rta"]);
    expect(filterTranslationRows(rows, { query: "  COMMON.SAVE " }).map((r) => r.key)).toEqual(["common.save"]);
  });

  it("keeps a key only the translation has instead of dropping it", () => {
    const extra = translationRows({ locale: "it", strings: { only: "Solo" }, reference: {} });
    expect(extra.map((r) => [r.key, r.reference, r.status])).toEqual([["only", "", "unreviewed"]]);
  });

  it("takes the server's whole list and keeps only this locale's verdicts", () => {
    const fromList = translationRows({
      locale: "fr",
      strings: { "common.save": "Enregistrer" },
      reference: { "common.save": "Save" },
      reviews: [review(), review({ locale: "it", verdict: "NEEDS_CHANGE" })],
    });
    expect(fromList[0].status).toBe("approved");
    expect(fromList[0].review?.locale).toBe("fr");
  });
});

describe("translationRows — kastlan's shape (ns:key, two sources, gaps)", () => {
  const rows = translationRows({
    locale: "fr",
    strings: {
      "common:actions.save": "Enregistrer",
      "doc_text.invoice:payment_note": "Payable jusqu’au {date}.",
    },
    // German is kastlan's reference — the app's choice, not the kit's.
    reference: {
      "common:actions.save": "Speichern",
      "common:actions.cancel": "Abbrechen",
      "doc_text.invoice:payment_note": "Zahlbar bis {date} auf IBAN {iban}.",
    },
    reviews: new Map([["common:actions.save", review({ key: "common:actions.save", referenceText: "Speichern" })]]),
    sourceOf: (key) => (key.startsWith("doc_text.") ? "documents" : "screen"),
  });

  it("lists the reference's keys, with the locale's gaps as missing", () => {
    expect(rows.map((r) => [r.key, r.status])).toEqual([
      ["common:actions.save", "approved"],
      ["common:actions.cancel", "missing"],
      ["doc_text.invoice:payment_note", "unreviewed"],
    ]);
  });

  it("knows each row's namespace and source", () => {
    expect(rows.map((r) => [r.namespace, r.source])).toEqual([
      ["common", "screen"],
      ["common", "screen"],
      ["doc_text.invoice", "documents"],
    ]);
  });

  it("checks placeholders only where there is text", () => {
    expect(rows.map((r) => r.placeholderMismatch)).toEqual([false, false, true]);
  });

  it("summarises and filters by source and status", () => {
    expect(summariseRows(rows)).toMatchObject({ missing: 1, unreviewed: 1, approved: 1, total: 3 });
    expect(filterTranslationRows(rows, { source: "documents" })).toHaveLength(1);
    expect(filterTranslationRows(rows, { status: "missing" })[0].key).toBe("common:actions.cancel");
    expect(filterTranslationRows(rows, { query: "abbrechen" })).toHaveLength(1);
  });

  it("takes the app's own namespaceOf", () => {
    const own = translationRows({
      locale: "fr",
      strings: {},
      reference: { "common:actions.save": "Speichern" },
      namespaceOf: (key) => key.split(":")[1].split(".")[0],
    });
    expect(own[0].namespace).toBe("actions");
  });
});

describe("areas", () => {
  it("keeps a key inside one of the areas, and every key without a limit", () => {
    expect(keyInAreas("legal.privacy.title", ["legal"])).toBe(true);
    expect(keyInAreas("legal", ["legal"])).toBe(true);
    expect(keyInAreas("budget.rta", ["legal"])).toBe(false);
    // The area is a namespace, not a prefix of letters.
    expect(keyInAreas("legalese.title", ["legal"])).toBe(false);
    expect(keyInAreas("budget.rta", null)).toBe(true);
    expect(keyInAreas("budget.rta", undefined)).toBe(true);
  });

  it("understands kastlan's ns:key, and takes the app's own rule", () => {
    expect(keyInArea("legal:imprint.title", "legal")).toBe(true);
    // kastlan's second area: every document module's texts.
    expect(keyInArea("doc_text.invoice:payment_note", "doc_text")).toBe(true);
    expect(keyInArea("doc_text", "doc_text")).toBe(true);
    expect(keyInArea("doc_textual:x", "doc_text")).toBe(false);
    expect(keyInAreas("common:save", ["legal", "doc_text"])).toBe(false);
    expect(keyInAreas("docs/legal/x", ["legal"], (key, area) => key.includes(`/${area}/`))).toBe(true);
  });

  it("leaves rows outside the areas out of the rows altogether", () => {
    const rows = translationRows({
      locale: "fr",
      strings: { "legal.terms": "Conditions d’utilisation", "common.save": "Enregistrer" },
      reference: { "legal.terms": "Terms of Service", "common.save": "Save" },
      areas: ["legal"],
    });
    expect(rows.map((r) => r.key)).toEqual(["legal.terms"]);
    expect(summariseRows(rows).total).toBe(1);
  });
});

describe("writing", () => {
  const [row] = translationRows({
    locale: "fr",
    strings: { "common.save": "Enregistrer" },
    reference: { "common.save": "Save" },
  });

  it("stores a verdict with the wording it was given on", () => {
    expect(reviewWrite(row, "APPROVED")).toEqual({
      locale: "fr",
      key: "common.save",
      text: "Enregistrer",
      referenceText: "Save",
      verdict: "APPROVED",
      note: null,
      suggestion: null,
    });
  });

  it("maps to and from the contract's snake_case", () => {
    const api: ApiTranslationReview = {
      locale: "fr",
      key: "common.save",
      text: "Enregistrer",
      reference_text: "Save",
      verdict: "NEEDS_CHANGE",
      note: "trop long",
      suggestion: "Sauver",
      reviewer_name: null,
      reviewed_at: "2026-10-02T10:00:00Z",
    };
    expect(fromApiReview(api)).toEqual(
      review({ verdict: "NEEDS_CHANGE", note: "trop long", suggestion: "Sauver", reviewerName: null }),
    );
    expect(toApiWrite(reviewWrite(row, "NEEDS_CHANGE", "trop long", "Sauver"))).toEqual({
      locale: "fr",
      key: "common.save",
      text: "Enregistrer",
      reference_text: "Save",
      verdict: "NEEDS_CHANGE",
      note: "trop long",
      suggestion: "Sauver",
    });
  });

  it("patches a cached list in either spelling: a save's rows replace, a reset drops", () => {
    const prev = [review(), review({ key: "common.cancel", text: "Annuler" })];
    expect(mergeReviews(prev, [review({ verdict: "NEEDS_CHANGE" })]).map((r) => [r.key, r.verdict])).toEqual([
      ["common.cancel", "APPROVED"],
      ["common.save", "NEEDS_CHANGE"],
    ]);
    expect(dropReviews(prev, [{ locale: "fr", key: "common.save" }]).map((r) => r.key)).toEqual(["common.cancel"]);
    // Another locale's verdict on the same key is a different verdict.
    expect(dropReviews(prev, [{ locale: "it", key: "common.save" }])).toHaveLength(2);
  });
});

describe("translationCorrections", () => {
  it("exports what was sent back, with the suggestion and the current wording", () => {
    const rows = translationRows({
      locale: "fr",
      strings: { "common.save": "Enregistrer", "common.cancel": "Annuler" },
      reference: { "common.save": "Save", "common.cancel": "Cancel", "common.close": "Close" },
      reviews: new Map([
        ["common.save", review({ verdict: "NEEDS_CHANGE", suggestion: "Sauvegarder", note: "plus courant" })],
        ["common.cancel", review({ key: "common.cancel", text: "Annuler", referenceText: "Cancel" })],
        // A missing string's suggested translation is a correction too: the string to add.
        ["common.close", review({ key: "common.close", text: "", referenceText: "Close", verdict: "NEEDS_CHANGE", suggestion: "Fermer" })],
      ]),
    });
    expect(translationCorrections(rows)).toEqual([
      {
        locale: "fr",
        key: "common.save",
        status: "needs_change",
        current: "Enregistrer",
        reference: "Save",
        suggestion: "Sauvegarder",
        note: "plus courant",
        reviewer: "Amélie",
        reviewed_at: "2026-10-02T10:00:00Z",
      },
      expect.objectContaining({ key: "common.close", status: "needs_change", current: "", suggestion: "Fermer" }),
    ]);
  });
});

describe("0.25: groups and Undo (keksdose live #377)", () => {
  const rows = translationRows({
    locale: "fr",
    strings: { "budget.rta": "À attribuer", "common.save": "Enregistrer", "budget.hint": "Astuce", "legal.terms": "Conditions" },
    reference: {
      "budget.rta": "Ready to Assign",
      "common.save": "Save",
      "budget.hint": "Hint",
      "budget.goal": "Goal",
      "legal.terms": "Terms",
    },
    reviews: [
      review({}),
      review({ key: "budget.rta", text: "A attribuer", referenceText: "Ready to Assign", verdict: "NEEDS_CHANGE", note: "accent" }),
    ],
  });

  it("groups rows where each group's first row is, keeping the rows' order, with each group's counts", () => {
    const groups = groupTranslationRows(rows, (r) => r.namespace);
    expect(groups.map((g) => [g.key, g.rows.map((r) => r.key)])).toEqual([
      ["budget", ["budget.rta", "budget.hint", "budget.goal"]],
      ["common", ["common.save"]],
      ["legal", ["legal.terms"]],
    ]);
    expect(groups[0].summary).toEqual({ missing: 1, unreviewed: 1, changed: 1, needs_change: 0, approved: 0, total: 3 });
    expect(groupTranslationRows([], (r) => r.namespace)).toEqual([]);
  });

  it("takes only the rows nobody has judged and that have a text into a group's bulk approve", () => {
    // Not the changed one (read it again), not the missing one (nothing to approve).
    expect(unreviewedRows(rows).map((r) => r.key)).toEqual(["budget.hint", "legal.terms"]);
  });

  it("undoes by storing the earlier verdict again, or clearing a row that had none", () => {
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const before = ["budget.rta", "budget.hint"].map((key) => byKey.get(key)!);
    expect(reviewUndo(before)).toEqual({
      writes: [
        {
          locale: "fr",
          key: "budget.rta",
          // The wording it was judged on, so the row reads "changed" again, not "approved".
          text: "A attribuer",
          referenceText: "Ready to Assign",
          verdict: "NEEDS_CHANGE",
          note: "accent",
          suggestion: null,
        },
      ],
      clears: [{ locale: "fr", key: "budget.hint" }],
    });
  });
});

describe("swipe bindings (keksdose, live #377 rework: the swipes bound in its settings)", () => {
  // missing (no suggestion) · missing with a suggested translation · unreviewed · changed ·
  // needs a change · approved.
  const rows = translationRows({
    locale: "fr",
    strings: { "a.unreviewed": "Un", "a.changed": "Deux", "a.flagged": "Trois", "a.approved": "Quatre" },
    reference: {
      "a.missing": "Zero",
      "a.suggested": "Half",
      "a.unreviewed": "One",
      "a.changed": "Two",
      "a.flagged": "Three",
      "a.approved": "Four",
    },
    reviews: [
      review({ key: "a.suggested", text: "", referenceText: "Half", verdict: "NEEDS_CHANGE", suggestion: "Demi" }),
      review({ key: "a.changed", text: "Deux!", referenceText: "Two" }),
      review({ key: "a.flagged", text: "Trois", referenceText: "Three", verdict: "NEEDS_CHANGE", note: "n" }),
      review({ key: "a.approved", text: "Quatre", referenceText: "Four" }),
    ],
  });
  const row = (key: string) => rows.find((r) => r.key === key)!;
  const plan = (binding: Parameters<typeof translationReviewSwipePlan>[0], key: string, canClear = true) =>
    translationReviewSwipePlan(binding, row(key), { canClear });

  it("lists the ids a settings page offers, and defaults to 0.25's mapping", () => {
    expect(TRANSLATION_REVIEW_SWIPE_ACTIONS).toEqual(["approve", "edit", "clear"]);
    expect(DEFAULT_TRANSLATION_REVIEW_SWIPE).toEqual({ start: ["edit"], end: ["approve"] });
    expect(Object.isFrozen(DEFAULT_TRANSLATION_REVIEW_SWIPE)).toBe(true);
  });

  it("offers approve where there is a text not yet approved, clear where there is a verdict, edit everywhere", () => {
    const all = { end: ["approve", "clear", "edit"] } as const;
    expect(
      ["a.missing", "a.suggested", "a.unreviewed", "a.changed", "a.flagged", "a.approved"].map((key) => [
        row(key).status,
        plan(all, key).end,
      ]),
    ).toEqual([
      ["missing", ["edit"]],
      ["needs_change", ["clear", "edit"]],
      ["unreviewed", ["approve", "edit"]],
      ["changed", ["approve", "clear", "edit"]],
      ["needs_change", ["approve", "clear", "edit"]],
      ["approved", ["clear", "edit"]],
    ]);
  });

  it("closes a ladder up over what drops out, per side, in the bound order", () => {
    const binding = { end: ["approve", "clear"], start: ["clear", "edit"] } as const;
    expect(plan(binding, "a.approved")).toEqual({ end: ["clear"], start: ["clear", "edit"] });
    expect(plan(binding, "a.unreviewed")).toEqual({ end: ["approve"], start: ["edit"] });
    expect(plan({ end: ["clear", "approve"] }, "a.flagged")).toEqual({ end: ["clear", "approve"], start: [] });
  });

  it("drops clear without onClear, a duplicate, and an id it does not know", () => {
    expect(plan({ end: ["clear", "approve"] }, "a.approved", false)).toEqual({ end: [], start: [] });
    expect(plan({ end: ["approve", "approve"], start: ["edit", "edit"] }, "a.unreviewed")).toEqual({
      end: ["approve"],
      start: ["edit"],
    });
    // A binding stored by another version, or an app's own empty slot.
    const stored = ["none", "needsChange", "approve"] as unknown as TranslationReviewSwipeAction[];
    expect(plan({ end: stored }, "a.unreviewed")).toEqual({ end: ["approve"], start: [] });
    expect(plan({}, "a.unreviewed")).toEqual({ end: [], start: [] });
  });
});
