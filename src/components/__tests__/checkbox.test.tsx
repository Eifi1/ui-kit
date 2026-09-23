import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Checkbox } from "../checkbox";

/**
 * The kit's checkbox is a NATIVE `<input type="checkbox">` with its paint replaced.
 *
 * That is the point of it, so most of what is pinned here is that nothing a raw
 * checkbox did was lost on the way — the label click, the form value, the uncontrolled
 * mode, a caller's own attributes — plus the three things a raw one could not do: say
 * it is wrong (`invalid`/`error`), say why, and show "some" (`indeterminate`).
 */

const described = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
const descriptions = (el: Element) =>
  described(el).map((id) => document.getElementById(id)?.textContent ?? `#${id} MISSING`);

describe("Checkbox", () => {
  it("is a native checkbox named by its label, and a click on the words toggles it", () => {
    const onChange = vi.fn();
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Stop processing" onChange={onChange} onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Stop processing" });
    expect(box.tagName).toBe("INPUT");
    expect(box).toHaveAttribute("type", "checkbox");
    fireEvent.click(screen.getByText("Stop processing"));
    expect(box).toBeChecked();
    // Both callbacks, in the shapes their callers expect: the event for the DOM
    // spelling, the boolean for the one Lenkbank and Radix used.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target).toBe(box);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("works controlled", () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return <Checkbox label="Active" checked={on} onCheckedChange={setOn} />;
    }
    render(<Controlled />);
    const box = screen.getByRole("checkbox", { name: "Active" });
    fireEvent.click(box);
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
  });

  it("submits with its form like the raw input did", () => {
    const { container } = render(
      <form>
        <Checkbox label="On budget" name="onBudget" value="yes" defaultChecked />
      </form>,
    );
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("onBudget")).toBe("yes");
  });

  it("renders the box alone without label, description or error", () => {
    const { container } = render(<Checkbox aria-label="Select row" className="self-end" />);
    const box = screen.getByRole("checkbox", { name: "Select row" });
    // No row, no label: it drops into a table cell or a caller's own <label>.
    expect(container.querySelector("label")).toBeNull();
    expect(container.firstElementChild).toBe(box.parentElement);
    expect(box.parentElement).toHaveClass("self-end");
  });

  it("puts `className` on the row and `inputClassName` on the input", () => {
    const { container } = render(
      <Checkbox label="Mirror steps" className="self-end pb-2" inputClassName="custom-box" />,
    );
    expect(container.firstElementChild).toHaveClass("self-end", "pb-2");
    expect(screen.getByRole("checkbox")).toHaveClass("custom-box");
  });

  it("forwards the ref and every attribute it does not own", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} label="Active" data-tour="anchor" name="active" required />);
    const box = screen.getByRole("checkbox", { name: "Active" });
    expect(ref.current).toBe(box);
    expect(box).toHaveAttribute("data-tour", "anchor");
    expect(box).toHaveAttribute("name", "active");
    expect(box).toBeRequired();
  });

  it("stays a checkbox whatever a spread props object says", () => {
    const props = { type: "text" } as unknown as object;
    render(<Checkbox aria-label="Box" {...props} />);
    expect(screen.getByRole("checkbox", { name: "Box" })).toHaveAttribute("type", "checkbox");
  });

  it("keeps a caller's own id on the input and points the label at it", () => {
    render(<Checkbox id="is-default" label="Default account" />);
    expect(screen.getByLabelText("Default account")).toHaveAttribute("id", "is-default");
  });

  describe("indeterminate", () => {
    it("sets the DOM property and shows the dash with the checked fill", () => {
      render(<Checkbox aria-label="All rows" indeterminate />);
      const box = screen.getByRole<HTMLInputElement>("checkbox", { name: "All rows" });
      expect(box.indeterminate).toBe(true);
      // jest-dom reads `indeterminate` as the "mixed" state.
      expect(box).toBePartiallyChecked();
      expect(box.className).toMatch(/(^|\s)bg-\[var\(--brand\)\]/);
    });

    it("puts the dash back after a click while the prop still says so", () => {
      // A click clears the property in the DOM. A caller that answers the click by
      // keeping `indeterminate` (say, the header box while rows are still loading)
      // must see the dash again on the next render, although the prop never changed.
      function Header() {
        const [clicks, setClicks] = useState(0);
        return (
          <>
            <Checkbox aria-label="All rows" indeterminate onChange={() => setClicks((n) => n + 1)} />
            <span>{clicks}</span>
          </>
        );
      }
      render(<Header />);
      const box = screen.getByRole<HTMLInputElement>("checkbox", { name: "All rows" });
      fireEvent.click(box);
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(box.indeterminate).toBe(true);
    });

    it("clears when the prop goes false", () => {
      const { rerender } = render(<Checkbox aria-label="All rows" indeterminate />);
      rerender(<Checkbox aria-label="All rows" indeterminate={false} />);
      expect(screen.getByRole<HTMLInputElement>("checkbox").indeterminate).toBe(false);
    });

    it("hands the forwarded ref the same node the property is set on", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Checkbox ref={ref} aria-label="All rows" indeterminate />);
      expect(ref.current?.indeterminate).toBe(true);
    });
  });

  describe("description and error", () => {
    it("describes the box with the description, which is NOT part of its name", () => {
      render(<Checkbox label="Default account" description="Used when no account is chosen" />);
      const box = screen.getByRole("checkbox", { name: "Default account" });
      expect(descriptions(box)).toEqual(["Used when no account is chosen"]);
    });

    it("renders the error, implies aria-invalid and paints the danger border", () => {
      render(<Checkbox label="Accept the terms" error="Required to continue" />);
      const box = screen.getByRole("checkbox", { name: "Accept the terms" });
      expect(box).toHaveAttribute("aria-invalid", "true");
      expect(descriptions(box)).toEqual(["Required to continue"]);
      expect(box.className).toContain("border-[var(--danger-border)]");
    });

    it("merges caller → description → error, in reading order", () => {
      render(
        <>
          <span id="own">Own hint</span>
          <Checkbox label="Terms" aria-describedby="own" description="Read them" error="Tick it" />
        </>,
      );
      expect(descriptions(screen.getByRole("checkbox"))).toEqual(["Own hint", "Read them", "Tick it"]);
    });

    it("leaves `invalid` working alone and points at nothing", () => {
      render(<Checkbox aria-label="Terms" invalid />);
      const box = screen.getByRole("checkbox");
      expect(box).toHaveAttribute("aria-invalid", "true");
      expect(box).not.toHaveAttribute("aria-describedby");
    });

    it("treats the happy-path falsy values as no message", () => {
      for (const error of [null, false, ""] as const) {
        const { unmount } = render(<Checkbox aria-label="Terms" error={error} />);
        const box = screen.getByRole("checkbox");
        expect(box).not.toHaveAttribute("aria-invalid");
        expect(box).not.toHaveAttribute("aria-describedby");
        unmount();
      }
    });

    it("keeps a caller's own aria-invalid", () => {
      render(<Checkbox aria-label="Terms" aria-invalid="true" />);
      expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("mints distinct ids per box", () => {
      render(
        <>
          <Checkbox label="One" error="First" />
          <Checkbox label="Two" error="Second" />
        </>,
      );
      expect(descriptions(screen.getByRole("checkbox", { name: "One" }))).toEqual(["First"]);
      expect(descriptions(screen.getByRole("checkbox", { name: "Two" }))).toEqual(["Second"]);
    });
  });

  it("refuses the click when disabled, and fades the whole row", () => {
    const onCheckedChange = vi.fn();
    const { container } = render(<Checkbox label="Locked" disabled onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Locked" });
    expect(box).toBeDisabled();
    fireEvent.click(screen.getByText("Locked"));
    expect(box).not.toBeChecked();
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(container.firstElementChild).toHaveClass("opacity-60");
  });

  it("asks for a keyboard focus ring in a token colour, offset from its own fill", () => {
    render(<Checkbox aria-label="Box" />);
    const cls = screen.getByRole("checkbox").className;
    expect(cls).toMatch(/focus-visible:ring-2/);
    expect(cls).toMatch(/focus-visible:ring-\[var\(--[a-z-]+\)\]/);
    expect(cls).toMatch(/focus-visible:ring-offset-\[var\(--bg-surface\)\]/);
  });

  it("uses logical spacing only, so the row mirrors in a right-to-left form", () => {
    const { container } = render(<Checkbox label="Label" description="More" error="Wrong" />);
    for (const el of container.querySelectorAll("*")) {
      expect(el.getAttribute("class") ?? "").not.toMatch(/(^|\s)(ml|mr|pl|pr|left|right)-/);
    }
  });
});
