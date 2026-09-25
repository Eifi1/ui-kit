import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, IconButton, buttonClasses } from "../ui";
import type { ButtonVariant } from "../ui";

/**
 * keksdose's 0.8.0 asks of the two buttons (B14, B15): a compact text button, and an
 * icon button that can be a toggle, be sky, and stay still under the pointer when it
 * is disabled.
 */

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger", "brand", "link"];

describe("Button size", () => {
  it("md is the default and the pre-0.8.0 geometry", () => {
    render(<Button>Save</Button>);
    const cls = screen.getByRole("button").className;
    for (const c of ["px-3", "py-2", "text-sm", "gap-2"]) expect(cls.split(" ")).toContain(c);
  });

  it("sm is keksdose's px-2 py-1 text-xs, with no md geometry left over", () => {
    render(<Button variant="secondary" size="sm">Export</Button>);
    const cls = screen.getByRole("button").className.split(" ");
    for (const c of ["px-2", "py-1", "text-xs"]) expect(cls).toContain(c);
    for (const c of ["px-3", "py-2", "text-sm"]) expect(cls).not.toContain(c);
  });

  it("buttonClasses matches <Button> for every variant at both sizes", () => {
    for (const variant of VARIANTS) {
      for (const size of ["sm", "md"] as const) {
        const { unmount } = render(<Button variant={variant} size={size}>x</Button>);
        expect(screen.getByRole("button").className).toBe(buttonClasses(variant, { size }));
        unmount();
      }
    }
  });

  it("buttonClasses keeps its string second argument", () => {
    expect(buttonClasses("secondary", "w-full")).toBe(buttonClasses("secondary", { className: "w-full" }));
    expect(buttonClasses("secondary", "w-full").split(" ")).toContain("w-full");
    expect(buttonClasses("secondary")).toBe(buttonClasses("secondary", { size: "md" }));
  });

  it("a caller's className still wins over the size", () => {
    render(<Button size="sm" className="py-0.5">x</Button>);
    const cls = screen.getByRole("button").className.split(" ");
    expect(cls).toContain("py-0.5");
    expect(cls).not.toContain("py-1");
  });

  it("link keeps p-0 at either size", () => {
    const cls = buttonClasses("link", { size: "sm" }).split(" ");
    expect(cls).toContain("p-0");
    expect(cls).not.toContain("px-2");
    expect(cls).not.toContain("py-1");
  });
});

describe("IconButton pressed", () => {
  it("is not a toggle unless asked", () => {
    render(<IconButton aria-label="Share budget">x</IconButton>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("pressed=true is aria-pressed with the brand glyph on the quiet brand fill", () => {
    render(<IconButton pressed tone="muted" aria-label="Share budget">x</IconButton>);
    const button = screen.getByRole("button", { name: "Share budget", pressed: true });
    const cls = button.className;
    expect(cls).toContain("text-[var(--brand)]");
    expect(cls).toContain("bg-[var(--brand-bg)]");
    // The tone's grey is gone, not merely out-ordered.
    expect(cls).not.toContain("text-[var(--text-placeholder)]");
  });

  it("pressed=false is still a toggle, with the resting look", () => {
    render(<IconButton pressed={false} aria-label="Share budget">x</IconButton>);
    const button = screen.getByRole("button", { pressed: false });
    expect(button.className).not.toContain("bg-[var(--brand-bg)]");
  });

  it("a caller's own aria-pressed is kept when pressed is left out", () => {
    render(<IconButton aria-pressed="mixed" aria-label="Select all">x</IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "mixed");
  });
});

describe("IconButton tone=info", () => {
  it("is sky at rest, with the info hover and ring", () => {
    render(<IconButton tone="info" aria-label="Reconcile">x</IconButton>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("text-[var(--info)]");
    expect(cls).toContain("hover:bg-[var(--info-bg)]");
    expect(cls).toContain("focus:ring-[var(--info-border)]");
  });
});

describe("IconButton disabled", () => {
  it("pins every variant's resting fill under disabled:hover", () => {
    const rest: Record<ButtonVariant, string> = {
      primary: "disabled:hover:bg-[var(--bg-surface-2)]",
      secondary: "disabled:hover:bg-transparent",
      ghost: "disabled:hover:bg-transparent",
      danger: "disabled:hover:bg-[var(--danger)]",
      brand: "disabled:hover:bg-[var(--brand)]",
      link: "disabled:hover:bg-transparent",
    };
    for (const variant of VARIANTS) {
      const { unmount } = render(<IconButton variant={variant} disabled aria-label="x">x</IconButton>);
      expect(screen.getByRole("button").className).toContain(rest[variant]);
      unmount();
    }
    render(<IconButton variant="overlay" disabled aria-label="Rotate">x</IconButton>);
    expect(screen.getByRole("button").className).toContain(
      "disabled:hover:bg-[color-mix(in_srgb,var(--bg-inverse)_60%,transparent)]",
    );
  });

  it("keeps a hover-changing tone's glyph at rest, and a pressed one's fill", () => {
    const { unmount } = render(<IconButton tone="danger" disabled aria-label="Delete">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("disabled:hover:text-[var(--text-placeholder)]");
    unmount();
    render(<IconButton pressed disabled aria-label="Share">x</IconButton>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("disabled:hover:bg-[var(--brand-bg)]");
    // tailwind-merge dropped the ghost reset the pressed one replaces.
    expect(cls).not.toContain("disabled:hover:bg-transparent");
  });

  it("leaves the plain hover classes alone, so a caller's hover override still wins", () => {
    render(<IconButton className="hover:bg-[var(--bg-hover)]" aria-label="x">x</IconButton>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("hover:bg-[var(--bg-hover)]");
    expect(cls).not.toContain(" hover:bg-[var(--bg-surface-2)]");
  });
});
