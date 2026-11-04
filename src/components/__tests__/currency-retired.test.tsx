import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { AmountInput } from "../amount-input";
import { CurrencySelect } from "../currency-select";

/**
 * A currency that was replaced is no longer OFFERED (keksdose audit follow-up,
 * 2026-11-01): Bulgaria adopted the euro on 2026-01-01, and both currency pickers still
 * listed the lev. It stays in `CURRENCIES`, marked `retired`, because an app may hold
 * amounts in it — so a field that holds it still shows it, and a caller's own `options`
 * still decide for themselves.
 */

function open(trigger: HTMLElement) {
  fireEvent.click(trigger);
  return screen.getByRole("listbox");
}

function codes(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole("option")
    .map((o) => /\b([A-Z]{3})\b/.exec(o.textContent ?? "")?.[1] ?? "");
}

describe("CurrencySelect leaves a retired currency out of its list", () => {
  it("offers no BGN by default, and still every other currency", () => {
    render(<CurrencySelect value="EUR" onChange={() => {}} />);
    const shown = codes(open(screen.getByRole("combobox", { name: "Currency: EUR" })));
    expect(shown).not.toContain("BGN");
    expect(shown).toContain("RON");
    expect(shown).toContain("TRY");
  });

  it("finds no BGN by searching for it either", () => {
    render(<CurrencySelect value="EUR" onChange={() => {}} />);
    open(screen.getByRole("combobox", { name: "Currency: EUR" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "lev" } });
    expect(screen.queryByRole("option", { name: /BGN/ })).toBeNull();
    // …where the search itself works: the Romanian leu still answers.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "leu" } });
    expect(screen.getByRole("option", { name: /RON/ })).toBeInTheDocument();
  });

  it("still shows a BGN the field holds: its flag and code, and its row, checked", () => {
    render(<CurrencySelect value="BGN" onChange={() => {}} />);
    const trigger = screen.getByRole("combobox", { name: "Currency: BGN" });
    expect(trigger.querySelector(".fi-bg")).not.toBeNull();
    const list = open(trigger);
    expect(within(list).getByRole("option", { name: /BGN/ })).toHaveAttribute("aria-selected", "true");
  });

  it("offers it when the caller's own options name it", () => {
    render(<CurrencySelect value="EUR" options={["EUR", "BGN"]} onChange={() => {}} />);
    expect(codes(open(screen.getByRole("combobox", { name: "Currency: EUR" })))).toEqual(["EUR", "BGN"]);
  });
});

describe("AmountInput's currency chip does the same (it renders the same list)", () => {
  function chip() {
    return screen.getByRole("button", { name: /^Currency/ });
  }

  it("offers no BGN by default", () => {
    render(<AmountInput label="Amount" value="" onChange={vi.fn()} currency="EUR" onCurrencyChange={vi.fn()} />);
    expect(codes(open(chip()))).not.toContain("BGN");
  });

  it("keeps an amount held in BGN on BGN", () => {
    render(<AmountInput label="Amount" value="12.5" onChange={vi.fn()} currency="BGN" onCurrencyChange={vi.fn()} />);
    expect(chip()).toHaveTextContent("BGN");
    expect(within(open(chip())).getByRole("option", { name: /BGN/ })).toHaveAttribute("aria-selected", "true");
  });
});
