import type { ReactElement, ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldSuggestion } from "../field-parts";
import { Input } from "../input";
import { Select } from "../select";
import { Textarea } from "../textarea";
import { Combobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { DatePicker } from "../date-picker";
import { NumberInput } from "../number-input";
import { ToggleGroup } from "../toggle-group";
import { CheckboxGroup } from "../checkbox-group";
import { Field } from "../field";
import { Form } from "../../rhf/form";
import { RhfTextField } from "../../rhf/fields";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { applyTextSize } from "../../theme/text-size";
import { DESKTOP_WIDTH, viewportMatchMedia } from "../../test/viewport";

/**
 * A field's "suggested from" caption (0.55, keksdose dev #638): where a prefilled value came
 * from, under the field, with a button that clears it. keksdose drew it by hand — a `<p>`
 * of the caption's type wired to the field by its own id — so here every field that takes
 * a `hint` draws it as its caption, describes its control by it, and names the button
 * after the field.
 */

const noop = () => {};
const OPTIONS = [
  { value: "a", label: "Groceries" },
  { value: "b", label: "Gifts" },
];

function Bound({ hint }: { hint: ReactNode }) {
  const form = useForm<{ category: string }>({ defaultValues: { category: "Groceries" } });
  return (
    <Form {...form}>
      <form>
        <RhfTextField name="category" label="Category" hint={hint} />
      </form>
    </Form>
  );
}

/** Every kind of field part, labelled "Category". */
const SWEEP: Record<string, (hint: ReactNode) => ReactElement> = {
  Input: (hint) => <Input label="Category" defaultValue="Groceries" hint={hint} />,
  Textarea: (hint) => <Textarea label="Category" defaultValue="Groceries" hint={hint} />,
  Select: (hint) => (
    <Select label="Category" defaultValue="a" hint={hint}>
      <option value="a">Groceries</option>
    </Select>
  ),
  Combobox: (hint) => (
    <Combobox label="Category" value="Groceries" onChange={noop} options={["Groceries"]} hint={hint} />
  ),
  EntityCombobox: (hint) => (
    <EntityCombobox<string> label="Category" value="a" onChange={noop} options={OPTIONS} hint={hint} />
  ),
  DatePicker: (hint) => <DatePicker label="Category" value="2026-10-31" onChange={noop} locale="en-GB" hint={hint} />,
  NumberInput: (hint) => <NumberInput label="Category" value="1" onChange={noop} hint={hint} />,
  ToggleGroup: (hint) => <ToggleGroup label="Category" value="a" onChange={noop} options={OPTIONS} hint={hint} />,
  CheckboxGroup: (hint) => (
    <CheckboxGroup legend="Category" options={OPTIONS} value={["a"]} onChange={noop} hint={hint} />
  ),
  Field: (hint) => (
    <Field label="Category" hint={hint}>
      {(ids) => <input {...ids} defaultValue="Groceries" />}
    </Field>
  ),
  RhfTextField: (hint) => <Bound hint={hint} />,
};

/** The caption that holds the suggestion — the element the control's description names. */
const captionOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="field-suggestion"]')?.closest<HTMLElement>("[id]") ?? null;

describe("FieldSuggestion, as a field's hint", () => {
  it.each(Object.keys(SWEEP))("%s: a caption under the field that describes it, and a named clear", (name) => {
    const onClear = vi.fn();
    const { container } = render(SWEEP[name](<FieldSuggestion from="From the memo" onClear={onClear} />));
    expect(screen.getByText("From the memo")).toBeInTheDocument();
    const caption = captionOf(container);
    expect(caption, "the caption carries an id").not.toBeNull();
    // Under the field, never on its label line.
    expect(caption!.closest("label, legend, [data-field-label]")).toBeNull();
    expect(caption!.textContent).toMatch(/^From the memo/);
    expect(
      container.querySelector(`[aria-describedby~="${caption!.id}"]`),
      "a control is described by it",
    ).not.toBeNull();
    const clear = screen.getByRole("button", { name: "Clear the suggestion for “Category”" });
    expect(clear).toHaveTextContent("Clear");
    expect(clear).toHaveAttribute("type", "button");
    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe("FieldSuggestion", () => {
  it("is the kit's 'Suggested' when the app names no source, and words alone without onClear", () => {
    render(<Input label="Account" defaultValue="Giro" hint={<FieldSuggestion />} />);
    const input = screen.getByRole("textbox", { name: "Account" });
    expect(input).toHaveAccessibleDescription("Suggested");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("describes the field by its words and then the way back; the separator is not read", () => {
    render(<Input label="Account" defaultValue="Giro" hint={<FieldSuggestion from="Last used" onClear={noop} />} />);
    expect(screen.getByRole("textbox", { name: "Account" })).toHaveAccessibleDescription(/^Last used Clear/);
  });

  it("takes the field's aria-label when it has no label, and its own `field` first", () => {
    const { unmount } = render(
      <Input
        aria-label="Payee"
        defaultValue="Migros"
        hint={<FieldSuggestion from="From the receipt" onClear={noop} />}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear the suggestion for “Payee”" })).toBeInTheDocument();
    unmount();
    render(
      <Input
        label="Account"
        defaultValue="Giro"
        hint={<FieldSuggestion from="Last used" field="Booking account" onClear={noop} />}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear the suggestion for “Booking account”" })).toBeInTheDocument();
  });

  it("drawn outside a field, names no field unless told", () => {
    render(
      <p>
        <FieldSuggestion from="From the memo" onClear={noop} />
      </p>,
    );
    expect(screen.getByRole("button", { name: "Clear the suggestion" })).toBeInTheDocument();
  });

  it("speaks the provider's language, and its own labels win", () => {
    const { unmount } = render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <Input label="Kategorie" defaultValue="Lebensmittel" hint={<FieldSuggestion onClear={noop} />} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Vorgeschlagen")).toBeInTheDocument();
    const clear = screen.getByRole("button", { name: "Vorschlag für „Kategorie“ entfernen" });
    expect(clear).toHaveTextContent("Entfernen");
    unmount();
    render(<Input label="Account" hint={<FieldSuggestion onClear={noop} labels={{ clear: "Undo" }} />} />);
    expect(within(screen.getByRole("button")).getByText("Undo")).toBeInTheDocument();
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-text-size");
    vi.unstubAllGlobals();
  });

  it("stays a caption at Large text and beside a help", () => {
    vi.stubGlobal("matchMedia", viewportMatchMedia(DESKTOP_WIDTH));
    act(() => applyTextSize("large"));
    render(
      <Input
        label="Account"
        defaultValue="Giro"
        help="The account a new row is booked to."
        hint={<FieldSuggestion from="Last used" onClear={noop} />}
      />,
    );
    // The help's "?" is the label line's only button besides the clear.
    expect(screen.getByRole("button", { name: "Clear the suggestion for “Account”" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Account" })).toHaveAccessibleDescription(/^Last used/);
  });
});
