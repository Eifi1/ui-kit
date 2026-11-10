import { useRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../../components/checkbox";
import { List, ListItem } from "../../components/list";
import { useReorder } from "../../components/reorder";
import { useRowLeaves } from "../use-row-leaves";

/**
 * A row that LEAVES its list while the focus is in it (keksdose 846423e6, run 95): ticking an
 * item on the shopping list moves its row from the open items into the folded "Done" group, so
 * the box that had the focus is unmounted with it, and the browser puts the focus on <body>
 * and says nothing (lib/focus-left). A keyboard or screen reader working down the list then
 * starts again from the top of the page at every tick. keksdose carried the recovery itself,
 * with private copies of `focusIsLost` and `focusFirst`.
 *
 * `useRowLeaves` notes the row and the control the focus is on, and once `items` no longer
 * holds that row, a focus that was lost goes to the same control in the next row, else the
 * previous, else the `fallback`.
 */

interface Item {
  id: string;
  label: string;
  done?: boolean;
  /** No Remove of its own: the next row's "same control" is missing. */
  fixed?: boolean;
}

const GROCERIES: Item[] = [
  { id: "bread", label: "Bread" },
  { id: "milk", label: "Milk" },
  { id: "eggs", label: "Eggs" },
  { id: "apples", label: "Apples", done: true },
];

interface HarnessProps {
  initial?: Item[];
  /** The Done group starts open. */
  doneOpen?: boolean;
  /** A tick is written first: the list shows it when "Answer" is pressed. */
  saveFirst?: boolean;
  /** The app moves the focus itself as it ticks: to the search field. */
  focusSearchOnTick?: boolean;
}

function ShoppingList({ initial = GROCERIES, doneOpen = false, saveFirst, focusSearchOnTick }: HarnessProps) {
  const [items, setItems] = useState(initial);
  const [queued, setQueued] = useState<Item[] | null>(null);
  const [, setRenders] = useState(0);
  const header = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const boxes = useRef(new Map<string, HTMLInputElement>());
  const open = items.filter((item) => !item.done);
  const done = items.filter((item) => item.done);
  const openLeaves = useRowLeaves({ items: open, rowKey: (item) => item.id, fallback: header });
  const doneLeaves = useRowLeaves({
    items: done,
    rowKey: (item) => item.id,
    // The last item taken back out of Done: its own box, back on the list.
    fallback: (item) => boxes.current.get(item.id),
  });
  const write = (next: Item[]) => (saveFirst ? setQueued(next) : setItems(next));
  const tick = (item: Item, checked: boolean) => {
    if (focusSearchOnTick) search.current?.focus();
    write(items.map((each) => (each.id === item.id ? { ...each, done: checked } : each)));
  };
  const row = (item: Item, leaves: typeof openLeaves) => (
    <ListItem
      key={item.id}
      {...leaves.row(item)}
      title={item.label}
      onClick={() => {}}
      leadingActions={
        <Checkbox
          ref={(box) => {
            if (box) boxes.current.set(item.id, box);
          }}
          aria-label={`Done: ${item.label}`}
          checked={item.done ?? false}
          onCheckedChange={(checked) => tick(item, checked)}
        />
      }
      actions={
        !item.fixed && (
          <button type="button" onClick={() => write(items.filter((each) => each.id !== item.id))}>
            Remove {item.label}
          </button>
        )
      }
    />
  );
  return (
    <>
      <input ref={search} aria-label="Search" />
      <List aria-label="Shopping list">
        {open.map((item) => row(item, openLeaves))}
        {done.length > 0 && (
          <ListItem
            ref={header}
            title={`Done (${done.length})`}
            defaultExpanded={doneOpen}
            expandedContent={<List aria-label="Done">{done.map((item) => row(item, doneLeaves))}</List>}
          />
        )}
      </List>
      {/* Outside the list, and pressed by `fireEvent`, which moves no focus. */}
      <button type="button" onClick={() => setItems(items.filter((each) => each.id !== "milk"))}>
        Sync removes Milk
      </button>
      <button type="button" onClick={() => setRenders((n) => n + 1)}>
        Render again
      </button>
      {saveFirst && (
        <button
          type="button"
          onClick={() => {
            if (queued) setItems(queued);
            setQueued(null);
          }}
        >
          Answer
        </button>
      )}
    </>
  );
}

const box = (label: string) => screen.getByRole("checkbox", { name: `Done: ${label}` });
const button = (name: string | RegExp) => screen.getByRole("button", { name });

/** A keyboard user on `el` presses it: the focus is on it, then the click. */
function press(el: HTMLElement) {
  act(() => el.focus());
  fireEvent.click(el);
}

describe("useRowLeaves", () => {
  it("a tick that moves the row away puts the focus on the next item's box", () => {
    render(<ShoppingList />);
    press(box("Milk"));
    expect(screen.queryByRole("checkbox", { name: "Done: Milk" })).toBeNull();
    expect(box("Eggs")).toHaveFocus();
  });

  it("the last item's tick goes to the box before it", () => {
    render(<ShoppingList />);
    press(box("Eggs"));
    expect(box("Milk")).toHaveFocus();
  });

  it("the only item's tick goes to the fallback, the Done group's header", () => {
    render(<ShoppingList initial={[{ id: "bread", label: "Bread" }]} />);
    press(box("Bread"));
    expect(button(/^Done \(1\)/)).toHaveFocus();
  });

  it("keeps the control: the focus on a row's Remove goes to the next row's Remove", () => {
    render(<ShoppingList />);
    press(button("Remove Milk"));
    expect(button("Remove Eggs")).toHaveFocus();
  });

  it("goes to the next row's target when that row has no such control", () => {
    render(
      <ShoppingList
        initial={[
          { id: "milk", label: "Milk" },
          { id: "eggs", label: "Eggs", fixed: true },
        ]}
      />,
    );
    press(button("Remove Milk"));
    expect(button("Eggs")).toHaveFocus();
  });

  it("the last item taken back out of Done goes to its own box on the list (a function fallback)", () => {
    render(<ShoppingList doneOpen />);
    press(box("Apples"));
    // Back among the open items, the Done group gone with its last item.
    expect(screen.queryByRole("button", { name: /^Done \(/ })).toBeNull();
    expect(box("Apples")).toHaveFocus();
    expect(box("Apples")).not.toBeChecked();
  });

  it("waits for the list to show the change: a tick written first moves the focus when it lands", () => {
    render(<ShoppingList saveFirst />);
    press(box("Milk"));
    // Nothing left yet; a render with the same rows changes nothing either.
    expect(box("Milk")).toHaveFocus();
    fireEvent.click(button("Render again"));
    expect(box("Milk")).toHaveFocus();
    fireEvent.click(button("Answer"));
    expect(box("Eggs")).toHaveFocus();
  });

  it("leaves a focus that went somewhere real where it is", () => {
    render(<ShoppingList focusSearchOnTick />);
    press(box("Milk"));
    expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();
  });

  it("pulls no focus when the row that left did not have it", () => {
    render(<ShoppingList />);
    act(() => box("Bread").focus());
    fireEvent.click(button("Sync removes Milk"));
    expect(box("Bread")).toHaveFocus();
  });

  it("forgets the row once the focus left it for nothing: a later removal pulls no focus", async () => {
    render(<ShoppingList />);
    act(() => box("Milk").focus());
    // A click on the page's background: the box blurs, and nothing takes the focus.
    act(() => box("Milk").blur());
    await act(async () => {});
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(button("Sync removes Milk"));
    expect(document.activeElement).toBe(document.body);
  });

  it("marks the row's target, beside useReorder's marks", () => {
    function Both() {
      const items = ["Bread", "Milk"];
      const reorder = useReorder({ items, rowKey: (item) => item, onReorder: () => {} });
      const leaves = useRowLeaves({ items, rowKey: (item) => item });
      return (
        <List>
          {items.map((item, index) => (
            <ListItem key={item} {...reorder.row(index).props} {...leaves.row(item)} title={item} onClick={() => {}} />
          ))}
        </List>
      );
    }
    render(<Both />);
    const milk = button("Milk");
    expect(milk).toHaveAttribute("data-row-leaves-key", "Milk");
    expect(milk.getAttribute("data-row-leaves-list")).toBeTruthy();
    expect(milk).toHaveAttribute("data-reorder-key", "Milk");
  });
});
