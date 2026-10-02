import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../form";
import { RhfDateRangePicker, RhfTimeInput, RhfToggleGroup } from "../fields";

/**
 * 0.22 — kastlan 4: the three controls its forms still wired by hand through
 * RhfField's render, bound like every other field. Each runs a real `useForm`; what
 * could go wrong is the wiring — the value round trip, the error reaching the control,
 * focus on error and the touched state.
 */
interface Values {
  time: string | null;
  from: string | null;
  to: string | null;
  interval: string;
  status: string | null;
}

const DEFAULTS: Values = { time: "", from: "", to: "", interval: "", status: null };

type FormRef = { current: UseFormReturn<Values> | null };

function Harness({
  children,
  defaults = DEFAULTS,
  resolver,
  onSubmit = () => {},
  formRef,
  mode,
}: {
  children: ReactNode;
  defaults?: Values;
  resolver?: Resolver<Values>;
  onSubmit?: (values: Values) => void;
  formRef?: FormRef;
  mode?: "onSubmit" | "onTouched";
}) {
  const form = useForm<Values>({ defaultValues: defaults, resolver, mode });
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

/** Reports every listed key that is empty, with the message given. */
function requireKeys(messages: Partial<Record<keyof Values, string>>): Resolver<Values> {
  return async (values) => {
    const errors: Record<string, { type: string; message: string }> = {};
    for (const [key, message] of Object.entries(messages)) {
      const v = values[key as keyof Values];
      if (v === "" || v === null) errors[key] = { type: "required", message: message! };
    }
    return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
  };
}

/** A cross-field rule on the END, where a schema's `refine` puts it. */
const endAfterStart: Resolver<Values> = async (values) => {
  const errors: Record<string, { type: string; message: string }> = {};
  if (values.from && values.to && values.to < values.from) errors.to = { type: "order", message: "End before start" };
  return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
};

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  });
}

// ── RhfTimeInput ─────────────────────────────────────────────────────────────

describe("RhfTimeInput (kastlan 4)", () => {
  const timeInput = () => document.querySelector<HTMLInputElement>('input[type="time"]')!;

  it("labels the input, describes it with the hint and marks it required", () => {
    render(
      <Harness>
        <RhfTimeInput name="time" label="Meeting time" hint="Local time" required />
      </Harness>,
    );
    const input = screen.getByLabelText(/Meeting time/);
    expect(input).toBe(timeInput());
    expect(input).toHaveAccessibleDescription("Local time");
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("stores the normalised time, and emptyValue when cleared", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfTimeInput name="time" label="Time" emptyValue={null} />
      </Harness>,
    );
    act(() => {
      fireEvent.change(timeInput(), { target: { value: "14:30:00" } });
    });
    expect(formRef.current!.getValues("time")).toBe("14:30");
    act(() => {
      fireEvent.change(timeInput(), { target: { value: "" } });
    });
    expect(formRef.current!.getValues("time")).toBeNull();
  });

  it("paints, announces and focuses the input on a failed submit, and is touched on blur", async () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef} resolver={requireKeys({ time: "Enter a time" })}>
        <RhfTimeInput name="time" label="Time" />
      </Harness>,
    );
    act(() => {
      fireEvent.focus(timeInput());
      fireEvent.blur(timeInput());
    });
    expect(formRef.current!.getFieldState("time").isTouched).toBe(true);
    await submit();
    const input = timeInput();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a time");
    expect(input).toHaveFocus();
  });

  it("keeps a disabled preset's value, and drops it with excludeWhenDisabled", async () => {
    const onSubmit = vi.fn();
    const { unmount } = render(
      <Harness onSubmit={onSubmit} defaults={{ ...DEFAULTS, time: "09:00" }}>
        <RhfTimeInput name="time" label="Time" disabled />
      </Harness>,
    );
    expect(timeInput()).toBeDisabled();
    await submit();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ time: "09:00" });
    unmount();

    const onSubmit2 = vi.fn();
    render(
      <Harness onSubmit={onSubmit2} defaults={{ ...DEFAULTS, time: "09:00" }}>
        <RhfTimeInput name="time" label="Time" disabled excludeWhenDisabled />
      </Harness>,
    );
    await submit();
    expect(onSubmit2.mock.calls[0][0].time).toBeUndefined();
  });
});

// ── RhfDateRangePicker ───────────────────────────────────────────────────────

const PRESETS = [{ id: "q3", label: "Q3", from: "2026-07-01", to: "2026-09-30" }];
const SEPT = { ...DEFAULTS, from: "2026-09-01", to: "2026-09-14" };

describe("RhfDateRangePicker (kastlan 4)", () => {
  const trigger = () => screen.getByRole("combobox", { name: /^Period/ });
  const open = () => fireEvent.click(trigger());
  const day = (n: string) => within(screen.getByRole("grid")).getByText(n);

  it("names the trigger by the label, and writes both fields from one pick", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" hint="Billing period" required presets={PRESETS} />
      </Harness>,
    );
    expect(trigger()).toHaveAccessibleDescription("Billing period");
    expect(trigger()).toHaveAttribute("aria-required", "true");
    open();
    fireEvent.click(within(screen.getByRole("group", { name: "Quick ranges" })).getByRole("button", { name: "Q3" }));
    expect(formRef.current!.getValues()).toMatchObject({ from: "2026-07-01", to: "2026-09-30" });
    expect(formRef.current!.getFieldState("from").isTouched).toBe(true);
    expect(formRef.current!.getFieldState("to").isTouched).toBe(true);
  });

  it("clears both fields to emptyValue", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef} defaults={SEPT}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" clearable emptyValue={null} />
      </Harness>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(formRef.current!.getValues()).toMatchObject({ from: null, to: null });
  });

  it("holds a half-made range without touching it, and completes it on the second click", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef} defaults={SEPT}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" />
      </Harness>,
    );
    open();
    fireEvent.click(day("3"));
    expect(formRef.current!.getValues()).toMatchObject({ from: "2026-09-03", to: "" });
    expect(formRef.current!.getFieldState("to").isTouched).toBe(false);
    fireEvent.click(day("10"));
    expect(formRef.current!.getValues()).toMatchObject({ from: "2026-09-03", to: "2026-09-10" });
    expect(formRef.current!.getFieldState("to").isTouched).toBe(true);
  });

  it("shows an error on the END alone: label, trigger and message, and focuses the trigger", async () => {
    render(
      <Harness resolver={endAfterStart} defaults={{ ...DEFAULTS, from: "2026-09-14", to: "2026-09-01" }}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" hint="Billing period" />
      </Harness>,
    );
    await submit();
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    expect(trigger().className).toMatch(/danger/);
    expect(trigger()).toHaveAccessibleDescription("Billing period End before start");
    expect(screen.getByText("Period")).toHaveAttribute("data-error", "true");
    expect(trigger()).toHaveFocus();
  });

  it("lists both fields' messages, once each when they say the same", async () => {
    const { unmount } = render(
      <Harness resolver={requireKeys({ from: "Enter a start", to: "Enter an end" })}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" />
      </Harness>,
    );
    await submit();
    expect(trigger()).toHaveAccessibleDescription("Enter a start Enter an end");
    unmount();

    render(
      <Harness resolver={requireKeys({ from: "Enter the period", to: "Enter the period" })}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" />
      </Harness>,
    );
    await submit();
    expect(screen.getAllByText("Enter the period")).toHaveLength(1);
    expect(trigger()).toHaveAccessibleDescription("Enter the period");
  });

  it("re-runs the end's rule when the start moves, so a fixed order clears the error", async () => {
    render(
      <Harness resolver={endAfterStart} defaults={{ ...DEFAULTS, from: "2026-09-14", to: "2026-09-01" }}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" presets={PRESETS} />
      </Harness>,
    );
    await submit();
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    open();
    await act(async () => {
      fireEvent.click(within(screen.getByRole("group", { name: "Quick ranges" })).getByRole("button", { name: "Q3" }));
    });
    expect(trigger()).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("End before start")).toBeNull();
  });

  it("disables the trigger and keeps both values", async () => {
    const onSubmit = vi.fn();
    render(
      <Harness onSubmit={onSubmit} defaults={SEPT}>
        <RhfDateRangePicker fromName="from" toName="to" label="Period" disabled />
      </Harness>,
    );
    expect(trigger()).toBeDisabled();
    await submit();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ from: "2026-09-01", to: "2026-09-14" });
  });
});

// ── RhfToggleGroup ───────────────────────────────────────────────────────────

const INTERVALS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const satisfies { value: string; label: string }[];

describe("RhfToggleGroup (kastlan 4)", () => {
  it("is a radiogroup named by the label, described by the hint, and stores the choice", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfToggleGroup name="interval" label="Interval" hint="How often rent is due" required options={[...INTERVALS]} />
      </Harness>,
    );
    const group = screen.getByRole("radiogroup", { name: /Interval/ });
    expect(group).toHaveAccessibleDescription("How often rent is due");
    expect(group).toHaveAttribute("aria-required", "true");
    // An empty default: nothing checked.
    expect(within(group).getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(group).getByRole("radio", { name: "Yearly" }));
    expect(formRef.current!.getValues("interval")).toBe("yearly");
    expect(within(group).getByRole("radio", { name: "Yearly" })).toHaveAttribute("aria-checked", "true");
    // Required: a press on the chosen option keeps it.
    fireEvent.click(within(group).getByRole("radio", { name: "Yearly" }));
    expect(formRef.current!.getValues("interval")).toBe("yearly");
  });

  it("paints, announces and focuses the group's tab stop on a failed submit", async () => {
    render(
      <Harness resolver={requireKeys({ interval: "Choose an interval" })}>
        <RhfToggleGroup name="interval" label="Interval" options={[...INTERVALS]} />
      </Harness>,
    );
    await submit();
    const group = screen.getByRole("radiogroup", { name: /Interval/ });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group.className).toMatch(/danger/);
    expect(group).toHaveAccessibleDescription("Choose an interval");
    expect(within(group).getByRole("radio", { name: "Monthly" })).toHaveFocus();
  });

  it("is touched when focus leaves the group, not when it moves between options", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfToggleGroup name="interval" label="Interval" options={[...INTERVALS]} />
      </Harness>,
    );
    const [monthly, yearly] = screen.getAllByRole("radio");
    act(() => {
      fireEvent.blur(monthly, { relatedTarget: yearly });
    });
    expect(formRef.current!.getFieldState("interval").isTouched).toBe(false);
    act(() => {
      fireEvent.blur(yearly, { relatedTarget: screen.getByRole("button", { name: "Save" }) });
    });
    expect(formRef.current!.getFieldState("interval").isTouched).toBe(true);
  });

  it("allowEmpty: toggle buttons, and a second press stores emptyValue", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef} defaults={{ ...DEFAULTS, status: "open" }}>
        <RhfToggleGroup
          name="status"
          label="Status"
          allowEmpty
          caption={(v) => (v === null ? "Any status" : `Only ${v}`)}
          options={[
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </Harness>,
    );
    const group = screen.getByRole("group", { name: /Status/ });
    const open = within(group).getByRole("button", { name: "Open" });
    expect(open).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Only open")).toBeTruthy();
    fireEvent.click(open);
    expect(formRef.current!.getValues("status")).toBeNull();
    expect(open).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Any status")).toBeTruthy();
  });

  it("allowEmpty with emptyValue=\"\" stores the empty string", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef} defaults={{ ...DEFAULTS, interval: "monthly" }}>
        <RhfToggleGroup name="interval" aria-label="Interval" allowEmpty emptyValue="" options={[...INTERVALS]} />
      </Harness>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(formRef.current!.getValues("interval")).toBe("");
  });

  it("disables every option and keeps the value", async () => {
    const onSubmit = vi.fn();
    render(
      <Harness onSubmit={onSubmit} defaults={{ ...DEFAULTS, interval: "yearly" }}>
        <RhfToggleGroup name="interval" label="Interval" disabled options={[...INTERVALS]} />
      </Harness>,
    );
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    await submit();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ interval: "yearly" });
  });
});
