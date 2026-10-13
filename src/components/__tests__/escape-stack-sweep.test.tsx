import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Autocomplete } from "../autocomplete";
import { ChipInput } from "../chip-input";
import { DatePicker } from "../date-picker";
import { EntityCombobox } from "../entity-combobox";
import { FullBleedDialog } from "../full-bleed-dialog";
import { HoverMenu } from "../hover-menu";
import { InlineEditField } from "../inline-edit-field";
import { Modal } from "../modal";
import { NumberPadSheet } from "../numpad-sheet";
import { Popover } from "../popover";
import { Tooltip } from "../tooltip";
import { CommandPalette } from "../../search/command-palette";
import { stubPhone } from "../../test/viewport";

/**
 * Round 0.34 Wave 2, DUP-1: one Escape stack. Every kit overlay and picker is a layer
 * while it is open; Escape closes the topmost one, and only that one, wherever focus
 * is. Swept across both dialogs, and nested (a picker in a Popover in a Modal), so a
 * new overlay that forgets to register shows up here.
 *
 * Wave 0's `picker-escape-in-dialog.test.tsx` holds the nine pickers × three hosts; this
 * holds the rest — the overlays that dismissed through a document listener a dialog
 * never let the key reach (HoverMenu, the numpad, a tooltip), the ones that closed
 * without stopping it (CommandPalette), and the ONE claim rule the two dialogs used to
 * read differently (a ChipInput's draft kept a Modal open and closed a FullBleedDialog).
 */

const noop = () => {};

/** jsdom fires popstate in a task, and the overlays hold Back entries: a close that came
 *  through history would only show after this. */
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
    "FullBleedDialog",
    ({ onClose, children }) => (
      <FullBleedDialog open onClose={onClose} title="Edit lease" closeLabel="Close">
        {children}
      </FullBleedDialog>
    ),
  ],
];

interface OverlayCase {
  field: ReactNode;
  /** Opens the overlay the way a user would. */
  open: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
  isOpen: () => boolean;
}

/** A host component for the numpad: the field keeps focus, the pad shows while it does,
 *  and Done (or Escape) puts the pad away — `AmountInput`'s contract with it. */
function PadField() {
  const [pad, setPad] = useState(false);
  return (
    <>
      <input aria-label="Amount" onFocus={() => setPad(true)} />
      {pad && <NumberPadSheet value="12" onChange={noop} onDone={() => setPad(false)} />}
    </>
  );
}

/** A palette opened from inside the dialog, as an app's "jump to…" button would. */
function PaletteButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Jump to
      </button>
      <CommandPalette open={open} onClose={() => setOpen(false)} search={() => []} />
    </>
  );
}

const OVERLAYS: [string, OverlayCase][] = [
  [
    "Popover",
    {
      field: (
        <Popover
          labels={{ panel: "Filter panel" }}
          trigger={({ toggle, ref }) => (
            <button type="button" ref={ref} onClick={toggle}>
              Filter
            </button>
          )}
        >
          {() => <input aria-label="Contains" />}
        </Popover>
      ),
      open: async (user) => {
        await user.click(screen.getByRole("button", { name: "Filter" }));
      },
      isOpen: () => screen.queryByRole("dialog", { name: "Filter panel" }) !== null,
    },
  ],
  [
    "DatePicker",
    {
      field: <DatePicker value="2026-10-03" onChange={noop} locale="en-GB" label="Due date" />,
      open: async (user) => {
        await user.click(screen.getByRole("combobox", { name: /^Due date/ }));
      },
      isOpen: () => screen.queryByRole("grid") !== null,
    },
  ],
  [
    "Autocomplete",
    {
      field: (
        <Autocomplete<string>
          label="Address"
          value="Example"
          onChange={noop}
          options={[
            { value: "1", label: "Example Street 1" },
            { value: "2", label: "Example Street 12" },
          ]}
        />
      ),
      open: async (user) => {
        await user.click(screen.getByRole("combobox", { name: "Address" }));
        await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
      },
      isOpen: () => screen.queryByRole("listbox") !== null,
    },
  ],
  [
    "HoverMenu (opened by keyboard)",
    {
      field: (
        <HoverMenu
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle}>
              More
            </button>
          )}
        >
          {(close) => (
            <ul>
              <li>
                <button type="button" onClick={close}>
                  Archive
                </button>
              </li>
            </ul>
          )}
        </HoverMenu>
      ),
      open: async (user) => {
        act(() => screen.getByRole("button", { name: "More" }).focus());
        await user.keyboard("{ArrowDown}");
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus());
      },
      isOpen: () => screen.queryByRole("menu") !== null,
    },
  ],
  [
    "the numpad over its field",
    {
      field: <PadField />,
      open: async (user) => {
        await user.click(screen.getByRole("textbox", { name: "Amount" }));
      },
      isOpen: () => screen.queryByRole("group") !== null,
    },
  ],
  [
    "a tooltip shown by focus",
    {
      field: (
        <Tooltip label="Archive this lease" portal>
          <button type="button">Archive</button>
        </Tooltip>
      ),
      open: async () => {
        act(() => screen.getByRole("button", { name: "Archive" }).focus());
        await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
      },
      isOpen: () => screen.queryByRole("tooltip") !== null,
    },
  ],
  [
    "CommandPalette",
    {
      field: <PaletteButton />,
      open: async (user) => {
        await user.click(screen.getByRole("button", { name: "Jump to" }));
      },
      isOpen: () => screen.queryByRole("dialog", { name: "Search" }) !== null,
    },
  ],
];

const CASES = HOSTS.flatMap(([host, Host]) => OVERLAYS.map(([name, c]) => [name, host, Host, c] as const));

describe("Escape closes the topmost layer only (DUP-1)", () => {
  it.each(CASES)("%s in a %s: the first Escape closes it, the second the dialog", async (_o, _h, Host, c) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Host onClose={onClose}>{c.field}</Host>);

    await c.open(user);
    expect(c.isOpen()).toBe(true);

    await user.keyboard("{Escape}");
    await settle();
    expect(c.isOpen()).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("the phone picker sheet in a dialog (DUP-1)", () => {
  beforeEach(() => {
    // The phone layout, and no motion: a dialog lowers itself before it reports the
    // close otherwise.
    stubPhone({ reducedMotion: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(HOSTS)("EntityCombobox's sheet in a %s: the sheet first, then the dialog", async (_h, Host) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Host onClose={onClose}>
        <EntityCombobox<string>
          label="Account"
          value={null}
          onChange={noop}
          options={[
            { value: "a1", label: "Checking" },
            { value: "a2", label: "Savings" },
          ]}
        />
      </Host>,
    );
    await user.click(screen.getByRole("combobox", { name: /Account/ }));
    const sheet = await screen.findByRole("dialog", { name: "Account" });
    await waitFor(() => expect(within(sheet).getByRole("textbox")).toHaveFocus());

    await user.keyboard("{Escape}");
    await settle();
    expect(screen.queryByRole("dialog", { name: "Account" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    // The sheet hands focus back to nobody (its `restoreFocus` is off): the next press
    // comes from the page, and the stack still knows the dialog is on top.
    await user.keyboard("{Escape}");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("nested layers unwind one press at a time (DUP-1)", () => {
  it.each(HOSTS)("a picker in a Popover in a %s: list, then popover, then dialog", async (_h, Host) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Host onClose={onClose}>
        <Popover
          labels={{ panel: "Filter panel" }}
          trigger={({ toggle, ref }) => (
            <button type="button" ref={ref} onClick={toggle}>
              Filter
            </button>
          )}
        >
          {() => (
            <EntityCombobox<string>
              label="Account"
              value={null}
              onChange={noop}
              options={[
                { value: "a1", label: "Checking" },
                { value: "a2", label: "Savings" },
              ]}
            />
          )}
        </Popover>
      </Host>,
    );
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const panel = screen.getByRole("dialog", { name: "Filter panel" });
    await user.click(within(panel).getByRole("combobox", { name: /Account/ }));
    await waitFor(() => expect(screen.getByPlaceholderText(/Search/)).toHaveFocus());

    await user.keyboard("{Escape}");
    await settle();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Filter panel" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    await settle();
    expect(screen.queryByRole("dialog", { name: "Filter panel" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("one claim rule, the same in both dialogs (DUP-1)", () => {
  it.each(HOSTS)("ChipInput's draft in a %s: Escape clears it and the dialog stays", async (_h, Host) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Host onClose={onClose}>
        <ChipInput label="Tags" value={[]} onChange={noop} />
      </Host>,
    );
    await user.click(screen.getByRole("textbox", { name: "Tags" }));
    await user.keyboard("urgent{Escape}");
    await settle();
    expect(screen.getByRole("textbox", { name: "Tags" })).toHaveValue("");
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(HOSTS)("InlineEditField in a %s: Escape cancels the edit, the dialog stays", async (_h, Host) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Host onClose={onClose}>
        <InlineEditField label="Budget name" value="Household" onCommit={noop} />
      </Host>,
    );
    await user.click(screen.getByRole("button", { name: "Household" }));
    await user.keyboard("Holiday{Escape}");
    await settle();
    expect(screen.queryByRole("textbox", { name: "Budget name" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each(HOSTS)("the date picker's month grid in a %s: Escape goes back to the days", async (_h, Host) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Host onClose={onClose}>
        <DatePicker value="2026-10-03" onChange={noop} locale="en-GB" label="Due date" monthJump />
      </Host>,
    );
    await user.click(screen.getByRole("combobox", { name: /^Due date/ }));
    const grid = () => screen.getByRole("grid");
    const panel = grid().closest("[role=dialog]") as HTMLElement;
    await user.click(within(panel).getByRole("button", { expanded: false }));
    expect(grid()).toHaveAccessibleName("2026");
    act(() => within(grid()).getByRole("gridcell", { name: "October 2026" }).focus());

    await user.keyboard("{Escape}");
    await settle();
    expect(grid()).toHaveAccessibleName("October 2026");
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each(HOSTS)("a descendant's bare preventDefault does NOT keep a %s open", async (_h, Host) => {
    // What a search box does to stop Chromium clearing a type=search input. In 0.8.0 it
    // silently held FullBleedDialog open (keksdose), and it held a Modal open until now.
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Host onClose={onClose}>
        <input
          aria-label="Search"
          onKeyDown={(e) => {
            if (e.key === "Escape") e.preventDefault();
          }}
        />
      </Host>,
    );
    await user.click(screen.getByRole("textbox", { name: "Search" }));
    await user.keyboard("{Escape}");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("the layer owner's own handler still claims (DUP-1)", () => {
  // Kurvenschmiede's gear wizard and the kit's busy reauth dialog hold the dialog open
  // from its `onKeyDown`; that stays the owner's to decide.
  it.each([
    [
      "Modal",
      (onClose: () => void) => (
        <Modal onClose={onClose} aria-label="Busy" onKeyDown={(e) => e.key === "Escape" && e.preventDefault()}>
          <input aria-label="Name" />
        </Modal>
      ),
    ],
    [
      "FullBleedDialog",
      (onClose: () => void) => (
        <FullBleedDialog
          open
          onClose={onClose}
          title="Busy"
          closeLabel="Close"
          onKeyDown={(e) => e.key === "Escape" && e.preventDefault()}
        >
          <input aria-label="Name" />
        </FullBleedDialog>
      ),
    ],
  ])("%s: a preventDefault in its onKeyDown keeps it open", async (_h, ui) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(ui(onClose));
    await user.click(screen.getByRole("textbox", { name: "Name" }));
    await user.keyboard("{Escape}");
    await settle();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("an Escape with focus in no layer (DUP-1)", () => {
  it("reaches the topmost layer from the page, and only it", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} aria-label="Edit lease">
        <PadField />
      </Modal>,
    );
    await user.click(screen.getByRole("textbox", { name: "Amount" }));
    expect(screen.getByRole("group")).toBeInTheDocument();
    // Focus out of every layer: the key is pressed on <body>.
    act(() => (document.activeElement as HTMLElement).blur());
    await user.keyboard("{Escape}");
    await settle();
    expect(screen.queryByRole("group")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
