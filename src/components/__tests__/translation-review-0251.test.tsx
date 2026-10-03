import { act, fireEvent, render as rtlRender, screen, within } from "@testing-library/react";
import { useState } from "react";
import type { ReactElement } from "react";
import { MemoryRouter, useSearchParams } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TRANSLATION_REVIEW_FILTER, translationRows } from "../../lib/translation-review";
import type { ReviewStatus, TranslationReviewFilter, TranslationRow } from "../../lib/translation-review";
import { TranslationReviewPanel } from "../translation-review";
import type { TranslationReviewPanelProps } from "../translation-review";

/**
 * 0.25.1 — what the apps found on 0.25.0.
 *
 * keksdose: `groupBy` on a wide screen opened EVERY group — 122 areas, 2053 rows, ~46 000
 * elements, 5.2 s to appear, 2.5 s per filter click, and a page test from 4 s to 146 s. A
 * folded group renders its header only, and a wide screen folds when opening them all
 * would render more than 100 rows.
 *
 * Kurvenschmiede: a field the app passes in `filter` but does not write back silently
 * disables its control. A development build now says so.
 */

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: MemoryRouter });

/** `areas` areas named `area000…`, the first `big` of them `bigSize` strings long and the
 *  rest `smallSize`; every ninth string missing. Synthetic keys, synthetic text. */
function areaRows({ areas = 122, big = 20, bigSize = 182, smallSize = 10 } = {}): TranslationRow[] {
  const reference: Record<string, string> = {};
  const strings: Record<string, string> = {};
  for (let a = 0; a < areas; a++) {
    for (let i = 0; i < (a < big ? bigSize : smallSize); i++) {
      const key = `area${String(a).padStart(3, "0")}.key${i}`;
      reference[key] = `Example text ${a}.${i}`;
      if ((a + i) % 9) strings[key] = `Texte exemple ${a}.${i}`;
    }
  }
  return translationRows({ locale: "fr", strings, reference, reviews: [] });
}

function panel(props: Partial<TranslationReviewPanelProps> = {}) {
  return (
    <TranslationReviewPanel
      rows={areaRows({ areas: 3, big: 0, smallSize: 2 })}
      localeLabel="Français"
      referenceLabel="English"
      onSave={vi.fn()}
      onClear={vi.fn()}
      groupBy="namespace"
      {...props}
    />
  );
}

/** jsdom has no matchMedia, so the wide layout renders unless a phone is stubbed. */
function stubPhone() {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const toggle = (name: string) => within(screen.getByRole("heading", { name: new RegExp(`^${name}`) })).getByRole("button");
const expanded = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => within(h).getByRole("button").getAttribute("aria-expanded"));
const section = (name: string) => toggle(name).closest<HTMLElement>("[data-review-group]")!;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("TranslationReviewPanel groups on a wide screen (keksdose, 0.25.1)", () => {
  it("starts a whole catalogue folded — 122 headers, no table, no row", () => {
    const { container } = render(panel({ rows: areaRows() }));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(122);
    expect(new Set(expanded())).toEqual(new Set(["false"]));
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    // 0.25.0 rendered ~44 000 elements here (122 tables, 2024 rows); the headers alone
    // are about two pages of the ungrouped table.
    expect(container.querySelectorAll("*").length).toBeLessThan(3000);
  });

  it("renders a group when it is opened — with the focus left on its header", () => {
    render(panel({ rows: areaRows({ areas: 30, big: 0, smallSize: 6 }) }));
    const header = toggle("area004");
    header.focus();
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(header).toHaveFocus();
    const table = screen.getByRole("table", { name: "area004" });
    expect(within(table).getAllByRole("row").filter((r) => r.closest("tbody"))).toHaveLength(6);
    // The others stay headers only.
    expect(screen.getAllByRole("table")).toHaveLength(1);
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("still opens a few groups, however long: two areas of 182 strings", () => {
    render(panel({ rows: areaRows({ areas: 2, big: 2 }) }));
    expect(expanded()).toEqual(["true", "true"]);
    expect(screen.getAllByRole("table")).toHaveLength(2);
  });

  it("opens as many small areas as fit in 100 rows, and folds past that", () => {
    const { unmount } = render(panel({ rows: areaRows({ areas: 10, big: 0, smallSize: 10 }) }));
    expect(new Set(expanded())).toEqual(new Set(["true"]));
    unmount();
    render(panel({ rows: areaRows({ areas: 11, big: 0, smallSize: 10 }) }));
    expect(new Set(expanded())).toEqual(new Set(["false"]));
  });

  it("measures the budget in the panel's own pages when they are longer than 100 rows", () => {
    const rows = areaRows({ areas: 3, big: 3, bigSize: 40 });
    const { unmount } = render(panel({ rows }));
    expect(expanded()).toEqual(["false", "false", "false"]);
    unmount();
    render(panel({ rows, pageSize: 150 }));
    expect(expanded()).toEqual(["true", "true", "true"]);
  });

  it("follows the filters: a search with few hits opens them, clearing it folds again — not what the reviewer opened", () => {
    render(panel({ rows: areaRows({ areas: 40, big: 0, smallSize: 6 }) }));
    fireEvent.click(toggle("area001"));
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "Texte exemple 3" } });
    // area003's hits and area030–039's: all open, all rendered.
    expect(new Set(expanded())).toEqual(new Set(["true"]));
    expect(screen.getByRole("table", { name: "area003" })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "" } });
    expect(toggle("area003")).toHaveAttribute("aria-expanded", "false");
    expect(toggle("area001")).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the group of an open editor open when the default turns", () => {
    render(panel({ rows: areaRows({ areas: 40, big: 0, smallSize: 6 }) }));
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "Texte exemple 5" } });
    fireEvent.click(screen.getByText("Texte exemple 5.1").closest("tr")!);
    const wording = screen.getByLabelText("Better wording");
    fireEvent.change(wording, { target: { value: "Half typed" } });
    fireEvent.change(search, { target: { value: "" } });
    expect(toggle("area005")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Better wording")).toHaveValue("Half typed");
    expect(toggle("area006")).toHaveAttribute("aria-expanded", "false");
  });

  it("sorts a group opened later like the others, and keeps counting what the filters leave", () => {
    render(panel({ rows: areaRows({ areas: 30, big: 0, smallSize: 6 }) }));
    fireEvent.click(toggle("area000"));
    fireEvent.click(within(screen.getByRole("table", { name: "area000" })).getByRole("button", { name: "Key" }));
    fireEvent.click(toggle("area002"));
    expect(
      within(screen.getByRole("table", { name: "area002" })).getByRole("columnheader", { name: /Key/ }),
    ).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("radio", { name: /^Missing/ }));
    // One missing string in two areas of three, area002 none: its header goes, the
    // others count what is left — and twenty rows fit, so they all open.
    expect(within(section("area000")).getByText("0 unreviewed / 1")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^area002/ })).toBeNull();
    expect(toggle("area004")).toHaveAttribute("aria-expanded", "true");
  });

  it("opens every group with defaultGroupsOpen, folds every one with false", () => {
    const { unmount } = render(panel({ defaultGroupsOpen: false }));
    expect(expanded()).toEqual(["false", "false", "false"]);
    expect(screen.queryByRole("table")).toBeNull();
    unmount();
    render(panel({ rows: areaRows({ areas: 12, big: 0, smallSize: 10 }), defaultGroupsOpen: true }));
    expect(screen.getAllByRole("table")).toHaveLength(12);
  });

  describe("on a phone", () => {
    it("renders a folded group's header and nothing under it, like the wide screen", () => {
      stubPhone();
      render(panel());
      expect(expanded()).toEqual(["false", "false", "false"]);
      expect(within(section("area000")).queryByText("Texte exemple 0.1")).toBeNull();
      for (const name of ["area000", "area001", "area002"]) {
        expect(section(name).querySelectorAll("li, table")).toHaveLength(0);
      }
      fireEvent.click(toggle("area000"));
      expect(within(section("area000")).getByText("Texte exemple 0.1")).toBeInTheDocument();
    });

    it("opens every group with defaultGroupsOpen", () => {
      stubPhone();
      render(panel({ defaultGroupsOpen: true }));
      expect(expanded()).toEqual(["true", "true", "true"]);
    });
  });
});

describe("TranslationReviewPanel controlled filter check (Kurvenschmiede, 0.25.1)", () => {
  /** A development build — the check is off under vitest, as the kit's other dev
   *  warnings are — and a clock to let the change land. */
  function devBuild() {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", true);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    return vi.spyOn(console, "warn").mockImplementation(() => {});
  }
  const settle = () => act(() => void vi.advanceTimersByTime(1500));
  const placeholderBox = () => screen.getByRole("checkbox", { name: /placeholder problems/ });

  /** An app that keeps its filters in state but hands back only some fields — the
   *  others stay whatever it passed. */
  function HalfWired({ handBack }: { handBack: readonly (keyof TranslationReviewFilter)[] }) {
    const [filter, setFilter] = useState<TranslationReviewFilter>(DEFAULT_TRANSLATION_REVIEW_FILTER);
    return panel({
      groupBy: undefined,
      filter,
      onFilterChange: (next) =>
        setFilter((prev) => ({ ...prev, ...Object.fromEntries(handBack.map((field) => [field, next[field]])) })),
    });
  }

  it("warns once per field when a field the app passes is not written back", () => {
    const warn = devBuild();
    render(<HalfWired handBack={["status", "source", "namespace", "query"]} />);
    fireEvent.click(placeholderBox());
    expect(placeholderBox()).not.toBeChecked();
    expect(warn).not.toHaveBeenCalled();
    settle();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toBe(
      '[ui-kit] TranslationReviewPanel: the "placeholdersOnly" filter was changed to true, but the `filter` prop ' +
        "still says false, so the control does nothing. A field passed in `filter` is the app's: write back every " +
        "field `onFilterChange` reports, in one update (useSearchParamsState's setter takes the object as it is), " +
        "or leave the field out of `filter` and the panel keeps it. (Development builds only; once per field.)",
    );
    fireEvent.click(placeholderBox());
    settle();
    expect(warn).toHaveBeenCalledTimes(1);
    // The fields it does write back work, and say nothing.
    fireEvent.click(screen.getByRole("radio", { name: /^Unreviewed/ }));
    settle();
    expect(screen.getByRole("radio", { name: /^Unreviewed/ })).toHaveAttribute("aria-checked", "true");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns for a controlled field with no onFilterChange to take it", () => {
    const warn = devBuild();
    render(panel({ groupBy: undefined, filter: { status: "all" } }));
    fireEvent.click(screen.getByRole("radio", { name: /^Unreviewed/ }));
    settle();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/the "status" filter was changed to "unreviewed", but the `filter` prop still says "all"/);
  });

  it("says nothing for a field the app leaves out — the panel keeps it (keksdose's placeholder switch)", () => {
    const warn = devBuild();
    function LeavesItOut() {
      const [filter, setFilter] = useState<Partial<TranslationReviewFilter>>({ status: "all", query: "" });
      return panel({
        groupBy: undefined,
        filter,
        onFilterChange: (next) => setFilter({ status: next.status, query: next.query }),
      });
    }
    render(<LeavesItOut />);
    fireEvent.click(placeholderBox());
    settle();
    expect(placeholderBox()).toBeChecked();
    expect(warn).not.toHaveBeenCalled();
  });

  it("says nothing when the app does not control the filter, or writes it back through the URL", () => {
    const warn = devBuild();
    const { unmount } = render(panel({ groupBy: undefined }));
    fireEvent.click(placeholderBox());
    fireEvent.click(screen.getByRole("radio", { name: /^Unreviewed/ }));
    settle();
    unmount();

    // The router writes the URL in a transition: the panel's own render sees the old
    // filter first, which must not count.
    function InTheUrl() {
      const [params, setParams] = useSearchParams();
      return panel({
        groupBy: undefined,
        filter: { status: (params.get("status") ?? "all") as ReviewStatus | "all", placeholdersOnly: params.has("p") },
        onFilterChange: (next) =>
          setParams({ status: next.status, ...(next.placeholdersOnly ? { p: "1" } : {}) }),
      });
    }
    render(<InTheUrl />);
    fireEvent.click(placeholderBox());
    fireEvent.click(screen.getByRole("radio", { name: /^Unreviewed/ }));
    settle();
    expect(placeholderBox()).toBeChecked();
    expect(warn).not.toHaveBeenCalled();
  });

  it("is silent outside a development build, and under vitest unless a test opts in", () => {
    const warn = devBuild();
    vi.stubEnv("DEV", false);
    const { unmount } = render(<HalfWired handBack={[]} />);
    fireEvent.click(placeholderBox());
    settle();
    unmount();
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITEST", "true");
    render(<HalfWired handBack={[]} />);
    fireEvent.click(placeholderBox());
    settle();
    expect(warn).not.toHaveBeenCalled();
  });
});
