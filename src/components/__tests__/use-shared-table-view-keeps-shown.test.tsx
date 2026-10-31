import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_PERSIST_PREFIX, useSharedTableView } from "../use-table-state";

/**
 * `useSharedTableView` writes the very blob a DataTable with the same `storageKey` keeps,
 * carrying over what it does not own. It carried the filters, widths and hidden columns
 * but not `shown` — the `defaultHidden` columns the user ticked back on (0.48) — so a sort
 * changed in the grouped view hid them again in the single table (refactor audit
 * 2026-10-30, DSP-23 c).
 */

const KEY = "review";
const stored = () => JSON.parse(localStorage.getItem(DEFAULT_PERSIST_PREFIX + KEY) ?? "{}");

afterEach(() => localStorage.clear());

describe("useSharedTableView keeps the single table's ticked-back columns (audit 2026-10-30 DSP-23 c)", () => {
  it("a sort written by the groups leaves `shown` (and the rest) as stored", () => {
    localStorage.setItem(
      DEFAULT_PERSIST_PREFIX + KEY,
      JSON.stringify({ sort: [], filters: {}, pageSize: 25, hidden: ["notes"], shown: ["context"] }),
    );
    const { result } = renderHook(() => useSharedTableView({ active: true, storageKey: KEY, defaultPageSize: 25 }));
    act(() => result.current.setSorts([{ key: "key", dir: "asc" }]));
    expect(stored()).toMatchObject({ sort: [{ key: "key", dir: "asc" }], hidden: ["notes"], shown: ["context"] });
  });
});
