import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmountInput } from "../amount-input";
import { CalculatorButton } from "../calculator";
import { MoneyField } from "../money-field";
import { NumberField } from "../number-field";

/**
 * A calculator session commits ONCE (refactor audit 2026-10-30, INP-1): on "=" — the key,
 * or Enter in the display — or when the pad closes on a result not committed yet. Every
 * keystroke that resolves still reaches `onChange`, so the field tracks the pad live.
 *
 * Before, the two field engines got it wrong in opposite directions. NumberInput and
 * NumberField never committed a calculator result at all: the field showed 150 while the
 * host kept 100, and Kurvenschmiede's dialogs saved the old number. AmountInput and
 * MoneyField committed every resolving keystroke — "100+5" saved 105 on its way to 150 —
 * and keksdose's threshold field, `disabled` while it saves, lost its calculator on the
 * first one.
 */

async function openPad(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open calculator" }));
  return screen.getByRole("textbox", { name: "Calculation" });
}

describe("NumberField's calculator", () => {
  it("commits the session once on Enter in the display, and not again when it closes", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField label="Wheelbase" value={100} digits={2} onCommit={onCommit} />);
    const pad = await openPad(user);
    await user.type(pad, "+50");
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Wheelbase" })).toHaveValue("150");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(150);
  });

  it("commits the result the pad left in the field when it closes without '='", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField label="Wheelbase" value={100} onCommit={onCommit} />);
    const pad = await openPad(user);
    await user.type(pad, "+50");
    await user.keyboard("{Escape}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(150);
  });

  it("commits nothing when a lock arrives with the pad open", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(<NumberField label="Wheelbase" value={100} onCommit={onCommit} />);
    const pad = await openPad(user);
    await user.type(pad, "+50");
    rerender(<NumberField label="Wheelbase" value={100} onCommit={onCommit} disabledReason="Read-only" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("MoneyField's calculator", () => {
  it("commits nothing while the sum is typed, then once on '='", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<MoneyField label="Threshold" currency="CHF" value={100} onCommit={onCommit} />);
    const pad = await openPad(user);
    await user.type(pad, "+50");
    expect(onCommit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Equals" }));
    await user.keyboard("{Escape}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(150);
  });

  it("keeps the pad open on a field that is disabled while it saves (keksdose's threshold)", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    function Threshold() {
      const [saving, setSaving] = useState(false);
      return (
        <MoneyField
          label="Threshold"
          currency="CHF"
          value={100}
          disabled={saving}
          onCommit={(v) => {
            save(v);
            setSaving(true);
          }}
        />
      );
    }
    render(<Threshold />);
    const pad = await openPad(user);
    await user.type(pad, "+5");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.type(pad, "0{Enter}");
    expect(save).toHaveBeenCalledExactlyOnceWith(150);
  });
});

describe("AmountInput's calculator", () => {
  it("reports every result on onChange and settles once on close", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCommit = vi.fn();
    function Amount() {
      const [value, setValue] = useState("100");
      return (
        <AmountInput
          label="Amount"
          currency="CHF"
          value={value}
          onChange={(text) => {
            onChange(text);
            setValue(text);
          }}
          onCommit={onCommit}
        />
      );
    }
    render(<Amount />);
    const pad = await openPad(user);
    await user.type(pad, "+50");
    expect(onChange.mock.calls.map(([text]) => text)).toEqual(["105", "150"]);
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("150");
  });

  it("commits nothing for a pad opened and closed untouched", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<AmountInput label="Amount" currency="CHF" value="100" onChange={() => {}} onCommit={onCommit} />);
    await openPad(user);
    await user.keyboard("{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("CalculatorButton's onCommit", () => {
  it("fires at each '=' and on closing over a newer result, never per keystroke", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    function Pad() {
      const [value, setValue] = useState("12");
      return <CalculatorButton value={value} onChange={setValue} onCommit={onCommit} />;
    }
    render(<Pad />);
    const pad = await openPad(user);
    await user.type(pad, "*2+1");
    expect(onCommit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Equals" }));
    await user.type(pad, "*2");
    await user.keyboard("{Escape}");
    expect(onCommit.mock.calls).toEqual([["25"], ["50"]]);
  });
});
