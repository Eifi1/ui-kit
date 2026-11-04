import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LockFrame } from "../field-parts";

/**
 * The fields' one lock frame (0.55, held back from 0.53; 0.52 code review,
 * date-picker.tsx:300): fifteen fields wrote the same ternary around `LockedReason`. The
 * field as it is while unlocked; while locked, LockedReason's frame — the line or the
 * Tooltip — `block`, then the caller's classes. The fields' own lock tests
 * (date-pickers-write-lock, locked-reason.line, field-write-lock, …) pin each field on it.
 */

const REASON = "Shared with you to read";
const LOCKED = { locked: true, reason: REASON, reasonId: "the-reason" };
const OPEN = { locked: false, reason: undefined, reasonId: "no-reason" };

const classes = (el: Element) => el.className.split(/\s+/);

describe("LockFrame", () => {
  it("unlocked: the field as it is — no element around it, no reason", () => {
    const { container } = render(
      <LockFrame lock={OPEN} display="line" className="w-48">
        <input aria-label="Name" />
      </LockFrame>,
    );
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(screen.getByRole("textbox"));
    expect(container.querySelector("[data-slot='disabled-reason'], #no-reason")).toBeNull();
  });

  it("locked, as a line: the reason under the field, the field's description; block, then the caller's classes", () => {
    const { container } = render(
      <LockFrame lock={LOCKED} display="line" className="w-48">
        <input aria-label="Name" aria-describedby="the-reason" />
      </LockFrame>,
    );
    const frame = container.firstElementChild!;
    expect(frame).toHaveAttribute("data-slot", "disabled-reason");
    expect(frame).toContainElement(screen.getByRole("textbox"));
    expect(classes(frame)).toEqual(expect.arrayContaining(["block", "w-48"]));
    // `block` replaces the line's own `inline-flex`: a full-width field stays full width.
    expect(classes(frame)).not.toContain("inline-flex");
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription(REASON);
    expect(frame).toHaveTextContent(REASON);
  });

  it("locked, as a tooltip: a hidden copy of the reason for the description, the bubble on hover", () => {
    const { container } = render(
      <LockFrame lock={LOCKED} display="tooltip" className="col-span-2">
        <input aria-label="Name" aria-describedby="the-reason" />
      </LockFrame>,
    );
    const frame = container.firstElementChild!;
    expect(frame).toContainElement(screen.getByRole("textbox"));
    expect(classes(frame)).toEqual(expect.arrayContaining(["block", "col-span-2"]));
    expect(classes(frame)).not.toContain("inline-flex");
    const copy = container.querySelector("#the-reason")!;
    expect(copy).toHaveAttribute("hidden");
    expect(copy).toHaveTextContent(REASON);
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription(REASON);
    // No line on screen in this form.
    expect(container.querySelector("[data-slot='disabled-reason']")).toBeNull();
  });

  it("a display class from the caller replaces block (CountrySelect's flex row)", () => {
    const { container } = render(
      <LockFrame lock={LOCKED} display="line" className="flex w-full items-stretch">
        <button type="button">Switzerland</button>
      </LockFrame>,
    );
    const frame = container.firstElementChild!;
    expect(classes(frame)).toEqual(expect.arrayContaining(["flex", "w-full", "items-stretch"]));
    expect(classes(frame)).not.toContain("block");
  });

  it("without a className: block alone (the Combobox family)", () => {
    const { container } = render(
      <LockFrame lock={LOCKED} display="line">
        <button type="button">Example Ltd</button>
      </LockFrame>,
    );
    expect(classes(container.firstElementChild!)).toContain("block");
  });
});
