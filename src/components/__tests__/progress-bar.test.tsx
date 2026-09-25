import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../progress-bar";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("ProgressBar", () => {
  it("is a named progressbar with value, bounds and a percentage valuetext", () => {
    render(<ProgressBar value={42} label="Import" />);
    const bar = screen.getByRole("progressbar", { name: "Import" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "42%");
    expect(bar.querySelector('[data-part="fill"]')).toHaveStyle({ width: "42%" });
  });

  it("valuetext comes from the label function, and showValue shows the same words once", () => {
    render(
      <ProgressBar value={3} max={12} label="Files" showValue formatValue={(v, max) => `${v} of ${max} files`} />,
    );
    const bar = screen.getByRole("progressbar", { name: "Files" });
    expect(bar).toHaveAttribute("aria-valuetext", "3 of 12 files");
    const visible = screen.getByText("3 of 12 files");
    expect(visible).toHaveAttribute("aria-hidden", "true");
  });

  it("clamps out-of-range values", () => {
    render(<ProgressBar value={150} aria-label="Over" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("formats the default valuetext in the kit's locale", () => {
    render(
      <UiKitProvider locale="de">
        <ProgressBar value={42} aria-label="x" />
      </UiKitProvider>,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      new Intl.NumberFormat("de", { style: "percent" }).format(0.42),
    );
  });

  it("without a value it is indeterminate: no valuenow, busy, named Loading…", () => {
    render(<ProgressBar />);
    const bar = screen.getByRole("progressbar", { name: "Loading…" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuetext");
    expect(bar).toHaveAttribute("aria-busy", "true");
  });

  it("the indeterminate sweep stops under reduced motion and runs backwards in RTL", () => {
    render(<ProgressBar aria-label="Working" />);
    const fill = screen.getByRole("progressbar").querySelector('[data-part="fill"]')!;
    expect(fill.className).toMatch(/animate-\[indeterminate-sweep/);
    expect(fill.className).toMatch(/motion-reduce:animate-none/);
    expect(fill.className).toMatch(/rtl:\[animation-direction:reverse\]/);
  });

  it("variant=meter is a meter, never indeterminate", () => {
    render(<ProgressBar variant="meter" value={0.3} max={1} label="Groceries" />);
    const meter = screen.getByRole("meter", { name: "Groceries" });
    expect(meter).toHaveAttribute("aria-valuetext", "30%");
    expect(screen.queryByRole("progressbar")).toBeNull();

    render(<ProgressBar variant="meter" aria-label="Empty" />);
    const empty = screen.getByRole("meter", { name: "Empty" });
    expect(empty).toHaveAttribute("aria-valuenow", "0");
    expect(empty).not.toHaveAttribute("aria-busy");
  });

  it("tone and size pick token classes", () => {
    render(<ProgressBar value={10} tone="danger" size="lg" aria-label="x" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className).toMatch(/\bh-3\b/);
    expect(bar.querySelector('[data-part="fill"]')!.className).toMatch(/bg-\[var\(--danger\)\]/);
  });
});

describe("ProgressBar money tones and the slim size", () => {
  it("fills in the money tokens for income and expense", () => {
    const { rerender } = render(<ProgressBar variant="meter" value={40} tone="income" aria-label="In" />);
    const fill = () => screen.getByRole("meter").querySelector("[data-part=fill]")!;
    expect(fill().className).toContain("bg-[var(--money-income)]");
    rerender(<ProgressBar variant="meter" value={40} tone="expense" aria-label="In" />);
    expect(fill().className).toContain("bg-[var(--money-expense)]");
  });

  it("draws a 6px track at size slim, between sm and md", () => {
    const { rerender } = render(<ProgressBar value={10} size="slim" aria-label="p" />);
    expect(screen.getByRole("progressbar").className).toContain("h-1.5");
    rerender(<ProgressBar value={10} size="sm" aria-label="p" />);
    expect(screen.getByRole("progressbar").className).toMatch(/(^|\s)h-1(\s|$)/);
    rerender(<ProgressBar value={10} aria-label="p" />);
    expect(screen.getByRole("progressbar").className).toMatch(/(^|\s)h-2(\s|$)/);
  });
});
