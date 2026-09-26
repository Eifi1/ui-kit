import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "../field";
import { EntityCombobox } from "../entity-combobox";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { AmountInput } from "../amount-input";
import { DatePicker, DateRangePicker } from "../date-picker";
import { NumberInput } from "../number-input";

/**
 * `Field`'s render-prop hands `{ id, aria-describedby, aria-invalid, aria-required }`
 * to the control. Each control here must type that spread AND put it on the element
 * a reader lands on — not on a wrapper div, where the label named nothing and the
 * hint and required state described nothing.
 */
function expectWired(el: HTMLElement, id: string | null) {
  expect(el.id).toBe(id);
  expect(el).toHaveAttribute("aria-invalid", "true");
  expect(el).toHaveAttribute("aria-required", "true");
  expect(el).toHaveAccessibleDescription("The hint Required");
}

const OPTIONS = [{ value: 1, label: "Anna" }];

describe("controls take Field's render-prop spread on their focusable element", () => {
  it("EntityCombobox: on the trigger, not the wrapper", () => {
    let fieldId = "";
    render(
      <Field label="Tenant" hint="The hint" error="Required" required>
        {(ids) => {
          fieldId = ids.id;
          return <EntityCombobox {...ids} data-testid="wrapper" value={null} onChange={vi.fn()} options={OPTIONS} />;
        }}
      </Field>,
    );
    const trigger = screen.getByRole("combobox", { name: "Tenant" });
    expectWired(trigger, fieldId);
    // `aria-invalid` alone paints the invalid border.
    expect(trigger.className).toMatch(/danger/);
    const wrapper = screen.getByTestId("wrapper");
    for (const attr of ["id", "aria-describedby", "aria-invalid", "aria-required"]) {
      expect(wrapper).not.toHaveAttribute(attr);
    }
  });

  it("EntityCombobox: merges a caller's describedby with its own error", () => {
    render(
      <>
        <p id="ext">External</p>
        <EntityCombobox aria-label="Owner" aria-describedby="ext" error="Pick one" value={null} onChange={vi.fn()} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: /Owner/ })).toHaveAccessibleDescription("External Pick one");
  });

  it("Combobox: on the input, and a caller's describedby merges with its error", () => {
    let fieldId = "";
    const { unmount } = render(
      <Field label="Payee" hint="The hint" error="Required" required>
        {(ids) => {
          fieldId = ids.id;
          return <Combobox {...ids} data-testid="wrapper" value="" onChange={vi.fn()} options={["Bern"]} />;
        }}
      </Field>,
    );
    const input = screen.getByRole("combobox", { name: "Payee" });
    expectWired(input, fieldId);
    expect(input.className).toMatch(/danger/);
    expect(screen.getByTestId("wrapper")).not.toHaveAttribute("aria-describedby");
    unmount();

    render(
      <>
        <p id="ext">External</p>
        <Combobox aria-label="City" aria-describedby="ext" error="Too long" value="" onChange={vi.fn()} options={[]} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "City" })).toHaveAccessibleDescription("External Too long");
  });

  it("InlineEntityCombobox: on the input, and a caller's describedby merges with its error", () => {
    let fieldId = "";
    const { unmount } = render(
      <Field label="Account" hint="The hint" error="Required" required>
        {(ids) => {
          fieldId = ids.id;
          return <InlineEntityCombobox {...ids} data-testid="wrapper" value={null} onChange={vi.fn()} options={OPTIONS} />;
        }}
      </Field>,
    );
    const input = screen.getByRole("combobox", { name: "Account" });
    expectWired(input, fieldId);
    expect(input.className).toMatch(/danger/);
    expect(screen.getByTestId("wrapper")).not.toHaveAttribute("aria-describedby");
    unmount();

    render(
      <>
        <p id="ext">External</p>
        <InlineEntityCombobox aria-label="To" aria-describedby="ext" error="Pick one" value={null} onChange={vi.fn()} options={OPTIONS} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "To" })).toHaveAccessibleDescription("External Pick one");
  });

  it("AmountInput: on the input, and aria-invalid paints", () => {
    let fieldId = "";
    render(
      <Field label="Rent" hint="The hint" error="Required" required>
        {(ids) => {
          fieldId = ids.id;
          return <AmountInput {...ids} value="" onChange={vi.fn()} currency="CHF" />;
        }}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Rent" });
    expectWired(input, fieldId);
    expect(input.className).toMatch(/danger/);
  });

  it("DatePicker: on the trigger, plain and with a step row as the root", () => {
    for (const step of [false, true]) {
      let fieldId = "";
      const { unmount } = render(
        <Field label="Start" hint="The hint" error="Required" required>
          {(ids) => {
            fieldId = ids.id;
            return <DatePicker {...ids} data-testid="root" value="" onChange={vi.fn()} step={step} />;
          }}
        </Field>,
      );
      const trigger = screen.getByRole("combobox", { name: /^Start/ });
      expectWired(trigger, fieldId);
      expect(screen.getByTestId("root")).not.toHaveAttribute("aria-required");
      unmount();
    }
  });

  it("DateRangePicker: on the trigger", () => {
    let fieldId = "";
    render(
      <Field label="Period" hint="The hint" error="Required" required>
        {(ids) => {
          fieldId = ids.id;
          return <DateRangePicker {...ids} from="" to="" onChange={vi.fn()} />;
        }}
      </Field>,
    );
    expectWired(screen.getByRole("combobox", { name: /^Period/ }), fieldId);
  });

  it("NumberInput: on the input, and aria-invalid paints", () => {
    let fieldId = "";
    render(
      <Field label="Share" hint="The hint" error="Required" required>
        {(ids) => {
          fieldId = ids.id;
          return <NumberInput {...ids} value="" onChange={vi.fn()} calculator={false} />;
        }}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Share" });
    expectWired(input, fieldId);
    expect(input.className).toMatch(/danger/);
  });
});

describe("DatePicker paints aria-invalid from a Field spread", () => {
  it("draws the invalid border without its own `invalid` prop", () => {
    render(
      <Field label="Start" error="Required">
        {(ids) => <DatePicker {...ids} value="" onChange={() => {}} />}
      </Field>,
    );
    expect(screen.getByRole("combobox", { name: /Start/ }).className).toMatch(/danger|invalid/);
  });
});
