import { fireEvent, render, screen } from "@testing-library/react";
import { Check } from "lucide-react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../amount-input";
import { Chip } from "../chip";
import { FormActions } from "../form-actions";
import { currencyMinorDigits, roundToCurrency } from "../../lib/format";

/** keksdose's 406px round, M2–M5 (0.15.4). */
describe("FormActions sticky sits on the phone nav (M2)", () => {
  it("offsets by --app-nav-h", () => {
    render(<FormActions placement="sticky" />);
    const row = document.querySelector('[data-slot="form-actions"]') as HTMLElement;
    expect(row.style.bottom).toContain("--app-nav-h");
  });
});

describe("Chip children and icons (M3)", () => {
  it("lays mixed children out in a row, and keeps truncation for text", () => {
    render(
      <>
        <Chip>
          <Check aria-hidden />
          Synced
        </Chip>
        <Chip>Plain</Chip>
      </>,
    );
    expect(screen.getByText("Synced").className).toContain("inline-flex");
    expect(screen.getByText("Plain").className).toContain("truncate");
  });

  it("takes a ready element as its icon", () => {
    render(<Chip icon={<Check data-testid="glyph" className="text-[var(--success)]" />}>Done</Chip>);
    expect(screen.getByTestId("glyph").parentElement).toHaveAttribute("aria-hidden");
  });
});

describe("currency rounding (M5)", () => {
  it("knows minor units and rounds half away from zero in decimal", () => {
    expect(currencyMinorDigits("CHF")).toBe(2);
    expect(currencyMinorDigits("JPY")).toBe(0);
    expect(currencyMinorDigits(undefined)).toBeUndefined();
    expect(roundToCurrency(93.4213, "CHF")).toBe(93.42);
    expect(roundToCurrency(1.005, "EUR")).toBe(1.01);
    expect(roundToCurrency(-2.5, "JPY")).toBe(-3);
    expect(roundToCurrency(93.4213, "XXX-not-a-code")).toBe(93.4213);
    expect(roundToCurrency(93.4213, "CHF", 3)).toBe(93.421);
  });

  it("shows a host-set value at the minor unit while the field rests, untouched while editing", () => {
    render(<AmountInput ariaLabel="Amount" value="93.4213" onChange={() => {}} currency="CHF" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    expect(input).toHaveValue("93.42");
    fireEvent.focus(input);
    expect(input).toHaveValue("93.4213");
  });
});

describe("NumberInput reserves the unit's own width (M4)", () => {
  it("pads the field by the measured end controls", async () => {
    const { NumberInput } = await import("../number-input");
    const { vi } = await import("vitest");
    const callbacks: Array<() => void> = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          callbacks.push(cb);
        }
        observe() {
          callbacks.forEach((cb) => cb());
        }
        disconnect() {}
      },
    );
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 19.4, height: 20, top: 0, left: 0, right: 19.4, bottom: 20, x: 0, y: 0, toJSON() {} } as DOMRect);
    render(<NumberInput label="Rate" value="5" onChange={() => {}} suffix="%" calculator={false} />);
    expect(screen.getByRole("textbox", { name: /Rate/ }).style.paddingInlineEnd).toBe("24px");
    rect.mockRestore();
    vi.unstubAllGlobals();
  });
});
