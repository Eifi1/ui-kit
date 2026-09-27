import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { MultiSelect } from "../multi-select";
import { Field } from "../field";
import { Form, FormField, FormItem } from "../../rhf/form";

/** Two findings of the 2026-09-27 showcase audit, pinned by their classes (jsdom has no layout). */
describe("showcase audit layout fixes", () => {
  it("dims a disabled MultiSelect's trigger like the other pickers", () => {
    render(<MultiSelect label="Markets" options={[{ value: 1, label: "EU" }]} values={[1]} onChange={() => {}} disabled />);
    const trigger = screen.getByRole("combobox", { name: /Markets/ });
    expect(trigger).toBeDisabled();
    expect(trigger.className).toContain("disabled:opacity-50");
  });

  it("keeps Field and FormItem rows at their content height in a grid row", () => {
    function Harness() {
      const form = useForm({ defaultValues: { a: "" } });
      return (
        <Form {...form}>
          <FormField name="a" render={() => <FormItem data-testid="item" />} />
        </Form>
      );
    }
    render(
      <>
        <Field label="Title">{(ids) => <input {...ids} />}</Field>
        <Harness />
      </>,
    );
    expect(screen.getByTestId("item").className).toContain("content-start");
    expect(document.querySelector('[data-slot="field"]')!.className).toContain("content-start");
  });
});
