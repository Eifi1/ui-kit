import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Form } from "../form";
import {
  RhfDateField,
  RhfDateRangePicker,
  RhfMonthPicker,
  type RhfDateFieldProps,
  type RhfDateRangePickerProps,
  type RhfMonthPickerProps,
} from "../fields";
import type { DatePickerProps, DateRangePickerProps } from "../../components/date-picker";
import type { MonthPickerProps } from "../../components/month-picker";
import type { CommitScope } from "../../components/write-lock";
import { WriteLockProvider } from "../../components/write-lock";

/**
 * The date twins pass their picker's write lock (refactor audit 2026-10-30, API-3): the
 * three pickers took neither `commit` nor `disabledReason`, so neither could their Rhf
 * bindings. They pass the props through as `Omit<…>` (DUP-9), so the lock reaches them
 * with no list to keep — this pins that it does, and that RhfDateRangePicker's draft mode
 * is `apply` now, its `commit` the lock's as on every other twin.
 */

type LockKeys = "commit" | "disabledReason" | "disabledReasonDisplay";

interface Values {
  booked: string;
  periodFrom: string;
  periodTo: string;
  month: string;
}

function Harness({ children, locked = false }: { children: ReactNode; locked?: boolean }) {
  const form = useForm<Values>({
    defaultValues: { booked: "2026-10-20", periodFrom: "2026-10-01", periodTo: "2026-10-31", month: "2026-10" },
  });
  return (
    <WriteLockProvider locked={locked} reason="Shared with you to read">
      <Form {...form}>
        <form noValidate>{children}</form>
      </Form>
    </WriteLockProvider>
  );
}

describe("the date twins and the write lock", () => {
  it("type: each twin takes its picker's lock props, and the range twin's `apply`", () => {
    expectTypeOf<Pick<RhfDateFieldProps, LockKeys>>().toEqualTypeOf<Pick<DatePickerProps, LockKeys>>();
    expectTypeOf<Pick<RhfDateRangePickerProps, LockKeys>>().toEqualTypeOf<Pick<DateRangePickerProps, LockKeys>>();
    expectTypeOf<Pick<RhfMonthPickerProps, LockKeys>>().toEqualTypeOf<Pick<MonthPickerProps, LockKeys>>();
    expectTypeOf<DatePickerProps["commit"]>().toEqualTypeOf<CommitScope | undefined>();
    expectTypeOf<MonthPickerProps["commit"]>().toEqualTypeOf<CommitScope | undefined>();
    expectTypeOf<RhfDateRangePickerProps["apply"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("locks each trigger with `commit` under a locked provider, focusably", () => {
    render(
      <Harness locked>
        <RhfDateField<Values> name="booked" label="Booked" commit />
        <RhfDateRangePicker<Values> fromName="periodFrom" toName="periodTo" label="Period" commit />
        <RhfMonthPicker<Values> name="month" label="Month" commit />
      </Harness>,
    );
    for (const name of [/^Booked/, /^Period/, /^Month/]) {
      const trigger = screen.getByRole("combobox", { name });
      expect(trigger).toBeEnabled();
      expect(trigger).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(trigger);
      expect(screen.queryByRole("dialog")).toBeNull();
    }
  });

  it("leaves them editable without `commit`: a form's fields stay open under the lock", () => {
    render(
      <Harness locked>
        <RhfDateField<Values> name="booked" label="Booked" />
      </Harness>,
    );
    const trigger = screen.getByRole("combobox", { name: /^Booked/ });
    expect(trigger).not.toHaveAttribute("aria-disabled");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("RhfDateRangePicker drafts with `apply`", () => {
    render(
      <Harness>
        <RhfDateRangePicker<Values> fromName="periodFrom" toName="periodTo" label="Period" apply />
      </Harness>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /^Period/ }));
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});
