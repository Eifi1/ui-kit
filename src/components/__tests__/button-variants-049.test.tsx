import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { buttonClasses } from "../button-look";
import { FormActions } from "../form-actions";
import { FloatingAction, FloatingActionButton, FloatingActionGroup } from "../floating-panel";

// 0.49 KIT-5: `default` (the quiet chip) and `accent` (the solid brand fill) are the
// names. `primary` and `brand` were deprecated aliases with the same look, removed in 0.51
// (FloatingAction(Button)'s own `primary` was `accent`).

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

  it("the 0.49 aliases are gone in 0.51: primary and brand no longer type-check", () => {
    // @ts-expect-error — `primary` was `default` (0.49 KIT-5), removed in 0.51.
    void buttonClasses("primary");
    // @ts-expect-error — `brand` was `accent`, removed in 0.51.
    void (<Button variant="brand">x</Button>);
    // @ts-expect-error — FloatingActionButton's `primary` was `accent`, removed in 0.51.
    void (<FloatingActionButton label="New" icon="+" variant="primary" />);
    // @ts-expect-error — FloatingAction's `primary` was `accent`, removed in 0.51.
    void (<FloatingAction label="Old" icon="+" variant="primary" />);
  });

  it("the names, the defaults and a FormActions row never warn", () => {
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
});

describe("FloatingAction(Button) accent (KIT-5)", () => {
  it("FloatingActionButton is accent by default", () => {
    render(<FloatingActionButton label="New" icon="+" />);
    expect(screen.getByRole("button", { name: "New" }).className).toContain("bg-brand");
  });

  it("FloatingAction: default is quiet, accent the brand fill", () => {
    render(
      <FloatingActionGroup aria-label="Tools">
        <FloatingAction label="Quiet" icon="·" tooltip={false} />
        <FloatingAction label="Add" icon="+" variant="accent" tooltip={false} />
      </FloatingActionGroup>,
    );
    expect(screen.getByRole("button", { name: "Quiet" })).not.toHaveClass("bg-brand");
    expect(screen.getByRole("button", { name: "Add" })).toHaveClass("bg-brand");
  });
});
