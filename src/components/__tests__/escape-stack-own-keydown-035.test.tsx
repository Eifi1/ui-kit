import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DropdownPanel, DropdownSearchHeader, useDropdown, useDropdownSearch } from "../dropdown";
import { HoverMenu } from "../hover-menu";
import { Popover } from "../popover";
import { Tooltip } from "../tooltip";

/**
 * Round 0.35 R2: the top-layer rule for the overlays' OWN `onKeyDown`, as 0.35 gave it
 * to Modal and FullBleedDialog first (b477f4a, `escape-stack-sweep.test.tsx`). A caller's
 * handler on a Popover, a HoverMenu, a DropdownPanel or a DropdownSearchHeader ran
 * before the stack was asked — so with a tooltip or a menu open over the overlay, a
 * handler that holds Escape ("clear the query first", "ask first") took the press, and
 * the layer on top stayed up. Now the layer on top takes it; the next press is the
 * overlay's, and its handler's `preventDefault()` still holds the overlay open.
 */

type OwnKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => void;

/** A label's "?" with its bubble: the layer that opens over the overlay. */
function Hint() {
  return (
    <Tooltip label="What this does" portal>
      <button type="button">?</button>
    </Tooltip>
  );
}

/** Shows the hint's bubble by focusing the "?" (the keyboard's way, and a script's). */
async function focusHint() {
  act(() => screen.getByRole("button", { name: "?" }).focus());
  await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
}

const tooltipUp = () => screen.queryByRole("tooltip") !== null;

/** `useDropdown` + `DropdownPanel`, as the showcase builds one: the caller's handler on
 *  the panel, `panelRef` handed through as the docs ask. */
function ListOwner({ onKeyDown }: { onKeyDown: OwnKeyDown }) {
  const { open, setOpen, wrapperRef, panelRef, triggerRef } = useDropdown();
  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" ref={triggerRef} onClick={() => setOpen((o) => !o)}>
        Sort
      </button>
      {open && (
        <DropdownPanel panelRef={panelRef} data-testid="list" onKeyDown={onKeyDown}>
          <li>
            <Hint />
          </li>
        </DropdownPanel>
      )}
    </div>
  );
}

/** `useDropdownSearch` + `DropdownSearchHeader`: the caller's handler on the search box,
 *  where focus is while the list is up. */
function SearchOwner({ onKeyDown }: { onKeyDown: OwnKeyDown }) {
  const { open, setOpen, wrapperRef, panelRef, query, setQuery, inputRef } = useDropdownSearch();
  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}>
        Store
      </button>
      {open && (
        <DropdownPanel
          panelRef={panelRef}
          data-testid="list"
          header={
            <DropdownSearchHeader
              query={query}
              onQueryChange={setQuery}
              inputRef={inputRef}
              aria-label="Search stores"
              onKeyDown={onKeyDown}
            />
          }
        >
          <li>
            <Hint />
          </li>
        </DropdownPanel>
      )}
    </div>
  );
}

interface OwnerCase {
  /** The overlay, closed, with the caller's handler. */
  ui: (onKeyDown: OwnKeyDown) => ReactElement;
  /** Opens the overlay and then the layer over it; focus ends inside the overlay. */
  open: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
  /** Whether the layer over the overlay is still up. */
  layerUp: () => boolean;
  isOpen: () => boolean;
}

const popoverPanel = () => screen.queryByRole("dialog", { name: "Filter panel" });

const CASES: [string, OwnerCase][] = [
  [
    "Popover, a tooltip in its panel",
    {
      ui: (onKeyDown) => (
        <Popover
          labels={{ panel: "Filter panel" }}
          onKeyDown={onKeyDown}
          trigger={({ toggle, ref }) => (
            <button type="button" ref={ref} onClick={toggle}>
              Filter
            </button>
          )}
        >
          {() => <Hint />}
        </Popover>
      ),
      open: async (user) => {
        await user.click(screen.getByRole("button", { name: "Filter" }));
        await focusHint();
      },
      layerUp: tooltipUp,
      isOpen: () => popoverPanel() !== null,
    },
  ],
  [
    "Popover, a HoverMenu opened by the mouse in its panel",
    {
      ui: (onKeyDown) => (
        <Popover
          labels={{ panel: "Filter panel" }}
          onKeyDown={onKeyDown}
          trigger={({ toggle, ref }) => (
            <button type="button" ref={ref} onClick={toggle}>
              Filter
            </button>
          )}
        >
          {() => (
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
          )}
        </Popover>
      ),
      open: async (user) => {
        await user.click(screen.getByRole("button", { name: "Filter" }));
        await user.click(screen.getByRole("button", { name: "More" }));
        expect(screen.getByRole("menu")).toBeInTheDocument();
        // A mouse open takes no focus into the menu: the press comes from the panel.
        act(() => popoverPanel()!.focus());
      },
      layerUp: () => screen.queryByRole("menu") !== null,
      isOpen: () => popoverPanel() !== null,
    },
  ],
  [
    "HoverMenu, a tooltip on the row the arrows reached",
    {
      ui: (onKeyDown) => (
        <HoverMenu
          onKeyDown={onKeyDown}
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle}>
              More
            </button>
          )}
        >
          {() => (
            <ul>
              <li>
                <button type="button">Archive</button>
              </li>
              <li>
                <Hint />
              </li>
            </ul>
          )}
        </HoverMenu>
      ),
      open: async (user) => {
        act(() => screen.getByRole("button", { name: "More" }).focus());
        await user.keyboard("{ArrowDown}");
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus());
        await user.keyboard("{ArrowDown}");
        expect(screen.getByRole("menuitem", { name: "?" })).toHaveFocus();
        await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
      },
      layerUp: tooltipUp,
      isOpen: () => screen.queryByRole("menu") !== null,
    },
  ],
  [
    "DropdownPanel, a tooltip on a row",
    {
      ui: (onKeyDown) => <ListOwner onKeyDown={onKeyDown} />,
      open: async (user) => {
        await user.click(screen.getByRole("button", { name: "Sort" }));
        await focusHint();
      },
      layerUp: tooltipUp,
      isOpen: () => screen.queryByTestId("list") !== null,
    },
  ],
  [
    "DropdownSearchHeader, a tooltip hovered on a row while focus stays in the box",
    {
      ui: (onKeyDown) => <SearchOwner onKeyDown={onKeyDown} />,
      open: async (user) => {
        await user.click(screen.getByRole("button", { name: "Store" }));
        await waitFor(() => expect(screen.getByRole("textbox", { name: "Search stores" })).toHaveFocus());
        await user.hover(within(screen.getByTestId("list")).getByRole("button", { name: "?" }));
        await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
        expect(screen.getByRole("textbox", { name: "Search stores" })).toHaveFocus();
      },
      layerUp: tooltipUp,
      isOpen: () => screen.queryByTestId("list") !== null,
    },
  ],
];

describe("an overlay's own onKeyDown hears Escape only while it is on top (round 0.35 R2)", () => {
  it.each(CASES)("%s: the first Escape closes the layer over it, the second is the handler's", async (_c, c) => {
    const user = userEvent.setup();
    const ask = vi.fn();
    // A handler that holds the overlay on Escape, as Kurvenschmiede's gear wizard holds
    // its Modal: it does nothing on a press another handler already prevented.
    render(
      c.ui((e) => {
        if (e.key !== "Escape" || e.defaultPrevented) return;
        e.preventDefault();
        ask();
      }),
    );

    await c.open(user);
    expect(c.layerUp()).toBe(true);

    await user.keyboard("{Escape}");
    expect(c.layerUp()).toBe(false);
    expect(ask).not.toHaveBeenCalled();
    expect(c.isOpen()).toBe(true);

    await user.keyboard("{Escape}");
    expect(ask).toHaveBeenCalledTimes(1);
    // Its preventDefault is still the owner's claim: the overlay stays.
    expect(c.isOpen()).toBe(true);
  });

  it.each(CASES)("%s: without a claim, the second Escape closes the overlay", async (_c, c) => {
    const user = userEvent.setup();
    const seen = vi.fn();
    render(c.ui((e) => seen(e.key)));

    await c.open(user);
    await user.keyboard("{Escape}");
    expect(c.layerUp()).toBe(false);
    expect(seen).not.toHaveBeenCalledWith("Escape");
    expect(c.isOpen()).toBe(true);

    await user.keyboard("{Escape}");
    expect(seen).toHaveBeenCalledWith("Escape");
    expect(c.isOpen()).toBe(false);
  });

  it.each(CASES)("%s: every other key still reaches the handler while the layer is up", async (_c, c) => {
    const user = userEvent.setup();
    const keys = vi.fn();
    render(c.ui((e) => keys(e.key)));

    await c.open(user);
    keys.mockClear();
    await user.keyboard("a{Shift}");
    expect(keys.mock.calls.map(([k]) => k)).toEqual(["a", "Shift"]);
    expect(c.layerUp()).toBe(true);
  });
});
