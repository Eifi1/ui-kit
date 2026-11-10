import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../button";
import { FormActions } from "../form-actions";
import { WriteLockProvider } from "../write-lock";
import { stubDesktop, stubPhone } from "../../test/viewport";

/**
 * FormActions stacked on a phone: Cancel and Save fill the width, and so must an action the
 * caller passes as `children`. A bare one always did — the column stretches its items — but a
 * REFUSED one sits in its reason's frame (the line under it, or the tooltip's wrapper), which
 * keeps the control at its own width; the column stretched only the frame. keksdose's "Save
 * as template" (`commit`, in the read-only demo) stood narrow between the two full-width
 * buttons, and keksdose widened it by hand with `usePhoneLayout` and `w-full`.
 *
 * jsdom lays nothing out, so "fills its line" is read off the classes, as the CSS reads them.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

const REASON = "Read-only demo — saving is disabled.";

const stretches = (el: Element) => el.classList.contains("flex-col") && el.classList.contains("items-stretch");

/**
 * Whether a stacked row's button fills its line: it is `w-full` itself (the kit's Cancel and
 * Save), or the stacked column stretches it — as the group's own item, or as the control of a
 * lock frame the group stretches through.
 */
function fillsLine(button: HTMLElement): boolean {
  if (button.classList.contains("w-full")) return true;
  const parent = button.parentElement!;
  if (stretches(parent) && parent.closest("[data-stacked]")) return true;
  if (!parent.hasAttribute("data-lock-frame")) return false;
  const group = parent.parentElement!;
  return (
    stretches(group) &&
    group.classList.contains("[&>[data-lock-frame]]:flex-col") &&
    group.classList.contains("[&>[data-lock-frame]]:items-stretch")
  );
}

function Row({ extra }: { extra: ReactNode }) {
  return (
    <WriteLockProvider locked reason={REASON}>
      <FormActions stack="phone" onCancel={() => {}} onSubmit={() => {}} submitLabel="Save list" commit>
        {extra}
      </FormActions>
    </WriteLockProvider>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

/** keksdose's extra action: it commits, so the read-only demo's lock refuses it. */
const TEMPLATE = (
  <Button variant="secondary" commit onClick={() => {}}>
    Save as template
  </Button>
);

describe("FormActions stacked: a caller's action fills its line", () => {
  it("a locked one on a touch phone, in its reason line, as Cancel and Save do", () => {
    stubPhone({ coarse: true });
    render(<Row extra={TEMPLATE} />);
    const template = button("Save as template");
    // The reason line's frame, under the button: the case that stood narrow.
    expect(template.closest("[data-slot=disabled-reason]")).not.toBeNull();
    expect(fillsLine(template), "Save as template fills its line").toBe(true);
    expect(fillsLine(button("Cancel"))).toBe(true);
    expect(fillsLine(button("Save list"))).toBe(true);
  });

  it("a locked one in the tooltip's wrapper — a narrow window with a mouse", () => {
    stubPhone();
    render(<Row extra={TEMPLATE} />);
    const template = button("Save as template");
    expect(template.closest("[data-slot=disabled-reason]")).toBeNull();
    expect(template.parentElement).toHaveAttribute("data-lock-frame");
    expect(fillsLine(template), "Save as template fills its line").toBe(true);
  });

  it("one refused for a reason of its own, and a bare one", () => {
    stubPhone({ coarse: true });
    render(
      <Row
        extra={
          <>
            <Button variant="secondary" disabledReason="Keep at least one item first" onClick={() => {}}>
              Save as template
            </Button>
            <Button variant="secondary" onClick={() => {}}>
              Print
            </Button>
          </>
        }
      />,
    );
    expect(fillsLine(button("Save as template"))).toBe(true);
    expect(fillsLine(button("Print"))).toBe(true);
  });

  it("reaches no frame inside an element of the caller's own", () => {
    stubPhone({ coarse: true });
    render(<Row extra={<div className="flex gap-2">{TEMPLATE}</div>} />);
    // The caller's row is the item the column stretches; what is inside it is the caller's.
    expect(fillsLine(button("Save as template"))).toBe(false);
  });

  it("leaves the desktop's row alone", () => {
    stubDesktop();
    const { container } = render(<Row extra={TEMPLATE} />);
    const row = container.querySelector("[data-slot=form-actions]")!;
    expect(row).not.toHaveAttribute("data-stacked");
    const classes = (el: Element) => el.getAttribute("class") ?? "";
    expect([row, ...row.querySelectorAll("*")].filter((el) => classes(el).includes("data-lock-frame"))).toEqual([]);
    expect(button("Save as template")).not.toHaveClass("w-full");
  });
});
