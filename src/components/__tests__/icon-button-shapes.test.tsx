import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconButton } from "../ui";

describe("IconButton 0.11 additions", () => {
  it("size xl is a 48px box with a 24px glyph", () => {
    render(<IconButton size="xl" aria-label="Add" />);
    const cls = screen.getByRole("button", { name: "Add" }).className;
    expect(cls).toContain("size-12");
    expect(cls).toContain("[&_svg]:size-6");
  });

  it("stretch keeps the width and lets the row decide the height", () => {
    render(<IconButton stretch size="md" aria-label="Delete" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("self-stretch");
    expect(cls).toContain("w-9");
    expect(cls).toContain("min-h-9");
    expect(cls).not.toContain("size-9");
  });

  it("stretch moves to the tooltip wrapper when there is a label", () => {
    render(<IconButton stretch label="Delete" />);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.parentElement!.className).toContain("self-stretch");
  });

  it("tone success is green at rest, and quiet waits for hover", () => {
    const { rerender } = render(<IconButton tone="success" aria-label="Synced" />);
    expect(screen.getByRole("button").className).toContain("text-[var(--success)]");
    rerender(<IconButton tone="success" quiet aria-label="Synced" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("text-[var(--text-placeholder)]");
    expect(cls).toContain("hover:text-[var(--success)]");
  });

  it("toneColor sets the custom tone's variable and implies tone=custom", () => {
    const { rerender } = render(<IconButton toneColor="var(--warning)" aria-label="Sync" />);
    const button = screen.getByRole("button");
    expect(button.style.getPropertyValue("--icon-button-tone")).toBe("var(--warning)");
    expect(button.className).toContain("text-[var(--icon-button-tone,var(--text-primary))]");
    // Following state: the colour changes with the prop.
    rerender(<IconButton toneColor="var(--success)" aria-label="Sync" />);
    expect(screen.getByRole("button").style.getPropertyValue("--icon-button-tone")).toBe("var(--success)");
  });

  it("tone=custom can take its colour from a class instead", () => {
    render(<IconButton tone="custom" className="[--icon-button-tone:var(--info)]" aria-label="Sync" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("[--icon-button-tone:var(--info)]");
    expect(button.style.getPropertyValue("--icon-button-tone")).toBe("");
  });

  it("shape round is a circle, even at the small sizes", () => {
    render(<IconButton shape="round" size="2xs" aria-label="Status" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("rounded-full");
    expect(cls).not.toMatch(/(^|\s)rounded(\s|$)/);
  });

  it("defaults are unchanged", () => {
    render(<IconButton aria-label="x" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("size-9");
    expect(button.className).not.toContain("rounded-full");
    expect(button.getAttribute("style")).toBeNull();
  });
});
