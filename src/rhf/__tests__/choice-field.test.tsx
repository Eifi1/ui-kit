import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Form } from "../form";
import { RhfChoiceField } from "../fields";
import { stubDesktop, stubPhone } from "../../test/viewport";

/**
 * 0.58: RhfChoiceField — ChoiceField bound to one field, as RhfToggleGroup binds the group
 * and RhfSelect the select. Each runs a real `useForm` in both forms; what could go wrong
 * is the wiring — the label naming whichever control is on screen, the value round trip,
 * the error reaching it, focus on error and the touched state.
 */

afterEach(() => vi.unstubAllGlobals());

interface Values {
  grain: string | null;
}

type FormRef = { current: UseFormReturn<Values> | null };

const GRAINS = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

function Harness({
  children,
  defaults = { grain: "" },
  resolver,
  formRef,
}: {
  children: ReactNode;
  defaults?: Values;
  resolver?: Resolver<Values>;
  formRef?: FormRef;
}) {
  const form = useForm<Values>({ defaultValues: defaults, resolver });
  useEffect(() => {
    if (formRef) formRef.current = form;
  });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(() => {})}>
        {children}
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

const requireGrain: Resolver<Values> = async (values) => {
  const errors: Record<string, { type: string; message: string }> = {};
  if (!values.grain) errors.grain = { type: "required", message: "Choose a grain" };
  return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
};

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  });
}

describe("RhfChoiceField on a desktop: the segmented group", () => {
  it("is a radiogroup named by the label, described by the hint, and stores the choice", () => {
    stubDesktop();
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfChoiceField name="grain" label="Group by" hint="The width of each bar" required options={GRAINS} />
      </Harness>,
    );
    const group = screen.getByRole("radiogroup", { name: /Group by/ });
    expect(group).toHaveAccessibleDescription("The width of each bar");
    expect(group).toHaveAttribute("aria-required", "true");
    // An empty default: nothing checked.
    for (const radio of within(group).getAllByRole("radio")) expect(radio).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(group).getByRole("radio", { name: "Quarter" }));
    expect(formRef.current!.getValues("grain")).toBe("quarter");
    expect(within(group).getByRole("radio", { name: "Quarter" })).toHaveAttribute("aria-checked", "true");
  });

  it("paints, announces and focuses the group's tab stop on a failed submit", async () => {
    stubDesktop();
    render(
      <Harness resolver={requireGrain}>
        <RhfChoiceField name="grain" label="Group by" options={GRAINS} />
      </Harness>,
    );
    await submit();
    const group = screen.getByRole("radiogroup", { name: /Group by/ });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group.className).toMatch(/danger/);
    expect(group).toHaveAccessibleDescription("Choose a grain");
    expect(within(group).getByRole("radio", { name: "Month" })).toHaveFocus();
  });

  it("is touched when focus leaves the group, not when it moves between segments", () => {
    stubDesktop();
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfChoiceField name="grain" label="Group by" options={GRAINS} />
      </Harness>,
    );
    const [month, quarter] = screen.getAllByRole("radio");
    act(() => {
      fireEvent.blur(month, { relatedTarget: quarter });
    });
    expect(formRef.current!.getFieldState("grain").isTouched).toBe(false);
    act(() => {
      fireEvent.blur(quarter, { relatedTarget: screen.getByRole("button", { name: "Save" }) });
    });
    expect(formRef.current!.getFieldState("grain").isTouched).toBe(true);
  });
});

describe("RhfChoiceField on a phone: the select", () => {
  it("is a select named by the label, described by the hint, and stores the choice", () => {
    stubPhone();
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef} defaults={{ grain: "month" }}>
        <RhfChoiceField name="grain" label="Group by" hint="The width of each bar" required options={GRAINS} />
      </Harness>,
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: /Group by/ });
    expect(select).toHaveAccessibleDescription("The width of each bar");
    expect(select).toHaveAttribute("aria-required", "true");
    expect(select).toHaveDisplayValue("Month");
    fireEvent.change(select, { target: { value: "year" } });
    expect(formRef.current!.getValues("grain")).toBe("year");
  });

  it("shows nothing chosen for an empty default, then paints, announces and focuses the select on a failed submit", async () => {
    stubPhone();
    render(
      <Harness resolver={requireGrain} defaults={{ grain: null }}>
        <RhfChoiceField name="grain" label="Group by" options={GRAINS} />
      </Harness>,
    );
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: /Group by/ });
    expect(select).toHaveDisplayValue("");
    await submit();
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.className).toMatch(/danger/);
    expect(select).toHaveAccessibleDescription("Choose a grain");
    expect(select).toHaveFocus();
  });

  it("is touched when focus leaves the select", () => {
    stubPhone();
    const formRef: FormRef = { current: null };
    render(
      <Harness formRef={formRef}>
        <RhfChoiceField name="grain" label="Group by" options={GRAINS} />
      </Harness>,
    );
    act(() => {
      fireEvent.blur(screen.getByRole("combobox", { name: /Group by/ }), {
        relatedTarget: screen.getByRole("button", { name: "Save" }),
      });
    });
    expect(formRef.current!.getFieldState("grain").isTouched).toBe(true);
  });
});
