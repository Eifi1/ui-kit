import { describe, expect, it } from "vitest";
import { foldForSearch, matchesSearch, rankMatch, searchWords } from "../text-match";
import { normalizeSearchText } from "../../search/search-index";

/**
 * DUP-5 (refactor audit 2026-10): typing into a kit list was matched by six different
 * rules. "zurich" found Zürich in CountrySelect and the command palette, and in no
 * EntityCombobox, Combobox, MultiSelect or DataTable text filter; "İ" folded by the
 * locale in GroupedPicker and nowhere in the combobox family. One fold and one ranking
 * now, which every list calls.
 */
describe("foldForSearch", () => {
  it("drops case and accents, and spells ß as ss — normalizeSearchText's rule", () => {
    expect(foldForSearch("Zürich")).toBe("zurich");
    expect(foldForSearch("Côte d'Ivoire")).toBe("cote d'ivoire");
    expect(foldForSearch("Straße")).toBe("strasse");
    expect(foldForSearch("ÉTÉ")).toBe("ete");
  });

  it("keeps punctuation and symbols: a currency is found by its €", () => {
    expect(foldForSearch("€")).toBe("€");
    expect(foldForSearch("CA$")).toBe("ca$");
  });

  it("folds case by the locale: the Turkish dotless and dotted i", () => {
    // İ is a capital i everywhere; I is the capital of ı in Turkish only.
    expect(foldForSearch("İSTANBUL", "tr")).toBe("istanbul");
    expect(foldForSearch("İSTANBUL", "en")).toBe("istanbul");
    expect(foldForSearch("IRMAK", "tr")).toBe("ırmak");
    expect(foldForSearch("IRMAK", "en")).toBe("irmak");
  });

  it("takes a malformed locale as no locale rather than throwing", () => {
    expect(foldForSearch("Zürich", "not a tag!")).toBe("zurich");
  });

  it("is what normalizeSearchText folds by, which still turns punctuation into spaces", () => {
    expect(normalizeSearchText("  Überweisung – Straße/ÉTÉ! ")).toBe("uberweisung strasse ete");
    expect(normalizeSearchText("Zürich")).toBe(foldForSearch("Zürich"));
  });
});

describe("rankMatch", () => {
  it("ranks the code (or the whole label), then the start, then anywhere; -1 for none", () => {
    expect(rankMatch("Switzerland", "ch", { code: "CH" })).toBe(0);
    expect(rankMatch("Chad", "ch", { code: "TD" })).toBe(1);
    expect(rankMatch("Czechia", "ch", { code: "CZ" })).toBe(2);
    expect(rankMatch("Germany", "ch", { code: "DE" })).toBe(-1);
    expect(rankMatch("Bread", "bread")).toBe(0);
  });

  it("folds both sides, by the locale", () => {
    expect(rankMatch("Zürich", "zur")).toBe(1);
    expect(rankMatch("Bad Zürich", "ZURICH")).toBe(2);
    expect(rankMatch("IRMAK", "ırm", { locale: "tr" })).toBe(1);
    expect(rankMatch("IRMAK", "ırm", { locale: "en" })).toBe(-1);
  });

  it("matches everything, equally, for an empty query", () => {
    expect(rankMatch("Anything", "  ")).toBe(0);
  });
});

describe("matchesSearch: every word of a picker's query (0.51.4, keksdose /prices)", () => {
  it("splits and folds the query into words", () => {
    expect(searchWords("  Migros   Zürich ")).toEqual(["migros", "zurich"]);
    expect(searchWords("   ")).toEqual([]);
  });

  it("finds a row when each word is in one of its texts, in any order", () => {
    const shop = ["8004 Zürich", "Migros"];
    expect(matchesSearch(searchWords("migros 8004"), shop)).toBe(true);
    expect(matchesSearch(searchWords("zurich migros"), shop)).toBe(true);
    expect(matchesSearch(searchWords("coop zurich"), shop)).toBe(false);
  });

  it("matches one word, and a phrase that is a substring, as before", () => {
    expect(matchesSearch(searchWords("zur"), ["8004 Zürich"])).toBe(true);
    expect(matchesSearch(searchWords("8004 zur"), ["8004 Zürich"])).toBe(true);
    expect(matchesSearch([], ["anything"])).toBe(true);
  });

  it("never matches a word across two texts, and skips a missing one", () => {
    expect(matchesSearch(searchWords("grosbern"), ["Migros", "Bern"])).toBe(false);
    expect(matchesSearch(searchWords("bern"), ["Migros", undefined, "Bern"])).toBe(true);
  });
});
