import { describe, expect, it } from "vitest";
import { createSearchIndex, matchEntries, normalizeSearchText } from "../search-index";
import type { SearchEntry } from "../search-index";

const titles = (hits: Array<{ entry: SearchEntry }>) => hits.map((h) => h.entry.title);

describe("normalizeSearchText", () => {
  it("folds case, accents, ß and punctuation", () => {
    expect(normalizeSearchText("  Überweisung – Straße/ÉTÉ! ")).toBe("uberweisung strasse ete");
  });
});

describe("createSearchIndex", () => {
  const entries: SearchEntry[] = [
    { id: "tooltip", title: "Tooltip", group: "Components" },
    { id: "tooltip-page", title: "Popovers, menus & tooltips", group: "Pages", description: "Overlays anchored to a trigger" },
    { id: "drp", title: "DateRangePicker", group: "Components" },
    { id: "dp", title: "DatePicker", group: "Components" },
    { id: "cal", title: "Calendars & date pickers", group: "Pages", keywords: ["pick a date range"] },
    { id: "confirm", title: "Confirm dialog", group: "Pages", keywords: ["ask before deleting"] },
    { id: "trash", title: "Swipeable row", group: "Pages", description: "swipe a row to delete it" },
  ];
  const index = createSearchIndex(entries);

  it("ranks the exact name above a prefix above a word in a longer title", () => {
    const hits = titles(index.search("tooltip"));
    expect(hits[0]).toBe("Tooltip");
    expect(hits).toContain("Popovers, menus & tooltips");
    expect(titles(index.search("datep"))[0]).toBe("DatePicker");
  });

  it("ranks the title above keywords above the description", () => {
    const hits = index.search("delet");
    expect(titles(hits)).toEqual(["Confirm dialog", "Swipeable row"]);
    expect(hits.map((h) => h.field)).toEqual(["keywords", "description"]);
  });

  it("is word-order-insensitive and needs every word", () => {
    expect(titles(index.search("range date"))).toContain("DateRangePicker");
    expect(titles(index.search("range date"))).toContain("Calendars & date pickers");
    expect(index.search("range zebra")).toEqual([]);
  });

  it("splits camelCase, so a component is found by any of its words", () => {
    expect(titles(index.search("range picker"))[0]).toBe("DateRangePicker");
  });

  it("tolerates one typo in a word of five letters or more — and none below", () => {
    expect(titles(index.search("tooltp"))[0]).toBe("Tooltip");
    expect(titles(index.search("toolitp"))[0]).toBe("Tooltip"); // a transposition
    expect(titles(index.search("calender"))).toContain("Calendars & date pickers");
    expect(index.search("dta")).toEqual([]);
  });

  it("is accent- and case-insensitive on both sides", () => {
    const idx = createSearchIndex([{ id: "u", title: "Überweisung" }, { id: "c", title: "Café" }]);
    expect(titles(idx.search("uberweisung"))).toEqual(["Überweisung"]);
    expect(titles(idx.search("CAFE"))).toEqual(["Café"]);
  });

  it("matches inside a compound for words of four letters or more", () => {
    const idx = createSearchIndex([{ id: "d", title: "Datumsbereich auswählen" }]);
    expect(titles(idx.search("datum bereich"))).toEqual(["Datumsbereich auswählen"]);
    expect(idx.search("ber")).toEqual([]);
  });

  it("adds weight within a tier", () => {
    const idx = createSearchIndex([
      { id: "a", title: "Export CSV" },
      { id: "b", title: "Export PDF", weight: 50 },
    ]);
    expect(titles(idx.search("export"))).toEqual(["Export PDF", "Export CSV"]);
  });

  it("caps each group, after ranking", () => {
    const many: SearchEntry[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      title: `Item ${i}`,
      group: i % 2 ? "Odd" : "Even",
    }));
    const hits = createSearchIndex(many, { groupLimit: 3 }).search("item");
    expect(hits.filter((h) => h.entry.group === "Odd")).toHaveLength(3);
    expect(hits.filter((h) => h.entry.group === "Even")).toHaveLength(3);
    expect(createSearchIndex(many).search("item")).toHaveLength(16);
  });

  it("returns nothing for an empty query", () => {
    expect(index.search("   ")).toEqual([]);
  });
});

describe("matchEntries", () => {
  /**
   * Ported from keksdose's global-search-i18n test: the app localises its entries (a
   * category's `name_translations`), and the matcher must find what the user SEES. A
   * German list finds "Gehalt" and has no "Salary" left to find.
   */
  it("finds a localised entry by its localised name only", () => {
    const localise = (lang: "de" | "en") => [
      { id: "c1", title: lang === "de" ? "Gehalt" : "Salary", keywords: lang === "de" ? ["Lohn", "Einkommen"] : ["income"] },
    ];
    expect(matchEntries(localise("de"), "Gehalt").map((e) => e.title)).toEqual(["Gehalt"]);
    expect(matchEntries(localise("de"), "Salary")).toEqual([]);
    expect(matchEntries(localise("de"), "einkommen").map((e) => e.id)).toEqual(["c1"]);
    expect(matchEntries(localise("en"), "Salary").map((e) => e.title)).toEqual(["Salary"]);
  });
});
