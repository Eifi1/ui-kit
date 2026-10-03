import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Form } from "../form";
import { RhfCombobox, RhfInlineEntityCombobox, RhfTextCombobox } from "../fields";
import { FieldHint } from "../../components/ui";

/**
 * 0.24 — kastlan: `RhfInlineEntityCombobox`. Its account picker is an
 * InlineEntityCombobox inside an RhfField render (the budget line-item form), and with
 * no `ref` on the picker a failed submit could not focus it. Also the two older
 * combobox bindings, which now hand `field.ref` to the picker's own `ref` and title the
 * phone sheet with the form's label. A real `useForm` throughout; synthetic values only.
 */

type Values = Record<string, unknown>;
type FormRef = { current: UseFormReturn<Values> | null };

function Harness({
  children,
  defaults,
  formRef,
  mode,
  onSubmit = () => {},
}: {
  children: ReactNode;
  defaults: Values;
  formRef?: FormRef;
  mode?: "onSubmit" | "onBlur";
  onSubmit?: (values: Values) => void;
}) {
  const form = useForm<Values>({ defaultValues: defaults, mode });
  useEffect(() => {
    if (formRef) formRef.current = form;
  });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {children}
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  });
}

const REQUIRED = { required: "Required" };

const ACCOUNTS = [
  { value: 1000, label: "1000 Example cash", group: "Assets" },
  { value: 2000, label: "2000 Sample payables", group: "Liabilities" },
  { value: 3000, label: "3000 Sample revenue", group: "Revenue" },
];

describe("RhfInlineEntityCombobox (kastlan)", () => {
  it("focuses the <input> on a failed submit, paints it, and describes it with hint and message", async () => {
    const onSubmit = vi.fn();
    render(
      <Harness defaults={{ account: undefined, note: "" }} onSubmit={onSubmit}>
        <RhfInlineEntityCombobox
          name="account"
          label="Account"
          hint="Where the line is booked"
          required
          options={ACCOUNTS}
          rules={REQUIRED}
        />
      </Harness>,
    );
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    const input = screen.getByRole("combobox", { name: "Account" });
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input.className).toMatch(/danger/);
    expect(input).toHaveAccessibleDescription("Where the line is booked Required");
    // The shell's message and description alone — the picker is handed neither.
    expect(screen.getAllByText("Required")).toHaveLength(1);
    expect(screen.getAllByText("Where the line is booked")).toHaveLength(1);
  });

  it("stores the picked id, and is touched when focus leaves", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ account: null }} formRef={formRef}>
        <RhfInlineEntityCombobox name="account" label="Account" options={ACCOUNTS} />
      </Harness>,
    );
    const input = screen.getByRole("combobox", { name: "Account" });
    act(() => input.focus());
    fireEvent.mouseDown(within(screen.getByRole("listbox")).getByRole("option", { name: "2000 Sample payables" }));
    expect(formRef.current!.getValues("account")).toBe(2000);
    expect(input).toHaveValue("2000 Sample payables");
    act(() => input.blur());
    expect(formRef.current!.getFieldState("account").isTouched).toBe(true);
  });

  it("a typed exact label commits on blur — before the field is touched, so mode onBlur validates the new value", async () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ account: null }} formRef={formRef} mode="onBlur">
        <RhfInlineEntityCombobox name="account" label="Account" options={ACCOUNTS} rules={REQUIRED} />
      </Harness>,
    );
    const input = screen.getByRole("combobox", { name: "Account" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "3000 sample revenue" } });
    await act(async () => input.blur());
    expect(formRef.current!.getValues("account")).toBe(3000);
    expect(formRef.current!.getFieldState("account").isTouched).toBe(true);
    // The blur validated the value the picker had just committed, not the empty one
    // (mode onBlur does not validate again on change, so the order is what decides).
    expect(formRef.current!.getFieldState("account").invalid).toBe(false);
    expect(screen.queryByText("Required")).toBeNull();
  });

  it("emptying the text stores null, or the clearValue the schema spells it with", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ a: 1000, b: 1000 }} formRef={formRef}>
        <RhfInlineEntityCombobox name="a" label="First" options={ACCOUNTS} />
        <RhfInlineEntityCombobox name="b" label="Second" options={ACCOUNTS} clearable clearValue="" />
      </Harness>,
    );
    const first = screen.getByRole("combobox", { name: "First" });
    act(() => first.focus());
    fireEvent.change(first, { target: { value: "" } });
    act(() => first.blur());
    expect(formRef.current!.getValues("a")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(formRef.current!.getValues("b")).toBe("");
    // Both read back as empty.
    expect(screen.getByRole("combobox", { name: "First" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Second" })).toHaveValue("");
  });

  it("passes the write lock through: focusable, aria-disabled, readOnly, the list stays shut", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ account: 1000 }} formRef={formRef}>
        <RhfInlineEntityCombobox
          name="account"
          label="Account"
          options={ACCOUNTS}
          disabledReason="Only the owner can change this"
        />
      </Harness>,
    );
    const input = screen.getByRole("combobox", { name: "Account" });
    expect(input).toHaveAttribute("aria-disabled", "true");
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute("readonly");
    act(() => input.focus());
    expect(input).toHaveFocus();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(formRef.current!.getValues("account")).toBe(1000);
  });

  it("passes the create row through: onCreate gets the typed name", () => {
    const onCreate = vi.fn();
    render(
      <Harness defaults={{ account: null }}>
        <RhfInlineEntityCombobox name="account" label="Account" options={ACCOUNTS} onCreate={onCreate} />
      </Harness>,
    );
    const input = screen.getByRole("combobox", { name: "Account" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "4000 New account" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: /4000 New account/ }));
    expect(onCreate).toHaveBeenCalledWith("4000 New account");
  });

  it("disabled keeps the value and disables the <input>", () => {
    render(
      <Harness defaults={{ account: 2000 }}>
        <RhfInlineEntityCombobox name="account" label="Account" options={ACCOUNTS} disabled />
      </Harness>,
    );
    const input = screen.getByRole("combobox", { name: "Account" });
    expect(input).toBeDisabled();
    expect(input).toHaveValue("2000 Sample payables");
  });

  it("unlabelled, an aria-label names it and a FieldHint hint is the shell's, not the picker's", () => {
    render(
      <Harness defaults={{ account: null }}>
        <RhfInlineEntityCombobox
          name="account"
          aria-label="Account for line 1"
          hint={<FieldHint label="Postable accounts only" />}
          options={ACCOUNTS}
        />
      </Harness>,
    );
    const input = screen.getByRole("combobox", { name: "Account for line 1" });
    // No end-hint row beside the <input>: the "?" is the form's description.
    expect(input.closest("[data-slot='form-description']")).toBeNull();
    expect(screen.getByRole("button", { name: "Postable accounts only" }).closest("[data-slot='form-description']")).not.toBeNull();
  });
});

describe("RhfCombobox / RhfTextCombobox: field.ref through the picker's own ref (0.24)", () => {
  it("RhfCombobox focuses the trigger and passes the write lock through", async () => {
    render(
      <Harness defaults={{ a: null, b: 1 }}>
        <RhfCombobox name="a" label="Tenant" options={[{ value: 1, label: "Example Ltd" }]} rules={REQUIRED} />
        <RhfCombobox name="b" label="Locked" options={[{ value: 1, label: "Example Ltd" }]} disabledReason="Read-only demo" />
      </Harness>,
    );
    await submit();
    expect(screen.getByRole("combobox", { name: "Tenant" })).toHaveFocus();
    const locked = screen.getByRole("combobox", { name: /Locked/ });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(locked);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("RhfTextCombobox focuses the <input> and passes the write lock through", async () => {
    render(
      <Harness defaults={{ a: "", b: "Bern" }}>
        <RhfTextCombobox name="a" label="City" options={["Bern"]} rules={REQUIRED} />
        <RhfTextCombobox name="b" label="Locked" options={["Bern"]} disabledReason="Read-only demo" />
      </Harness>,
    );
    await submit();
    expect(screen.getByRole("combobox", { name: "City" })).toHaveFocus();
    expect(screen.getByRole("combobox", { name: "Locked" })).toHaveAttribute("readonly");
  });
});

describe("the phone sheet takes the form's label as its title", () => {
  let original: typeof window.matchMedia;
  beforeEach(() => {
    original = window.matchMedia;
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
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it.each([
    ["RhfInlineEntityCombobox", <RhfInlineEntityCombobox key="i" name="f" label="Account" options={ACCOUNTS} />],
    ["RhfTextCombobox", <RhfTextCombobox key="t" name="f" label="Account" options={["Example"]} />],
    ["RhfCombobox", <RhfCombobox key="c" name="f" label="Account" options={ACCOUNTS} />],
  ])("%s", (_name, field) => {
    render(<Harness defaults={{ f: null }}>{field}</Harness>);
    const control = screen.getByRole("combobox", { name: "Account" });
    act(() => {
      control.focus();
      fireEvent.click(control);
    });
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
  });
});
