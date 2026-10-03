import { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";

/**
 * 0.25.1 — two adoption findings.
 *  - keksdose: an app test mocking react-router with a factory that leaves out
 *    `UNSAFE_DataRouterContext` (as most do — they mock `useNavigate` and keep the rest)
 *    threw at IMPORT: vitest's module mock throws on any export it does not define.
 *  - Kurvenschmiede: `useSearchParamsState<TranslationReviewFilter>(…)` failed with
 *    TS2344 — an interface has no index signature, and the constraint was
 *    `Record<string, unknown>`.
 */
vi.mock("react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router")>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { UNSAFE_DataRouterContext, ...rest } = original;
  return rest;
});

const { useSearchParamsState } = await import("../use-search-param-state");

/** An INTERFACE on purpose — the shape TranslationReviewFilter has. */
interface Filter {
  status: string;
  q: string;
}

let search = "";
function Where() {
  const location = useLocation();
  useEffect(() => {
    search = location.search;
  });
  return null;
}

let set: ((update: Partial<Filter>) => void) | null = null;
function Filters() {
  const [, setFilter] = useSearchParamsState<Filter>({ status: { default: "all" }, q: { default: "" } });
  useEffect(() => {
    set = setFilter;
  });
  return null;
}

describe("useSearchParamsState under a react-router mock without the data-router context", () => {
  it("imports, and writes several keys in one go (an interface as V)", () => {
    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Filters />
        <Where />
      </MemoryRouter>,
    );
    act(() => set!({ status: "unreviewed", q: "save" }));
    const params = new URLSearchParams(search);
    expect(params.get("status")).toBe("unreviewed");
    expect(params.get("q")).toBe("save");
  });
});
