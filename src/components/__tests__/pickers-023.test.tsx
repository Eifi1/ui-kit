import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Coffee, Home, Star } from "lucide-react";
import { SwatchPicker } from "../swatch-picker";
import { IconPicker } from "../icon-picker";

/**
 * 0.23.0, the kit's later list: a per-option lock reason on SwatchPicker and IconPicker
 * (`disabledReason` on an option, after the whole-picker lock of keksdose K3). The
 * pickers' own guarantee — a locked option never reaches `onChange`, whichever way it
 * is picked. How the TILE draws the lock (reachable, `aria-disabled`, the reason in its
 * bubble) is TileRadioGroup's, tested with it.
 */

const SWATCHES = [
  { value: "red", label: "Red", color: "#f00" },
  { value: "green", label: "Green", color: "#0f0", disabledReason: "Used by Groceries." },
  { value: "blue", label: "Blue", color: "#00f", disabled: true, disabledReason: "Only the owner sets blue." },
];

describe("SwatchPicker option disabledReason", () => {
  it("never reports a locked option: click, arrow (automatic) or Enter (manual)", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SwatchPicker aria-label="Flag" value="red" onChange={onChange} options={SWATCHES} />);
    fireEvent.click(screen.getByRole("radio", { name: "Green" }));
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }));
    const red = screen.getByRole("radio", { name: "Red" });
    red.focus();
    fireEvent.keyDown(red, { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
    rerender(<SwatchPicker aria-label="Flag" activation="manual" value="red" onChange={onChange} options={SWATCHES} />);
    const green = screen.getByRole("radio", { name: "Green" });
    fireEvent.keyDown(green, { key: "Enter" });
    fireEvent.click(green);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still reports the other options, and none", () => {
    const onChange = vi.fn();
    render(<SwatchPicker aria-label="Flag" allowNone value="red" onChange={onChange} options={SWATCHES} />);
    fireEvent.click(screen.getByRole("radio", { name: "No colour" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("an empty reason is no reason: the option is live", () => {
    const onChange = vi.fn();
    render(
      <SwatchPicker
        aria-label="Flag"
        value="red"
        onChange={onChange}
        options={[SWATCHES[0], { value: "green", label: "Green", color: "#0f0", disabledReason: "" }]}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Green" }));
    expect(onChange).toHaveBeenCalledWith("green");
  });
});

describe("IconPicker option disabledReason", () => {
  const SYMBOLS = [
    { value: "home", label: "Home", icon: Home },
    { value: "coffee", label: "Coffee", icon: Coffee, disabledReason: "Used by Leisure." },
    { value: "star", label: "Favourite", icon: Star },
  ];

  it("never reports a locked option, and reports the rest", () => {
    const onChange = vi.fn();
    render(<IconPicker aria-label="Symbol" value="home" onChange={onChange} options={SYMBOLS} />);
    fireEvent.click(screen.getByRole("radio", { name: "Coffee" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Favourite" }));
    expect(onChange).toHaveBeenCalledWith("star");
  });
});
