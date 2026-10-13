import type { FormEvent, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../input";
import { AmountInput } from "../amount-input";
import { MoneyField } from "../money-field";
import { WriteLockProvider } from "../write-lock";
import { PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";

/**
 * Round 0.34 C2: the write lock NumberInput got in 0.33.1, on the other fields that save
 * themselves — `Input` (KS U10: Kurvenschmiede's segment and profile names, behind a
 * local `CommitInput`), `AmountInput` and `MoneyField` (keksdose's 25 and kastlan's 21
 * self-saving amounts). Locked = still in the tab order, `readOnly` + `aria-disabled`,
 * the reason in the tooltip and the description, and nothing a save listens to fires.
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

describe("Input under a write lock (KS U10)", () => {
  it("stays in the tab order, read-only and described", async () => {
    const user = userEvent.setup();
    render(locked(<Input label="Segment name" value="Ramp up" onChange={() => {}} commit />));
    const input = screen.getByRole("textbox", { name: "Segment name" });
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-disabled", "true");
    expect(input).not.toBeDisabled();
    expect(input).toHaveAccessibleDescription(REASON);
    expect(input).toHaveValue("Ramp up");

    await user.click(screen.getByRole("button", { name: "Before" }));
    await user.tab();
    expect(input).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("reports nothing a save listens to: no change, no blur, no Enter — other keys still reach onKeyDown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const onKeyDown = vi.fn();
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      locked(
        <form onSubmit={onSubmit}>
          <Input
            label="Segment name"
            value="Ramp up"
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            commit
          />
        </form>,
      ),
    );
    const input = screen.getByRole("textbox", { name: "Segment name" });
    await user.click(input);
    await user.type(input, "x");
    expect(input).toHaveValue("Ramp up");
    // Enter is swallowed — the form around it is not submitted — and not reported.
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onKeyDown.mock.calls.every(([e]) => e.key !== "Enter")).toBe(true);
    expect(onKeyDown).toHaveBeenCalled();
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(onBlur).not.toHaveBeenCalled();
  });

  it("follows its scope, and an Input without `commit` stays editable under the lock", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <Input label="Own setting" defaultValue="a" onBlur={onBlur} commit={{ except: ["billing"] }} />
        <Input label="Draft" defaultValue="b" />
      </WriteLockProvider>,
    );
    for (const name of ["Own setting", "Draft"]) {
      const input = screen.getByRole("textbox", { name });
      expect(input).not.toHaveAttribute("readonly");
      expect(input).not.toHaveAttribute("aria-disabled");
    }
    await user.type(screen.getByRole("textbox", { name: "Own setting" }), "c");
    await user.tab();
    expect(screen.getByRole("textbox", { name: "Own setting" })).toHaveValue("ac");
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("takes a `disabledReason` of its own, which wins over `disabled` — labelled or not", () => {
    render(
      <>
        <Input label="Name" value="Profile A" readOnly disabled disabledReason="Signed; it cannot change." />
        <Input aria-label="Code" value="X1" readOnly disabled disabledReason="Issued by the server." />
      </>,
    );
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name).not.toBeDisabled();
    expect(name).toHaveAttribute("readonly");
    expect(name).toHaveAccessibleDescription("Signed; it cannot change.");
    const code = screen.getByRole("textbox", { name: "Code" });
    expect(code).not.toBeDisabled();
    expect(code).toHaveAccessibleDescription("Issued by the server.");
  });

  it("puts the reason between the caption and the error, and keeps `className` on the outer box", () => {
    const { container } = render(
      locked(
        <Input
          label="Segment name"
          value="Ramp up"
          onChange={() => {}}
          commit
          className="w-56"
          hint="Shown in the legend"
          error="Already taken"
          aria-describedby="own"
        />,
      ),
    );
    const input = screen.getByRole("textbox", { name: "Segment name" });
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(4);
    expect(ids[0]).toBe("own");
    expect(document.getElementById(ids[1])).toHaveTextContent("Shown in the legend");
    expect(document.getElementById(ids[2])).toHaveTextContent(REASON);
    expect(document.getElementById(ids[3])).toHaveTextContent("Already taken");
    // The Tooltip's box is the outermost of the field now, so it carries the width.
    const sized = container.querySelectorAll(".w-56");
    expect(sized).toHaveLength(1);
    expect(sized[0]).toContainElement(input);
    expect(sized[0].tagName).toBe("SPAN");
  });

  it("an unlabelled one moves `className` the same way", () => {
    const { container } = render(locked(<Input aria-label="Name" value="A" onChange={() => {}} commit className="w-40" />));
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).not.toHaveClass("w-40");
    const sized = container.querySelector(".w-40");
    expect(sized?.tagName).toBe("SPAN");
    expect(sized).toContainElement(input);
  });

  it("a locked password field hands the keyboard no reveal toggle", () => {
    render(locked(<Input type="password" label="Secret" value="hunter2" onChange={() => {}} commit />));
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  });

  it("without a provider `commit` changes nothing", () => {
    render(<Input label="Name" value="A" onChange={() => {}} commit />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).not.toHaveAttribute("readonly");
    expect(input).not.toHaveAttribute("aria-disabled");
    expect(input).not.toHaveAccessibleDescription();
  });
});

describe("AmountInput under a write lock (round 0.34 C2)", () => {
  it("stays in the tab order, read-only and described, with no calculator and a read-out chip", async () => {
    const user = userEvent.setup();
    render(
      locked(
        <AmountInput
          label="Assigned"
          value="120.50"
          onChange={() => {}}
          currency="CHF"
          onCurrencyChange={() => {}}
          commit
        />,
      ),
    );
    const input = screen.getByRole("textbox", { name: "Assigned" });
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-disabled", "true");
    expect(input).toHaveAccessibleDescription(REASON);
    expect(input).toHaveValue("120.50");
    expect(screen.queryByRole("button", { name: /calculator/i })).toBeNull();
    // Picking a currency is a change too: the chip is a read-out, not the picker.
    expect(screen.queryByRole("button", { name: /currency/i })).toBeNull();
    expect(screen.getByText("CHF")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Before" }));
    await user.tab();
    expect(input).toHaveFocus();
  });

  it("changes nothing: no typing, no sign, no settle on blur or Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const onNegativeChange = vi.fn();
    render(
      locked(
        <AmountInput
          label="Assigned"
          value="12.345"
          onChange={onChange}
          onCommit={onCommit}
          onNegativeChange={onNegativeChange}
          currency="CHF"
          commit
        />,
      ),
    );
    const input = screen.getByRole("textbox", { name: "Assigned" });
    await user.click(input);
    await user.type(input, "-5");
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onNegativeChange).not.toHaveBeenCalled();
  });

  it("takes a `disabledReason` of its own, which wins over `disabled`, between caption and error", () => {
    render(
      <AmountInput
        label="Price"
        value="4"
        onChange={() => {}}
        disabled
        disabledReason="Set by the contract."
        hint="Per unit"
        error="Too low"
      />,
    );
    const input = screen.getByRole("textbox", { name: "Price" });
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute("readonly");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "Per unit",
      "Set by the contract.",
      "Too low",
    ]);
  });

  it("an amount without `commit` stays editable under the lock", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(locked(<AmountInput label="Draft" value="" onChange={onChange} />));
    const input = screen.getByRole("textbox", { name: "Draft" });
    expect(input).not.toHaveAttribute("readonly");
    await user.type(input, "5");
    expect(onChange).toHaveBeenCalledWith("5");
  });

  describe("on a phone", () => {
    afterEach(() => {
      // @ts-expect-error jsdom leaves it undefined by default; restore that.
      delete window.matchMedia;
    });

    it("opens no numpad", () => {
      stubViewportWidth(PHONE_WIDTH, { coarse: true, reducedMotion: true });
      render(locked(<AmountInput label="Assigned" value="1" onChange={() => {}} commit />));
      fireEvent.focus(screen.getByRole("textbox", { name: "Assigned" }));
      expect(screen.queryByRole("button", { name: "5" })).toBeNull();
    });
  });
});

describe("MoneyField under a write lock (round 0.34 C2)", () => {
  it("passes `commit` on: read-only, described, and `onCommit` never fires", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(locked(<MoneyField ariaLabel="Amount" currency="CHF" value={12.5} onCommit={onCommit} commit />));
    const input = screen.getByRole("textbox", { name: "Amount" });
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAccessibleDescription(REASON);
    await user.click(input);
    await user.type(input, "9");
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
