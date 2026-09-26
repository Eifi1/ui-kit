import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ToggleGroup } from "../toggle-group";

const OPTIONS = [
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
] as const;
type Dir = (typeof OPTIONS)[number]["value"];

describe("ToggleGroup caption (lenkbank ToggleField hint)", () => {
  it("a static caption describes the group", () => {
    render(<ToggleGroup aria-label="Dir" value="up" onChange={vi.fn()} options={[...OPTIONS]} caption="Applies to all" />);
    const group = screen.getByRole("radiogroup", { name: "Dir" });
    expect(group).toHaveAccessibleDescription("Applies to all");
    expect(screen.getByText("Applies to all")).not.toHaveAttribute("aria-live");
  });

  it("a function caption follows the value and is a polite live region", () => {
    function Harness() {
      const [v, setV] = useState<Dir>("up");
      return (
        <ToggleGroup
          label="Direction"
          value={v}
          onChange={setV}
          options={[...OPTIONS]}
          caption={(value) => (value === "up" ? "Rising edge" : "Falling edge")}
        />
      );
    }
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: "Direction" });
    expect(group).toHaveAccessibleDescription("Rising edge");
    expect(screen.getByText("Rising edge")).toHaveAttribute("aria-live", "polite");
    fireEvent.click(screen.getByRole("radio", { name: "Down" }));
    expect(group).toHaveAccessibleDescription("Falling edge");
  });

  it("merges with the caller's describedby and the error, in that order", () => {
    render(
      <>
        <p id="own">Own</p>
        <ToggleGroup
          label="Dir"
          aria-describedby="own"
          value="up"
          onChange={vi.fn()}
          options={[...OPTIONS]}
          caption="Cap"
          error="Bad"
        />
      </>,
    );
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription("Own Cap Bad");
  });

  it("a function caption returning nothing adds no description", () => {
    render(
      <ToggleGroup allowEmpty aria-label="F" value={null} onChange={vi.fn()} options={[...OPTIONS]} caption={(v) => v && `Only ${v}`} />,
    );
    expect(screen.getByRole("group", { name: "F" })).not.toHaveAttribute("aria-describedby");
  });

  it("without a caption the bare group is returned as before", () => {
    const { container } = render(<ToggleGroup aria-label="Dir" value="up" onChange={vi.fn()} options={[...OPTIONS]} />);
    expect(container.firstElementChild).toHaveAttribute("role", "radiogroup");
  });
});
