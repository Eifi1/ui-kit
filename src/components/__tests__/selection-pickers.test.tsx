import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Car, Coffee, Gamepad2 } from "lucide-react";
import { SwatchPicker } from "../swatch-picker";
import type { SwatchOption } from "../swatch-picker";
import { IconPicker } from "../icon-picker";
import type { IconOption } from "../icon-picker";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * SwatchPicker and IconPicker replace Keksdose's rows of `aria-pressed` buttons (the
 * category colours and symbols, the transaction flags): a tab stop per tile, and
 * "pressed" on what is really one-of-n. What is pinned here is the APG radio group —
 * one tab stop, arrows that move and choose, flipped in RTL — plus the two states the
 * app's own versions carried: "none" as an answer, and "mixed" as no answer.
 */

type Flag = "red" | "green" | "blue";
const FLAGS: SwatchOption<Flag>[] = [
  { value: "red", color: "var(--chart-1)", label: "Red" },
  { value: "green", color: "var(--chart-2)", label: "Green" },
  { value: "blue", color: "var(--chart-3)", label: "Blue", note: "Used by Rent" },
];

function Swatches(props: { initial?: Flag | null; allowNone?: boolean; mixed?: boolean; manual?: boolean }) {
  const [value, setValue] = useState<Flag | null>(props.initial ?? null);
  return (
    <SwatchPicker
      aria-label="Flag"
      options={FLAGS}
      value={value}
      onChange={setValue}
      allowNone={props.allowNone}
      mixed={props.mixed}
      activation={props.manual ? "manual" : "automatic"}
    />
  );
}

const tabbable = (group: HTMLElement) =>
  within(group)
    .getAllByRole("radio")
    .filter((r) => r.tabIndex === 0);

describe("SwatchPicker", () => {
  it("is one radio group with a single tab stop on the checked swatch", () => {
    render(<Swatches initial="green" />);
    const group = screen.getByRole("radiogroup", { name: "Flag" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Green" })).toHaveAttribute("aria-checked", "true");
    expect(tabbable(group)).toEqual([screen.getByRole("radio", { name: "Green" })]);
  });

  it("puts the tab stop on the first swatch while nothing is checked", () => {
    render(<Swatches />);
    expect(tabbable(screen.getByRole("radiogroup"))).toEqual([
      screen.getByRole("radio", { name: "Red" }),
    ]);
  });

  it("moves and chooses with the arrow keys, wrapping at the ends", () => {
    render(<Swatches initial="red" />);
    const red = screen.getByRole("radio", { name: "Red" });
    red.focus();
    fireEvent.keyDown(red, { key: "ArrowRight" });
    const green = screen.getByRole("radio", { name: "Green" });
    expect(green).toHaveFocus();
    expect(green).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(green, { key: "ArrowLeft" });
    fireEvent.keyDown(screen.getByRole("radio", { name: "Red" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: /Blue/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Blue/ }), { key: "Home" });
    expect(screen.getByRole("radio", { name: "Red" })).toHaveFocus();
  });

  it("flips left and right in a right-to-left page", () => {
    render(
      <div dir="rtl">
        <Swatches initial="red" />
      </div>,
    );
    const red = screen.getByRole("radio", { name: "Red" });
    fireEvent.keyDown(red, { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Green" })).toHaveAttribute("aria-checked", "true");
  });

  it("in manual activation, arrows move focus and Enter/click chooses", () => {
    render(<Swatches initial="red" manual />);
    const red = screen.getByRole("radio", { name: "Red" });
    fireEvent.keyDown(red, { key: "ArrowRight" });
    const green = screen.getByRole("radio", { name: "Green" });
    expect(green).toHaveFocus();
    expect(red).toHaveAttribute("aria-checked", "true");
    fireEvent.click(green);
    expect(green).toHaveAttribute("aria-checked", "true");
  });

  it("offers 'none' as a tile of its own, whose value is null", () => {
    const onChange = vi.fn();
    render(<SwatchPicker aria-label="Colour" options={FLAGS} value="red" onChange={onChange} allowNone />);
    fireEvent.click(screen.getByRole("radio", { name: "No colour" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("does not re-emit when the checked swatch is clicked again", () => {
    const onChange = vi.fn();
    render(<SwatchPicker aria-label="Colour" options={FLAGS} value="red" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Red" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("in the mixed state checks nothing, not even 'none', and says why", () => {
    render(
      <SwatchPicker aria-label="Flag" options={FLAGS} value={null} onChange={vi.fn()} allowNone mixed />,
    );
    const group = screen.getByRole("radiogroup");
    for (const r of within(group).getAllByRole("radio")) {
      expect(r).toHaveAttribute("aria-checked", "false");
    }
    expect(group).toHaveAccessibleDescription(
      "Mixed: the selected items have different colours",
    );
  });

  it("describes a tile by its note, and shows name and note in the bubble", () => {
    render(<Swatches />);
    const blue = screen.getByRole("radio", { name: "Blue" });
    expect(blue).toHaveAccessibleDescription("Used by Rent");
  });

  it("takes its words from the provider", () => {
    render(
      <UiKitProvider labels={{ swatchPicker: { none: "Keine Farbe" } }}>
        <SwatchPicker aria-label="Farbe" options={FLAGS} value={null} onChange={vi.fn()} allowNone />
      </UiKitProvider>,
    );
    expect(screen.getByRole("radio", { name: "Keine Farbe" })).toHaveAttribute("aria-checked", "true");
  });
});

type Sym = "car" | "coffee" | "game";
const ICONS: IconOption<Sym>[] = [
  { value: "car", icon: Car, label: "Car" },
  { value: "coffee", icon: Coffee, label: "Café", keywords: ["drink"] },
  { value: "game", icon: Gamepad2, label: "Game controller" },
];

describe("IconPicker", () => {
  it("names the radiogroup, not the wrapper that also holds the search", () => {
    render(
      <IconPicker aria-label="Symbol" options={ICONS} value="car" onChange={vi.fn()} searchable data-testid="outer" />,
    );
    expect(screen.getByTestId("outer")).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("radiogroup", { name: "Symbol" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search icons" })).toBeInTheDocument();
  });

  it("filters by label and keywords, ignoring case and accents, and keeps 'none'", () => {
    render(<IconPicker aria-label="Symbol" options={ICONS} value={null} onChange={vi.fn()} searchable allowNone />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "CAFE" } });
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual([
      "No icon",
      "Café",
    ]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "drink" } });
    expect(screen.getByRole("radio", { name: "Café" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 icon");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No icons match")).toBeInTheDocument();
  });

  it("chooses on click and on arrows", () => {
    const onChange = vi.fn();
    render(<IconPicker aria-label="Symbol" options={ICONS} value="car" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Car" }), { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("coffee");
    fireEvent.click(screen.getByRole("radio", { name: "Game controller" }));
    expect(onChange).toHaveBeenLastCalledWith("game");
  });
});
