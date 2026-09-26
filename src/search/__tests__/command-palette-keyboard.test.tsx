import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CommandPalette, useCommandKey, type CommandItem } from "../command-palette";

/**
 * The palette, driven by the keyboard only — which is the only way anyone drives it.
 *
 * A ⌘K palette is a keyboard feature end to end: the shortcut opens it, the arrows
 * move the highlight, ↵ runs the highlighted row and Escape gets out. Every one of
 * those was written and none was ever pressed in a test — the existing suite drives
 * the SEARCH side (the revision signal, the debounce) and clicks nothing, so the
 * whole interaction model rested on `role`/`aria-*` attributes being spelled right.
 *
 * Driven with `user-event` rather than `fireEvent`: a palette is exactly the place
 * where the difference shows. `user-event` dispatches keydown/keypress/keyup at the
 * element that actually has focus, so "Enter fires the ACTIVE row" is a real claim
 * about where focus ended up, whereas `fireEvent.keyDown(input, …)` asserts that the
 * handler works when called and says nothing about whether the user can reach it.
 */
const ITEMS: CommandItem[] = [
  { id: "a", label: "Accounts", group: "Pages", onSelect: () => {} },
  { id: "b", label: "Budget", group: "Pages", onSelect: () => {} },
  { id: "c", label: "New transaction", group: "Actions", onSelect: () => {} },
];

/** The real wiring: the app owns `open`, the hook owns the shortcut. */
function Harness({ items = ITEMS }: { items?: CommandItem[] }) {
  const [open, setOpen] = useState(false);
  useCommandKey(() => setOpen(true));
  return (
    <>
      <button type="button">elsewhere</button>
      <CommandPalette open={open} onClose={() => setOpen(false)} search={() => items} />
    </>
  );
}

/**
 * jsdom has no layout and therefore no `Element.prototype.scrollIntoView`. The palette
 * keeps the active row in view by calling it on every highlight move, and it used to
 * call it unguarded — so in EVERY consumer's test suite the first arrow key threw
 * (kastlan stubbed it in its setup). It is now optional-called like combobox-core's,
 * and this file deliberately runs WITHOUT a stub: every key press below proves it.
 */

/** The row the field says the keyboard is on, resolved the way a screen reader
 *  resolves it: through `aria-activedescendant`, not through a class. */
function activeRow(): HTMLElement | null {
  const id = screen.getByRole("combobox").getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
}

/**
 * Open the palette and wait until the caret is in its field. The palette focuses its
 * field from the focus trap's effect, after the portal mounts (it used to be a rAF),
 * so a key pressed before that lands on <body> — which
 * made every test below a race that a slow run lost ("Enter did nothing", "Escape
 * did not close"). Waiting for the rows alone was never the same thing.
 */
async function openPalette(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard("{Control>}k{/Control}");
  const field = await screen.findByRole("combobox");
  await waitFor(() => expect(field).toHaveFocus());
}

describe("the command palette's keyboard", () => {
  it("opens on ⌘K/Ctrl-K and puts the caret in the search box", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    const field = await screen.findByRole("combobox");
    // Focus lands after the portal is in the document (the focus trap's effect), which
    // is the reason this is awaited rather than asserted.
    await waitFor(() => expect(field).toHaveFocus());
  });

  it("moves the active row with the arrows, without moving focus off the field", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openPalette(user);
    await screen.findByText("Accounts");

    // The first row is active on open, so there is always something ↵ means.
    expect(activeRow()).toHaveTextContent("Accounts");

    await user.keyboard("{ArrowDown}");
    expect(activeRow()).toHaveTextContent("Budget");

    // Down again crosses a GROUP heading: navigation runs over the flattened list,
    // so a heading is not a row the highlight can get stuck on.
    await user.keyboard("{ArrowDown}");
    expect(activeRow()).toHaveTextContent("New transaction");

    // Focus never leaves the input — that is what `aria-activedescendant` is for,
    // and it is why typing keeps working while the highlight is three rows down.
    expect(screen.getByRole("combobox")).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(activeRow()).toHaveTextContent("Budget");
  });

  it("stops at the ends instead of wrapping", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openPalette(user);
    await screen.findByText("Accounts");

    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(activeRow()).toHaveTextContent("Accounts");

    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(activeRow()).toHaveTextContent("New transaction");
  });

  it("runs the active row on Enter — that row, and only that one", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const wrong = vi.fn();
    render(
      <Harness
        items={[
          { id: "a", label: "Accounts", group: "Pages", onSelect: wrong },
          { id: "b", label: "Budget", group: "Pages", onSelect },
        ]}
      />,
    );
    await openPalette(user);
    await screen.findByText("Accounts");

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(wrong).not.toHaveBeenCalled();
    // And it closes on the way out: a palette still on screen over the page it just
    // navigated to is the bug this pins.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does nothing on Enter when the search found nothing", async () => {
    const user = userEvent.setup();
    render(<Harness items={[]} />);
    await openPalette(user);
    await screen.findByText("No results");

    await user.keyboard("{Enter}");
    // Still open: there was nothing to run, so nothing happened. The failure mode
    // worth pinning is the other one — closing on an Enter that did nothing.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openPalette(user);
    await screen.findByText("Accounts");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("types into the field rather than triggering the shortcut again", async () => {
    // The global ⌘K listener sits on `document` and stays there while the palette is
    // open. A plain "k" must reach the input.
    const user = userEvent.setup();
    render(<Harness />);
    await openPalette(user);

    await user.keyboard("bank");
    expect(screen.getByRole("combobox")).toHaveValue("bank");
  });
});

