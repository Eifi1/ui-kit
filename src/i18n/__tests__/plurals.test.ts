import { describe, expect, it } from "vitest";
import { pluralForm, withAllPlurals } from "../plurals";

/**
 * withAllPlurals: the CLDR categories i18next asks for, filled from `_other` — the
 * French "many" that otherwise printed German (Kurvenschmiede, kastlan).
 */

const catalogue = {
  rows_one: "{{count}} ligne",
  rows_other: "{{count}} lignes",
  nested: { files_one: "{{count}} fichier", files_other: "{{count}} fichiers", title: "Fichiers" },
  place_ordinal_one: "{{count}}er",
  place_ordinal_other: "{{count}}e",
  list: ["a", "b"],
};

describe("withAllPlurals", () => {
  it("fills French many from other, at every depth", () => {
    const out = withAllPlurals(catalogue, "fr");
    expect(out.rows_many).toBe("{{count}} lignes");
    expect((out.nested as Record<string, string>).files_many).toBe("{{count}} fichiers");
    expect((out.nested as Record<string, string>).title).toBe("Fichiers");
  });

  it("fills an ordinal family from the ordinal categories, not the cardinal ones", () => {
    const en = withAllPlurals({ place_ordinal_one: "1st", place_ordinal_other: "{{count}}th" }, "en");
    expect(Object.keys(en).sort()).toEqual(
      ["place_ordinal_few", "place_ordinal_one", "place_ordinal_other", "place_ordinal_two"].sort(),
    );
  });

  it("adds nothing a language does not have, and keeps a category already written", () => {
    expect(Object.keys(withAllPlurals({ a_one: "1", a_other: "n" }, "en"))).toEqual(["a_one", "a_other"]);
    expect(Object.keys(withAllPlurals({ a_other: "n" }, "zh"))).toEqual(["a_other"]);
    const written = withAllPlurals({ a_one: "1", a_many: "beaucoup", a_other: "n" }, "fr");
    expect(written.a_many).toBe("beaucoup");
  });

  it("adds nothing for a locale Intl cannot read, instead of throwing (kastlan)", () => {
    for (const locale of ["", "x", "not a tag"]) {
      const out = withAllPlurals(catalogue, locale);
      expect(out).toEqual(catalogue);
      expect(out).not.toBe(catalogue);
    }
  });

  it("returns a new tree and leaves the input and arrays alone", () => {
    const before = JSON.stringify(catalogue);
    const out = withAllPlurals(catalogue, "it");
    expect(JSON.stringify(catalogue)).toBe(before);
    expect(out).not.toBe(catalogue);
    expect(out.list).toEqual(["a", "b"]);
  });
});

describe("pluralForm (0.33.1)", () => {
  const budget = { one: "budget", other: "budgets" };

  it("picks the count's CLDR category in the locale", () => {
    expect(pluralForm(1, budget, "en")).toBe("budget");
    expect(pluralForm(5, budget, "en")).toBe("budgets");
    expect(pluralForm(0, budget, "en")).toBe("budgets");
    // French reads 0 and 1 as one.
    expect(pluralForm(0, budget, "fr")).toBe("budget");
  });

  it("reads `other` for a category the forms leave out, as withAllPlurals fills it", () => {
    // Polish 3 is `few`, French 1 000 000 `many`, and Chinese has only `other`.
    expect(pluralForm(3, { one: "budżet", few: "budżety", other: "budżetów" }, "pl")).toBe("budżety");
    expect(pluralForm(1_000_000, budget, "fr")).toBe("budgets");
    expect(pluralForm(1, { other: "预算" }, "zh")).toBe("预算");
  });

  it("reads a locale Intl cannot, or none, as the runtime's, instead of throwing", () => {
    for (const locale of [undefined, "", "not a tag"])
      expect(pluralForm(2, budget, locale)).toBe(pluralForm(2, budget));
  });
});
