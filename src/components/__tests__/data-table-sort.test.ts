import { decodeSorts, encodeSorts, nextSorts, normalizeSorts } from "../data-table-sort";
import type { SortState } from "../data-table-sort";

/**
 * Characterisation suite for the multi-column sort state (refactor plan
 * 2026-08-24, U-1). Nothing was found wrong here; these assertions exist so the
 * URL/localStorage compatibility the comments promise stops being a claim.
 */

const KEYS = new Set(["date", "amount", "payee"]);

describe("normalizeSorts", () => {
  it("accepts the pre-multi-sort single-object format", () => {
    expect(normalizeSorts({ key: "date", dir: "desc" })).toEqual([{ key: "date", dir: "desc" }]);
    expect(normalizeSorts({ key: "date" })).toEqual([{ key: "date", dir: "asc" }]);
  });

  it("passes arrays through, dropping junk and duplicates", () => {
    expect(normalizeSorts([{ key: "date", dir: "desc" }, { key: "amount" }])).toEqual([
      { key: "date", dir: "desc" },
      { key: "amount", dir: "asc" },
    ]);
    expect(normalizeSorts([{ key: "date" }, { key: "date", dir: "desc" }])).toEqual([
      { key: "date", dir: "asc" },
    ]);
    expect(normalizeSorts([null, 42, { dir: "asc" }, { key: "" }])).toEqual([]);
  });

  it("is empty for anything that is not sort state", () => {
    expect(normalizeSorts(null)).toEqual([]);
    expect(normalizeSorts(undefined)).toEqual([]);
    expect(normalizeSorts("date.desc")).toEqual([]);
  });
});

describe("encodeSorts / decodeSorts", () => {
  it("round-trips, leaving asc implicit", () => {
    const sorts: SortState[] = [{ key: "date", dir: "desc" }, { key: "amount", dir: "asc" }];
    const raw = encodeSorts(sorts);
    expect(raw).toBe("date.desc,amount");
    expect(decodeSorts(raw, KEYS)).toEqual(sorts);
  });

  it("decodes the pre-multi-sort single-value format", () => {
    expect(decodeSorts("date.desc", KEYS)).toEqual([{ key: "date", dir: "desc" }]);
    expect(decodeSorts("date", KEYS)).toEqual([{ key: "date", dir: "asc" }]);
    expect(decodeSorts("date.asc", KEYS)).toEqual([{ key: "date", dir: "asc" }]);
  });

  it("drops unknown and duplicated keys rather than trusting the URL", () => {
    expect(decodeSorts("date,nonsense,amount", KEYS)).toEqual([
      { key: "date", dir: "asc" },
      { key: "amount", dir: "asc" },
    ]);
    expect(decodeSorts("date,date.desc", KEYS)).toEqual([{ key: "date", dir: "asc" }]);
    expect(decodeSorts(null, KEYS)).toEqual([]);
    expect(encodeSorts([])).toBeNull();
  });
});

describe("nextSorts (header click semantics)", () => {
  it("cycles asc -> desc -> none on the sole criterion", () => {
    let s: SortState[] = [];
    s = nextSorts(s, "date", false);
    expect(s).toEqual([{ key: "date", dir: "asc" }]);
    s = nextSorts(s, "date", false);
    expect(s).toEqual([{ key: "date", dir: "desc" }]);
    s = nextSorts(s, "date", false);
    expect(s).toEqual([]);
  });

  it("replaces the whole sort on a plain click of a different column", () => {
    const s = nextSorts([{ key: "date", dir: "desc" }, { key: "amount", dir: "asc" }], "payee", false);
    expect(s).toEqual([{ key: "payee", dir: "asc" }]);
  });

  it("appends on shift-click, then cycles that entry in place", () => {
    let s: SortState[] = [{ key: "date", dir: "desc" }];
    s = nextSorts(s, "amount", true);
    expect(s).toEqual([{ key: "date", dir: "desc" }, { key: "amount", dir: "asc" }]);
    s = nextSorts(s, "amount", true);
    expect(s).toEqual([{ key: "date", dir: "desc" }, { key: "amount", dir: "desc" }]);
    s = nextSorts(s, "amount", true);
    expect(s).toEqual([{ key: "date", dir: "desc" }]);
  });

  it("keeps priority order when a middle entry cycles", () => {
    const s = nextSorts(
      [{ key: "date", dir: "asc" }, { key: "amount", dir: "asc" }, { key: "payee", dir: "asc" }],
      "amount",
      true,
    );
    expect(s.map((x) => x.key)).toEqual(["date", "amount", "payee"]);
    expect(s[1].dir).toBe("desc");
  });
});
