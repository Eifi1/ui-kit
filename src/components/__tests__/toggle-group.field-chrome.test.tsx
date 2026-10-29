import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ToggleGroup } from "../toggle-group";
import { FieldHint } from "../field-parts";
import { WriteLockProvider } from "../write-lock";

/**
 * 0.22.0: keksdose K1 (the field chrome cleared its label again), K2 (`labelPlacement=
 * "strip"`) and K3 (`commit` / `disabledReason` on a self-committing group).
 */

const OPTIONS = [
  { value: "a", label: "Any" },
  { value: "b", label: "All" },
];

// The pixel value of every vertical class the chrome, the strip and their label use —
// jsdom computes no CSS, so the geometry is checked from the classes, which is where a
// regression (someone putting `pt-4` back) would land.
const PX: Record<string, number> = {
  "top-1": 4,
  "pt-4": 16,
  "pt-5": 20,
  "pb-0.5": 2,
  "pb-1": 4,
  "py-0": 0,
  "py-0.5": 2,
  "leading-4": 16,
  "leading-5": 20,
  // 0.32 (§3.2): the md chrome line in rem — 18px at Normal, and it scales with the rest.
  "leading-[1.125rem]": 18,
};

/** The one token of `cls` that is `prefix` + a known size, without a variant. */
function px(el: Element, ...prefixes: string[]): number {
  const tokens = el.className.split(/\s+/).filter((t) => prefixes.some((p) => t.startsWith(p)) && t in PX);
  if (tokens.length !== 1)
    throw new Error(`expected one of ${prefixes.join("/")} in "${el.className}", got ${tokens.join(",")}`);
  return PX[tokens[0]];
}

const LABEL_FONT = 11;
const LEADING_TIGHT = 1.25;
/** A labelled Select / Input: 1 + pt-4 + a 20px line + pb-1 + 1. */
const FIELD_HEIGHT = 42;

function labelBottom(label: Element): number {
  // `text-caption` is 0.6875rem, 11px at Normal (0.32, §3.2).
  expect(label.className).toContain("text-caption");
  expect(label.className).toContain("leading-tight");
  return px(label, "top-") + LABEL_FONT * LEADING_TIGHT;
}

describe("ToggleGroup field chrome geometry (keksdose K1, feedback #117 rework)", () => {
  for (const size of ["md", "sm"] as const) {
    it(`${size}: the active fill starts clear of the label and the field stays 42px`, () => {
      render(<ToggleGroup label="Group by" size={size} value="a" onChange={vi.fn()} options={OPTIONS} />);
      const group = screen.getByRole("radiogroup", { name: "Group by" });
      const chrome = group.parentElement!;
      const label = screen.getByText("Group by").closest("label")!;
      const active = screen.getByRole("radio", { name: "Any" });
      // The fill is painted from the segment's top, which sits at the chrome's border
      // plus its top padding (the group itself has no padding in the chrome).
      expect(group.className).toContain("p-0");
      const fillTop = 1 + px(chrome, "pt-");
      // feedback #117: at pt-4 this was 17px against a 17.75px label line — touching.
      expect(fillTop - labelBottom(label)).toBeGreaterThanOrEqual(3);
      expect(px(active, "py-")).toBe(0);
      const height = 1 + px(chrome, "pt-") + px(active, "leading-") + px(chrome, "pb-") + 1;
      expect(height).toBe(FIELD_HEIGHT);
    });
  }

  it("honours size=sm inside the chrome: 12px type in a 16px line", () => {
    render(<ToggleGroup label="Group by" size="sm" value="a" onChange={vi.fn()} options={OPTIONS} />);
    const cls = screen.getByRole("radio", { name: "Any" }).className;
    expect(cls).toContain("text-xs");
    expect(cls).toContain("leading-4");
    expect(cls).not.toContain("leading-5");
  });

  it("puts chromeClassName on the chrome box, after the kit's classes", () => {
    const { container } = render(
      <ToggleGroup
        label="Group by"
        className="md:-ms-px"
        chromeClassName="md:rounded-s-none"
        value="a"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    const chrome = screen.getByRole("radiogroup").parentElement!;
    expect(chrome.className).toContain("md:rounded-s-none");
    expect(chrome.className).toContain("border-subtle");
    expect((container.firstElementChild as HTMLElement).className).toContain("md:-ms-px");
    expect(chrome.className).not.toContain("md:-ms-px");
  });

  it("ignores chromeClassName without the chrome", () => {
    render(
      <ToggleGroup aria-label="Group by" chromeClassName="x-chrome" value="a" onChange={vi.fn()} options={OPTIONS} />,
    );
    expect(document.querySelector(".x-chrome")).toBeNull();
  });
});

describe('ToggleGroup labelPlacement="strip" (keksdose K2, live #288 / #431)', () => {
  it("is named by an 11px static label over the bare group, 20px strip + 22px group = 42px", () => {
    const { container } = render(
      <ToggleGroup
        label="Status"
        labelPlacement="strip"
        className="col-span-4"
        value="a"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Status" });
    const wrapper = container.firstElementChild as HTMLElement;
    // className styles the wrapper; the group keeps its OWN box (no field chrome).
    expect(wrapper.className).toContain("col-span-4");
    expect(wrapper.className).toContain("relative");
    expect(group.className).toContain("border-strong");
    expect(group.className).toContain("p-0.5");
    expect(group.className).not.toContain("col-span-4");
    const label = screen.getByText("Status");
    expect(label.className).toContain("static");
    expect(label.parentElement!.className).toContain("inset-x-3");
    const active = screen.getByRole("radio", { name: "Any" });
    const strip = px(wrapper, "pt-");
    // The group (keksdose dev#593): border + p-0.5 moat + a 16px line + moat + border.
    const groupHeight = 1 + 2 + px(active, "py-") * 2 + px(active, "leading-") + 2 + 1;
    expect(strip).toBe(20);
    expect(groupHeight).toBe(22);
    expect(strip + groupHeight).toBe(FIELD_HEIGHT);
    // The group's border starts below the label's whole line box.
    expect(strip).toBeGreaterThanOrEqual(px(label.parentElement!, "top-") + LABEL_FONT * LEADING_TIGHT);
  });

  it("keeps sm at 22px: 12px type in the same 16px line", () => {
    render(
      <ToggleGroup label="Status" labelPlacement="strip" size="sm" value="a" onChange={vi.fn()} options={OPTIONS} />,
    );
    const active = screen.getByRole("radio", { name: "Any" });
    expect(active.className).toContain("text-xs");
    expect(1 + 2 + px(active, "py-") * 2 + px(active, "leading-") + 2 + 1).toBe(22);
  });

  // keksdose dev#593 (kk K4): the label row — the label AND its 14px "?" — ended 18px
  // down, inside a 16px strip, so both crossed the group's top border by 2px; and the
  // group, `inline-flex` on a line box, measured 44px with a 22px box. jsdom lays out
  // nothing, so the geometry is pinned through the classes that make it.
  it('keeps the label row and its "?" inside the strip, and the group block-level (dev#593)', () => {
    const { container } = render(
      <ToggleGroup
        label="Status"
        labelPlacement="strip"
        hint={<FieldHint label="What the bank says" />}
        value="a"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const row = screen.getByText("Status").parentElement!;
    const hint = screen.getByRole("button", { name: "What the bank says" });
    expect(row.contains(hint)).toBe(true);
    // The "?" is a 14px icon (`size-3.5`), a hair taller than the 13.75px label line.
    expect(hint.querySelector("svg")!.getAttribute("class")).toContain("size-3.5");
    const rowBottom = px(row, "top-") + Math.max(LABEL_FONT * LEADING_TIGHT, 14);
    expect(rowBottom).toBe(18);
    expect(px(wrapper, "pt-") - rowBottom).toBeGreaterThanOrEqual(2);
    // Block-level: the group is exactly its box, no line box's leading round it.
    const groupTokens = screen.getByRole("radiogroup").className.split(/\s+/);
    expect(groupTokens).toContain("flex");
    expect(groupTokens).not.toContain("inline-flex");
    // At Large the label stands above the group in flow and the strip goes, so nothing
    // lies under it; the segments keep their text-sm line there (a wrapped label needs it).
    expect(wrapper.className.split(/\s+/)).toContain("large:pt-0");
    expect(row.className.split(/\s+/)).toContain("large:static");
    expect(screen.getByRole("radio", { name: "Any" }).className.split(/\s+/)).toContain("large:leading-5");
  });

  it("is block-level in the strip only: a bare group stays inline-flex", () => {
    render(<ToggleGroup aria-label="Bare" value="a" onChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole("radiogroup", { name: "Bare" }).className.split(/\s+/)).toContain("inline-flex");
  });

  it("carries a hint on the label line, an error under the group, and a caption", () => {
    render(
      <ToggleGroup
        label="Status"
        labelPlacement="strip"
        hint={<FieldHint label="What the bank says" />}
        error="Pick a status"
        caption="Cleared rows are reconciled."
        value="a"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    expect(screen.getByRole("button", { name: "What the bank says" })).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { name: "Status" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAccessibleDescription("Cleared rows are reconciled. Pick a status");
    // No chrome to paint: the bare group wears the invalid border.
    expect(group.className).toContain("border-danger-strong");
  });

  it("dims the label with a disabled group", () => {
    render(
      <ToggleGroup label="Status" labelPlacement="strip" disabled value="a" onChange={vi.fn()} options={OPTIONS} />,
    );
    expect(screen.getByText("Status").className).toContain("opacity-50");
  });
});

describe("ToggleGroup commit / disabledReason (keksdose K3, dev#496)", () => {
  it("disabledReason: reachable, refusing, and says why", () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup
        aria-label="Status"
        disabledReason="Reconciled rows are final."
        value="a"
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    const any = screen.getByRole("radio", { name: "Any" });
    const all = screen.getByRole("radio", { name: "All" });
    expect(any).not.toBeDisabled();
    expect(any).toHaveAttribute("aria-disabled", "true");
    expect(any).toHaveAttribute("tabindex", "0");
    expect(any).toHaveAccessibleDescription("Reconciled rows are final.");
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Reconciled rows are final.");
    fireEvent.click(all);
    expect(onChange).not.toHaveBeenCalled();
    // The arrows still walk the segments, but choose nothing.
    any.focus();
    fireEvent.keyDown(any, { key: "ArrowRight" });
    expect(all).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    expect(any).toHaveAttribute("aria-checked", "true");
  });

  it("wins over disabled, as on Button", () => {
    render(
      <ToggleGroup
        aria-label="Status"
        disabled
        disabledReason="Locked."
        value="a"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    expect(screen.getByRole("radio", { name: "Any" })).not.toBeDisabled();
  });

  it("commit: locked by the provider with the provider's reason; untouched without a lock", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked reason="Read-only demo.">
        <ToggleGroup
          aria-label="Status"
          commit
          disabledReason="Own reason"
          value="a"
          onChange={onChange}
          options={OPTIONS}
        />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("radio", { name: "Any" })).toHaveAccessibleDescription("Read-only demo.");
    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(onChange).not.toHaveBeenCalled();
    rerender(
      <WriteLockProvider locked={false}>
        <ToggleGroup aria-label="Status" commit value="a" onChange={onChange} options={OPTIONS} />
      </WriteLockProvider>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("a locked pressed group swallows the press too", () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup
        allowEmpty
        aria-label="Filter"
        disabledReason="No."
        value="a"
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Any" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the unlocked group's DOM: segments are the group's own children", () => {
    render(<ToggleGroup aria-label="Status" value="a" onChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole("radio", { name: "Any" }).parentElement).toBe(screen.getByRole("radiogroup"));
  });

  it("locks the field chrome as well, dimmed", () => {
    render(<ToggleGroup label="Status" disabledReason="No." value="a" onChange={vi.fn()} options={OPTIONS} />);
    const group = screen.getByRole("radiogroup", { name: "Status" });
    expect(group.parentElement!.className).toContain("opacity-60");
    expect(screen.getByRole("radio", { name: "Any" })).toHaveAccessibleDescription("No.");
  });
});
