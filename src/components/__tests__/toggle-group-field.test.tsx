import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToggleGroup } from "../toggle-group";
import { FieldHint } from "../ui";

const OPTIONS = [
  { value: "a", label: "Any" },
  { value: "b", label: "All" },
];

describe("ToggleGroup size=sm (keksdose rule-editor:204)", () => {
  it("draws compact 12px options", () => {
    render(<ToggleGroup size="sm" aria-label="Match" value="a" onChange={vi.fn()} options={OPTIONS} />);
    const cls = screen.getByRole("radio", { name: "Any" }).className;
    expect(cls).toContain("text-xs");
    expect(cls).toContain("px-2");
    expect(cls).toContain("py-1");
    expect(cls).not.toContain("text-sm");
  });

  it("keeps the md look by default", () => {
    render(<ToggleGroup aria-label="Match" value="a" onChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole("radio", { name: "Any" }).className).toContain("text-sm");
  });
});

describe("ToggleGroup as a field (lenkbank's ToggleField, gear/common.tsx:97)", () => {
  it("is named by its label and sits in the field's chrome", () => {
    const { container } = render(
      <ToggleGroup label="Direction" className="w-40" value="a" onChange={vi.fn()} options={OPTIONS} />,
    );
    const group = screen.getByRole("radiogroup", { name: "Direction" });
    // The group's own box is dropped; the chrome box around it is the field.
    expect(group.className).toContain("border-0");
    const chrome = group.parentElement!;
    expect(chrome.className).toContain("border-[var(--border)]");
    expect(chrome.className).toContain("pt-4");
    // className goes to the wrapper, as on a labelled Select.
    expect((container.firstElementChild as HTMLElement).className).toContain("w-40");
    expect(group.className).not.toContain("w-40");
    // The options take no vertical padding of their own.
    expect(screen.getByRole("radio", { name: "Any" }).className).toContain("py-0");
  });

  it("carries a hint on the label line", () => {
    render(
      <ToggleGroup
        label="Direction"
        hint={<FieldHint label="Which way the shift goes" />}
        value="a"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    expect(screen.getByRole("button", { name: "Which way the shift goes" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Direction" })).toBeInTheDocument();
  });

  it("shows an error, paints the field and describes the group with it", () => {
    render(
      <ToggleGroup label="Direction" error="Pick one" value="a" onChange={vi.fn()} options={OPTIONS} />,
    );
    const group = screen.getByRole("radiogroup", { name: "Direction" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAccessibleDescription("Pick one");
    expect(group.parentElement!.className).toContain("border-[var(--danger-border)]");
  });

  it("lets an explicit aria-label name the group instead", () => {
    render(
      <ToggleGroup label="Dir." aria-label="Direction" value="a" onChange={vi.fn()} options={OPTIONS} />,
    );
    const group = screen.getByRole("radiogroup", { name: "Direction" });
    expect(group).not.toHaveAttribute("aria-labelledby");
  });

  it("ignores error and hint without a label — the old group, unchanged", () => {
    const { container } = render(
      <ToggleGroup aria-label="Direction" error="Pick one" value="a" onChange={vi.fn()} options={OPTIONS} />,
    );
    expect(container.firstElementChild).toBe(screen.getByRole("radiogroup"));
    expect(screen.queryByText("Pick one")).toBeNull();
  });
});
