import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AmountInput } from "../amount-input";
import { NumberInput } from "../number-input";
import { NumberPadSheet } from "../numpad-sheet";

/**
 * Every string on the mobile numpad is the HOST's to translate — all of them, from
 * either field that opens it.
 *
 * The package carries no translation catalog (see the README), so the rule is that
 * every user-facing string is a prop with an English default. The numpad broke it
 * twice, in the two ways that rule can break:
 *
 *  - Its most prominent key, the brand-filled primary one, was the literal `Done`
 *    with no key in `NumberPadSheetLabels` at all — while `backspace`, `clear` and
 *    `equals` beside it each took an override. It was the only VISIBLE (non-aria)
 *    string in the package a host could not reach, and it sat among German labels on
 *    a German page.
 *  - `NumberInput` renders the same sheet as {@link AmountInput} — it is documented
 *    as the currency-free counterpart — but passed it no `labels` and declared no
 *    `pad` key to pass, so the identical keypad announced itself in German when a
 *    money field opened it and in English when a goal target did.
 *
 * The last case is the one that would have caught both: the two fields must name the
 * pad identically, because it is the same pad.
 */
const noop = () => {};

const PAD_DE = {
  pad: "Zahlenfeld",
  backspace: "Zurück",
  clear: "Löschen",
  equals: "Gleich",
  done: "Fertig",
};

/** The sheet only exists on a phone, and jsdom's matchMedia is undefined (the
 *  desktop fallback), so the fields never reach their numpad branch otherwise. */
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

describe("NumberPadSheet labels", () => {
  it("lets the host name the Done key", () => {
    render(<NumberPadSheet value="12" onChange={noop} onDone={noop} labels={{ done: "Fertig" }} />);
    expect(screen.getByRole("button", { name: "Fertig" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
  });

  it("keeps the English default when the host does not translate", () => {
    render(<NumberPadSheet value="12" onChange={noop} onDone={noop} />);
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});

describe("the numpad speaks one language from either field", () => {
  beforeEach(asPhone);
  afterEach(() => {
    // @ts-expect-error jsdom leaves it undefined by default; restore that.
    delete window.matchMedia;
  });

  /** Focusing a field on a phone opens its numpad; this is what the pad calls its
   *  own keys once it is up. */
  function padNames(open: () => void): string[] {
    open();
    const pad = screen.getByRole("group");
    return [
      pad.getAttribute("aria-label") ?? "",
      screen.getByRole("button", { name: PAD_DE.backspace }).getAttribute("aria-label") ?? "",
      screen.getByRole("button", { name: PAD_DE.clear }).getAttribute("aria-label") ?? "",
      screen.getByRole("button", { name: PAD_DE.equals }).getAttribute("aria-label") ?? "",
      screen.getByRole("button", { name: PAD_DE.done }).textContent ?? "",
    ];
  }

  it("takes the host's names through AmountInput", () => {
    render(<AmountInput value="12" onChange={noop} ariaLabel="Betrag" labels={{ pad: PAD_DE }} />);
    expect(padNames(() => fireEvent.focus(screen.getByLabelText("Betrag")))).toEqual([
      PAD_DE.pad,
      PAD_DE.backspace,
      PAD_DE.clear,
      PAD_DE.equals,
      PAD_DE.done,
    ]);
  });

  it("takes them through NumberInput too — the same sheet, the same words", () => {
    render(<NumberInput value="12" onChange={noop} ariaLabel="Ziel" labels={{ pad: PAD_DE }} />);
    expect(padNames(() => fireEvent.focus(screen.getByLabelText("Ziel")))).toEqual([
      PAD_DE.pad,
      PAD_DE.backspace,
      PAD_DE.clear,
      PAD_DE.equals,
      PAD_DE.done,
    ]);
  });
});
