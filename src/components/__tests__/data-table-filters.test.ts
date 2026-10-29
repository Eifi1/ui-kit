import {
  decodeFilterValueOfType,
  defaultFilterState,
  encodeFilterValue,
  isFilterActive,
  rowMatches,
} from "../data-table-filters";
import type { FilterValue } from "../data-table-filters";
import type { DataTableColumn } from "../data-table";

/**
 * Characterisation suite for the data-table filter codec (refactor plan
 * 2026-08-24, U-1b/U-5). These values go into the URL, so the round trip is the
 * whole contract: whatever a user filtered by has to come back as the same filter
 * when the link is opened again.
 */

/** The property every codec here owes: encode then decode is the identity. */
function roundTrip(v: FilterValue): FilterValue | null {
  const raw = encodeFilterValue(v);
  return raw === null ? null : decodeFilterValueOfType(v.type, raw);
}

describe("isFilterActive", () => {
  it("distinguishes a narrowing filter from its empty default", () => {
    expect(isFilterActive(undefined)).toBe(false);
    expect(isFilterActive({ type: "text", q: "" })).toBe(false);
    expect(isFilterActive({ type: "text", q: "   " })).toBe(false);
    expect(isFilterActive({ type: "text", q: "rent" })).toBe(true);
    expect(isFilterActive({ type: "select", values: [] })).toBe(false);
    expect(isFilterActive({ type: "select", values: ["a"] })).toBe(true);
    expect(isFilterActive({ type: "date", from: "", to: "" })).toBe(false);
    expect(isFilterActive({ type: "date", from: "2026-01-01", to: "" })).toBe(true);
    expect(isFilterActive({ type: "number", min: "", max: "", abs: false })).toBe(false);
    expect(isFilterActive({ type: "number", min: "", max: "", abs: true })).toBe(true);
  });
});

describe("defaultFilterState", () => {
  it("is the empty state for each type", () => {
    expect(defaultFilterState({ type: "text", getValue: () => "" })).toEqual({ type: "text", q: "" });
    expect(defaultFilterState({ type: "select", getValue: () => "" })).toEqual({ type: "select", values: [] });
    expect(defaultFilterState({ type: "date", getValue: () => "" })).toEqual({ type: "date", from: "", to: "" });
    expect(defaultFilterState({ type: "number", getValue: () => 0 })).toEqual({
      type: "number",
      min: "",
      max: "",
      abs: false,
    });
  });
});

describe("encode/decode", () => {
  it("returns null for a filter that is not narrowing anything", () => {
    expect(encodeFilterValue({ type: "text", q: "  " })).toBeNull();
    expect(encodeFilterValue({ type: "select", values: [] })).toBeNull();
    expect(encodeFilterValue({ type: "date", from: "", to: "" })).toBeNull();
    expect(encodeFilterValue({ type: "number", min: "", max: "", abs: false })).toBeNull();
  });

  it("round-trips the ordinary cases", () => {
    expect(roundTrip({ type: "text", q: "rent" })).toEqual({ type: "text", q: "rent" });
    expect(roundTrip({ type: "select", values: ["RED", "BLUE"] })).toEqual({
      type: "select",
      values: ["RED", "BLUE"],
    });
    expect(roundTrip({ type: "date", from: "2026-01-01", to: "2026-01-31" })).toEqual({
      type: "date",
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(roundTrip({ type: "number", min: "5", max: "50", abs: true })).toEqual({
      type: "number",
      min: "5",
      max: "50",
      abs: true,
    });
  });

  it("round-trips half-open ranges", () => {
    expect(roundTrip({ type: "date", from: "2026-01-01", to: "" })).toEqual({
      type: "date",
      from: "2026-01-01",
      to: "",
    });
    expect(roundTrip({ type: "number", min: "", max: "50", abs: false })).toEqual({
      type: "number",
      min: "",
      max: "50",
      abs: false,
    });
  });

  it("round-trips a select value containing the separator (U-5)", () => {
    // The select codec joins on "," and splits on "," — so a value that CONTAINS a
    // comma came back as two values and the filter silently matched nothing. It is
    // the only codec whose separator can occur in its data (".." cannot appear in a
    // date or a number), and it is reachable: steering-design filters its sessions
    // table on `gear_title`, a free-text field.
    expect(roundTrip({ type: "select", values: ["Rack, long", "Rack, short"] })).toEqual({
      type: "select",
      values: ["Rack, long", "Rack, short"],
    });
    expect(roundTrip({ type: "select", values: ["a,b"] })).toEqual({
      type: "select",
      values: ["a,b"],
    });
  });

  it("round-trips a select value containing a percent sign", () => {
    // The escape has to escape itself, or values that already look encoded decode
    // back into something else.
    expect(roundTrip({ type: "select", values: ["100%", "%2C", "50%25"] })).toEqual({
      type: "select",
      values: ["100%", "%2C", "50%25"],
    });
  });

  it("still decodes the URLs written before the escaping existed", () => {
    // Plain values were never escaped, and a bookmarked link has to keep working.
    expect(decodeFilterValueOfType("select", "RED,BLUE")).toEqual({
      type: "select",
      values: ["RED", "BLUE"],
    });
    expect(decodeFilterValueOfType("select", "12")).toEqual({ type: "select", values: ["12"] });
    expect(decodeFilterValueOfType("select", "")).toEqual({ type: "select", values: [] });
  });
});

/**
 * Round 0.34 BUG-2: the date filter compared `raw.slice(0, 10)` — for a server
 * timestamp ("…Z", "+00:00") the UTC day — while the cell, the DatePicker and the
 * presets all use the local day. In Berlin a report filed at 00:30 shows as the 12th
 * and was filtered as the 11th: "Today" dropped everything from 00:00 to 02:00 and
 * picked up yesterday's late rows instead.
 */
describe("rowMatches on a date column (BUG-2)", () => {
  type Row = { at: string | null };
  const col: DataTableColumn<Row> = {
    key: "created",
    header: "Created",
    cell: (r) => r.at,
    filter: { type: "date", getValue: (r) => r.at },
  };
  const the12th: FilterValue = { type: "date", from: "2026-10-12", to: "2026-10-12" };

  // The suite's zone is pinned for the whole process (vitest.config.ts) and cannot be
  // moved per test under vmThreads, so each test here checks it stands where the
  // local day and the UTC day differ — on a UTC runner both agree, and the old slice
  // would pass.
  const inBerlin = () => expect(new Date("2026-10-11T22:30:00Z").getDate()).toBe(12);

  it("files a timestamp under the local day the cell shows", () => {
    inBerlin();
    // 00:30 on the 12th in Berlin, 22:30 on the 11th in UTC.
    expect(rowMatches(col, { at: "2026-10-11T22:30:00Z" }, the12th)).toBe(true);
    expect(rowMatches(col, { at: "2026-10-11T22:30:00+00:00" }, the12th)).toBe(true);
    // 00:30 on the 13th in Berlin, still the 12th in UTC.
    expect(rowMatches(col, { at: "2026-10-12T22:30:00Z" }, the12th)).toBe(false);
    // An offset of its own is read as the instant it names, then shown locally.
    expect(rowMatches(col, { at: "2026-10-12T00:30:00+02:00" }, the12th)).toBe(true);
  });

  it("bounds a range by the local day at both ends", () => {
    inBerlin();
    const range: FilterValue = { type: "date", from: "2026-10-12", to: "2026-10-13" };
    expect(rowMatches(col, { at: "2026-10-11T21:59:59Z" }, range)).toBe(false); // 23:59 on the 11th
    expect(rowMatches(col, { at: "2026-10-11T22:00:00Z" }, range)).toBe(true); // 00:00 on the 12th
    expect(rowMatches(col, { at: "2026-10-13T21:59:59Z" }, range)).toBe(true); // 23:59 on the 13th
    expect(rowMatches(col, { at: "2026-10-13T22:00:00Z" }, range)).toBe(false); // 00:00 on the 14th
  });

  it("keeps a bare calendar day, which has no zone to move it", () => {
    inBerlin();
    expect(rowMatches(col, { at: "2026-10-12" }, the12th)).toBe(true);
    expect(rowMatches(col, { at: "2026-10-11" }, the12th)).toBe(false);
  });

  it("still keeps a row with no date out of a set filter, and in an empty one", () => {
    expect(rowMatches(col, { at: null }, the12th)).toBe(false);
    expect(rowMatches(col, { at: null }, { type: "date", from: "", to: "" })).toBe(true);
  });
});

// BUG-10 (refactor audit 2026-10): a bound that is not a number — `f.amount=abc..` in a
// shared link — decoded to NaN, every comparison with NaN is false, and the filter
// matched every row while its column showed it as active.
describe("a number filter's bound that is not a number (BUG-10)", () => {
  const amount: DataTableColumn<{ n: number }> = {
    key: "amount",
    header: "Amount",
    cell: (r) => String(r.n),
    filter: { type: "number", getValue: (r) => r.n },
  };

  it("is dropped by the URL decoder, so the filter is not active", () => {
    const decoded = decodeFilterValueOfType("number", "abc..");
    expect(decoded).toEqual({ type: "number", min: "", max: "", abs: false });
    expect(isFilterActive(decoded)).toBe(false);
    // The finite half of a half-broken range is kept.
    expect(decodeFilterValueOfType("number", "abc..20!")).toEqual({ type: "number", min: "", max: "20", abs: true });
    expect(decodeFilterValueOfType("number", "-5..1e3")).toEqual({ type: "number", min: "-5", max: "1e3", abs: false });
  });

  it("does not count as narrowing, and rowMatches ignores it rather than comparing with NaN or 0", () => {
    expect(isFilterActive({ type: "number", min: "abc", max: "", abs: false })).toBe(false);
    // `Number(" ")` is 0: a blank bound used to keep every negative row out.
    const blank: FilterValue = { type: "number", min: " ", max: "", abs: false };
    expect(isFilterActive(blank)).toBe(false);
    expect(rowMatches(amount, { n: -5 }, blank)).toBe(true);
    // A real bound beside a broken one still narrows.
    const half: FilterValue = { type: "number", min: "Infinity", max: "10", abs: false };
    expect(rowMatches(amount, { n: -5 }, half)).toBe(true);
    expect(rowMatches(amount, { n: 20 }, half)).toBe(false);
  });
});

// DUP-5: the text filter folds as every kit list does — accents off, the locale's case.
describe("rowMatches on a text column folds for search (DUP-5)", () => {
  const city: DataTableColumn<{ city: string }> = {
    key: "city",
    header: "City",
    cell: (r) => r.city,
    filter: { type: "text", getValue: (r) => r.city },
  };

  it('"zurich" finds Zürich, and "ZÜRICH" finds Zurich', () => {
    expect(rowMatches(city, { city: "Zürich" }, { type: "text", q: "zurich" })).toBe(true);
    expect(rowMatches(city, { city: "Zurich" }, { type: "text", q: "ZÜRICH" })).toBe(true);
    expect(rowMatches(city, { city: "Basel" }, { type: "text", q: "zurich" })).toBe(false);
  });

  it("folds the case by the table's locale", () => {
    expect(rowMatches(city, { city: "IRMAK" }, { type: "text", q: "ırmak" }, "tr")).toBe(true);
    expect(rowMatches(city, { city: "İSTANBUL" }, { type: "text", q: "istanbul" }, "tr")).toBe(true);
  });
});
