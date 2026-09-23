import { useEffect, useRef, useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FullBleedDialog } from "../full-bleed-dialog";
import { PickerSheet } from "../picker-sheet";
import { Popover } from "../popover";
import { NumberPadSheet } from "../numpad-sheet";

/**
 * Every overlay in this package now does what `Modal` alone used to do.
 *
 * The audit's §a11y finding, in one sentence: *"Only Modal manages focus; every other
 * dialog strands it on the page behind"* — while declaring `aria-modal="true"`, which
 * tells assistive technology to hide that page. So the user's focus sat in the part of
 * the document the screen reader had just been told to stop describing, and Tab walked
 * them through controls nothing would read out.
 *
 * These are written around the three questions a trap actually has to answer — where
 * focus goes on open, where Tab can reach while it is up, and where focus lands when it
 * closes — plus the two overlays that deliberately answer them differently, because a
 * pattern applied without exceptions is how a keyboard becomes a cage.
 *
 * ⚠️ jsdom does not move focus for a Tab keypress; nothing does but a real browser. So
 * containment is asserted the way `use-focus-trap`'s own suite asserts it: put focus on
 * the last control, dispatch the key, and check the trap wrapped it round to the first.
 * The assertion is about the wrap, which is the part this package implements.
 */

/** Focusing a field is a state change for the hosts below, so it has to be committed
 *  before the next line reads the DOM. */
function focus(el: HTMLElement) {
  act(() => {
    el.focus();
  });
}

/** A press on a button, focus included. jsdom's `click` does not focus its target, but
 *  every browser does — and "where was focus when the overlay opened" is exactly what
 *  the restore half of a trap is about, so a click that skips it tests nothing. */
function press(el: HTMLElement) {
  act(() => {
    el.focus();
  });
  fireEvent.click(el);
}

/** jsdom fires popstate in a task, and `useOverlayHistory` pushes one per overlay. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/* ── FullBleedDialog ───────────────────────────────────────────────────────── */

function RowEditor({ onClosed }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        edit row
      </button>
      <FullBleedDialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClosed?.();
        }}
        closeLabel="Close"
        header={<span>Groceries</span>}
      >
        <input aria-label="amount" />
      </FullBleedDialog>
    </div>
  );
}

describe("FullBleedDialog focus", () => {
  it("moves focus into the dialog when it opens", async () => {
    render(<RowEditor />);
    press(screen.getByRole("button", { name: "edit row" }));
    await settle();
    // The dialog itself, not the first field: focusing a field pops the phone's
    // keyboard before the user has asked to type — `Modal`'s rule, and this is the
    // phone's dialog.
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("keeps Tab inside it", async () => {
    render(<RowEditor />);
    press(screen.getByRole("button", { name: "edit row" }));
    await settle();
    const amount = screen.getByLabelText("amount");
    amount.focus();
    fireEvent.keyDown(amount, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const onClosed = vi.fn();
    render(<RowEditor onClosed={onClosed} />);
    press(screen.getByRole("button", { name: "edit row" }));
    await settle();
    fireEvent.keyDown(screen.getByLabelText("amount"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Once. `requestClose` runs an exit animation first, and a second handler firing
    // on the same key would run the caller's state machine twice.
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("gives focus back to the row that opened it", async () => {
    render(<RowEditor />);
    const trigger = screen.getByRole("button", { name: "edit row" });
    press(trigger);
    await settle();
    // Both halves, or the assertion below is satisfied by focus never having gone
    // anywhere — which is precisely the bug.
    expect(trigger).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

/* ── PickerSheet ───────────────────────────────────────────────────────────── */

/**
 * The composition the sheet actually ships in: a combobox field that opens its list
 * **on focus** (`combobox.tsx`, live #200/#309), with the sheet as that list.
 */
function AccountField() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <div>
      <input aria-label="account" onFocus={() => setOpen(true)} />
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Account"
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search"
      >
        <button type="button" onClick={() => setOpen(false)}>
          Wallet
        </button>
      </PickerSheet>
    </div>
  );
}

describe("PickerSheet focus", () => {
  it("still focuses its own search box (live #212)", async () => {
    render(<AccountField />);
    focus(screen.getByLabelText("account"));
    await settle();
    expect(screen.getByPlaceholderText("Search")).toHaveFocus();
  });

  it("keeps Tab inside the sheet", async () => {
    render(<AccountField />);
    focus(screen.getByLabelText("account"));
    await settle();
    const row = screen.getByRole("button", { name: "Wallet" });
    row.focus();
    fireEvent.keyDown(row, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    render(<AccountField />);
    focus(screen.getByLabelText("account"));
    await settle();
    fireEvent.keyDown(screen.getByPlaceholderText("Search"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does NOT hand focus back to the field that opened it", async () => {
    // The deliberate exception, and the reason it is deliberate: this sheet's callers
    // all open it from the field's own `onFocus`, so restoring focus there on close
    // re-opens the sheet the user has just dismissed. Picking a row has to end with the
    // sheet gone and staying gone.
    render(<AccountField />);
    focus(screen.getByLabelText("account"));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Wallet" }));
    await settle();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("account")).not.toHaveFocus();
  });
});

/* ── Popover ───────────────────────────────────────────────────────────────── */

/** A child that takes focus for itself on mount — what `FilterPopover` does with
 *  `autoFocus`, which is the whole point of pressing "Filter". */
function SelfFocusingInput() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return <input ref={ref} aria-label="filter text" />;
}

function FilterColumn({ autoFocusChild = false }: { autoFocusChild?: boolean }) {
  return (
    <div>
      <input aria-label="before" />
      <Popover
        trigger={({ toggle, ref }) => (
          <button type="button" ref={ref} onClick={toggle}>
            Filter
          </button>
        )}
      >
        {(close) => (
          <div>
            {autoFocusChild ? <SelfFocusingInput /> : <input aria-label="filter text" />}
            <button type="button" onClick={close}>
              Clear
            </button>
          </div>
        )}
      </Popover>
      <input aria-label="after" />
    </div>
  );
}

describe("Popover focus", () => {
  it("gives the panel a dialog role", () => {
    render(<FilterColumn />);
    press(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("moves focus into the panel", () => {
    render(<FilterColumn />);
    press(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("keeps Tab inside the panel", () => {
    render(<FilterColumn />);
    press(screen.getByRole("button", { name: "Filter" }));
    const clear = screen.getByRole("button", { name: "Clear" });
    clear.focus();
    fireEvent.keyDown(clear, { key: "Tab" });
    expect(screen.getByLabelText("filter text")).toHaveFocus();
  });

  it("closes on Escape and gives focus back to the trigger", async () => {
    render(<FilterColumn />);
    const trigger = screen.getByRole("button", { name: "Filter" });
    press(trigger);
    expect(trigger).not.toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("leaves a child that has already claimed focus alone", () => {
    render(<FilterColumn autoFocusChild />);
    press(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByLabelText("filter text")).toHaveFocus();
  });
});

/* ── NumberPadSheet ────────────────────────────────────────────────────────── */

/**
 * The host contract, reproduced exactly: the field suppresses the OS keyboard with
 * `inputMode="none"`, renders the pad **while it has focus**, and commits on blur.
 * `showNumpad = isMobile && !disabled && focused` in both `NumberInput` and
 * `AmountInput`.
 */
function AmountField({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <input
        ref={ref}
        aria-label="amount"
        inputMode="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {focused && (
        <NumberPadSheet
          value="12"
          onChange={() => {}}
          onDone={() => {
            ref.current?.blur();
            onDone?.();
          }}
        />
      )}
    </div>
  );
}

describe("NumberPadSheet focus", () => {
  it("leaves focus on the field it is a keyboard for", () => {
    // Not an oversight — a trap here would delete the component it was protecting.
    // Focus moving into the pad blurs the host, the host sets `focused` false, and
    // `showNumpad` goes with it: the pad would unmount itself on mount.
    render(<AmountField />);
    const amount = screen.getByLabelText("amount");
    focus(amount);
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(amount).toHaveFocus();
  });

  it("finishes on Escape, because the Done key is the only way out it has", () => {
    const onDone = vi.fn();
    render(<AmountField onDone={onDone} />);
    focus(screen.getByLabelText("amount"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
