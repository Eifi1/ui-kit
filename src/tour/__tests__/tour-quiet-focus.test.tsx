import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, type TourStep } from "../tour";
import { Combobox, InlineEntityCombobox } from "../../components/combobox";
import { Autocomplete } from "../../components/autocomplete";
import { focusQuietly } from "../../lib/quiet-focus";

// The overlay is its own chunk since 0.52 (refactor audit 2026-10-30, MOD-1): loaded once
// up front, as an app's bundle has it by the time a tour starts; React.lazy still resolves
// it a render after the start, which the waits below cover.
beforeAll(async () => {
  await import("../tour-overlay");
});

/**
 * 0.50.1 (keksdose B1): on a fine pointer the tour focuses a field step's first control on
 * arrival (§11.8). A picker that opens on focus opened its list then, and the list, a later
 * layer (§11.6), covered the card. The tour's focus is quiet now: the field is focused and
 * described by the card's body, and the list stays closed until the person opens it.
 */

const OPTIONS = [
  { value: "a1", label: "Checking" },
  { value: "a2", label: "Savings" },
];

function Account() {
  const [value, setValue] = useState<string | null>(null);
  useTourGate("form.account", value !== null);
  return (
    <div data-tour="account">
      <InlineEntityCombobox<string> label="Account" value={value} onChange={setValue} options={OPTIONS} />
    </div>
  );
}

function Launcher({ steps }: { steps: TourStep[] }) {
  const tour = useTour();
  return (
    <button type="button" onClick={() => tour.start(steps)}>
      Take the tour
    </button>
  );
}

const box = {
  top: 300,
  left: 400,
  width: 200,
  height: 40,
  right: 600,
  bottom: 340,
  x: 400,
  y: 300,
};
let rectSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  const original = Element.prototype.getBoundingClientRect;
  rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.getAttribute("data-tour") === "account") return { ...box, toJSON: () => box } as DOMRect;
    return original.call(this);
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  rectSpy.mockRestore();
  vi.restoreAllMocks();
});

const STEP: TourStep = {
  title: "Account",
  body: "Pick the account it was paid from.",
  target: '[data-tour="account"]',
  gate: "form.account",
};
const END: TourStep = { title: "Done", body: "All set." };

const field = (name: string) => screen.getByRole("combobox", { name });
const listbox = () => screen.queryByRole("listbox");

describe("Tour arrival on a picker field (0.50.1)", () => {
  it("focuses the InlineEntityCombobox, describes it by the card, and leaves its list closed", async () => {
    render(
      <TourProvider>
        <Launcher steps={[STEP, END]} />
        <Account />
      </TourProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    // The overlay is a chunk of its own (MOD-1): the card is there a render later.
    await screen.findByRole("dialog");
    await act(async () => {
      await Promise.resolve();
    });

    const input = field("Account");
    expect(input).toHaveFocus();
    expect(listbox()).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAccessibleDescription(/Pick the account it was paid from\./);
    // The card is not covered: its Next is there to be pressed.
    expect(screen.getByRole("button", { name: /^(Next|Done)$/ })).toBeInTheDocument();

    // The person opens it as usual: ArrowDown …
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(listbox()).toBeInTheDocument();
  });

  it("a click on the quietly focused field opens its list", async () => {
    render(
      <TourProvider>
        <Launcher steps={[STEP, END]} />
        <Account />
      </TourProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    // The overlay is a chunk of its own (MOD-1): the card is there a render later.
    await screen.findByRole("dialog");
    await act(async () => {
      await Promise.resolve();
    });
    expect(listbox()).not.toBeInTheDocument();
    fireEvent.click(field("Account"));
    expect(listbox()).toBeInTheDocument();
  });
});

describe("focusQuietly", () => {
  it("InlineEntityCombobox: quiet focus stays closed, the person's own focus opens", () => {
    render(<InlineEntityCombobox<string> label="Account" value={null} onChange={() => {}} options={OPTIONS} />);
    act(() => focusQuietly(field("Account")));
    expect(field("Account")).toHaveFocus();
    expect(listbox()).not.toBeInTheDocument();
    act(() => field("Account").blur());
    act(() => field("Account").focus());
    expect(listbox()).toBeInTheDocument();
  });

  it("Combobox: quiet focus stays closed, the person's own focus opens", () => {
    render(<Combobox label="Payee" value="" onChange={() => {}} options={["Bakery", "Butcher"]} />);
    act(() => focusQuietly(field("Payee")));
    expect(field("Payee")).toHaveFocus();
    expect(listbox()).not.toBeInTheDocument();
    fireEvent.click(field("Payee"));
    expect(listbox()).toBeInTheDocument();
  });

  it("Autocomplete: quiet focus looks nothing up, the person's own focus does", () => {
    const onFocus = vi.fn();
    render(
      <Autocomplete<string>
        label="Address"
        value="Ma"
        onChange={() => {}}
        onFocus={onFocus}
        options={[{ value: "m", label: "Main Street" }]}
      />,
    );
    act(() => focusQuietly(field("Address")));
    expect(field("Address")).toHaveFocus();
    // The caller's own onFocus still hears it.
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(listbox()).not.toBeInTheDocument();
    fireEvent.click(field("Address"));
    expect(listbox()).toBeInTheDocument();

    act(() => field("Address").blur());
    expect(listbox()).not.toBeInTheDocument();
    act(() => field("Address").focus());
    expect(listbox()).toBeInTheDocument();
  });

  it("marks only the focus it makes", () => {
    render(<InlineEntityCombobox<string> label="Account" value={null} onChange={() => {}} options={OPTIONS} />);
    const other = document.createElement("button");
    document.body.appendChild(other);
    act(() => focusQuietly(other));
    act(() => field("Account").focus());
    expect(listbox()).toBeInTheDocument();
    other.remove();
  });
});
