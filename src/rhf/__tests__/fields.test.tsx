import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../form";
import {
  RhfCheckbox,
  RhfCombobox,
  RhfDateField,
  RhfField,
  RhfMoneyField,
  RhfNumberField,
  RhfSelect,
  RhfTextarea,
  RhfTextCombobox,
  RhfTextField,
} from "../fields";

/**
 * Every case runs a real `useForm` with a hand-written resolver (no zod): what the
 * bound fields could get wrong is the wiring to react-hook-form's state — the value
 * round trip, the error reaching the control's `invalid`, and focus on error.
 */
interface Values {
  name: string;
  notes: string;
  count: number | null;
  rent: number | null;
  start: string;
  type: string;
  agree: boolean;
  tenant: number | null;
  city: string;
}

const DEFAULTS: Values = {
  name: "",
  notes: "",
  count: null,
  rent: null,
  start: "",
  type: "",
  agree: false,
  tenant: null,
  city: "",
};

/** Every field required: the resolver reports each empty one. */
const requireAll: Resolver<Values> = async (values) => {
  const errors: Record<string, { type: string; message: string }> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === null || value === false) {
      errors[key] = { type: "required", message: `${key} is required` };
    }
  }
  return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
};

function Harness({
  children,
  onSubmit = () => {},
  resolver,
  defaults = DEFAULTS,
  formRef,
}: {
  children: (form: UseFormReturn<Values>) => React.ReactNode;
  onSubmit?: (values: Values) => void;
  resolver?: Resolver<Values>;
  defaults?: Values;
  formRef?: { current: UseFormReturn<Values> | null };
}) {
  const form = useForm<Values>({ defaultValues: defaults, resolver });
  useEffect(() => {
    if (formRef) formRef.current = form;
  });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {children(form)}
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

describe("RhfTextField", () => {
  it("labels the input, describes it with the hint and marks it required", () => {
    render(
      <Harness>
        {() => <RhfTextField name="name" label="Name" hint="As on the lease" required />}
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAccessibleDescription("As on the lease");
  });

  it("paints, announces and focuses the field on a failed submit", async () => {
    render(
      <Harness resolver={requireAll}>
        {(form) => (
          <>
            <RhfTextField control={form.control} name="name" label="Name" />
          </>
        )}
      </Harness>,
    );
    await submit();
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    // The red border: kastlan's wrappers announced the error and did not paint it.
    expect(input.className).toMatch(/danger/);
    expect(input).toHaveAccessibleDescription("name is required");
    expect(input).toHaveFocus();
  });

  it("round-trips the value, with rules instead of a resolver", async () => {
    const onSubmit = vi.fn();
    render(
      <Harness onSubmit={onSubmit}>
        {() => <RhfTextField name="name" label="Name" rules={{ minLength: { value: 3, message: "Too short" } }} />}
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    await userEvent.type(input, "Al");
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Too short")).toBeInTheDocument();
    await userEvent.type(input, "ice");
    await submit();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Alice" }), expect.anything());
  });

  it("disables the control and still submits a locked preset (kastlan 0.12)", async () => {
    const onSubmit = vi.fn();
    render(
      <Harness onSubmit={onSubmit} defaults={{ ...DEFAULTS, name: "Unit 4", type: "fixed" }}>
        {() => (
          <>
            <RhfTextField name="name" label="Name" disabled />
            <RhfSelect name="type" label="Type" options={[{ value: "fixed", label: "Fixed" }]} disabled />
          </>
        )}
      </Harness>,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Type" })).toBeDisabled();
    await submit();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Unit 4", type: "fixed" }),
      expect.anything(),
    );
  });

  it("drops the value the react-hook-form way with excludeWhenDisabled", async () => {
    const onSubmit = vi.fn();
    render(
      <Harness onSubmit={onSubmit} defaults={{ ...DEFAULTS, name: "Unit 4" }}>
        {() => <RhfTextField name="name" label="Name" disabled excludeWhenDisabled />}
      </Harness>,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    await submit();
    expect(onSubmit.mock.calls[0]![0].name).toBeUndefined();
  });

  it("is disabled by a form-wide useForm({ disabled }) as well", () => {
    function Locked() {
      const form = useForm<Values>({ defaultValues: DEFAULTS, disabled: true });
      return (
        <Form {...form}>
          <RhfTextField name="name" label="Name" />
        </Form>
      );
    }
    render(<Locked />);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
  });
});

describe("RhfTextarea", () => {
  it("stores the text and paints on error", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef} resolver={requireAll}>
        {() => <RhfTextarea name="notes" label="Notes" rows={3} />}
      </Harness>,
    );
    await submit();
    const area = screen.getByRole("textbox", { name: "Notes" });
    expect(area).toHaveAttribute("aria-invalid", "true");
    expect(area.className).toMatch(/danger/);
    await userEvent.type(area, "Hi");
    expect(formRef.current?.getValues("notes")).toBe("Hi");
  });
});

describe("RhfNumberField", () => {
  it("commits a number on blur and stores null when emptied", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(<Harness formRef={formRef}>{() => <RhfNumberField name="count" label="Count" digits={0} />}</Harness>);
    const input = screen.getByRole("textbox", { name: "Count" });
    await userEvent.type(input, "42");
    fireEvent.blur(input);
    expect(formRef.current?.getValues("count")).toBe(42);
    await userEvent.clear(input);
    fireEvent.blur(input);
    expect(formRef.current?.getValues("count")).toBeNull();
  });

  it("is invalid, described and focused on error", async () => {
    render(
      <Harness resolver={requireAll}>
        {() => (
          <>
            <RhfNumberField name="count" label="Count" />
          </>
        )}
      </Harness>,
    );
    await submit();
    const input = screen.getByRole("textbox", { name: "Count" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("count is required");
    expect(input).toHaveFocus();
  });

  it("stores the configured empty value", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef} defaults={{ ...DEFAULTS, count: 5 }}>
        {() => <RhfNumberField name="count" label="Count" emptyValue="" />}
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Count" });
    await userEvent.clear(input);
    fireEvent.blur(input);
    expect(formRef.current?.getValues("count")).toBe("");
  });
});

describe("RhfMoneyField", () => {
  it("stores a number while typing and keeps a half-typed decimal in the field", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(<Harness formRef={formRef}>{() => <RhfMoneyField name="rent" label="Rent" />}</Harness>);
    const input = screen.getByRole("textbox", { name: "Rent" });
    await userEvent.type(input, "12.");
    expect(input).toHaveValue("12.");
    expect(formRef.current?.getValues("rent")).toBe(12);
    await userEvent.type(input, "5");
    expect(formRef.current?.getValues("rent")).toBe(12.5);
  });

  it("follows a reset from outside", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(<Harness formRef={formRef}>{() => <RhfMoneyField name="rent" label="Rent" />}</Harness>);
    act(() => formRef.current?.setValue("rent", 99));
    expect(screen.getByRole("textbox", { name: "Rent" })).toHaveValue("99");
  });

  it("is invalid, described, touched on blur and focused on error", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef} resolver={requireAll}>
        {() => <RhfMoneyField name="rent" label="Rent" hint="Per month" />}
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Rent" });
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(formRef.current?.getFieldState("rent").isTouched).toBe(true);
    await submit();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Per month rent is required");
    expect(input).toHaveFocus();
  });
});

describe("RhfDateField", () => {
  it("names the trigger by the label, paints it and focuses it on error", async () => {
    render(<Harness resolver={requireAll}>{() => <RhfDateField name="start" label="Start" />}</Harness>);
    await submit();
    const trigger = screen.getByRole("combobox", { name: /Start/ });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger.className).toMatch(/danger/);
    expect(trigger).toHaveAccessibleDescription("start is required");
    expect(trigger).toHaveFocus();
  });
});

describe("RhfSelect", () => {
  it("renders options with a placeholder, stores numbers when asked, paints on error", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef} resolver={requireAll}>
        {() => (
          <RhfSelect
            name="type"
            label="Type"
            placeholder="Choose…"
            options={[
              { value: "a", label: "Apartment" },
              { value: "b", label: "Box" },
            ]}
          />
        )}
      </Harness>,
    );
    await submit();
    const select = screen.getByRole("combobox", { name: "Type" });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.className).toMatch(/danger/);
    expect(select).toHaveFocus();
    await userEvent.selectOptions(select, "b");
    expect(formRef.current?.getValues("type")).toBe("b");
  });

  it("coerces to a number with valueAsNumber", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef}>
        {() => (
          <RhfSelect name="count" label="Count" valueAsNumber placeholder="—">
            <option value="1">One</option>
            <option value="2">Two</option>
          </RhfSelect>
        )}
      </Harness>,
    );
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Count" }), "2");
    expect(formRef.current?.getValues("count")).toBe(2);
  });
});

describe("RhfCheckbox", () => {
  it("stores a boolean, puts the hint under the box and paints on error", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef} resolver={requireAll}>
        {() => <RhfCheckbox name="agree" label="I agree" hint="Required to continue" />}
      </Harness>,
    );
    await submit();
    const box = screen.getByRole("checkbox", { name: "I agree" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription(/Required to continue/);
    expect(box).toHaveAccessibleDescription(/agree is required/);
    expect(box).toHaveFocus();
    await userEvent.click(box);
    expect(formRef.current?.getValues("agree")).toBe(true);
  });
});

describe("RhfCombobox", () => {
  const TENANTS = [
    { value: 1, label: "Anna Muster" },
    { value: 2, label: "Ben Beispiel" },
  ];

  it("names the trigger by the label, shows the choice, and stores the option's value", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef} defaults={{ ...DEFAULTS, tenant: 2 }}>
        {() => <RhfCombobox name="tenant" label="Tenant" options={TENANTS} />}
      </Harness>,
    );
    const trigger = screen.getByRole("combobox", { name: "Tenant" });
    expect(trigger).toHaveTextContent("Ben Beispiel");
    await userEvent.click(trigger);
    await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Anna Muster" }));
    expect(formRef.current?.getValues("tenant")).toBe(1);
  });

  it("paints, describes and focuses the trigger on error", async () => {
    render(
      <Harness resolver={requireAll}>{() => <RhfCombobox name="tenant" label="Tenant" options={TENANTS} />}</Harness>,
    );
    await submit();
    const trigger = screen.getByRole("combobox", { name: /Tenant/ });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger.className).toMatch(/danger/);
    expect(trigger).toHaveAccessibleDescription("tenant is required");
    expect(trigger).toHaveFocus();
    // One message, the picker's own — not a second FormMessage under it.
    expect(screen.getAllByText("tenant is required")).toHaveLength(1);
  });
});

describe("RhfTextCombobox", () => {
  it("labels the input, stores typed text and shows the error once", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef} resolver={requireAll}>
        {() => <RhfTextCombobox name="city" label="City" options={["Bern", "Basel"]} />}
      </Harness>,
    );
    await submit();
    const input = screen.getByRole("combobox", { name: "City" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(screen.getAllByText("city is required")).toHaveLength(1);
    await userEvent.type(input, "Zug");
    expect(formRef.current?.getValues("city")).toBe("Zug");
  });
});

describe("RhfField", () => {
  it("wraps a control of your own with the label, hint, message and invalid state", async () => {
    render(
      <Harness resolver={requireAll}>
        {() => (
          <RhfField
            name="name"
            label="Custom"
            hint="Anything"
            render={({ field, invalid }) => (
              <input
                ref={field.ref}
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                data-invalid={invalid || undefined}
              />
            )}
          />
        )}
      </Harness>,
    );
    await submit();
    const input = screen.getByRole("textbox", { name: "Custom" });
    expect(input).toHaveAttribute("data-invalid", "true");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Anything name is required");
    expect(input).toHaveFocus();
  });
});

describe("hint and required on the controls that now take them as props", () => {
  it("describes each control with its hint and marks it aria-required", () => {
    render(
      <Harness>
        {() => (
          <>
            <RhfNumberField name="count" label="Count" hint="Count hint" required />
            <RhfMoneyField name="rent" label="Rent" hint="Rent hint" required />
            <RhfDateField name="start" label="Start" hint="Start hint" required />
            <RhfCombobox name="tenant" label="Tenant" hint="Tenant hint" required options={[{ value: 1, label: "Anna" }]} />
            <RhfTextCombobox name="city" label="City" hint="City hint" required options={["Bern"]} />
          </>
        )}
      </Harness>,
    );
    const controls = [
      screen.getByRole("textbox", { name: "Count" }),
      screen.getByRole("textbox", { name: "Rent" }),
      screen.getByRole("combobox", { name: /^Start/ }),
      screen.getByRole("combobox", { name: "Tenant" }),
      screen.getByRole("combobox", { name: "City" }),
    ];
    for (const [i, hint] of ["Count", "Rent", "Start", "Tenant", "City"].entries()) {
      expect(controls[i]).toHaveAttribute("aria-required", "true");
      expect(controls[i]).toHaveAccessibleDescription(`${hint} hint`);
    }
  });
});
