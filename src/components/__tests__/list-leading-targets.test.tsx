import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { GripVertical } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checkbox } from "../checkbox";
import { IconButton } from "../icon-button";
import { List, ListItem } from "../list";
import { WriteLockProvider } from "../write-lock";
import { axeViolations } from "../../test/axe";
import { stubPhone } from "../../test/viewport";

/**
 * A control in ListItem's `leadingActions` is a full-size touch target (keksdose live #497,
 * Marcel 2026-11-10): on the shopping list a tap on the ROW opens the item's editor and the box
 * before it TICKS the item — and that box was a 16 px target for a thumb in a shop aisle. The
 * slot gives each control in it an invisible hit area, 44 px square (48 px from Large), centred
 * on it, which changes neither the row's layout nor the control's look.
 *
 * jsdom lays nothing out, so the hit area is read off the classes, as the CSS reads them: the
 * slot's descendant selectors reach the box's wrapper (`data-slot="checkbox-box"`) and every
 * button. What a tap ON the hit area does is real: it lands on the box's wrapper, which hands
 * it to the box.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-text-size");
});

/** The leading slot's cell: the row box's child that holds the control. */
const cellOf = (control: Element) => control.closest("[data-slot=list-item-leading]") as HTMLElement | null;

/** The hit area the cell's CSS gives `slot` (a selector part): `[&_<slot>]:after:…` classes. */
function hitArea(cell: HTMLElement, slot: string): { normal: boolean; large: boolean; drawn: boolean } {
  const has = (c: string) => cell.classList.contains(c);
  return {
    drawn: has(`[&_${slot}]:after:absolute`) && has(`[&_${slot}]:after:content-['']`),
    normal: has(`[&_${slot}]:after:inset-[min(0px,calc((100%-44px)/2))]`),
    large: has(`large:[&_${slot}]:after:inset-[min(0px,calc((100%-48px)/2))]`),
  };
}

const WHOLE = { drawn: true, normal: true, large: true };

/** keksdose's item row: the row opens the editor, the box before it ticks the item. */
function ItemRow({
  onOpen = () => {},
  onTick = () => {},
  disabled,
}: {
  onOpen?: () => void;
  onTick?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const [ticked, setTicked] = useState(false);
  return (
    <List aria-label="Shopping list" separator="divider" density="comfortable">
      <ListItem
        title="Bread"
        subtitle="1 loaf"
        onClick={onOpen}
        leadingActions={
          <Checkbox
            aria-label="Done: Bread"
            checked={ticked}
            disabled={disabled}
            onCheckedChange={(next) => {
              setTicked(next);
              onTick(next);
            }}
          />
        }
      />
    </List>
  );
}

const box = () => screen.getByRole("checkbox", { name: "Done: Bread" });
/** The box's wrapper, where a tap on the hit area lands (its `::after` is the area). */
const hitTarget = () => box().closest("[data-slot=checkbox-box]") as HTMLElement;

describe("ListItem leadingActions: a full-size target for each control", () => {
  it("gives the box a 44 px hit area, 48 px from Large, through the slot", () => {
    render(<ItemRow />);
    expect(hitTarget(), "the box's wrapper carries its slot").not.toBeNull();
    const cell = cellOf(box());
    expect(cell, "the box sits in the leading slot's cell").not.toBeNull();
    expect(hitArea(cell!, "[data-slot=checkbox-box]")).toEqual(WHOLE);
  });

  it("gives a button there the same: an IconButton drag handle", () => {
    render(
      <List>
        <ListItem
          title="Bread"
          onClick={() => {}}
          leadingActions={
            <IconButton label="Drag Bread" size="xs">
              <GripVertical />
            </IconButton>
          }
        />
      </List>,
    );
    const cell = cellOf(screen.getByRole("button", { name: "Drag Bread" }));
    expect(hitArea(cell!, "button")).toEqual(WHOLE);
    expect(cell!.classList.contains("[&_button]:relative"), "the button holds its own ::after").toBe(true);
  });

  it("a tap on the hit area ticks the box, and does not open the row", () => {
    const onOpen = vi.fn();
    const onTick = vi.fn();
    render(<ItemRow onOpen={onOpen} onTick={onTick} />);
    fireEvent.click(hitTarget());
    expect(onTick).toHaveBeenCalledWith(true);
    expect(box()).toBeChecked();
    expect(onOpen).not.toHaveBeenCalled();
    // As a tap on the box itself does: the box takes the focus.
    expect(box()).toHaveFocus();
  });

  it("a tap on the box itself ticks it once, not twice", () => {
    const onTick = vi.fn();
    render(<ItemRow onTick={onTick} />);
    fireEvent.click(box());
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(box()).toBeChecked();
  });

  it("a disabled box ignores a tap on its hit area", () => {
    const onTick = vi.fn();
    render(<ItemRow onTick={onTick} disabled />);
    fireEvent.click(hitTarget());
    expect(onTick).not.toHaveBeenCalled();
    expect(box()).not.toBeChecked();
  });

  it("a locked box refuses a tap on its hit area, as one on the box", () => {
    const onTick = vi.fn();
    stubPhone({ coarse: true });
    render(
      <WriteLockProvider locked reason="This list is done.">
        <List>
          <ListItem
            title="Bread"
            onClick={() => {}}
            leadingActions={
              <Checkbox
                aria-label="Done: Bread"
                checked={false}
                commit
                disabledReasonDisplay="tooltip"
                onCheckedChange={onTick}
              />
            }
          />
        </List>
      </WriteLockProvider>,
    );
    fireEvent.click(hitTarget());
    expect(onTick).not.toHaveBeenCalled();
    expect(box()).not.toBeChecked();
    // Still the slot's: the lock's tooltip frame sits inside the cell.
    expect(hitArea(cellOf(box())!, "[data-slot=checkbox-box]")).toEqual(WHOLE);
  });

  it("changes neither the box's look nor the row's layout", () => {
    render(<ItemRow />);
    // The box is the kit's 1rem box, the cell keeps its density's padding.
    expect(box()).toHaveClass("size-4");
    const cell = cellOf(box())!;
    expect(cell).toHaveClass("ps-3", "flex", "shrink-0", "items-center");
    // The area is drawn by `::after`, positioned: no class that sizes the cell or the box.
    expect(cell.className).not.toMatch(/(^|\s)(min-[wh]|size|[wh])-/);
    expect(hitTarget().className).not.toMatch(/(^|\s)(min-[wh]|size|[wh]|p[xy]?)-/);
  });

  it("keeps the caller's name and the row's own target apart", async () => {
    const { container } = render(<ItemRow />);
    expect(box()).toHaveAccessibleName("Done: Bread");
    const row = screen.getByRole("button", { name: /Bread/ });
    expect(row).not.toContainElement(box());
    expect(await axeViolations(container)).toEqual([]);
  });

  it("leaves a checkable row (`checked`) as it was: the row is the box, no leading cell", () => {
    render(
      <List>
        <ListItem title="Bread" checked={false} onCheckedChange={() => {}} />
      </List>,
    );
    const row = screen.getByRole("checkbox", { name: "Bread" });
    expect(cellOf(row)).toBeNull();
    expect(document.querySelector("[data-slot=list-item-leading]")).toBeNull();
  });
});

describe("Checkbox: a tap on its box's wrapper", () => {
  it("is a tap on the box — the hit area a slot draws round it lands there", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept" onCheckedChange={onCheckedChange} />);
    const input = screen.getByRole("checkbox", { name: "Accept" });
    fireEvent.click(input.closest("[data-slot=checkbox-box]")!);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(input).toBeChecked();
  });

  it("is ignored when the tap is the input's own, on its way up", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Accept" }));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });
});
