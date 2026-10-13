import type { ReactElement, ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AmountInput } from "../amount-input";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { CountrySelect } from "../country-select";
import { CurrencySelect } from "../currency-select";
import { DialogFrame } from "../dialog-frame";
import { EntityCombobox } from "../entity-combobox";
import { FullBleedDialog } from "../full-bleed-dialog";
import { GroupedPicker } from "../grouped-picker";
import { Modal } from "../modal";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { MultiSelect } from "../multi-select";

/**
 * Round 0.34 Wave 0, BUG-1 (sev 4): Escape on an open picker list inside a dialog
 * closed the DIALOG and threw away the form behind the list — kastlan's lease dialog,
 * keksdose's product-merge modal and AmountInput's currency chip in its transaction
 * dialogs.
 *
 * The pickers dismissed through a listener on the document. The dialogs take Escape in
 * their own React `onKeyDown` and stop it there, so the native event never reached the
 * document: the dialog closed and the list stayed open over nothing. The panels now take
 * Escape themselves while their list is open — `preventDefault` + `stopPropagation` and
 * close back to the trigger, as Autocomplete always has — so one press closes the
 * innermost thing on screen, and the next one the dialog.
 *
 * Driven with user-event, which sends the key to whatever really holds focus: the
 * panel's search box, or the field itself for the two editable comboboxes.
 */

const noop = () => {};
const OPTIONS = [
  { value: "a1", label: "Checking" },
  { value: "a2", label: "Savings" },
];

/** jsdom fires popstate in a task, and the lists and dialogs each hold a Back entry:
 *  a close that came in through history would only show after this. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

type Host = (props: { onClose: () => void; children: ReactNode }) => ReactElement;

const HOSTS: [string, Host][] = [
  [
    "Modal",
    ({ onClose, children }) => (
      <Modal onClose={onClose} aria-label="Edit lease">
        {children}
      </Modal>
    ),
  ],
  [
    "DialogFrame",
    ({ onClose, children }) => (
      <DialogFrame onClose={onClose} title="Edit lease">
        {children}
      </DialogFrame>
    ),
  ],
  [
    "FullBleedDialog",
    ({ onClose, children }) => (
      <FullBleedDialog open onClose={onClose} title="Edit lease" closeLabel="Close">
        {children}
      </FullBleedDialog>
    ),
  ],
];

interface PickerCase {
  field: ReactNode;
  /** What opens the list: the trigger, or the editable field itself. */
  trigger: () => HTMLElement;
  /** Where focus sits while the list is up — what the Escape is pressed in. */
  keyboardAt: () => HTMLElement;
  isOpen: () => boolean;
}

/** The search box of whichever panel is open: the one text field that is not part of
 *  the form behind it. */
const searchBox = (placeholder: string | RegExp) => () => screen.getByPlaceholderText(placeholder);
const expanded = (el: () => HTMLElement) => () => el().getAttribute("aria-expanded") === "true";
const listbox = () => screen.queryByRole("listbox") !== null;

const PICKERS: [string, PickerCase][] = [
  [
    "EntityCombobox",
    {
      field: <EntityCombobox<string> label="Account" value={null} onChange={noop} options={OPTIONS} />,
      trigger: () => screen.getByRole("combobox", { name: /Account/ }),
      keyboardAt: searchBox(/Search/),
      isOpen: listbox,
    },
  ],
  [
    "MultiEntityCombobox",
    {
      field: <MultiEntityCombobox<string> label="Accounts" value={[]} onChange={noop} options={OPTIONS} />,
      trigger: () => screen.getByRole("combobox", { name: /Accounts/ }),
      keyboardAt: searchBox(/Search/),
      isOpen: listbox,
    },
  ],
  [
    "CountrySelect",
    {
      field: <CountrySelect label="Country" value={null} onChange={noop} />,
      trigger: () => screen.getByRole("combobox", { name: /Country/ }),
      keyboardAt: searchBox(/Search/),
      isOpen: listbox,
    },
  ],
  [
    "Combobox",
    {
      field: <Combobox label="Payee" value="" onChange={noop} options={["Rewe", "Migros"]} />,
      trigger: () => screen.getByRole("combobox", { name: "Payee" }),
      keyboardAt: () => screen.getByRole("combobox", { name: "Payee" }),
      isOpen: listbox,
    },
  ],
  [
    "InlineEntityCombobox",
    {
      field: <InlineEntityCombobox<string> label="Account" value={null} onChange={noop} options={OPTIONS} />,
      trigger: () => screen.getByRole("combobox", { name: "Account" }),
      keyboardAt: () => screen.getByRole("combobox", { name: "Account" }),
      isOpen: listbox,
    },
  ],
  [
    "MultiSelect",
    {
      field: (
        <MultiSelect
          label="Tags"
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          value={[]}
          onChange={noop}
        />
      ),
      trigger: () => screen.getByRole("combobox", { name: /Tags/ }),
      keyboardAt: searchBox(/Search/),
      isOpen: listbox,
    },
  ],
  [
    "CurrencySelect",
    {
      field: <CurrencySelect label="Currency" value="EUR" onChange={noop} />,
      trigger: () => screen.getByRole("combobox", { name: /Currency/ }),
      keyboardAt: searchBox(/Search/),
      isOpen: expanded(() => screen.getByRole("combobox", { name: /Currency/ })),
    },
  ],
  [
    "GroupedPicker",
    {
      field: (
        <GroupedPicker
          aria-label="Category"
          buttonLabel="Pick a category"
          groups={[{ key: "food", label: "Food", items: [{ key: "bread", label: "Bread" }] }]}
          selected={null}
          onSelect={noop}
          filterPlaceholder="Filter"
        />
      ),
      trigger: () => screen.getByRole("combobox", { name: "Category" }),
      keyboardAt: searchBox("Filter"),
      isOpen: expanded(() => screen.getByRole("combobox", { name: "Category" })),
    },
  ],
  [
    "AmountInput's currency chip",
    {
      field: <AmountInput label="Amount" value="" onChange={noop} currency="EUR" onCurrencyChange={noop} />,
      trigger: () => screen.getByRole("button", { name: /^Currency/ }),
      keyboardAt: searchBox(/Search/),
      // The chip says nothing about its list; the list's own search box is the tell.
      isOpen: () => screen.queryByPlaceholderText(/Search/) !== null,
    },
  ],
];

const CASES = HOSTS.flatMap(([host, Host]) =>
  PICKERS.map(([picker, c]) => [picker, host, Host, c] as const),
);

describe("Escape on an open picker list inside a dialog (BUG-1)", () => {
  it.each(CASES)("%s in a %s: the first Escape closes the list, the second the dialog", async (_p, _h, Host, c) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Host onClose={onClose}>{c.field}</Host>);

    await user.click(c.trigger());
    expect(c.isOpen()).toBe(true);
    // The panels move focus into their search box a frame after opening.
    await waitFor(() => expect(c.keyboardAt()).toHaveFocus());

    await user.keyboard("{Escape}");
    await settle();
    expect(c.isOpen()).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    // Back where the list was opened from — inside the dialog, so the next press
    // reaches it.
    expect(c.trigger()).toHaveFocus();

    await user.keyboard("{Escape}");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Three of the lists had rows that were tab stops, so focus could be on a ROW when the
  // key came. On the shared panel (round 0.34 Wave 2, DUP-4) they are options that focus
  // never reaches by Tab, but a script still can — and the panel takes the key there too,
  // not only in the search box.
  const ROW_CASES: [string, string, (c: PickerCase) => HTMLElement][] = [
    ["CurrencySelect", "Modal", () => screen.getByRole("option", { name: /CHF/ })],
    ["GroupedPicker", "FullBleedDialog", () => screen.getByRole("option", { name: "Bread" })],
    ["AmountInput's currency chip", "DialogFrame", () => screen.getByRole("option", { name: /CHF/ })],
  ];
  it.each(ROW_CASES)("%s in a %s: Escape on a row closes only the list", async (picker, host, row) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const c = PICKERS.find(([name]) => name === picker)![1];
    const Host = HOSTS.find(([name]) => name === host)![1];
    render(<Host onClose={onClose}>{c.field}</Host>);

    await user.click(c.trigger());
    await waitFor(() => expect(c.keyboardAt()).toHaveFocus());
    act(() => row(c).focus());

    await user.keyboard("{Escape}");
    await settle();
    expect(c.isOpen()).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(c.trigger()).toHaveFocus();
  });
});
