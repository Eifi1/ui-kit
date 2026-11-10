import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List, ListItem } from "../list";
import { WriteLockProvider } from "../write-lock";
import { axeViolations } from "../../test/axe";

/**
 * 0.58 (keksdose's shopping list, candidate 4): a ListItem that IS a checkbox — the whole
 * row toggles, the kit draws the box. keksdose's checklist drew a 16 px `Checkbox` in
 * `leading` and caught a tap on the rest of the row by hand (`targetProps.onClick`, minus
 * the box's own): two controls for one fact, the row's button naming the whole row.
 */

/** The texts `aria-describedby` points at, in order. */
const descriptions = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? `#${id} MISSING`);

const box = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-slot="list-item-check"]');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ListItem checked: the row is one checkbox", () => {
  it("is role=checkbox, named by the title alone and described by its other lines", () => {
    render(
      <List aria-label="Basket">
        <ListItem
          title="Bread"
          overline="Cereals"
          subtitle="500 g"
          meta="Wholemeal, sliced"
          trailing="CHF 3.20"
          checked={false}
          onCheckedChange={() => {}}
        />
      </List>,
    );
    const row = screen.getByRole("checkbox", { name: "Bread" });
    expect(row).toHaveAttribute("aria-checked", "false");
    expect(descriptions(row)).toEqual(["Cereals", "500 g", "Wholemeal, sliced", "CHF 3.20"]);
    // One control: no button, link or second checkbox in the row.
    const item = screen.getByRole("listitem");
    expect(within(item).getAllByRole("checkbox")).toEqual([row]);
    expect(within(item).queryByRole("button")).toBeNull();
    expect(within(item).queryByRole("link")).toBeNull();
    // The kit's box, inside the target and hidden from the tree: the row says the state.
    expect(row).toContainElement(box(row));
    expect(box(row)).toHaveAttribute("aria-hidden", "true");
  });

  it("toggles on a click anywhere in the row: true from unchecked, false from checked", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <ListItem as="div" title="Milk" subtitle="2 l · Organic" checked={false} onCheckedChange={onCheckedChange} />,
    );
    fireEvent.click(screen.getByText("2 l · Organic"));
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    rerender(<ListItem as="div" title="Milk" subtitle="2 l · Organic" checked onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("checkbox", { name: "Milk" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByText("Milk"));
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
  });

  it("toggles on Space, not on Enter, as a native checkbox does", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<ListItem as="div" title="Apples" checked={false} onCheckedChange={onCheckedChange} />);
    const row = screen.getByRole("checkbox", { name: "Apples" });
    row.focus();
    await user.keyboard("{Enter}");
    expect(onCheckedChange).not.toHaveBeenCalled();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('says "mixed" for a partly ticked section, and a click on it ticks everything', () => {
    const onCheckedChange = vi.fn();
    render(<ListItem as="div" title="Other" trailing="1 of 2" checked="mixed" onCheckedChange={onCheckedChange} />);
    const row = screen.getByRole("checkbox", { name: "Other" });
    expect(row).toHaveAttribute("aria-checked", "mixed");
    expect(descriptions(row)).toEqual(["1 of 2"]);
    fireEvent.click(row);
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("draws the box filled with a tick, a dash for mixed, and empty while unchecked", () => {
    const { rerender } = render(<ListItem as="div" title="Butter" checked={false} />);
    const row = () => screen.getByRole("checkbox", { name: "Butter" });
    expect(box(row())!.className).not.toContain("bg-brand");
    expect(box(row())!.querySelector("svg")).toBeNull();
    rerender(<ListItem as="div" title="Butter" checked />);
    expect(box(row())!.className).toContain("bg-brand");
    expect(box(row())!.querySelectorAll("svg")).toHaveLength(1);
    rerender(<ListItem as="div" title="Butter" checked="mixed" />);
    expect(box(row())!.className).toContain("bg-brand");
    // The dash is another glyph than the tick (lucide marks each with its own class).
    const dash = box(row())!.querySelector("svg")!;
    rerender(<ListItem as="div" title="Butter" checked />);
    expect(box(row())!.querySelector("svg")!.getAttribute("class")).not.toBe(dash.getAttribute("class"));
  });

  it('crosses a checked title out with checkedStyle="strike" — not an unchecked or a mixed one', () => {
    const title = () => screen.getByText("Bananas");
    const { rerender } = render(<ListItem as="div" title="Bananas" checked checkedStyle="strike" />);
    expect(title().className).toContain("line-through");
    expect(title().className).toContain("text-muted");
    rerender(<ListItem as="div" title="Bananas" checked={false} checkedStyle="strike" />);
    expect(title().className).not.toContain("line-through");
    rerender(<ListItem as="div" title="Bananas" checked="mixed" checkedStyle="strike" />);
    expect(title().className).not.toContain("line-through");
    // The default leaves a checked title as it is.
    rerender(<ListItem as="div" title="Bananas" checked />);
    expect(title().className).not.toContain("line-through");
    expect(title().className).toContain("text-primary");
  });

  it("takes the caller's own name over the title's", () => {
    render(<ListItem as="div" title="Eggs" checked={false} aria-label="Eggs, 6 pieces" />);
    expect(screen.getByRole("checkbox", { name: "Eggs, 6 pieces" })).not.toHaveAttribute("aria-labelledby");
  });

  it("builds a section: a mixed row with its count, its items in the body named by it", () => {
    function Aisle() {
      const [ticked, setTicked] = useState<Record<string, boolean>>({ Candles: false, Bananas: true });
      const names = Object.keys(ticked);
      const count = names.filter((name) => ticked[name]).length;
      const all = (value: boolean) => setTicked(Object.fromEntries(names.map((name) => [name, value])));
      return (
        <List aria-label="Shop">
          <ListItem
            title="Other"
            trailing={`${count} of ${names.length}`}
            checked={count === 0 ? false : count === names.length ? true : "mixed"}
            onCheckedChange={all}
          >
            <List aria-label="Other's items">
              {names.map((name) => (
                <ListItem
                  key={name}
                  title={name}
                  checked={ticked[name]}
                  checkedStyle="strike"
                  onCheckedChange={(value) => setTicked((was) => ({ ...was, [name]: value }))}
                />
              ))}
            </List>
          </ListItem>
        </List>
      );
    }
    render(<Aisle />);
    const header = screen.getByRole("checkbox", { name: "Other" });
    expect(header).toHaveAttribute("aria-checked", "mixed");
    expect(descriptions(header)).toEqual(["1 of 2"]);
    const group = screen.getByRole("group", { name: "Other" });
    const candles = within(group).getByRole("checkbox", { name: "Candles" });
    // The items are the header's siblings, not inside its target.
    expect(header).not.toContainElement(candles);
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-checked", "true");
    expect(candles).toHaveAttribute("aria-checked", "true");
    expect(descriptions(header)).toEqual(["2 of 2"]);
    fireEvent.click(candles);
    expect(header).toHaveAttribute("aria-checked", "mixed");
  });

  it("passes axe as a checklist with a section", async () => {
    const { container } = render(
      <List aria-label="Shop">
        <ListItem title="Dairy" trailing="1 of 2" checked="mixed">
          <List aria-label="Dairy items">
            <ListItem title="Milk" subtitle="2 l" checked checkedStyle="strike" />
            <ListItem title="Butter" overline="Fats" checked={false} />
          </List>
        </ListItem>
      </List>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("disabled: out of reach, nothing fires", () => {
    const onCheckedChange = vi.fn();
    render(<ListItem as="div" title="Flour" checked={false} disabled onCheckedChange={onCheckedChange} />);
    const row = screen.getByRole("checkbox", { name: "Flour" });
    expect(row).toBeDisabled();
    fireEvent.click(row);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("a reason, or a lock on a box that saves, keeps it focusable and says why", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <ListItem
        as="div"
        title="Sugar"
        subtitle="1 kg"
        checked={false}
        disabledReason="The list is done."
        onCheckedChange={onCheckedChange}
      />,
    );
    let row = screen.getByRole("checkbox", { name: "Sugar" });
    expect(row).toBeEnabled();
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(row)).toEqual(["1 kg", "The list is done."]);
    fireEvent.click(row);
    expect(onCheckedChange).not.toHaveBeenCalled();

    rerender(
      <WriteLockProvider locked reason="Read-only demo.">
        <ListItem as="div" title="Sugar" checked={false} commit onCheckedChange={onCheckedChange} />
      </WriteLockProvider>,
    );
    row = screen.getByRole("checkbox", { name: "Sugar" });
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(row)).toEqual(["Read-only demo."]);
    fireEvent.click(row);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("still runs targetProps' onKeyDown (useReorder's Alt+arrows ride on it)", () => {
    const onKeyDown = vi.fn();
    render(<ListItem as="div" title="Rice" checked={false} targetProps={{ onKeyDown }} />);
    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Rice" }), { key: "ArrowDown", altKey: true });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("types: a checkable row takes no onClick, href or expandedContent", () => {
    // @ts-expect-error — the box is the row's one action
    void (<ListItem title="x" checked onClick={() => {}} />);
    // @ts-expect-error — the box is the row's one action
    void (<ListItem title="x" checked={false} href="/x" />);
    // @ts-expect-error — a toggle that ticks and folds is two controls
    void (<ListItem title="x" checked="mixed" expandedContent="y" />);
    // @ts-expect-error — `checkedStyle` without `checked` means nothing
    void (<ListItem title="x" checkedStyle="strike" onClick={() => {}} />);
    expect(true).toBe(true);
  });

  it("given a second action anyway, keeps the box, nests nothing, and warns once in development", () => {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onClick = vi.fn();
    const onCheckedChange = vi.fn();
    // Untyped code: what a JavaScript caller or a cast can still pass.
    const untyped = { onClick, href: "/elsewhere", expandedContent: "inside" } as object;
    render(
      <List>
        <ListItem title="Yeast" checked={false} onCheckedChange={onCheckedChange} {...untyped} />
        <ListItem title="Salt" checked={false} {...untyped} />
      </List>,
    );
    const row = screen.getByRole("checkbox", { name: "Yeast" });
    expect(screen.queryByRole("link")).toBeNull();
    expect(row).not.toHaveAttribute("aria-expanded");
    fireEvent.click(row);
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(onClick).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/ListItem: a checkable row \(`checked`\) is its own one action/);
  });
});
