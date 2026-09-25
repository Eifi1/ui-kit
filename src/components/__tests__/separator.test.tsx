import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "../separator";

describe("Separator", () => {
  it("defaults to a real horizontal separator, stating no default orientation", () => {
    render(<Separator />);
    const sep = screen.getByRole("separator");
    expect(sep).not.toHaveAttribute("aria-orientation");
    expect(sep.className).toMatch(/h-px/);
  });

  it("vertical says so", () => {
    render(<Separator orientation="vertical" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep.className).toMatch(/w-px/);
  });

  it("decorative is out of the accessibility tree", () => {
    const { container } = render(<Separator decorative orientation="vertical" />);
    expect(screen.queryByRole("separator")).toBeNull();
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute("role", "none");
    expect(el).not.toHaveAttribute("aria-orientation");
  });
});
