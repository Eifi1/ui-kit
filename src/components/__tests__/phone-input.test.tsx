import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneInput, type PhoneInputProps } from "../phone-input";

/**
 * PhoneInput (kastlan): a country-code select and the number — E.164 out when it reads,
 * the text unchanged when it does not. Numbers are unassignable or in fiction ranges
 * (see lib/__tests__/phone.test.ts).
 */

const CH_E164 = "+41210000001";

function Harness(props: Partial<PhoneInputProps> & { initial?: string; onValue?: (v: string) => void }) {
  const { initial = "", onValue, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <PhoneInput
      label="Phone"
      {...rest}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

const number = () => screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
const select = () => screen.getByRole("combobox", { name: "Country code" }) as HTMLSelectElement;

describe("PhoneInput", () => {
  it("offers CH, LI, DE, AT, FR, IT and Other, CH first and selected", () => {
    render(<PhoneInput label="Phone" value="" onValueChange={vi.fn()} />);
    const options = Array.from(select().options).map((o) => o.textContent);
    expect(options).toEqual(["CH +41", "LI +423", "DE +49", "AT +43", "FR +33", "IT +39", "Other"]);
    expect(select()).toHaveValue("CH");
    expect(number()).toHaveAttribute("type", "tel");
  });

  it("emits E.164 for a national number, and groups it on blur", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(number(), "021 000 00 01");
    expect(onValue).toHaveBeenLastCalledWith(CH_E164);
    // While typing: the person's own text.
    expect(number()).toHaveValue("021 000 00 01");
    await user.tab();
    expect(number()).toHaveValue("21 000 00 01");
  });

  it("emits text it cannot read unchanged, and never marks it invalid", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(number(), "ask reception");
    expect(onValue).toHaveBeenLastCalledWith("ask reception");
    await user.tab();
    expect(number()).toHaveValue("ask reception");
    expect(number()).not.toHaveAttribute("aria-invalid");
  });

  it("shows an existing free-text value as it is, and normalises it on the next edit", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="021 000 00 0" onValue={onValue} />);
    expect(number()).toHaveValue("021 000 00 0");
    expect(onValue).not.toHaveBeenCalled();
    await user.type(number(), "1");
    expect(onValue).toHaveBeenLastCalledWith(CH_E164);
  });

  it("follows a number typed with its own + to its country", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(number(), "+49 30 0000001");
    expect(onValue).toHaveBeenLastCalledWith("+49300000001");
    expect(select()).toHaveValue("DE");
    await user.tab();
    expect(number()).toHaveValue("30 0000001");
  });

  it("takes any other country with its own + under Other", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(number(), "+1 202 555 0101");
    expect(onValue).toHaveBeenLastCalledWith("+12025550101");
    expect(select()).toHaveValue("other");
  });

  it("shows a stored number under its own country", () => {
    render(<PhoneInput label="Phone" value="+33199000001" onValueChange={vi.fn()} />);
    expect(select()).toHaveValue("FR");
    expect(number()).toHaveValue("1 99 00 00 01");
  });

  it("moves the national number to a newly chosen country code", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={CH_E164} onValue={onValue} />);
    await user.selectOptions(select(), "DE");
    expect(onValue).toHaveBeenLastCalledWith("+49210000001");
    expect(select()).toHaveValue("DE");
  });

  it("reads a typed national number again when the country changes", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.selectOptions(select(), "other");
    await user.type(number(), "01 99 00 00 01");
    expect(onValue).toHaveBeenLastCalledWith("01 99 00 00 01");
    await user.selectOptions(select(), "FR");
    expect(onValue).toHaveBeenLastCalledWith("+33199000001");
  });

  it("follows a value set from outside", () => {
    const { rerender } = render(<PhoneInput label="Phone" value={CH_E164} onValueChange={vi.fn()} />);
    expect(select()).toHaveValue("CH");
    rerender(<PhoneInput label="Phone" value="+4231000001" onValueChange={vi.fn()} />);
    expect(select()).toHaveValue("LI");
    expect(number()).toHaveValue("100 00 01");
  });

  it("starts from defaultCountry and offers only the countries asked for", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput label="Phone" value="" defaultCountry="DE" countries={["DE", "AT"]} onValueChange={onValueChange} />);
    expect(select()).toHaveValue("DE");
    expect(Array.from(select().options).map((o) => o.value)).toEqual(["DE", "AT", "other"]);
    fireEvent.change(number(), { target: { value: "030 0000001" } });
    expect(onValueChange).toHaveBeenLastCalledWith("+49300000001");
  });

  it("puts a text hint and the error under the whole row, attached to the number", () => {
    render(
      <PhoneInput label="Phone" value="" onValueChange={vi.fn()} hint="Mobile preferred" error="Required" />,
    );
    expect(number()).toHaveAccessibleDescription("Mobile preferred Required");
    expect(number()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("group", { name: "Phone" })).toContainElement(select());
  });

  it("takes its words as labels", () => {
    render(<PhoneInput label="Phone" value="" onValueChange={vi.fn()} labels={{ countryCode: "Vorwahl", other: "Andere" }} />);
    const sel = screen.getByRole("combobox", { name: "Vorwahl" }) as HTMLSelectElement;
    expect(sel.options[sel.options.length - 1]).toHaveTextContent("Andere");
  });

  it("forwards its ref to the number input and disables both controls", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<PhoneInput ref={ref} label="Phone" value="" onValueChange={vi.fn()} disabled />);
    expect(ref.current).toBe(number());
    expect(number()).toBeDisabled();
    expect(select()).toBeDisabled();
  });
});
