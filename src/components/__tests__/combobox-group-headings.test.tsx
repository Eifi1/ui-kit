import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Combobox } from "../combobox";

/**
 * One group-boundary calculation, shared by both branches (audit 2026-09-22,
 * §react-correctness).
 *
 * The desktop list read the previous row as `matches[i - 1]` — free. The phone sheet
 * had no index in hand and reached for `matches.indexOf(o)` instead, twice per row
 * and again per heading test: a scan of the whole list per row, on the branch that
 * runs on the slowest hardware we ship to, at a cap of 50 rows rather than 8.
 *
 * It also answered a subtly different question. `indexOf` finds the FIRST row holding
 * that string, so it compares against a neighbour the row is not necessarily next to.
 * Nothing shows today because `matches` de-duplicates — but that is a property of the
 * memo, not of the row being drawn, and the sheet had no business depending on it.
 */
const OPTIONS = [
  "Migros",
  "Coop",
  "Denner",
  "SBB",
  "BLS",
  "Postauto",
  "Swisscom",
  "Salt",
];

const GROUPS: Record<string, string> = {
  Migros: "Groceries",
  Coop: "Groceries",
  Denner: "Groceries",
  SBB: "Travel",
  BLS: "Travel",
  Postauto: "Travel",
  Swisscom: "Utilities",
  Salt: "Utilities",
};

/** The sheet only exists on a phone, and jsdom's matchMedia is undefined (the
 *  desktop fallback), so the field never reaches its sheet branch otherwise. */
function asPhone() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function Host({ groupBy }: { groupBy: (o: string) => string }) {
  const [value, setValue] = useState("");
  return (
    <Combobox
      label="Payee"
      value={value}
      onChange={setValue}
      options={OPTIONS}
      groupBy={groupBy}
    />
  );
}

/** The listbox as a reader walks it: headings and options in document order. */
function rows() {
  const list = screen.getByRole("listbox");
  return Array.from(list.querySelectorAll("li")).map((li) => li.textContent ?? "");
}

describe("Combobox group headings", () => {
  const groupBy = vi.fn((o: string) => GROUPS[o]);

  it("heads each group once in the phone sheet, in the list's own order", () => {
    asPhone();
    render(<Host groupBy={groupBy} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Payee/ }));

    expect(rows()).toEqual([
      "Groceries",
      "Migros",
      "Coop",
      "Denner",
      "Travel",
      "SBB",
      "BLS",
      "Postauto",
      "Utilities",
      "Swisscom",
      "Salt",
    ]);
  });

  it("does not scan the match list once per row to find the boundaries", () => {
    asPhone();
    const scan = vi.spyOn(Array.prototype, "indexOf");
    try {
      render(<Host groupBy={groupBy} />);
      fireEvent.click(screen.getByRole("combobox", { name: /Payee/ }));
      // The rows are drawn, so whatever the sheet needed it has already done.
      expect(within(screen.getByRole("listbox")).getByText("Postauto")).toBeInTheDocument();

      const overOptions = scan.mock.calls.filter(
        (call) => typeof call[0] === "string" && OPTIONS.includes(call[0] as string),
      );
      expect(overOptions).toHaveLength(0);
    } finally {
      scan.mockRestore();
    }
  });

  it("asks the caller's groupBy once per option, however many branches draw it", () => {
    asPhone();
    groupBy.mockClear();
    render(<Host groupBy={groupBy} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Payee/ }));

    // Once to make the list group-contiguous, once to find the boundaries in it.
    // `groupBy` is the caller's function and may be doing real work — a lookup, a
    // date bucketed into a label — so calling it three times per row to draw one
    // heading is the caller's cost, not ours.
    const perOpen = groupBy.mock.calls.length;
    expect(perOpen).toBeLessThanOrEqual(OPTIONS.length * 2);
  });

  it("draws the same boundaries on the desktop list", () => {
    render(<Host groupBy={groupBy} />);
    fireEvent.focus(screen.getByRole("combobox", { name: /Payee/ }));
    expect(rows()).toEqual([
      "Groceries",
      "Migros",
      "Coop",
      "Denner",
      "Travel",
      "SBB",
      "BLS",
      "Postauto",
      "Utilities",
      "Swisscom",
      "Salt",
    ]);
  });
});
