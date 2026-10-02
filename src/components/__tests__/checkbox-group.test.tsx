import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CheckboxGroup, type CheckboxGroupProps } from "../checkbox-group";
import { WriteLockProvider } from "../write-lock";

/**
 * Kurvenschmiede's reviewer dialog (per-locale grants) as a kit component — keksdose's
 * and kastlan's reviewer grants build the same picker.
 */

const LOCALES = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français", hint: "Legal pages only" },
  { value: "it", label: "Italiano", disabled: true },
];

const descriptions = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? `#${id} MISSING`);

function Harness(props: Partial<CheckboxGroupProps> & { initial?: string[]; onSave?: (v: string[]) => void }) {
  const { initial = [], onSave, ...rest } = props;
  const [value, setValue] = useState<string[]>(initial);
  return (
    <CheckboxGroup
      legend="Languages"
      options={LOCALES}
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onSave?.(next);
      }}
    />
  );
}

describe("CheckboxGroup", () => {
  it("is a fieldset named by its legend, one kit checkbox per option", () => {
    render(<Harness />);
    const group = screen.getByRole("group", { name: "Languages" });
    expect(group.tagName).toBe("FIELDSET");
    expect(within(group).getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getByRole("checkbox", { name: "Français" })).toHaveAccessibleDescription("Legal pages only");
    expect(screen.getByRole("checkbox", { name: "Italiano" })).toBeDisabled();
  });

  it("returns the set in the options' order, whatever order it was ticked in", () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Français" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Deutsch" }));
    expect(onSave).toHaveBeenLastCalledWith(["de", "fr"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Français" }));
    expect(onSave).toHaveBeenLastCalledWith(["de"]);
  });

  it("keeps a value no option carries", () => {
    const onSave = vi.fn();
    render(<Harness initial={["rm", "en"]} onSave={onSave} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Deutsch" }));
    expect(onSave).toHaveBeenLastCalledWith(["de", "en", "rm"]);
  });

  it("an sr-only legend still names the group", () => {
    render(<Harness legendVisibility="sr-only" />);
    expect(screen.getByText("Languages")).toHaveClass("sr-only");
    expect(screen.getByRole("group", { name: "Languages" })).toBeInTheDocument();
  });

  it("describes the group by its hint, then its error, and paints every box", () => {
    render(<Harness hint="Ticking none takes the role back" error="Pick at least one" />);
    const group = screen.getByRole("group", { name: "Languages" });
    expect(descriptions(group)).toEqual(["Ticking none takes the role back", "Pick at least one"]);
    for (const box of within(group).getAllByRole("checkbox")) {
      expect(box).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("required: a star on the legend, and native `required` on every box only while none is ticked", () => {
    render(<Harness required />);
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden");
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeRequired();
    fireEvent.click(screen.getByRole("checkbox", { name: "English" }));
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeRequired();
  });

  it("lays out vertical, as columns from sm up, or as a wrapping row", () => {
    const { rerender, container } = render(<Harness />);
    const list = () => container.querySelector("fieldset > div") as HTMLElement;
    expect(list()).toHaveClass("flex-col");
    rerender(<Harness columns={2} />);
    expect(list()).toHaveClass("grid", "grid-cols-1", "sm:grid-cols-2");
    rerender(<Harness layout="horizontal" />);
    expect(list()).toHaveClass("flex-wrap");
  });

  it("disabled disables every box through the fieldset", () => {
    render(<Harness disabled />);
    expect(screen.getByRole("group", { name: "Languages" })).toBeDisabled();
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeDisabled();
  });

  it("commit under a lock: every box focusable, described, and nothing changes", () => {
    const onSave = vi.fn();
    render(
      <WriteLockProvider locked reason="Only an admin grants this.">
        <Harness commit disabled initial={["en"]} onSave={onSave} />
      </WriteLockProvider>,
    );
    // The reason wins over `disabled`: the fieldset is not natively disabled, or the
    // boxes would leave the tab order.
    expect(screen.getByRole("group", { name: "Languages" })).not.toBeDisabled();
    const de = screen.getByRole("checkbox", { name: "Deutsch" });
    expect(de).toHaveAttribute("aria-disabled", "true");
    expect(de).toHaveAccessibleDescription("Only an admin grants this.");
    fireEvent.click(de);
    fireEvent.click(screen.getByRole("checkbox", { name: "English" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "English" })).toBeChecked();
    expect(de).not.toBeChecked();
  });

  it("submits each ticked box under `name` in a plain form", () => {
    const { container } = render(
      <form>
        <Harness name="locales" initial={["de", "fr"]} />
      </form>,
    );
    const data = new FormData(container.querySelector("form")!);
    expect(data.getAll("locales")).toEqual(["de", "fr"]);
  });
});
