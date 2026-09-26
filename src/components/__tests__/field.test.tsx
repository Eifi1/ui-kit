import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { Input } from "../ui";

describe("Field", () => {
  it("names the render-prop control with the label above it, star kept out of the name", async () => {
    render(
      <Field label="IBAN" required>
        {(ids) => <input {...ids} />}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "IBAN" });
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    await userEvent.click(screen.getByText("IBAN"));
    expect(input).toHaveFocus();
  });

  it("describes the control by the hint and the error that are rendered, hint first", () => {
    render(
      <Field label="IBAN" hint="22 characters" error="Not an IBAN">
        {(ids) => <Input {...ids} />}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "IBAN" });
    expect(input).toHaveAccessibleDescription("22 characters Not an IBAN");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Not an IBAN")).not.toHaveAttribute("role");
  });

  it("treats null, false and '' as no error", () => {
    const { rerender } = render(
      <Field label="IBAN" error={false}>
        {(ids) => <input {...ids} />}
      </Field>,
    );
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    rerender(
      <Field label="IBAN" error="">
        {(ids) => <input {...ids} />}
      </Field>,
    );
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-describedby");
  });

  it("renders plain children as they are, the label pointing at htmlFor", () => {
    render(
      <Field label="Notes" htmlFor="notes" hint="Optional">
        <textarea id="notes" />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute("id", "notes");
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("renders without a label", () => {
    render(<Field error="Pick one">{(ids) => <input {...ids} />}</Field>);
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Pick one");
  });
});
