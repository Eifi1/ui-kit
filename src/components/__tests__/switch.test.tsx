import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Switch } from "../switch";

/**
 * The kit's switch: a native checkbox with `role="switch"`, drawn as a track and a
 * thumb. What a Radix switch gave Kastlan — the role, `onCheckedChange`, two sizes —
 * has to survive the move to a native element, and what the native element adds
 * (form value, label click, uncontrolled mode) has to actually be there.
 */

describe("Switch", () => {
  it("is announced as a switch, named by its label, and toggles on a click on the words", () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Email notifications" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Email notifications" });
    expect(sw.tagName).toBe("INPUT");
    expect(sw).toHaveAttribute("type", "checkbox");
    fireEvent.click(screen.getByText("Email notifications"));
    expect(sw).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("works controlled, calling onChange and onCheckedChange both", () => {
    const onChange = vi.fn();
    function Controlled() {
      const [on, setOn] = useState(true);
      return <Switch aria-label="Active" checked={on} onChange={onChange} onCheckedChange={setOn} />;
    }
    render(<Controlled />);
    const sw = screen.getByRole("switch", { name: "Active" });
    expect(sw).toBeChecked();
    fireEvent.click(sw);
    expect(sw).not.toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("works uncontrolled and submits with its form", () => {
    const { container } = render(
      <form>
        <Switch aria-label="Active" name="active" defaultChecked />
      </form>,
    );
    expect(new FormData(container.querySelector("form")!).get("active")).toBe("on");
  });

  it("cannot be turned back into a plain checkbox by a spread props object", () => {
    const props = { role: "checkbox", type: "text" } as unknown as object;
    render(<Switch aria-label="Active" {...props} />);
    const sw = screen.getByRole("switch", { name: "Active" });
    expect(sw).toHaveAttribute("type", "checkbox");
  });

  it("forwards the ref and every attribute it does not own", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Switch ref={ref} aria-label="Active" data-tour="anchor" />);
    const sw = screen.getByRole("switch");
    expect(ref.current).toBe(sw);
    expect(sw).toHaveAttribute("data-tour", "anchor");
  });

  it("renders the switch alone when there is nothing to lay out beside it", () => {
    const { container } = render(<Switch aria-label="Active" className="ms-2" />);
    const sw = screen.getByRole("switch");
    expect(container.querySelector("label")).toBeNull();
    expect(container.firstElementChild).toBe(sw.parentElement);
    expect(sw.parentElement).toHaveClass("ms-2");
  });

  it("has two sizes, md by default", () => {
    const { rerender } = render(<Switch aria-label="S" />);
    expect(screen.getByRole("switch")).toHaveClass("h-5", "w-9");
    rerender(<Switch aria-label="S" size="sm" />);
    expect(screen.getByRole("switch")).toHaveClass("h-4", "w-7");
  });

  it("describes itself with the description, merged after the caller's own", () => {
    render(
      <>
        <span id="own">Own</span>
        <Switch label="Browser notifications" description="Needs permission" aria-describedby="own" />
      </>,
    );
    const sw = screen.getByRole("switch", { name: "Browser notifications" });
    const ids = (sw.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(["Own", "Needs permission"]);
  });

  it("puts the switch at the end of the row by default and at the start on request", () => {
    const { container, rerender } = render(<Switch label="Words" />);
    const row = () => container.firstElementChild!;
    expect(row().lastElementChild?.querySelector("[role=switch]")).not.toBeNull();
    rerender(<Switch label="Words" switchPosition="start" />);
    expect(row().firstElementChild?.querySelector("[role=switch]")).not.toBeNull();
  });

  it("refuses the click when disabled and fades the row", () => {
    const onCheckedChange = vi.fn();
    const { container } = render(<Switch label="Locked" disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByText("Locked"));
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(container.firstElementChild).toHaveClass("opacity-60");
  });

  it("asks for a keyboard focus ring in a token colour", () => {
    render(<Switch aria-label="S" />);
    const cls = screen.getByRole("switch").className;
    expect(cls).toMatch(/focus-visible:ring-2/);
    expect(cls).toMatch(/focus-visible:ring-\[var\(--[a-z-]+\)\]/);
  });

  it("moves the thumb with a LOGICAL offset, so it travels the right way in RTL", () => {
    const { container } = render(<Switch aria-label="S" />);
    const thumb = container.querySelector("[role=switch] + span")!;
    expect(thumb).toHaveAttribute("aria-hidden", "true");
    const cls = thumb.getAttribute("class") ?? "";
    expect(cls).toMatch(/peer-checked:start-\[/);
    expect(cls).not.toMatch(/(^|\s|:)(-?translate-x|left|right)-/);
  });
});
