import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { buttonClasses } from "../button-look";
import { FormActions } from "../form-actions";
import { FloatingAction, FloatingActionButton, FloatingActionGroup } from "../floating-panel";

// 0.49 KIT-5, stage 1: `default` (the quiet chip) and `accent` (the solid brand fill) are
// the names; `primary` and `brand` are deprecated aliases with the same look, and a
// development build warns once per name. FloatingAction(Button)'s own `primary` was the
// solid fill all along, so it reads as `accent`, never as Button's `default`.

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function devBuild() {
  vi.stubEnv("VITEST", "");
  vi.stubEnv("DEV", true);
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("Button variants default and accent (KIT-5)", () => {
  it("default is the quiet warm chip, and what a Button with no variant draws", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-surface-2", "border-subtle", "text-primary");
    expect(button.className).toBe(buttonClasses("default"));
    expect(buttonClasses()).toBe(buttonClasses("default"));
  });

  it("accent is the solid brand fill", () => {
    render(<Button variant="accent">Create</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-brand", "text-brand-contrast", "hover:bg-brand-hover");
  });

  it("the deprecated names draw exactly the new ones", () => {
    expect(buttonClasses("primary")).toBe(buttonClasses("default"));
    expect(buttonClasses("brand")).toBe(buttonClasses("accent"));
    const { rerender } = render(<Button variant="primary" tone="danger">x</Button>);
    const primary = screen.getByRole("button").className;
    rerender(<Button variant="default" tone="danger">x</Button>);
    expect(screen.getByRole("button").className).toBe(primary);
    rerender(<IconButton variant="brand" disabled aria-label="x">x</IconButton>);
    const brand = screen.getByRole("button").className;
    rerender(<IconButton variant="accent" disabled aria-label="x">x</IconButton>);
    expect(screen.getByRole("button").className).toBe(brand);
    expect(brand).toContain("disabled:hover:bg-brand");
  });

  it("a development build warns once per deprecated name", () => {
    const warn = devBuild();
    const { rerender } = render(<Button variant="primary">a</Button>);
    rerender(<Button variant="primary">b</Button>);
    render(<Button variant="brand">c</Button>);
    render(<Button variant="brand">d</Button>);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]![0]).toContain('Button variant="primary" is deprecated: use "default"');
    expect(warn.mock.calls[1]![0]).toContain('Button variant="brand" is deprecated: use "accent"');
    expect(warn.mock.calls[1]![0]).toContain("no earlier than 0.51");
  });

  it("the new names, the defaults and a FormActions row never warn", () => {
    const warn = devBuild();
    render(
      <>
        <Button>a</Button>
        <Button variant="accent">b</Button>
        <IconButton aria-label="c">c</IconButton>
        <FormActions onCancel={() => {}} />
      </>,
    );
    buttonClasses();
    expect(warn).not.toHaveBeenCalled();
    // FormActions' save button is the accent one by default.
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-brand");
  });

  it("a production build stays silent", () => {
    vi.stubEnv("DEV", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<IconButton variant="primary" aria-label="x">x</IconButton>);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("FloatingAction(Button) accent (KIT-5)", () => {
  it("FloatingActionButton is accent by default; primary reads as accent and warns", () => {
    const warn = devBuild();
    const { unmount } = render(<FloatingActionButton label="New" icon="+" />);
    const accent = screen.getByRole("button", { name: "New" }).className;
    expect(accent).toContain("bg-brand");
    unmount();
    expect(warn).not.toHaveBeenCalled();
    render(<FloatingActionButton label="New" icon="+" variant="primary" />);
    expect(screen.getByRole("button", { name: "New" }).className).toBe(accent);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('FloatingActionButton variant="primary" is deprecated: use "accent"');
  });

  it("FloatingAction: default is quiet, accent the brand fill, primary = accent", () => {
    const warn = devBuild();
    render(
      <FloatingActionGroup aria-label="Tools">
        <FloatingAction label="Quiet" icon="·" tooltip={false} />
        <FloatingAction label="Add" icon="+" variant="accent" tooltip={false} />
        <FloatingAction label="Old" icon="+" variant="primary" tooltip={false} />
      </FloatingActionGroup>,
    );
    expect(screen.getByRole("button", { name: "Quiet" })).not.toHaveClass("bg-brand");
    expect(screen.getByRole("button", { name: "Add" })).toHaveClass("bg-brand");
    expect(screen.getByRole("button", { name: "Old" }).className).toBe(
      screen.getByRole("button", { name: "Add" }).className,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('FloatingAction variant="primary" is deprecated: use "accent"');
  });
});
