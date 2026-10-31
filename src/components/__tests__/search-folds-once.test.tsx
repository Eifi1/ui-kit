import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";
import { CountrySelect } from "../country-select";
import { InlineEntityCombobox } from "../inline-entity-combobox";

/**
 * A ranked list folds each row's text ONCE per keystroke (0.52 code review, combobox.tsx).
 * Combobox, CountrySelect and InlineEntityCombobox filter by the query's words and rank by
 * the whole query, and asked `matchesSearch` (a fold of the row) and then `rankMatch`
 * (the row and the query, folded again) of every row they kept — InlineEntityCombobox
 * asked `rankMatch` twice of most. On a phone, where the list is the sheet's 50 and the
 * keystroke the slowest, three folds a row and more.
 *
 * Counted by the fold's own step: `foldForSearch` decomposes each text with
 * `normalize("NFD")` once, and nothing else on these paths does.
 */

afterEach(() => vi.restoreAllMocks());

/** `normalize` calls during `act`. */
function foldsDuring(act_: () => void): number {
  const normalize = vi.spyOn(String.prototype, "normalize");
  act_();
  const n = normalize.mock.calls.length;
  normalize.mockRestore();
  return n;
}

const N = 60;
const NAMES = Array.from({ length: N }, (_, i) => `Shop ${String(i).padStart(2, "0")}`);

describe("one fold per row per keystroke", () => {
  it("Combobox", () => {
    function Host() {
      const [value, setValue] = useState("");
      return <Combobox label="Shop" value={value} onChange={setValue} options={NAMES} maxSuggestions={N} />;
    }
    render(<Host />);
    const field = screen.getByRole("combobox", { name: "Shop" });
    act(() => field.focus());
    const folds = foldsDuring(() => fireEvent.change(field, { target: { value: "shop" } }));
    expect(screen.getAllByRole("option")).toHaveLength(N);
    // A fold per row, and the query's.
    expect(folds).toBeLessThanOrEqual(N + 2);
  });

  it("InlineEntityCombobox", () => {
    const options = NAMES.map((label, i) => ({ value: i, label }));
    render(<InlineEntityCombobox<number> label="Shop" value={null} onChange={() => {}} options={options} />);
    const field = screen.getByRole("combobox", { name: "Shop" });
    act(() => field.focus());
    const folds = foldsDuring(() => fireEvent.change(field, { target: { value: "op" } }));
    expect(screen.getAllByRole("option")).toHaveLength(N);
    expect(folds).toBeLessThanOrEqual(N + 2);
  });

  it("CountrySelect: the name and the code, once each", () => {
    render(<CountrySelect label="Country" locale="en" value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Country/ }));
    const count = screen.getAllByRole("option").length;
    const folds = foldsDuring(() => fireEvent.change(screen.getByRole("textbox"), { target: { value: "a" } }));
    // Two a country, and the query's few: once for each half of the list (preferred and
    // the rest) and once by the panel's own source, which this list's rows bypass.
    expect(folds).toBeLessThanOrEqual(2 * count + 3);
  });
});
