import {
  decodeFilterValueOfType,
  defaultFilterState,
  encodeFilterValue,
  isFilterActive,
} from "../data-table-filters";
import type { FilterValue } from "../data-table-filters";

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
    expect(defaultFilterState({ type: "number", getValue: () => 0 })).toEqual({ type: "number", min: "", max: "", abs: false });
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
