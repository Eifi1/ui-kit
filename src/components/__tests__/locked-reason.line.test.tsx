import type { ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "../input";
import { Select } from "../select";
import { AmountInput } from "../amount-input";
import { MoneyField } from "../money-field";
import { NumberInput } from "../number-input";
import { NumberField } from "../number-field";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { Autocomplete } from "../autocomplete";
import { CountrySelect } from "../country-select";
import { CurrencySelect } from "../currency-select";
import { List, ListItem } from "../list";
import { WriteLockProvider } from "../write-lock";
import type { DisabledReasonDisplay } from "../field-parts";
import { applyTextSize } from "../../theme/text-size";
import { DESKTOP_WIDTH, viewportMatchMedia } from "../../test/viewport";

/**
 * DUP-3 (refactor audit 2026-10): the kit drew "a locked control and its reason" in
 * three copies — Button's `ReasonFrame`, Chip's `ChipReasonFrame` and the fields'
 * `LockedReason` — and only the first two asked `useDisabledReasonLine`. So on a touch
 * screen or at Large a field locked through `commit` (0.34's C2) kept its reason in a
 * tooltip, while the form's Save beside it showed the same reason as a line
 * (docs/text-size-harmonization.md §4 "No fact only in a tooltip"). One frame now, and
 * every field takes Button's `disabledReasonDisplay`.
 */

const REASON = "Shared with you to read";

const OPTIONS = [
  { value: "a1", label: "Example Ltd" },
  { value: "a2", label: "Sample Cash" },
];
const noop = () => {};

type Lock = { commit: true; disabledReasonDisplay?: DisabledReasonDisplay };

// Each field locked through `commit`, and its control's role and name.
const FIELDS: Array<[string, (lock: Lock) => ReactElement, string, string]> = [
  ["Input", (l) => <Input label="Name" value="Ramp up" onChange={noop} {...l} />, "textbox", "Name"],
  [
    "Select",
    (l) => (
      <Select label="Role" value="a" onChange={noop} {...l}>
        <option value="a">Admin</option>
      </Select>
    ),
    "combobox",
    "Role",
  ],
  ["NumberInput", (l) => <NumberInput label="Rooms" value="3" onChange={noop} {...l} />, "textbox", "Rooms"],
  ["NumberField", (l) => <NumberField label="Rooms" value={3} onCommit={noop} {...l} />, "textbox", "Rooms"],
  ["AmountInput", (l) => <AmountInput label="Rent" currency="CHF" value="1200" onChange={noop} {...l} />, "textbox", "Rent"],
  ["MoneyField", (l) => <MoneyField label="Rent" currency="CHF" value={1200} onCommit={noop} {...l} />, "textbox", "Rent"],
  ["Combobox", (l) => <Combobox label="Payee" value="Example Ltd" onChange={noop} options={["Example Ltd"]} {...l} />, "combobox", "Payee"],
  [
    "InlineEntityCombobox",
    (l) => <InlineEntityCombobox<string> label="Account" value="a1" onChange={noop} options={OPTIONS} {...l} />,
    "combobox",
    "Account",
  ],
  [
    "EntityCombobox",
    (l) => <EntityCombobox<string> label="Account" value="a1" onChange={noop} options={OPTIONS} {...l} />,
    "combobox",
    "Account",
  ],
  [
    "MultiEntityCombobox",
    (l) => <MultiEntityCombobox<string> label="Accounts" value={["a1"]} onChange={noop} options={OPTIONS} {...l} />,
    "combobox",
    "Accounts",
  ],
  [
    "Autocomplete",
    (l) => <Autocomplete<string> label="Address" value="Example" onChange={noop} options={OPTIONS} {...l} />,
    "combobox",
    "Address",
  ],
  ["CountrySelect", (l) => <CountrySelect label="Country" value="CH" onChange={noop} {...l} />, "combobox", "Country"],
  ["CurrencySelect", (l) => <CurrencySelect label="Currency" value="CHF" onChange={noop} {...l} />, "combobox", "Currency"],
  [
    "ListItem",
    (l) => (
      <List>
        <ListItem title="Mark all read" onClick={noop} {...l} />
      </List>
    ),
    "button",
    "Mark all read",
  ],
];

/** A `matchMedia` whose pointer is a finger when `coarse`; nothing else matches. */
function media({ coarse }: { coarse: boolean }) {
  vi.stubGlobal("matchMedia", viewportMatchMedia(DESKTOP_WIDTH, { coarse }));
}

function locked(field: ReactElement) {
  return (
    <WriteLockProvider locked reason={REASON}>
      {field}
    </WriteLockProvider>
  );
}

/** The control, by role and the start of its name ("Country: Switzerland"). */
const control = (role: string, name: string) => screen.getByRole(role, { name: new RegExp(`^${name}`) });

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

describe.each(FIELDS)("%s locked through commit (DUP-3)", (_, field, role, name) => {
  it("on a touch screen shows the reason as a line under the field, and the line describes it", () => {
    media({ coarse: true });
    render(locked(field({ commit: true })));
    // One copy, on screen: no hidden twin and no bubble repeating it.
    const line = screen.getByText(REASON);
    expect(line).toBeVisible();
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    const el = control(role, name);
    expect(line.closest("[data-slot=disabled-reason]")).toContainElement(el);
    expect(el.getAttribute("aria-describedby")?.split(" ")).toContain(line.id);
  });

  it("at Large with a mouse it is the line too", () => {
    media({ coarse: false });
    act(() => applyTextSize("large"));
    render(locked(field({ commit: true })));
    expect(screen.getByText(REASON).closest("[data-slot=disabled-reason]")).toContainElement(control(role, name));
  });

  it("at Normal with a mouse it stays the tooltip, with a hidden copy as the description", () => {
    media({ coarse: false });
    render(locked(field({ commit: true })));
    expect(document.querySelector("[data-slot=disabled-reason]")).toBeNull();
    expect(control(role, name)).toHaveAccessibleDescription(new RegExp(REASON));
  });

  it("disabledReasonDisplay='tooltip' keeps the bubble on a touch screen", () => {
    media({ coarse: true });
    render(locked(field({ commit: true, disabledReasonDisplay: "tooltip" })));
    expect(document.querySelector("[data-slot=disabled-reason]")).toBeNull();
    expect(control(role, name)).toHaveAccessibleDescription(new RegExp(REASON));
  });
});
