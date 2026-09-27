import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "../form";
import { RhfIntegerField, RhfNumberField, RhfTextField } from "../fields";

interface Values {
  rooms: number | "" | null;
  iban: string;
}

function Harness({
  children,
  defaults = { rooms: "", iban: "" },
  formRef,
}: {
  children: ReactNode;
  defaults?: Values;
  formRef: { current: UseFormReturn<Values> | null };
}) {
  const form = useForm<Values>({ defaultValues: defaults });
  useEffect(() => {
    formRef.current = form;
  });
  return (
    <Form {...form}>
      <form>{children}</form>
    </Form>
  );
}

function typeAndBlur(input: HTMLElement, text: string) {
  act(() => {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    fireEvent.blur(input);
  });
}

describe("RhfIntegerField (kastlan 41)", () => {
  it("rounds to a whole number, has no calculator and stores '' when emptied", () => {
    const formRef: { current: UseFormReturn<Values> | null } = { current: null };
    render(
      <Harness formRef={formRef} defaults={{ rooms: 3, iban: "" }}>
        <RhfIntegerField name="rooms" label="Rooms" />
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Rooms" });
    typeAndBlur(input, "2.5");
    expect(formRef.current!.getValues("rooms")).toBe(3);
    typeAndBlur(input, "");
    expect(formRef.current!.getValues("rooms")).toBe("");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("lets every preset be overridden", () => {
    const formRef: { current: UseFormReturn<Values> | null } = { current: null };
    render(
      <Harness formRef={formRef} defaults={{ rooms: 3, iban: "" }}>
        <RhfIntegerField name="rooms" label="Rooms" digits={1} emptyValue={null} calculator />
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Rooms" });
    typeAndBlur(input, "2.5");
    expect(formRef.current!.getValues("rooms")).toBe(2.5);
    typeAndBlur(input, "");
    expect(formRef.current!.getValues("rooms")).toBeNull();
  });

  it("differs from RhfNumberField only in those defaults", () => {
    const formRef: { current: UseFormReturn<Values> | null } = { current: null };
    render(
      <Harness formRef={formRef} defaults={{ rooms: 3, iban: "" }}>
        <RhfNumberField name="rooms" label="Rooms" />
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Rooms" });
    typeAndBlur(input, "2.5");
    expect(formRef.current!.getValues("rooms")).toBe(2.5);
    typeAndBlur(input, "");
    expect(formRef.current!.getValues("rooms")).toBeNull();
  });
});

describe("RhfTextField inputClassName (kastlan 42)", () => {
  it("puts the classes on the <input>, and className on the item", () => {
    const formRef: { current: UseFormReturn<Values> | null } = { current: null };
    const { container } = render(
      <Harness formRef={formRef}>
        <RhfTextField name="iban" label="IBAN" inputClassName="font-mono" className="item-box" />
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "IBAN" });
    expect(input).toHaveClass("font-mono");
    expect(input).not.toHaveClass("item-box");
    expect(container.querySelector(".item-box")).not.toBeNull();
  });
});
