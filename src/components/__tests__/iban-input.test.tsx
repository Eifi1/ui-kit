import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IbanInput, type IbanInputProps } from "../iban-input";
import { formatIban, ibanCheckDigits } from "../../lib/iban";

/**
 * IbanInput (kastlan, keksdose): grouped in, compact out, checked but never blocked.
 * Every IBAN is SYNTHETIC — zeros with a single 1, check digits from the module's own
 * helper.
 */

const make = (country: string, bban: string) => `${country}${ibanCheckDigits(country, bban)}${bban}`;
const CH = make("CH", `${"0".repeat(16)}1`);
const CH_QR = make("CH", `30000${"0".repeat(11)}1`);
/** CH with its last digit changed: the right length, the wrong checksum. */
const CH_BAD = `${CH.slice(0, -1)}2`;

function Harness(props: Partial<IbanInputProps> & { initial?: string; onValue?: (v: string) => void }) {
  const { initial = "", onValue, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <IbanInput
      label="IBAN"
      {...rest}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

const field = () => screen.getByRole("textbox", { name: "IBAN" }) as HTMLInputElement;

describe("IbanInput", () => {
  it("shows the value grouped in fours", () => {
    render(<IbanInput label="IBAN" value={CH} onValueChange={vi.fn()} />);
    expect(field()).toHaveValue(formatIban(CH));
    expect(field()).toHaveAttribute("type", "text");
  });

  it("emits the compact upper-case IBAN, and the raw event to onChange", () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(<IbanInput label="IBAN" value="" onValueChange={onValueChange} onChange={onChange} />);
    fireEvent.change(field(), { target: { value: ` ${formatIban(CH).toLowerCase().replace(/ /g, "-")} ` } });
    expect(onValueChange).toHaveBeenLastCalledWith(CH);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("groups as you type and keeps the caret after the character it followed", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), CH.toLowerCase());
    expect(field()).toHaveValue(formatIban(CH));
    // Insert a character after the first group's last digit: the groups move, the
    // caret stays right after what was typed.
    field().setSelectionRange(4, 4);
    await user.keyboard("7");
    expect(field().value.startsWith(`${CH.slice(0, 4)} 7`)).toBe(true);
    expect(field().selectionStart).toBe(6);
  });

  it("keeps the grouping and the caret when a space is typed in the middle", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={CH} onValue={onValue} />);
    await user.click(field());
    field().setSelectionRange(7, 7);
    await user.keyboard(" ");
    expect(field()).toHaveValue(formatIban(CH));
    expect(field().selectionStart).toBe(7);
    expect(onValue).toHaveBeenLastCalledWith(CH);
  });

  it("says nothing while a half-typed IBAN is being typed, and the length on blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), CH.slice(0, 10));
    expect(field()).not.toHaveAttribute("aria-invalid");
    await user.tab();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription("An IBAN from this country has 21 characters — this one has 10.");
  });

  it("shows a bad checksum as soon as the full length is typed — and keeps taking keys", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(field(), CH_BAD);
    expect(field()).toHaveFocus();
    expect(field()).toHaveAccessibleDescription("The check digits don’t match — a character is probably mistyped.");
    // Never blocked: one more key still reaches the value, and the field is the same
    // element it was before the message appeared.
    await user.keyboard("0");
    expect(onValue).toHaveBeenLastCalledWith(`${CH_BAD}0`);
    expect(field()).toHaveFocus();
    expect(field()).toHaveAccessibleDescription("An IBAN from this country has 21 characters — this one has 22.");
  });

  it("names an unknown country from the fourth character", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), "XX00");
    expect(field()).toHaveAccessibleDescription("“XX” is not the country code of an IBAN.");
  });

  it("is quiet for a valid IBAN and for an empty field", () => {
    const { rerender } = render(<IbanInput label="IBAN" value={CH} onValueChange={vi.fn()} />);
    expect(field()).not.toHaveAttribute("aria-invalid");
    rerender(<IbanInput label="IBAN" value="" onValueChange={vi.fn()} />);
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("kind='qr' refuses a regular IBAN, kind='plain' refuses a QR-IBAN", () => {
    const { rerender } = render(<IbanInput label="IBAN" kind="qr" value={CH} onValueChange={vi.fn()} />);
    expect(field()).toHaveAccessibleDescription("This is a regular IBAN. A QR-bill needs the account’s QR-IBAN.");
    rerender(<IbanInput label="IBAN" kind="qr" value={CH_QR} onValueChange={vi.fn()} />);
    expect(field()).not.toHaveAttribute("aria-invalid");
    rerender(<IbanInput label="IBAN" kind="plain" value={CH_QR} onValueChange={vi.fn()} />);
    expect(field()).toHaveAccessibleDescription(
      "This is a QR-IBAN, which only receives QR-bill payments. Enter the account’s regular IBAN.",
    );
    rerender(<IbanInput label="IBAN" value={CH_QR} onValueChange={vi.fn()} />);
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("shows the caller's error instead of its own, and takes its messages as labels", () => {
    const { rerender } = render(
      <IbanInput label="IBAN" value={CH_BAD} onValueChange={vi.fn()} error="Already on file" />,
    );
    expect(field()).toHaveAccessibleDescription("Already on file");
    rerender(
      <IbanInput label="IBAN" value={CH_BAD} onValueChange={vi.fn()} error={null} labels={{ checksum: "Prüfziffer falsch" }} />,
    );
    expect(field()).toHaveAccessibleDescription("Prüfziffer falsch");
    rerender(
      <IbanInput label="IBAN" value={CH.slice(0, 8)} onValueChange={vi.fn()} labels={{ length: (a, e) => `${a}/${e}` }} />,
    );
    expect(field()).toHaveAccessibleDescription("8/21");
  });

  it("forwards its ref to the input", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<IbanInput ref={ref} label="IBAN" value="" onValueChange={vi.fn()} />);
    expect(ref.current).toBe(field());
  });
});
