import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List, ListItem } from "../list";
import { RowActions, type RowActionsCollapse } from "../row-actions";
import { useReorder } from "../reorder";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";
import { axeViolations } from "../../test/axe";

/**
 * 0.58 (keksdose's shopping list, SL-10): rows the app orders by hand. keksdose wrote the
 * pair of arrows into every row's RowActions (18 lines, the first row's up `disabled`).
 * A row React only moves keeps its focus (react-dom gives it back after the commit); a
 * control mounted anew loses it — the arrow that took the row to an end, locked there with
 * its reason, is a new node. That case is the one `followFocus` is for: without it the
 * end-of-list test below finds the focus on <body>.
 */

const GROCERIES = ["Milk", "Bread", "Apples", "Butter"];

function moved<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

interface HarnessProps {
  onReorder?: (from: number, to: number) => void;
  commit?: boolean;
  collapse?: RowActionsCollapse;
  /** Rows that are checkboxes, not buttons. */
  checkable?: boolean;
  /** Persist first: the new order arrives with "Answer"; "Refetch" renders the old order anew. */
  saveFirst?: boolean;
  /** Buttons outside the list calling `move(from, to)`, as a drop would. */
  drops?: Array<[label: string, from: number, to: number]>;
}

function Groceries({ onReorder, commit, collapse = "inline", checkable, saveFirst, drops = [] }: HarnessProps) {
  const [items, setItems] = useState(GROCERIES);
  const [queued, setQueued] = useState<[number, number] | null>(null);
  const reorder = useReorder({
    items,
    rowKey: (item) => item,
    onReorder: (from, to) => {
      onReorder?.(from, to);
      if (saveFirst) setQueued([from, to]);
      else setItems((list) => moved(list, from, to));
    },
    commit,
  });
  return (
    <>
      <List aria-label="Groceries">
        {items.map((item, index) => {
          const row = reorder.row(index);
          const actions = <RowActions name={item} collapse={collapse} actions={row.actions} />;
          return checkable ? (
            <ListItem key={item} {...row.props} title={item} checked={false} actions={actions} />
          ) : (
            <ListItem key={item} {...row.props} title={item} onClick={() => {}} actions={actions} />
          );
        })}
      </List>
      {reorder.element}
      {saveFirst && (
        <>
          <button
            type="button"
            onClick={() => {
              if (queued) setItems((list) => moved(list, queued[0], queued[1]));
              setQueued(null);
            }}
          >
            Answer
          </button>
          <button type="button" onClick={() => setItems((list) => [...list])}>
            Refetch
          </button>
        </>
      )}
      {drops.map(([label, from, to]) => (
        <button key={label} type="button" onClick={() => reorder.move(from, to)}>
          {label}
        </button>
      ))}
    </>
  );
}

/** The rows' keys in the order they stand, read off the hook's own marks. */
const order = () =>
  screen.getAllByRole("listitem").map((li) => li.querySelector("[data-reorder-key]")!.getAttribute("data-reorder-key"));
/** The row's target (the element with its marks), and its list item. */
const target = (name: string) => document.querySelector<HTMLElement>(`[data-reorder-key="${name}"]`)!;
const rowOf = (name: string) => target(name).closest("li")!;
/** The texts `aria-describedby` points at, in order. */
const descriptions = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? `#${id} MISSING`);
/** What the live region says, once its clear-then-set beat has passed (useAnnounce). The
 *  region, not any text: an action's reason ("Already at the top") is in the page too. */
const announced = (text: string) => waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(text));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReorder: Move up / Move down in the row's actions", () => {
  it("moves a row down, keeps the focus on its Move down, and says where it went", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(<Groceries onReorder={onReorder} />);
    const down = within(rowOf("Milk")).getByRole("button", { name: "Move down" });
    await user.click(down);
    expect(onReorder).toHaveBeenCalledExactlyOnceWith(0, 1);
    expect(order()).toEqual(["Bread", "Milk", "Apples", "Butter"]);
    // React moved Milk's own node; the focus stays on the same button.
    expect(down).toHaveFocus();
    await announced("Moved to position 2 of 4");
    await user.click(down);
    expect(order()).toEqual(["Bread", "Apples", "Milk", "Butter"]);
    expect(down).toHaveFocus();
    await announced("Moved to position 3 of 4");
  });

  it("at the ends the action stays, focusable, and says why — the focus stays on it", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(<Groceries onReorder={onReorder} />);
    const last = within(rowOf("Butter")).getByRole("button", { name: "Move down" });
    expect(last).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(last)).toEqual(["Already at the bottom"]);
    await user.click(within(rowOf("Bread")).getByRole("button", { name: "Move up" }));
    expect(order()).toEqual(["Bread", "Milk", "Apples", "Butter"]);
    // Bread's Move up is locked with its reason now, which mounts it anew: the focus is
    // on the new one, the same action in the same place, not on <body> or the row.
    const top = within(rowOf("Bread")).getByRole("button", { name: "Move up" });
    expect(top).toHaveFocus();
    expect(top).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(top)).toEqual(["Already at the top"]);
    await user.click(top);
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(order()).toEqual(["Bread", "Milk", "Apples", "Butter"]);
    // And at the bottom, the same.
    await user.click(within(rowOf("Apples")).getByRole("button", { name: "Move down" }));
    expect(order()).toEqual(["Bread", "Milk", "Butter", "Apples"]);
    const bottom = within(rowOf("Apples")).getByRole("button", { name: "Move down" });
    expect(bottom).toHaveFocus();
    expect(descriptions(bottom)).toEqual(["Already at the bottom"]);
  });

  it("through the row's ⋯ menu, gives the focus back to the moved row's ⋯", async () => {
    const user = userEvent.setup();
    render(<Groceries collapse="menu" />);
    const more = screen.getByRole("button", { name: "Actions for Milk" });
    await user.click(more);
    const menu = await screen.findByRole("dialog", { name: "Actions for Milk" });
    await user.click(within(menu).getByRole("button", { name: "Move down" }));
    expect(order()).toEqual(["Bread", "Milk", "Apples", "Butter"]);
    expect(more).toHaveFocus();
    await announced("Moved to position 2 of 4");
  });

  it("waits for an app that saves first: the focus and the words come with the new order", () => {
    // Fake timers: the announcer sets its words a beat (50 ms) after it is called, and
    // "nothing was said yet" needs that beat past for certain, not slept through.
    vi.useFakeTimers();
    try {
      render(<Groceries saveFirst />);
      const region = screen.getByRole("status");
      const down = within(rowOf("Bread")).getByRole("button", { name: "Move down" });
      down.focus();
      fireEvent.click(down);
      // The old order, rendered anew while the request is out, is not the move.
      fireEvent.click(screen.getByRole("button", { name: "Refetch" }));
      act(() => vi.advanceTimersByTime(200));
      expect(order()).toEqual(GROCERIES);
      expect(region.textContent).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Answer" }));
      expect(order()).toEqual(["Milk", "Apples", "Bread", "Butter"]);
      expect(down).toHaveFocus();
      act(() => vi.advanceTimersByTime(200));
      expect(region).toHaveTextContent("Moved to position 3 of 4");
    } finally {
      vi.useRealTimers();
    }
  });

  it("under a lock that refuses `commit`, the actions say the lock's reason", () => {
    const onReorder = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <Groceries onReorder={onReorder} commit />
      </WriteLockProvider>,
    );
    const down = within(rowOf("Milk")).getByRole("button", { name: "Move down" });
    expect(down).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(down)).toEqual(["Read-only demo."]);
    fireEvent.click(down);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("passes axe", async () => {
    const { container } = render(<Groceries />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("useReorder: Alt+ArrowUp / Alt+ArrowDown on the row", () => {
  it("moves the focused row, keeps the focus on it, and announces the keys", async () => {
    const user = userEvent.setup();
    render(<Groceries />);
    const milk = target("Milk");
    expect(milk).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");
    milk.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(order()).toEqual(["Bread", "Milk", "Apples", "Butter"]);
    expect(milk).toHaveFocus();
    await announced("Moved to position 2 of 4");
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(order()).toEqual(GROCERIES);
    expect(milk).toHaveFocus();
    await announced("Moved to position 1 of 4");
  });

  it("says so at an end instead of moving", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(<Groceries onReorder={onReorder} />);
    target("Milk").focus();
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    await announced("Already at the top");
    target("Butter").focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await announced("Already at the bottom");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("takes exactly Alt: a bare arrow, Ctrl+Alt and Alt+Shift move nothing; a held key moves once", () => {
    const onReorder = vi.fn();
    render(<Groceries onReorder={onReorder} />);
    const milk = target("Milk");
    expect(fireEvent.keyDown(milk, { key: "ArrowDown" })).toBe(true);
    expect(fireEvent.keyDown(milk, { key: "ArrowDown", altKey: true, ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(milk, { key: "ArrowDown", altKey: true, shiftKey: true })).toBe(true);
    expect(onReorder).not.toHaveBeenCalled();
    // A repeat is cancelled (no scroll) but moves nothing; the first press moved once.
    expect(fireEvent.keyDown(milk, { key: "ArrowDown", altKey: true })).toBe(false);
    expect(fireEvent.keyDown(milk, { key: "ArrowDown", altKey: true, repeat: true })).toBe(false);
    expect(onReorder).toHaveBeenCalledExactlyOnceWith(0, 1);
  });

  it("works on a checkable row, whose own key handler (Enter) it shares", async () => {
    const user = userEvent.setup();
    render(<Groceries checkable />);
    const milk = screen.getByRole("checkbox", { name: "Milk" });
    milk.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(order()).toEqual(["Bread", "Milk", "Apples", "Butter"]);
    expect(milk).toHaveFocus();
  });

  it("under a lock, says the lock's reason instead of moving", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <Groceries onReorder={onReorder} commit />
      </WriteLockProvider>,
    );
    target("Milk").focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await announced("Read-only demo.");
    expect(onReorder).not.toHaveBeenCalled();
    expect(order()).toEqual(GROCERIES);
  });
});

describe("useReorder: move(from, to) and row(index)", () => {
  it("moves anywhere, as a drop does, and pulls no focus that was on the page", async () => {
    const onReorder = vi.fn();
    render(
      <Groceries
        onReorder={onReorder}
        drops={[
          ["Milk last", 0, 3],
          ["Nowhere", 0, 9],
          ["In place", 1, 1],
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nowhere" }));
    fireEvent.click(screen.getByRole("button", { name: "In place" }));
    expect(onReorder).not.toHaveBeenCalled();
    expect(document.body).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Milk last" }));
    expect(onReorder).toHaveBeenCalledExactlyOnceWith(0, 3);
    expect(order()).toEqual(["Bread", "Apples", "Butter", "Milk"]);
    expect(document.body).toHaveFocus();
    await announced("Moved to position 4 of 4");
  });

  it("gives each row what it can do, its two actions and its marks", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorder({ items: ["a", "b", "c"], rowKey: (x) => x, onReorder }));
    const [first, middle, last] = [0, 1, 2].map((i) => result.current.row(i));
    expect([first.canMoveUp, first.canMoveDown, last.canMoveUp, last.canMoveDown]).toEqual([false, true, true, false]);
    expect(middle.actions.map((a) => [a.key, a.label, a.disabledReason])).toEqual([
      ["move-up", "Move up", undefined],
      ["move-down", "Move down", undefined],
    ]);
    expect(first.actions[0].disabledReason).toBe("Already at the top");
    expect(last.actions[1].disabledReason).toBe("Already at the bottom");
    expect(middle.props["data-reorder-key"]).toBe("b");
    expect(middle.props["data-reorder-list"]).toBe(first.props["data-reorder-list"]);
    act(() => middle.moveUp());
    expect(onReorder).toHaveBeenCalledExactlyOnceWith(1, 0);
    act(() => first.moveUp());
    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it("speaks the provider's language; the hook's own labels win", async () => {
    const user = userEvent.setup();
    function German() {
      const [items, setItems] = useState(["Milch", "Brot"]);
      const reorder = useReorder({
        items,
        rowKey: (item) => item,
        onReorder: (from, to) => setItems((list) => moved(list, from, to)),
        labels: { moveDown: "Runter" },
      });
      return (
        <>
          <List>
            {items.map((item, index) => {
              const row = reorder.row(index);
              return <ListItem key={item} {...row.props} title={item} actions={<RowActions actions={row.actions} />} />;
            })}
          </List>
          {reorder.element}
        </>
      );
    }
    render(
      <UiKitProvider
        labels={{ reorder: { moveUp: "Hoch", moveDown: "Nach unten", moved: (p, t) => `Platz ${p} von ${t}` } }}
      >
        <German />
      </UiKitProvider>,
    );
    expect(screen.getAllByRole("button", { name: "Hoch" })).toHaveLength(2);
    await user.click(screen.getAllByRole("button", { name: "Runter" })[0]!);
    await announced("Platz 2 von 2");
  });
});
