import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntegerField, NumberField } from "../number-field";
import { NumberInput } from "../number-input";
import { WriteLockProvider } from "../write-lock";

/**
 * Kurvenschmiede's ask (0.33 adoption): a NumberField could not be locked without
 * leaving the tab order. `disabled` was the only way, so the reason never reached a
 * keyboard, and its F80 grew a `commit` on every session-page control and a local
 * `CommitInput`. Now NumberInput — and with it NumberField and IntegerField — takes
 * `commit` and `disabledReason` the way the Combobox family does: focusable, read-only,
 * the steps off, the reason described.
 */

const REASON = "Shared with you to read";

function locked(field: ReactNode) {
  return (
    <WriteLockProvider locked reason={REASON}>
      <button type="button">Before</button>
      {field}
      <button type="button">After</button>
    </WriteLockProvider>
  );
}

describe("NumberField under a write lock (0.33.1)", () => {
  it("stays in the tab order, read-only and described", async () => {
    const user = userEvent.setup();
    render(locked(<NumberField label="Wheelbase" value={2700} onCommit={() => {}} commit />));
    const input = screen.getByRole("textbox", { name: "Wheelbase" });
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-disabled", "true");
    expect(input).not.toBeDisabled();
    expect(input).toHaveAccessibleDescription(REASON);
    expect(input).toHaveValue("2700");

    await user.click(screen.getByRole("button", { name: "Before" }));
    await user.tab();
    expect(input).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("changes nothing: no typing, no steps, no calculator, no commit on blur or Enter", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const onValueChange = vi.fn();
    render(
      locked(
        <NumberField label="Wheelbase" value={2700} step={10} onCommit={onCommit} onValueChange={onValueChange} commit />,
      ),
    );
    const input = screen.getByRole("textbox", { name: "Wheelbase" });
    expect(screen.queryByRole("button", { name: /calculator/i })).toBeNull();

    await user.click(input);
    await user.type(input, "5");
    await user.keyboard("{ArrowUp}{PageDown}");
    expect(input).toHaveValue("2700");
    // Enter is swallowed — the form around it is not submitted — and commits nothing.
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("leaves the arrows to the caret, and every other key to the browser", () => {
    render(locked(<NumberField label="Wheelbase" value={2700} step={10} onCommit={() => {}} commit />));
    const input = screen.getByRole("textbox", { name: "Wheelbase" });
    expect(fireEvent.keyDown(input, { key: "ArrowUp" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Home" })).toBe(true);
  });

  it("follows its scope, and a field without `commit` stays editable under the lock", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <NumberField label="Own setting" value={1} onCommit={onCommit} commit={{ except: ["billing"] }} />
        <NumberField label="Draft" value={2} onCommit={onCommit} />
      </WriteLockProvider>,
    );
    for (const name of ["Own setting", "Draft"]) {
      const input = screen.getByRole("textbox", { name });
      expect(input).not.toHaveAttribute("readonly");
      expect(input).not.toHaveAttribute("aria-disabled");
    }
    const own = screen.getByRole("textbox", { name: "Own setting" });
    await user.clear(own);
    await user.type(own, "4");
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(4);
  });

  it("takes a `disabledReason` of its own, which wins over `disabled`", () => {
    render(<NumberField label="Year" value={1984} onCommit={() => {}} disabled disabledReason="Signed; it cannot change." />);
    const input = screen.getByRole("textbox", { name: "Year" });
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAccessibleDescription("Signed; it cannot change.");
  });

  it("puts the reason between the caption and the error, and keeps `className` on the outer box", () => {
    const { container } = render(
      locked(
        <NumberField
          label="Wheelbase"
          value={2700}
          onCommit={() => {}}
          commit
          className="w-32"
          hint="Axle to axle"
          error="Too short"
          aria-describedby="own"
        />,
      ),
    );
    const input = screen.getByRole("textbox", { name: "Wheelbase" });
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(4);
    expect(ids[0]).toBe("own");
    expect(document.getElementById(ids[1])).toHaveTextContent("Axle to axle");
    expect(document.getElementById(ids[2])).toHaveTextContent(REASON);
    expect(document.getElementById(ids[3])).toHaveTextContent("Too short");
    // The Tooltip's box is the outermost of the field now, so it carries the width.
    const sized = container.querySelectorAll(".w-32");
    expect(sized).toHaveLength(1);
    expect(sized[0]).toContainElement(input);
    expect(sized[0].tagName).toBe("SPAN");
  });

  it("without a provider `commit` changes nothing", () => {
    render(<NumberField label="Wheelbase" value={2700} onCommit={() => {}} commit />);
    const input = screen.getByRole("textbox", { name: "Wheelbase" });
    expect(input).not.toHaveAttribute("readonly");
    expect(input).not.toHaveAttribute("aria-disabled");
    expect(input).not.toHaveAccessibleDescription();
  });
});

describe("the lock on the shared path (0.33.1)", () => {
  it("NumberInput locks the same way, and IntegerField passes `commit` on", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      locked(
        <>
          <NumberInput label="Rate" value="2.5" onChange={onChange} onCommit={onCommit} step={0.25} commit />
          <IntegerField label="Rooms" value={3} onCommit={onCommit} commit />
        </>,
      ),
    );
    for (const name of ["Rate", "Rooms"]) {
      const input = screen.getByRole("textbox", { name });
      expect(input).toHaveAttribute("readonly");
      expect(input).toHaveAccessibleDescription(REASON);
      fireEvent.keyDown(input, { key: "ArrowUp" });
      fireEvent.blur(input);
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  describe("on a phone", () => {
    afterEach(() => {
      // @ts-expect-error jsdom leaves it undefined by default; restore that.
      delete window.matchMedia;
    });

    it("opens no numpad", () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;
      render(locked(<NumberField label="Wheelbase" value={2700} onCommit={() => {}} commit />));
      fireEvent.focus(screen.getByRole("textbox", { name: "Wheelbase" }));
      expect(screen.queryByRole("button", { name: "5" })).toBeNull();
    });
  });
});
