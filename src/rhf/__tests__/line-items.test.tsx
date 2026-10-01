import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../form";
import { RhfField, RhfTextField } from "../fields";
import { Input } from "../../components/ui";
import { RhfLineItems } from "../line-items";

interface Values {
  lines: Array<{ account: string }>;
}

/** No zod: a hand-written resolver that wants two lines, each with an account. */
const resolver: Resolver<Values> = async (values) => {
  const errors: Record<string, unknown> = {};
  if (values.lines.length < 2) errors.lines = { type: "min", message: "At least two lines" };
  const lineErrors = values.lines.map((l) =>
    l.account ? undefined : { account: { type: "required", message: "Account is required" } },
  );
  if (lineErrors.some(Boolean)) errors.lines = lineErrors;
  return Object.keys(errors).length ? { values: {}, errors: errors as never } : { values, errors: {} };
};

function Harness({
  initial,
  onSubmit = () => {},
  formRef,
}: {
  initial: Values["lines"];
  onSubmit?: (v: Values) => void;
  formRef?: { current: UseFormReturn<Values> | null };
}) {
  const form = useForm<Values>({ defaultValues: { lines: initial }, resolver });
  useEffect(() => {
    if (formRef) formRef.current = form;
  });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <RhfLineItems
          control={form.control}
          name="lines"
          newItem={() => ({ account: "" })}
          columns={[
            {
              key: "account",
              header: "Account",
              render: ({ name, label }) => <RhfTextField name={`${name}.account`} aria-label={label} />,
            },
          ]}
        />
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

describe("RhfLineItems", () => {
  it("binds each row's fields by path, appends and removes through useFieldArray", async () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(<Harness initial={[{ account: "1000" }]} formRef={formRef} />);
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    const second = screen.getByRole("textbox", { name: "Account, row 2" });
    expect(second).toHaveFocus();
    await userEvent.type(second, "2000");
    expect(formRef.current?.getValues("lines")).toEqual([{ account: "1000" }, { account: "2000" }]);
    await userEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
    expect(formRef.current?.getValues("lines")).toEqual([{ account: "2000" }]);
  });

  it("shows the array's own error as the list's", async () => {
    const onSubmit = vi.fn();
    render(<Harness initial={[{ account: "1000" }]} onSubmit={onSubmit} />);
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("At least two lines")).toBeInTheDocument();
  });

  it("paints and focuses the first row field in error", async () => {
    render(<Harness initial={[{ account: "1000" }, { account: "" }]} />);
    await submit();
    const field = screen.getByRole("textbox", { name: "Account, row 2" });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
    expect(screen.getByText("Account is required")).toBeInTheDocument();
  });

  it("passes summary, fieldLabels and narrowColumns through, with fieldLabel in the cell context", () => {
    function Floating() {
      const form = useForm<Values>({ defaultValues: { lines: [{ account: "1000" }] } });
      return (
        <Form {...form}>
          <RhfLineItems
            control={form.control}
            name="lines"
            fieldLabels="floating"
            narrowColumns={2}
            summary={{ label: "Left to assign", value: "0.00", tone: "success" }}
            columns={[
              {
                key: "account",
                header: "Account",
                narrowSpan: 2,
                render: ({ name, label, fieldLabel }) => (
                  <RhfField
                    name={`${name}.account`}
                    render={({ field, invalid }) => (
                      <Input
                        label={fieldLabel}
                        aria-label={label}
                        name={field.name}
                        ref={field.ref}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        invalid={invalid}
                      />
                    )}
                  />
                ),
              },
            ]}
          />
        </Form>
      );
    }
    const { container } = render(<Floating />);
    const field = screen.getByRole("textbox", { name: "Account, row 1" });
    expect(field).toHaveValue("1000");
    expect(container.querySelector(`label[for="${field.id}"]`)).toHaveTextContent(/^Account$/);
    expect(screen.getByText("0.00")).toHaveAttribute("data-tone", "success");
    expect(container.querySelector("[data-line-items-row]")?.className).toContain("@2xs:grid-cols-2");
  });
});
