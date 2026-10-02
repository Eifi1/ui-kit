import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Coffee, Home, Star } from "lucide-react";
import { TileRadioGroup } from "../tile-radio";
import type { TileItem } from "../tile-radio";
import { SwatchPicker } from "../swatch-picker";
import { IconPicker } from "../icon-picker";

/**
 * 0.23.0, the kit's later list: a lock reason per TILE (`TileItem.disabledReason`), and
 * through it per option on SwatchPicker and IconPicker — Button's `disabledReason`, one
 * tile at a time, after the whole-picker lock of keksdose K3.
 */

type Key = "dots" | "lines" | "grid" | "waves";

function Tiles({
  items,
  initial = "dots",
  onSelect,
  activation,
  disabled,
}: {
  items: TileItem<Key>[];
  initial?: Key | null;
  onSelect?: (key: Key | null) => void;
  activation?: "automatic" | "manual";
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState<Key | null | undefined>(initial ?? undefined);
  return (
    <div role="radiogroup" aria-label="Pattern">
      <TileRadioGroup
        items={items}
        checked={checked}
        onSelect={(key) => {
          setChecked(key);
          onSelect?.(key);
        }}
        activation={activation}
        disabled={disabled}
        renderTile={() => null}
      />
    </div>
  );
}

const ITEMS: TileItem<Key>[] = [
  { key: "dots", label: "Dots" },
  { key: "lines", label: "Lines", note: "Used by Example Co", disabledReason: "Each pattern belongs to one card." },
  { key: "grid", label: "Grid", disabled: true },
  { key: "waves", label: "Waves" },
];

/** Hover the tile's bubble trigger (the Tooltip's wrapper round the tile's span). */
function hover(radio: HTMLElement) {
  act(() => {
    fireEvent.mouseEnter(radio.parentElement!.parentElement!);
  });
}

describe("TileRadioGroup item disabledReason", () => {
  it("is reachable but aria-disabled, dimmed, and described by its note then its reason", () => {
    render(<Tiles items={ITEMS} />);
    const lines = screen.getByRole("radio", { name: "Lines" });
    expect(lines).toBeEnabled();
    expect(lines).toHaveAttribute("aria-disabled", "true");
    expect(lines).toHaveAccessibleDescription("Used by Example Co Each pattern belongs to one card.");
    expect(lines.className).toContain("opacity-50");
    expect(lines.className).toContain("cursor-not-allowed");
    // No hover offer on a tile that cannot be chosen.
    expect(lines.className).toContain("hover:bg-[var(--bg-surface)]");
    // A plain `disabled` tile is still out of reach.
    expect(screen.getByRole("radio", { name: "Grid" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Dots" })).not.toHaveAttribute("aria-disabled");
  });

  it("wins over the item's disabled; the group's disabled wins over both", () => {
    const items: TileItem<Key>[] = [
      { key: "dots", label: "Dots" },
      { key: "lines", label: "Lines", disabled: true, disabledReason: "Locked." },
    ];
    const { unmount } = render(<Tiles items={items} />);
    expect(screen.getByRole("radio", { name: "Lines" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Lines" })).toHaveAttribute("aria-disabled", "true");
    unmount();
    render(<Tiles items={items} disabled />);
    expect(screen.getByRole("radio", { name: "Lines" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Lines" })).not.toHaveAttribute("aria-disabled");
  });

  it("refuses a click, keeping the checked tile", () => {
    const onSelect = vi.fn();
    render(<Tiles items={ITEMS} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: "Lines" }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Dots" })).toHaveAttribute("aria-checked", "true");
  });

  it("automatic: an arrow lands ON the locked tile without choosing it, the next walks on", async () => {
    const onSelect = vi.fn();
    render(<Tiles items={ITEMS} onSelect={onSelect} />);
    screen.getByRole("radio", { name: "Dots" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Lines" })).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Dots" })).toHaveAttribute("aria-checked", "true");
    // Space / Enter on it choose nothing either.
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
    // Grid is natively disabled: skipped. Waves is chosen.
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Waves" })).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("waves");
    // And back: Waves → Lines (Grid skipped), focus only.
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Lines" })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledTimes(1);
    // Home / End reach a locked end tile too.
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Dots" })).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("dots");
  });

  it("manual: arrows reach it, Enter and Space refuse it", async () => {
    const onSelect = vi.fn();
    render(<Tiles items={ITEMS} onSelect={onSelect} activation="manual" />);
    screen.getByRole("radio", { name: "Dots" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Lines" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps the tab stop reachable: a checked locked tile, or a locked first tile when nothing is checked", () => {
    const { unmount } = render(<Tiles items={ITEMS} initial="lines" />);
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1]);
    unmount();
    render(
      <Tiles
        items={[
          { key: "lines", label: "Lines", disabledReason: "Locked." },
          { key: "dots", label: "Dots" },
        ]}
        initial={null}
      />,
    );
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([0, -1]);
  });

  it("shows the reason in the tile's bubble, under its name and note", () => {
    render(<Tiles items={ITEMS} />);
    hover(screen.getByRole("radio", { name: "Lines" }));
    const bubble = screen.getByRole("tooltip");
    expect(bubble).toHaveTextContent("Lines");
    expect(bubble).toHaveTextContent("Used by Example Co");
    expect(bubble).toHaveTextContent("Each pattern belongs to one card.");
    expect(bubble.textContent!.indexOf("Used by")).toBeLessThan(bubble.textContent!.indexOf("Each pattern"));
  });

  it("an empty reason is no reason", () => {
    const onSelect = vi.fn();
    render(
      <Tiles
        items={[
          { key: "dots", label: "Dots" },
          { key: "lines", label: "Lines", disabledReason: "" },
        ]}
        onSelect={onSelect}
      />,
    );
    const lines = screen.getByRole("radio", { name: "Lines" });
    expect(lines).not.toHaveAttribute("aria-disabled");
    expect(lines).not.toHaveAttribute("aria-describedby");
    fireEvent.click(lines);
    expect(onSelect).toHaveBeenCalledWith("lines");
  });
});

const SWATCHES = [
  { value: "red", label: "Red", color: "#f00" },
  { value: "green", label: "Green", color: "#0f0", disabledReason: "Used by Groceries." },
  { value: "blue", label: "Blue", color: "#00f" },
];

describe("SwatchPicker option disabledReason", () => {
  it("one tile locked, the rest live: reachable, aria-disabled, says why, never chosen", async () => {
    const onChange = vi.fn();
    render(<SwatchPicker aria-label="Flag" value="red" onChange={onChange} options={SWATCHES} />);
    const group = screen.getByRole("radiogroup", { name: "Flag" });
    expect(group).not.toHaveAttribute("aria-disabled");
    const green = screen.getByRole("radio", { name: "Green" });
    expect(green).toBeEnabled();
    expect(green).toHaveAttribute("aria-disabled", "true");
    expect(green).toHaveAccessibleDescription("Used by Groceries.");
    hover(green);
    expect(screen.getByRole("tooltip")).toHaveTextContent("GreenUsed by Groceries.");
    screen.getByRole("radio", { name: "Red" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(green).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("blue");
  });

  it("disabled with a reason stays reachable; disabled alone does not", () => {
    render(
      <SwatchPicker
        aria-label="Flag"
        value="red"
        onChange={vi.fn()}
        options={[
          SWATCHES[0],
          { value: "green", label: "Green", color: "#0f0", disabled: true, disabledReason: "Owner only." },
          { value: "blue", label: "Blue", color: "#00f", disabled: true },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Green" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Blue" })).toBeDisabled();
  });

  it("sits beside the whole-picker lock: the group says the picker's reason, the tile its own", () => {
    render(
      <SwatchPicker aria-label="Flag" disabledReason="Read-only demo." value="red" onChange={vi.fn()} options={SWATCHES} />,
    );
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription("Read-only demo.");
    expect(screen.getByRole("radio", { name: "Green" })).toHaveAccessibleDescription("Used by Groceries.");
  });
});

describe("IconPicker option disabledReason", () => {
  const SYMBOLS = [
    { value: "home", label: "Home", icon: Home },
    { value: "coffee", label: "Coffee", icon: Coffee, keywords: ["drink"], disabledReason: "Used by Leisure." },
    { value: "star", label: "Favourite", icon: Star },
  ];

  it("locks the tile and keeps the lock through a search", async () => {
    const onChange = vi.fn();
    render(<IconPicker aria-label="Symbol" searchable value="home" onChange={onChange} options={SYMBOLS} />);
    const coffee = screen.getByRole("radio", { name: "Coffee" });
    expect(coffee).toHaveAttribute("aria-disabled", "true");
    expect(coffee).toHaveAccessibleDescription("Used by Leisure.");
    await userEvent.type(screen.getByRole("searchbox"), "drink");
    const found = screen.getByRole("radio", { name: "Coffee" });
    expect(found).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(found);
    expect(onChange).not.toHaveBeenCalled();
  });
});
