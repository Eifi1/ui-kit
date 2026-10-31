// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isBareIsoDay } from "../iso-day";

/**
 * 0.52 code review, lib/day-format.ts: the bare-day pattern was written three times —
 * `BARE_ISO_DAY` in lib/format, again in lib/day-format (the module that exists to be the
 * kit's one day rule), `DATE_ONLY` in lib/date-format. Had one of them learnt a new shape
 * alone, the ladder would have asked the provider for another day than the kit prints.
 */

describe("isBareIsoDay — the kit's one bare-day rule", () => {
  it("is a calendar day written YYYY-MM-DD, nothing else", () => {
    expect(isBareIsoDay("2026-08-01")).toBe(true);
    for (const value of [
      "2026-08-01T00:00",
      "2026-08-01T00:00:00Z",
      "2026-8-1",
      " 2026-08-01",
      "",
      null,
      1785542400000,
    ]) {
      expect(isBareIsoDay(value), String(value)).toBe(false);
    }
    expect(isBareIsoDay(new Date(2026, 7, 1))).toBe(false);
  });

  it("is the one the three date modules ask; none keeps a copy", () => {
    for (const file of ["format.ts", "day-format.ts", "date-format.ts"]) {
      const source = readFileSync(join(__dirname, "..", file), "utf8");
      expect(source, file).toContain('from "./iso-day"');
      expect(source, file).not.toContain("\\d{4}-\\d{2}-\\d{2}$/");
    }
  });
});
