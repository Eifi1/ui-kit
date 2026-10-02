import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TILE_SIZE, TileRadioGroup } from "../tile-radio";

// The shape a caller of the (0.22.0) public TileRadioGroup writes: its own
// role="radiogroup" container, only the four required props.
function Patterns({ onSelect }: { onSelect?: (key: string | null) => void }) {
  const [value, setValue] = useState<"dots" | "lines" | "grid" | null>("lines");
  return (
    <div role="radiogroup" aria-label="Pattern">
      <TileRadioGroup
        items={[
          { key: "dots", label: "Dots" },
          { key: "lines", label: "Lines", note: "Used by Example Co" },
          { key: "grid", label: "Grid" },
        ]}
        checked={value}
        onSelect={(key) => {
          setValue(key);
          onSelect?.(key);
        }}
        renderTile={(item) => <span data-testid={`glyph-${item.key}`} aria-hidden />}
      />
    </div>
  );
}

describe("TileRadioGroup (public)", () => {
  it("defaults activation, disabled and size: md tiles, all enabled, arrows choose", async () => {
    const onSelect = vi.fn();
    render(<Patterns onSelect={onSelect} />);
    const group = screen.getByRole("radiogroup", { name: "Pattern" });
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const radio of radios) {
      expect(group).toContainElement(radio);
      expect(radio).toBeEnabled();
      expect(radio.className).toContain(TILE_SIZE.md.tile);
    }
    const lines = screen.getByRole("radio", { name: "Lines" });
    expect(lines).toHaveAttribute("aria-checked", "true");
    // One tab stop: the checked tile.
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    lines.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onSelect).toHaveBeenLastCalledWith("grid");
    expect(screen.getByRole("radio", { name: "Grid" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Grid" })).toHaveAttribute("aria-checked", "true");
  });

  it("describes a tile by its note and renders the caller's glyph inside", () => {
    render(<Patterns />);
    expect(screen.getByRole("radio", { name: "Lines" })).toHaveAccessibleDescription("Used by Example Co");
    expect(screen.getByTestId("glyph-dots")).toBeInTheDocument();
  });

  it("still honours explicit activation, size and disabled", async () => {
    const onSelect = vi.fn();
    render(
      <div role="radiogroup" aria-label="Size">
        <TileRadioGroup
          items={[
            { key: "a", label: "A" },
            { key: "b", label: "B" },
          ]}
          checked="a"
          onSelect={onSelect}
          activation="manual"
          size="lg"
          renderTile={() => null}
        />
      </div>,
    );
    const a = screen.getByRole("radio", { name: "A" });
    expect(a.className).toContain(TILE_SIZE.lg.tile);
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "B" })).toHaveFocus();
  });
});
