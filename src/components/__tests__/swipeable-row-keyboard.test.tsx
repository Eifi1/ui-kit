import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SwipeableRow, type SwipeAction } from "../swipeable-row";

/**
 * The audit's §a11y, `swipeable-row.tsx:144`: *"SwipeableRow ships a pointer-only
 * gesture with no keyboard path and no ARIA."*
 *
 * The row's actions existed exclusively as a drag. Not "awkward with a keyboard" —
 * absent: `onCommit` had no other caller, so on a desktop, with a screen reader, or
 * with any input that cannot describe a 120px horizontal travel, deleting a
 * transaction from the mobile card was not a thing the UI could do. The DataTable
 * mounts this for every row of its phone layout.
 *
 * What is tested here is deliberately NOT a synthesised gesture. Arrow keys that pretend
 * to be a swipe would be a private idiom nobody can discover; the actions are buttons,
 * which every input device already knows how to reach, and they carry the same
 * `onCommit` the drag does so the two paths cannot drift.
 */
const del = (onCommit: () => void): SwipeAction => ({
  onCommit,
  label: "Delete",
  className: "bg-[var(--money-neutral)]",
  armedClassName: "bg-[var(--danger)]",
});

const restore = (onCommit: () => void): SwipeAction => ({
  onCommit,
  label: "Restore",
  className: "bg-[var(--money-neutral)]",
  armedClassName: "bg-[var(--money-income)]",
});

const row = <button type="button">Monthly groceries</button>;

describe("SwipeableRow's actions are reachable without a touchscreen", () => {
  it("offers every action as a button, named by its own label", () => {
    render(
      <SwipeableRow left={[del(vi.fn())]} right={[restore(vi.fn())]}>
        {row}
      </SwipeableRow>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("commits the same action the gesture would", () => {
    const onDelete = vi.fn();
    render(<SwipeableRow left={[del(onDelete)]}>{row}</SwipeableRow>);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("groups them under a name a host can translate", () => {
    const { rerender } = render(<SwipeableRow left={[del(vi.fn())]}>{row}</SwipeableRow>);
    expect(screen.getByRole("group", { name: "Row actions" })).toBeInTheDocument();
    rerender(
      <SwipeableRow left={[del(vi.fn())]} actionsLabel="Zeilenaktionen">
        {row}
      </SwipeableRow>,
    );
    expect(screen.getByRole("group", { name: "Zeilenaktionen" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Row actions" })).toBeNull();
  });

  it("offers nothing when the gesture is off", () => {
    // `enabled={false}` is an open editor or a pending mutation — the row is not to be
    // acted on at all, by any input.
    render(
      <SwipeableRow left={[del(vi.fn())]} enabled={false}>
        {row}
      </SwipeableRow>,
    );
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("adds nothing at all to a row with no actions", () => {
    render(<SwipeableRow>{row}</SwipeableRow>);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps the action buttons out of the part that slides", () => {
    // They are siblings of the sliding content, not children of it: an action that
    // travels with the row it acts on is a moving target, and the drag transform would
    // carry it off the screen.
    render(<SwipeableRow left={[del(vi.fn())]}>{row}</SwipeableRow>);
    const action = screen.getByRole("button", { name: "Delete" });
    const content = screen.getByRole("button", { name: "Monthly groceries" }).parentElement!;
    expect(content.contains(action)).toBe(false);
  });
});

/**
 * The buttons are `sr-only` until they take focus, which drags in the package's other
 * standing hazard: Tailwind builds `sr-only` out of `position: absolute`, and an
 * absolutely-positioned node with no positioned ancestor resolves its containing block
 * to the INITIAL one — growing `documentElement.scrollHeight` to reach it and putting a
 * second, empty scrollbar beside the app shell's own.
 *
 * `src/components/__tests__/sr-only-containment.test.tsx` holds that line, but it names
 * the components it walks one by one and cannot know about this one. These are the same
 * two assertions, kept next to the code that has to keep satisfying them: the strip is
 * positioned, and the buttons come back on focus rather than staying clipped forever.
 */
const POSITIONED = /(^|\s)(relative|absolute|fixed|sticky)(\s|$)/;

describe("the revealed buttons stay out of the document's way", () => {
  it("keeps every sr-only button in a local containing block", () => {
    const { container } = render(
      <SwipeableRow left={[del(vi.fn())]} right={[restore(vi.fn())]}>
        {row}
      </SwipeableRow>,
    );
    const hidden = [...container.querySelectorAll(".sr-only")];
    expect(hidden.length, "no sr-only buttons rendered — the test is vacuous").toBe(2);
    for (const el of hidden) {
      let node = el.parentElement;
      let contained = false;
      while (node && node !== container) {
        if (POSITIONED.test(node.className)) contained = true;
        node = node.parentElement;
      }
      expect(contained, `<button class="${el.className}"> escapes its containing block`).toBe(
        true,
      );
    }
  });

  it("uncloaks a button once it holds focus, ring and all", () => {
    // `sr-only` with no `focus:not-sr-only` is a control a sighted keyboard user tabs
    // INTO and cannot see — worse than the gesture it replaces, not better.
    render(<SwipeableRow left={[del(vi.fn())]}>{row}</SwipeableRow>);
    const action = screen.getByRole("button", { name: "Delete" });
    expect(action.className).toMatch(/(^|\s)focus:not-sr-only(\s|$)/);
    expect(action.className).toMatch(/focus-visible:ring-2/);
    expect(action.className).toMatch(/focus-visible:ring-\[var\(--brand\)\]/);
  });
});
