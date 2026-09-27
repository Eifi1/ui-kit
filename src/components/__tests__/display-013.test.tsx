import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ToggleGroup } from "../toggle-group";
import { Delta } from "../signed-amount";
import { StaticLegend, ToggleLegend, type LegendEntry } from "../toggle-legend";
import { BulkActionBar } from "../bulk-action-bar";
import { Button } from "../ui";

const OPTIONS = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
];

/**
 * kastlan #47: `aria-pressed` toggle buttons without `allowEmpty`'s "press again to
 * clear" — they took the clearable shape and dropped the `null` in `onChange`.
 */
describe("ToggleGroup — semantics=\"pressed\" (kastlan #47)", () => {
  it("renders toggle buttons in a group, each its own Tab stop", () => {
    render(<ToggleGroup semantics="pressed" value="list" onChange={vi.fn()} options={OPTIONS} aria-label="View" />);
    const group = screen.getByRole("group", { name: "View" });
    expect(screen.queryByRole("radiogroup")).toBeNull();
    const [list, board] = within(group).getAllByRole("button");
    expect(list).toHaveAttribute("aria-pressed", "true");
    expect(board).toHaveAttribute("aria-pressed", "false");
    expect(list).not.toHaveAttribute("aria-checked");
    expect(list).not.toHaveAttribute("tabindex");
    expect(board).not.toHaveAttribute("tabindex");
  });

  it("never clears: a press on the pressed option re-sends it, never null", () => {
    const onChange = vi.fn();
    render(<ToggleGroup semantics="pressed" value="list" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(onChange).toHaveBeenLastCalledWith("list");
    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(onChange).toHaveBeenLastCalledWith("board");
    expect(onChange).not.toHaveBeenCalledWith(null);
  });

  it("leaves the arrow keys alone — toggle buttons do not move the choice on focus", () => {
    const onChange = vi.fn();
    render(<ToggleGroup semantics="pressed" value="list" onChange={onChange} options={OPTIONS} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "List" }), { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stays a radiogroup by default (backwards compatible)", () => {
    render(<ToggleGroup value="list" onChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("aria-checked", "true");
  });

  it("does not leak `semantics` to the DOM", () => {
    render(<ToggleGroup semantics="pressed" value="list" onChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole("group")).not.toHaveAttribute("semantics");
  });
});

/** kastlan #48: at zero the figure stays, beside the flat dash. */
describe("Delta at zero (kastlan #48)", () => {
  it("shows the figure beside the flat indicator, muted, and says 'No change'", () => {
    render(<Delta value={0} unit="percent" digits={2} locale="en-US" data-testid="d" />);
    const d = screen.getByTestId("d");
    expect(d).toHaveAttribute("data-direction", "flat");
    const figure = screen.getByText("No change").parentElement!;
    expect(figure.querySelector("svg")).not.toBeNull();
    expect(figure.querySelector("span[aria-hidden]")).toHaveTextContent("0.00%");
    expect(figure).toHaveClass("text-[var(--text-muted)]");
  });

  it("is not judged at zero even with goodDirection", () => {
    render(<Delta value={0} goodDirection="up" locale="en-US" />);
    const figure = screen.getByText("No change").parentElement!;
    expect(figure).toHaveClass("text-[var(--text-muted)]");
    expect(figure.querySelector("span[aria-hidden]")).toHaveTextContent("0");
  });

  it("without an arrow still shows the zero", () => {
    render(<Delta value={0} arrow={false} currency="CHF" locale="en-US" />);
    const figure = screen.getByText("No change").parentElement!;
    expect(figure.querySelector("svg")).toBeNull();
    expect(figure.querySelector("span[aria-hidden]")).toHaveTextContent("CHF 0.00");
  });

  it("still renders nothing for a missing (non-finite) value", () => {
    const { container } = render(<Delta value={Number.NaN} />);
    expect(container).toBeEmptyDOMElement();
  });
});

/** kastlan #49: the gantt's "today" key at the legend's inline end. */
describe("legend entry align=\"end\" (kastlan #49)", () => {
  const ENTRIES: LegendEntry[] = [
    { key: "active", label: "Active", color: "#117733" },
    { key: "ended", label: "Ended", color: "#888" },
    { key: "today", label: "Today", color: "red", align: "end" },
  ];

  it("pushes the entry to the inline end of a StaticLegend, and only that one", () => {
    render(<StaticLegend entries={ENTRIES} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.classList.contains("ms-auto"))).toEqual([false, false, true]);
  });

  it("does the same on a ToggleLegend's switch", () => {
    render(<ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Today" })).toHaveClass("ms-auto");
    expect(screen.getByRole("button", { name: "Active" })).not.toHaveClass("ms-auto");
  });

  it("treats align=\"start\" as the default", () => {
    render(<StaticLegend entries={[{ key: "a", label: "A", color: "red", align: "start" }]} />);
    expect(screen.getByRole("listitem")).not.toHaveClass("ms-auto");
  });
});

/** keksdose F8: a `Button href` in the bar is one of the toolbar's arrow-key stops. */
describe("BulkActionBar — links rove (keksdose F8)", () => {
  it("includes an <a href> among the arrow-key stops, in document order", () => {
    render(
      <BulkActionBar count={2} onClear={() => {}}>
        <Button type="button">Edit</Button>
        <Button href="/reports/1">View report</Button>
        <Button type="button">Delete</Button>
      </BulkActionBar>,
    );
    const clear = screen.getByRole("button", { name: "Clear selection" });
    const edit = screen.getByRole("button", { name: "Edit" });
    const link = screen.getByRole("link", { name: "View report" });
    const del = screen.getByRole("button", { name: "Delete" });
    // One Tab stop: the link is roved like the buttons, not a second stop.
    expect([clear, edit, link, del].map((el) => el.tabIndex)).toEqual([0, -1, -1, -1]);

    edit.focus();
    fireEvent.keyDown(edit, { key: "ArrowRight" });
    expect(link).toHaveFocus();
    expect(link.tabIndex).toBe(0);
    fireEvent.keyDown(link, { key: "ArrowRight" });
    expect(del).toHaveFocus();
    fireEvent.keyDown(del, { key: "ArrowLeft" });
    expect(link).toHaveFocus();
  });

  it("skips a disabled link, as it skips a disabled button", () => {
    render(
      <BulkActionBar count={1} onClear={() => {}}>
        <Button href="/reports/1" disabled>
          View report
        </Button>
        <Button type="button">Delete</Button>
      </BulkActionBar>,
    );
    const clear = screen.getByRole("button", { name: "Clear selection" });
    clear.focus();
    fireEvent.keyDown(clear, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "View report" })).not.toHaveAttribute("tabindex");
  });
});
