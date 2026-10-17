import type { FormEvent, ReactElement, ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldHint } from "../field-parts";
import { FOCUS_RING } from "../focus-ring";
import { Input } from "../input";
import { Select } from "../select";
import { Textarea } from "../textarea";
import { HelpPopover } from "../help-popover";
import { NumberInput } from "../number-input";
import { NumberField, IntegerField } from "../number-field";
import { AmountInput } from "../amount-input";
import { MoneyField } from "../money-field";
import { ToggleGroup } from "../toggle-group";
import { Slider } from "../slider";
import { CountrySelect } from "../country-select";
import { CurrencySelect } from "../currency-select";
import { OneTimeCodeInput } from "../one-time-code-input";
import { PhoneInput } from "../phone-input";
import { IbanInput } from "../iban-input";
import { TimeInput } from "../time-input";
import { SwatchPicker } from "../swatch-picker";
import { IconPicker } from "../icon-picker";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { MultiSelect } from "../multi-select";
import { Autocomplete } from "../autocomplete";
import { DatePicker, DateRangePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";
import { CheckboxGroup } from "../checkbox-group";
import { Field } from "../field";
import { FieldStrip } from "../field-strip";
import { LanguageSelect } from "../language-select";
import { ContrastSetting, LanguageSetting, TextSizeSetting, ThemeSetting } from "../settings-fields";
import { CurrentPasswordInput, TypedConfirmField } from "../danger-confirm";
import { RoleSelect, RolesEditor } from "../../admin/role-select";
import { Form } from "../../rhf/form";
import {
  RhfCheckbox,
  RhfCombobox,
  RhfCountrySelect,
  RhfDateField,
  RhfDateRangePicker,
  RhfField,
  RhfIbanInput,
  RhfInlineEntityCombobox,
  RhfIntegerField,
  RhfMoneyField,
  RhfMonthPicker,
  RhfNumberField,
  RhfPhoneInput,
  RhfSelect,
  RhfTextarea,
  RhfTextCombobox,
  RhfTextField,
  RhfTimeInput,
  RhfToggleGroup,
} from "../../rhf/fields";
import type * as Kit from "../../index";
import type * as KitRhf from "../../rhf";
import { applyTextSize } from "../../theme/text-size";
import { DESKTOP_WIDTH, viewportMatchMedia } from "../../test/viewport";

/**
 * keksdose K3 (live #400, round 0.34): paragraph-long HELP behind a "?" that opens on a tap — the
 * kit Popover — rather than a FieldHint, which since 0.32 prints its words under the
 * field at Large and on a touch screen (§4 "No fact only in a tooltip"). That rule stays
 * for a FieldHint, a fact; a HelpPopover is help, and stays a "?" at every size
 * (docs/text-size-harmonization.md §10.23).
 */

const QUESTION = "What do the statuses mean?";
const HELP =
  "Pending: entered, not yet seen by the bank. Accepted: the bank has it. Cleared: it is on the statement. Reconciled: checked against the statement.";

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

/** A `matchMedia` whose primary pointer is a finger when `coarse` (the §4 test's). */
function media({ coarse = false }: { coarse?: boolean } = {}) {
  vi.stubGlobal("matchMedia", viewportMatchMedia(DESKTOP_WIDTH, { coarse }));
}

function help() {
  return <HelpPopover label={QUESTION}>{HELP}</HelpPopover>;
}

describe("HelpPopover", () => {
  it("is a '?' button named by its question, closed until pressed", () => {
    render(help());
    const button = screen.getByRole("button", { name: QUESTION });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button.className).toContain(FOCUS_RING);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The help is not on the page until asked for.
    expect(screen.queryByText(HELP)).toBeNull();
  });

  it("opens on a click: a dialog named by the question, described by the help, holding the focus", async () => {
    const user = userEvent.setup();
    render(help());
    const button = screen.getByRole("button", { name: QUESTION });
    await user.click(button);
    const panel = screen.getByRole("dialog", { name: QUESTION });
    expect(panel).toHaveAccessibleDescription(HELP);
    expect(within(panel).getByText(HELP)).toBeVisible();
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveFocus();
  });

  it("closes on a second press, and on Escape with the focus back on the '?'", async () => {
    const user = userEvent.setup();
    render(help());
    const button = screen.getByRole("button", { name: QUESTION });
    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("opens from the keyboard (Enter, Space), and reaches a keyboard at all", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        {help()}
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Before" }));
    await user.tab();
    const button = screen.getByRole("button", { name: QUESTION });
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.keyboard(" ");
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
  });

  it("never submits the form its field stands in", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Input label="Status" hint={help()} />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: QUESTION }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
  });

  it("takes the panel's width, a paragraph's measure by default", async () => {
    const user = userEvent.setup();
    render(
      <HelpPopover label={QUESTION} width={200}>
        {HELP}
      </HelpPopover>,
    );
    await user.click(screen.getByRole("button", { name: QUESTION }));
    // Capped by the viewport (jsdom: 1024 px), so a px width shows as given.
    expect(screen.getByRole("dialog").style.width).toBe("200px");
  });
});

/**
 * The exported components whose props declare `hint` — read off the TYPES of the two
 * barrels, so a component that gains a `hint` cannot stay out of the sweep below
 * unnoticed: the typecheck fails until it is swept or listed in {@link NOT_A_FIELD_HINT}
 * with its reason (DUP-2, refactor audit 2026-10: this test said "each kit field that
 * takes a `hint`" and listed five, while Slider and CountrySelect still printed nothing
 * on a phone).
 */
type HintTakers<M> = {
  [K in keyof M & string]: K extends Capitalize<K>
    ? M[K] extends (props: infer P, ...rest: never[]) => unknown
      ? "hint" extends keyof P
        ? K
        : never
      : never
    : never;
}[keyof M & string];

/** They take `hint`, but it is not a field's hint: a subtitle, a caption or note of their
 *  own, a string they draw their own "?" from, or the primitive the fields resolve theirs
 *  into. */
const NOT_A_FIELD_HINT = [
  // The label box every field draws its label line with: it draws what it is handed,
  // and the fields hand it a hint they resolved already.
  "FloatingField",
  // A second line of text under a title or a figure.
  "EmptyState",
  "Disclosure",
  "ProgressBar",
  "ColumnMapper",
  "MeasuredGrid",
  "FileDropzone",
  // A string: the component draws its own FieldHint from it.
  "StatTile",
  // 0.42.0: a StatTile that is a link — the same `hint`.
  "AttentionTile",
  "DescriptionItem",
] as const satisfies ReadonlyArray<HintTakers<typeof Kit>>;

type SweptField = Exclude<HintTakers<typeof Kit> | HintTakers<typeof KitRhf>, (typeof NOT_A_FIELD_HINT)[number]>;

const noop = () => {};
const OPTIONS = [
  { value: "a", label: "Pending" },
  { value: "b", label: "Cleared" },
];
const ROLES = { admin: { label: "Administrator" }, member: { label: "Member" } };
const THEMES = { system: "System", light: "Light", dark: "Dark" };

/** A bound field in a form of its own. */
function InForm({ children }: { children: ReactNode }) {
  const form = useForm({
    defaultValues: { text: "", count: 1, date: "", from: "", to: "", month: "", choice: "a", flag: false, country: "CH" },
  });
  return (
    <Form {...form}>
      <form>{children}</form>
    </Form>
  );
}

/** Every field that takes a `hint`, labelled "Status" (or named so), with `hint` given. */
const SWEEP: Record<SweptField, (hint: ReactNode) => ReactElement> = {
  Input: (hint) => <Input label="Status" hint={hint} />,
  Textarea: (hint) => <Textarea label="Status" hint={hint} />,
  Select: (hint) => (
    <Select label="Status" hint={hint} defaultValue="a">
      <option value="a">Pending</option>
    </Select>
  ),
  TimeInput: (hint) => <TimeInput label="Status" value="09:00" onChange={noop} hint={hint} />,
  IbanInput: (hint) => <IbanInput label="Status" value="" onChange={noop} hint={hint} />,
  PhoneInput: (hint) => <PhoneInput label="Status" value="" hint={hint} />,
  CurrentPasswordInput: (hint) => <CurrentPasswordInput label="Status" hint={hint} />,
  TypedConfirmField: (hint) => <TypedConfirmField target="DELETE" hint={hint} />,
  OneTimeCodeInput: (hint) => <OneTimeCodeInput label="Status" value="" onChange={noop} hint={hint} />,
  NumberInput: (hint) => <NumberInput label="Status" value="1" onChange={noop} hint={hint} />,
  NumberField: (hint) => <NumberField label="Status" value={1} onCommit={noop} hint={hint} />,
  IntegerField: (hint) => <IntegerField label="Status" value={1} onCommit={noop} hint={hint} />,
  AmountInput: (hint) => <AmountInput label="Status" value="1" onChange={noop} hint={hint} />,
  MoneyField: (hint) => <MoneyField label="Status" value={1} onCommit={noop} hint={hint} />,
  Slider: (hint) => <Slider label="Status" value={1} min={0} max={10} onChange={noop} hint={hint} />,
  CurrencySelect: (hint) => <CurrencySelect label="Status" value="CHF" onChange={noop} hint={hint} />,
  CountrySelect: (hint) => <CountrySelect label="Status" value="CH" onChange={noop} hint={hint} />,
  LanguageSelect: (hint) => <LanguageSelect label="Status" value="en" onChange={noop} hint={hint} />,
  RoleSelect: (hint) => <RoleSelect label="Status" value="member" roles={ROLES} onChange={noop} hint={hint} />,
  RolesEditor: (hint) => <RolesEditor legend="Status" value={["member"]} roles={ROLES} onChange={noop} hint={hint} />,
  ThemeSetting: (hint) => (
    <ThemeSetting label="Status" value="system" onChange={noop} optionLabels={THEMES} hint={hint} />
  ),
  LanguageSetting: (hint) => (
    <LanguageSetting label="Status" value="en" onChange={noop} options={[{ code: "en", label: "English" }]} hint={hint} />
  ),
  TextSizeSetting: (hint) => <TextSizeSetting label="Status" value="normal" onChange={noop} hint={hint} />,
  ContrastSetting: (hint) => <ContrastSetting label="Status" value="system" onChange={noop} hint={hint} />,
  Combobox: (hint) => <Combobox label="Status" value="" onChange={noop} options={["Pending"]} hint={hint} />,
  InlineEntityCombobox: (hint) => (
    <InlineEntityCombobox label="Status" value="a" options={OPTIONS} onChange={noop} hint={hint} />
  ),
  EntityCombobox: (hint) => <EntityCombobox label="Status" value="a" options={OPTIONS} onChange={noop} hint={hint} />,
  MultiEntityCombobox: (hint) => (
    <MultiEntityCombobox label="Status" value={["a"]} options={OPTIONS} onChange={noop} hint={hint} />
  ),
  MultiSelect: (hint) => <MultiSelect label="Status" options={OPTIONS} value={[]} onChange={noop} hint={hint} />,
  Autocomplete: (hint) => <Autocomplete label="Status" value="" onChange={noop} hint={hint} />,
  DatePicker: (hint) => <DatePicker label="Status" value="2026-09-14" onChange={noop} hint={hint} />,
  DateRangePicker: (hint) => (
    <DateRangePicker label="Status" from="2026-09-01" to="2026-09-14" onChange={noop} hint={hint} />
  ),
  MonthPicker: (hint) => <MonthPicker label="Status" value="2026-08" onChange={noop} hint={hint} />,
  ToggleGroup: (hint) => <ToggleGroup label="Status" hint={hint} value="a" onChange={noop} options={OPTIONS} />,
  CheckboxGroup: (hint) => <CheckboxGroup legend="Status" options={OPTIONS} value={[]} onChange={noop} hint={hint} />,
  SwatchPicker: (hint) => (
    <SwatchPicker label="Status" options={[{ value: "red", label: "Red", color: "#f00" }]} value={null} onChange={noop} hint={hint} />
  ),
  IconPicker: (hint) => (
    <IconPicker label="Status" options={[{ value: "ok", label: "Done", icon: Check }]} value={null} onChange={noop} hint={hint} />
  ),
  FieldStrip: (hint) => (
    <FieldStrip label="Status" hint={hint}>
      <span>Bern</span>
    </FieldStrip>
  ),
  Field: (hint) => <Field label="Status" hint={hint}>{(ids) => <input {...ids} />}</Field>,
  // The bound twins: label above (FormLabel), hint under the field (FormDescription).
  RhfField: (hint) => (
    <InForm>
      <RhfField name="text" label="Status" hint={hint} render={({ field }) => <input {...field} />} />
    </InForm>
  ),
  RhfTextField: (hint) => <InForm><RhfTextField name="text" label="Status" hint={hint} /></InForm>,
  RhfTextarea: (hint) => <InForm><RhfTextarea name="text" label="Status" hint={hint} /></InForm>,
  RhfNumberField: (hint) => <InForm><RhfNumberField name="count" label="Status" hint={hint} /></InForm>,
  RhfIntegerField: (hint) => <InForm><RhfIntegerField name="count" label="Status" hint={hint} /></InForm>,
  RhfMoneyField: (hint) => <InForm><RhfMoneyField name="count" label="Status" currency="CHF" hint={hint} /></InForm>,
  RhfDateField: (hint) => <InForm><RhfDateField name="date" label="Status" hint={hint} /></InForm>,
  RhfDateRangePicker: (hint) => (
    <InForm><RhfDateRangePicker fromName="from" toName="to" label="Status" hint={hint} /></InForm>
  ),
  RhfTimeInput: (hint) => <InForm><RhfTimeInput name="text" label="Status" hint={hint} /></InForm>,
  RhfIbanInput: (hint) => <InForm><RhfIbanInput name="text" label="Status" hint={hint} /></InForm>,
  RhfPhoneInput: (hint) => <InForm><RhfPhoneInput name="text" label="Status" hint={hint} /></InForm>,
  RhfCountrySelect: (hint) => <InForm><RhfCountrySelect name="country" label="Status" hint={hint} /></InForm>,
  RhfMonthPicker: (hint) => <InForm><RhfMonthPicker name="month" label="Status" hint={hint} /></InForm>,
  RhfSelect: (hint) => <InForm><RhfSelect name="choice" label="Status" options={OPTIONS} hint={hint} /></InForm>,
  RhfCheckbox: (hint) => <InForm><RhfCheckbox name="flag" label="Status" hint={hint} /></InForm>,
  RhfToggleGroup: (hint) => <InForm><RhfToggleGroup name="choice" label="Status" options={OPTIONS} hint={hint} /></InForm>,
  RhfCombobox: (hint) => <InForm><RhfCombobox name="choice" label="Status" options={OPTIONS} hint={hint} /></InForm>,
  RhfInlineEntityCombobox: (hint) => (
    <InForm><RhfInlineEntityCombobox name="choice" label="Status" options={OPTIONS} hint={hint} /></InForm>
  ),
  RhfTextCombobox: (hint) => <InForm><RhfTextCombobox name="text" label="Status" options={["Bern"]} hint={hint} /></InForm>,
};

describe("a HelpPopover stays on the label line where a FieldHint becomes a caption (§10.23)", () => {
  const swept = Object.keys(SWEEP) as SweptField[];

  it("sweeps every exported component whose props take `hint`, the listed non-fields aside", () => {
    // The completeness is the typecheck's (`Record<SweptField, …>`); here, that the two
    // lists do not overlap and the sweep is not empty.
    for (const name of NOT_A_FIELD_HINT) expect(swept).not.toContain(name);
    expect(swept.length).toBeGreaterThan(50);
  });

  for (const where of ["touch", "large"] as const) {
    for (const name of swept) {
      it(`${name}: on ${where === "touch" ? "a touch screen" : "Large"} the '?' stays and nothing is printed`, async () => {
        media({ coarse: where === "touch" });
        if (where === "large") act(() => applyTextSize("large"));
        const user = userEvent.setup();
        render(SWEEP[name](help()));
        expect(screen.queryByText(HELP)).toBeNull();
        await user.click(screen.getByRole("button", { name: QUESTION }));
        expect(screen.getByRole("dialog", { name: QUESTION })).toHaveAccessibleDescription(HELP);
      });
    }
  }

  // DUP-2 (refactor audit 2026-10): every field resolves its `hint` through
  // useFieldHint / useFieldMessages (or, a bare "hint under the control" one, through
  // useInlineHint), so a FieldHint — a fact — is never a lone 14 px "?" on a phone.
  for (const name of swept) {
    it(`${name}: a FieldHint is printed as its caption on a touch screen, and describes the field`, () => {
      media({ coarse: true });
      const fact = "Excludes transfers between your own accounts";
      render(SWEEP[name](<FieldHint label={fact} />));
      expect(screen.queryByRole("button", { name: fact })).toBeNull();
      const caption = screen.getByText(fact);
      expect(caption).toBeVisible();
      // Attached: the caption (or the box it is in) is some control's description.
      const id = caption.closest("[id]")?.id;
      expect(id).toBeTruthy();
      expect(document.querySelector(`[aria-describedby~="${id}"]`)).not.toBeNull();
    });
  }

  it("on an unlabelled field, at the end edge outside the box", () => {
    render(<Input aria-label="Status" hint={help()} />);
    const input = screen.getByRole("textbox", { name: "Status" });
    const button = screen.getByRole("button", { name: QUESTION });
    // EndHintRow: one flex row, the field first and the "?" after it.
    const row = button.parentElement!.parentElement!;
    expect(row).toHaveClass("flex");
    expect(row).toContainElement(input);
    expect(input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(button);
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
  });
});
