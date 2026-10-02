import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "../form";
import { RhfIbanInput, RhfPhoneInput } from "../fields";
import { ibanCheckDigits } from "../../lib/iban";

/**
 * 0.22 — kastlan binds every field through react-hook-form: the IBAN field stores the
 * compact IBAN, the phone field E.164 or the typed text. Synthetic values only.
 */
interface Values {
  iban: string;
  phone: string;
}

const BBAN = "00000000000000000001"; // 20 characters, artificial
const IBAN = `CH${ibanCheckDigits("CH", BBAN.slice(0, 17))}${BBAN.slice(0, 17)}`;

function Harness({ children, formRef }: { children: ReactNode; formRef: { current: UseFormReturn<Values> | null } }) {
  const form = useForm<Values>({ defaultValues: { iban: "", phone: "" } });
  useEffect(() => {
    formRef.current = form;
  });
  return <Form {...form}>{children}</Form>;
}

describe("RhfIbanInput", () => {
  it("stores the compact upper-case IBAN and shows it grouped", () => {
    const formRef: { current: UseFormReturn<Values> | null } = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfIbanInput<Values> name="iban" label="IBAN" />
      </Harness>,
    );
    const input = screen.getByLabelText("IBAN");
    fireEvent.change(input, { target: { value: IBAN.toLowerCase().replace(/(.{4})/g, "$1 ") } });
    expect(formRef.current!.getValues("iban")).toBe(IBAN);
    expect((input as HTMLInputElement).value.replace(/\s/g, "")).toBe(IBAN);
  });
});

describe("RhfPhoneInput", () => {
  it("stores E.164 for a number it reads", () => {
    const formRef: { current: UseFormReturn<Values> | null } = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfPhoneInput<Values> name="phone" label="Phone" />
      </Harness>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: /Phone/ }), { target: { value: "021 000 00 01" } });
    expect(formRef.current!.getValues("phone")).toBe("+41210000001");
  });
});
