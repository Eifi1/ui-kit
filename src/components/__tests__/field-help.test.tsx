import type { ReactElement, ReactNode } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldHint } from "../field-parts";
import { HelpPopover } from "../help-popover";
import { Input } from "../input";
import { Select } from "../select";
import { Textarea } from "../textarea";
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
import { ColumnMapper } from "../column-mapper";
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
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { applyTextSize } from "../../theme/text-size";
import { DESKTOP_WIDTH, viewportMatchMedia } from "../../test/viewport";

/**
 * Round 0.36 decision 1 (docs/text-size-harmonization.md §4, §10.23): a `help` slot beside
 * `hint` on every kit field. The fact is `hint` — a caption under the field, on its
 * `aria-describedby`; the help is `help` — a HelpPopover "?" on the label line, named
 * "About “<label>”". The help's "?" is the field's ONLY "?": while `help` is set a
 * FieldHint draws no "?" of its own and is printed as the caption at every size —
 * Normal included, not only at Large and on touch, where it always was.
 *
 * Kurvenschmiede's "How it was measured" (hysteresis-editor.tsx) is the case: a fact and
 * help on one Select, with one `hint` slot for both.
 */

const FACT = "Excludes transfers between your own accounts";
const HELP =
  "Pending: entered, not yet seen by the bank. Accepted: the bank has it. Cleared: it is on the statement.";
const ABOUT = /^About /;

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

type Mode = "normal" | "large" | "touch";

/** Normal on a mouse, Large on a mouse, Normal on a finger. */
function setMode(mode: Mode) {
  vi.stubGlobal("matchMedia", viewportMatchMedia(DESKTOP_WIDTH, { coarse: mode === "touch" }));
  if (mode === "large") act(() => applyTextSize("large"));
}

/** Every "?" icon in the tree — a FieldHint's and a HelpPopover's draw the same one. */
function questionMarks(root: HTMLElement): Element[] {
  return [...root.querySelectorAll("svg")].filter((svg) => /help/.test(svg.getAttribute("class") ?? ""));
}

/** The control a caption describes: some element's `aria-describedby` names its id. */
function describes(caption: HTMLElement): Element | null {
  const id = caption.closest("[id]")?.id;
  if (!id) return null;
  return document.querySelector(`[aria-describedby~="${id}"]`);
}

/**
 * The exported components whose props declare `help` — read off the TYPES of the two
 * barrels, as help-popover.test.tsx reads `hint`, so a component that gains a `help`
 * cannot stay out of the sweep below unnoticed.
 */
type HelpTakers<M> = {
  [K in keyof M & string]: K extends Capitalize<K>
    ? M[K] extends (props: infer P, ...rest: never[]) => unknown
      ? "help" extends keyof P
        ? K
        : never
      : never
    : never;
}[keyof M & string];

type SweptField = HelpTakers<typeof Kit> | HelpTakers<typeof KitRhf>;

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

type Make = (hint: ReactNode, help: ReactNode) => ReactElement;

/** Every field that takes a `help`, labelled "Status" (or named so). */
const SWEEP: Record<SweptField, Make> = {
  Input: (hint, help) => <Input label="Status" hint={hint} help={help} />,
  Textarea: (hint, help) => <Textarea label="Status" hint={hint} help={help} />,
  Select: (hint, help) => (
    <Select label="Status" hint={hint} help={help} defaultValue="a">
      <option value="a">Pending</option>
    </Select>
  ),
  TimeInput: (hint, help) => <TimeInput label="Status" value="09:00" onChange={noop} hint={hint} help={help} />,
  IbanInput: (hint, help) => <IbanInput label="Status" value="" onChange={noop} hint={hint} help={help} />,
  PhoneInput: (hint, help) => <PhoneInput label="Status" value="" hint={hint} help={help} />,
  CurrentPasswordInput: (hint, help) => <CurrentPasswordInput label="Status" hint={hint} help={help} />,
  TypedConfirmField: (hint, help) => <TypedConfirmField target="DELETE" hint={hint} help={help} />,
  OneTimeCodeInput: (hint, help) => (
    <OneTimeCodeInput label="Status" value="" onChange={noop} hint={hint} help={help} />
  ),
  NumberInput: (hint, help) => <NumberInput label="Status" value="1" onChange={noop} hint={hint} help={help} />,
  NumberField: (hint, help) => <NumberField label="Status" value={1} onCommit={noop} hint={hint} help={help} />,
  IntegerField: (hint, help) => <IntegerField label="Status" value={1} onCommit={noop} hint={hint} help={help} />,
  AmountInput: (hint, help) => <AmountInput label="Status" value="1" onChange={noop} hint={hint} help={help} />,
  MoneyField: (hint, help) => <MoneyField label="Status" value={1} onCommit={noop} hint={hint} help={help} />,
  Slider: (hint, help) => (
    <Slider label="Status" value={1} min={0} max={10} onChange={noop} hint={hint} help={help} />
  ),
  CurrencySelect: (hint, help) => (
    <CurrencySelect label="Status" value="CHF" onChange={noop} hint={hint} help={help} />
  ),
  CountrySelect: (hint, help) => <CountrySelect label="Status" value="CH" onChange={noop} hint={hint} help={help} />,
  LanguageSelect: (hint, help) => (
    <LanguageSelect label="Status" value="en" onChange={noop} hint={hint} help={help} />
  ),
  RoleSelect: (hint, help) => (
    <RoleSelect label="Status" value="member" roles={ROLES} onChange={noop} hint={hint} help={help} />
  ),
  RolesEditor: (hint, help) => (
    <RolesEditor legend="Status" value={["member"]} roles={ROLES} onChange={noop} hint={hint} help={help} />
  ),
  ThemeSetting: (hint, help) => (
    <ThemeSetting label="Status" value="system" onChange={noop} optionLabels={THEMES} hint={hint} help={help} />
  ),
  LanguageSetting: (hint, help) => (
    <LanguageSetting
      label="Status"
      value="en"
      onChange={noop}
      options={[{ code: "en", label: "English" }]}
      hint={hint}
      help={help}
    />
  ),
  TextSizeSetting: (hint, help) => (
    <TextSizeSetting label="Status" value="normal" onChange={noop} hint={hint} help={help} />
  ),
  ContrastSetting: (hint, help) => (
    <ContrastSetting label="Status" value="system" onChange={noop} hint={hint} help={help} />
  ),
  Combobox: (hint, help) => (
    <Combobox label="Status" value="" onChange={noop} options={["Pending"]} hint={hint} help={help} />
  ),
  InlineEntityCombobox: (hint, help) => (
    <InlineEntityCombobox label="Status" value="a" options={OPTIONS} onChange={noop} hint={hint} help={help} />
  ),
  EntityCombobox: (hint, help) => (
    <EntityCombobox label="Status" value="a" options={OPTIONS} onChange={noop} hint={hint} help={help} />
  ),
  MultiEntityCombobox: (hint, help) => (
    <MultiEntityCombobox label="Status" value={["a"]} options={OPTIONS} onChange={noop} hint={hint} help={help} />
  ),
  MultiSelect: (hint, help) => (
    <MultiSelect label="Status" options={OPTIONS} value={[]} onChange={noop} hint={hint} help={help} />
  ),
  Autocomplete: (hint, help) => <Autocomplete label="Status" value="" onChange={noop} hint={hint} help={help} />,
  DatePicker: (hint, help) => (
    <DatePicker label="Status" value="2026-09-14" onChange={noop} hint={hint} help={help} />
  ),
  DateRangePicker: (hint, help) => (
    <DateRangePicker label="Status" from="2026-09-01" to="2026-09-14" onChange={noop} hint={hint} help={help} />
  ),
  MonthPicker: (hint, help) => <MonthPicker label="Status" value="2026-08" onChange={noop} hint={hint} help={help} />,
  ToggleGroup: (hint, help) => (
    <ToggleGroup label="Status" hint={hint} help={help} value="a" onChange={noop} options={OPTIONS} />
  ),
  CheckboxGroup: (hint, help) => (
    <CheckboxGroup legend="Status" options={OPTIONS} value={[]} onChange={noop} hint={hint} help={help} />
  ),
  SwatchPicker: (hint, help) => (
    <SwatchPicker
      label="Status"
      options={[{ value: "red", label: "Red", color: "#f00" }]}
      value={null}
      onChange={noop}
      hint={hint}
      help={help}
    />
  ),
  IconPicker: (hint, help) => (
    <IconPicker
      label="Status"
      options={[{ value: "ok", label: "Done", icon: Check }]}
      value={null}
      onChange={noop}
      hint={hint}
      help={help}
    />
  ),
  ColumnMapper: (hint, help) => (
    <ColumnMapper
      label="Status"
      roles={[{ value: "t", label: "Time", required: true }]}
      onChange={noop}
      hint={hint}
      help={help}
    />
  ),
  FieldStrip: (hint, help) => (
    <FieldStrip label="Status" hint={hint} help={help}>
      <span>Bern</span>
    </FieldStrip>
  ),
  Field: (hint, help) => (
    <Field label="Status" hint={hint} help={help}>
      {(ids) => <input {...ids} />}
    </Field>
  ),
  // The bound twins: label above (FormLabel) with the help's "?" after it, the hint under
  // the field (FormDescription). `help` must not reach the kit control as well.
  RhfField: (hint, help) => (
    <InForm>
      <RhfField name="text" label="Status" hint={hint} help={help} render={({ field }) => <input {...field} />} />
    </InForm>
  ),
  RhfTextField: (hint, help) => (
    <InForm>
      <RhfTextField name="text" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfTextarea: (hint, help) => (
    <InForm>
      <RhfTextarea name="text" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfNumberField: (hint, help) => (
    <InForm>
      <RhfNumberField name="count" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfIntegerField: (hint, help) => (
    <InForm>
      <RhfIntegerField name="count" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfMoneyField: (hint, help) => (
    <InForm>
      <RhfMoneyField name="count" label="Status" currency="CHF" hint={hint} help={help} />
    </InForm>
  ),
  RhfDateField: (hint, help) => (
    <InForm>
      <RhfDateField name="date" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfDateRangePicker: (hint, help) => (
    <InForm>
      <RhfDateRangePicker fromName="from" toName="to" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfTimeInput: (hint, help) => (
    <InForm>
      <RhfTimeInput name="text" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfIbanInput: (hint, help) => (
    <InForm>
      <RhfIbanInput name="text" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfPhoneInput: (hint, help) => (
    <InForm>
      <RhfPhoneInput name="text" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfCountrySelect: (hint, help) => (
    <InForm>
      <RhfCountrySelect name="country" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfMonthPicker: (hint, help) => (
    <InForm>
      <RhfMonthPicker name="month" label="Status" hint={hint} help={help} />
    </InForm>
  ),
  RhfSelect: (hint, help) => (
    <InForm>
      <RhfSelect name="choice" label="Status" options={OPTIONS} hint={hint} help={help} />
    </InForm>
  ),
  RhfToggleGroup: (hint, help) => (
    <InForm>
      <RhfToggleGroup name="choice" label="Status" options={OPTIONS} hint={hint} help={help} />
    </InForm>
  ),
  RhfCombobox: (hint, help) => (
    <InForm>
      <RhfCombobox name="choice" label="Status" options={OPTIONS} hint={hint} help={help} />
    </InForm>
  ),
  RhfInlineEntityCombobox: (hint, help) => (
    <InForm>
      <RhfInlineEntityCombobox name="choice" label="Status" options={OPTIONS} hint={hint} help={help} />
    </InForm>
  ),
  RhfTextCombobox: (hint, help) => (
    <InForm>
      <RhfTextCombobox name="text" label="Status" options={["Bern"]} hint={hint} help={help} />
    </InForm>
  ),
};

const swept = Object.keys(SWEEP) as SweptField[];

describe("help beside hint: the fact as the caption, the help behind the one '?' (round 0.36)", () => {
  it("sweeps every exported component whose props take `help`", () => {
    // The completeness is the typecheck's (`Record<SweptField, …>`).
    expect(swept.length).toBeGreaterThan(55);
    expect(swept).not.toContain("RhfCheckbox");
  });

  for (const mode of ["normal", "large", "touch"] as const) {
    for (const name of swept) {
      it(`${name} at ${mode}: hint + help — the fact is printed and described, one '?' opens the help`, async () => {
        setMode(mode);
        const user = userEvent.setup();
        const { container } = render(SWEEP[name](<FieldHint label={FACT} />, HELP));
        // The fact: the caption, at every size, and some control's description.
        const caption = screen.getByText(FACT);
        expect(caption).toBeVisible();
        expect(describes(caption)).not.toBeNull();
        // One "?": the help's. The FieldHint draws none of its own.
        expect(screen.queryByRole("button", { name: FACT })).toBeNull();
        expect(questionMarks(container)).toHaveLength(1);
        const button = screen.getByRole("button", { name: ABOUT });
        expect(button).toHaveAttribute("aria-haspopup", "dialog");
        // The help is not printed, and opens on a press.
        expect(screen.queryByText(HELP)).toBeNull();
        await user.click(button);
        const dialog = screen.getByRole("dialog", { name: button.getAttribute("aria-label")! });
        expect(dialog).toHaveAccessibleDescription(HELP);
      });
    }
  }

  for (const name of swept) {
    it(`${name}: help alone — the one '?', nothing printed`, () => {
      setMode("touch");
      const { container } = render(SWEEP[name](undefined, HELP));
      expect(screen.getAllByRole("button", { name: ABOUT })).toHaveLength(1);
      expect(questionMarks(container)).toHaveLength(1);
      expect(screen.queryByText(HELP)).toBeNull();
    });

    it(`${name}: hint alone is unchanged — a FieldHint stays a '?' at Normal, no help '?'`, () => {
      setMode("normal");
      render(SWEEP[name](<FieldHint label={FACT} />, undefined));
      expect(screen.getByRole("button", { name: FACT })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: ABOUT })).toBeNull();
    });
  }
});

describe("the help's '?'", () => {
  it("is named 'About <label>' and the control is described by the fact, not the help", async () => {
    const user = userEvent.setup();
    render(<Input label="Reference" hint="At most 35 characters." help={HELP} />);
    const input = screen.getByRole("textbox", { name: "Reference" });
    expect(input).toHaveAccessibleDescription("At most 35 characters.");
    const button = screen.getByRole("button", { name: "About “Reference”" });
    // On the label line: in the row with the label, not under the field.
    expect(button.closest("[data-field-label]")).toHaveTextContent("Reference");
    await user.click(button);
    expect(screen.getByRole("dialog", { name: "About “Reference”" })).toHaveAccessibleDescription(HELP);
    // Still the fact, after the help opened.
    expect(input).toHaveAccessibleDescription("At most 35 characters.");
  });

  it("a FieldHint beside it is the caption at Normal on a mouse, where alone it is a '?'", () => {
    setMode("normal");
    render(
      <Select label="How it was measured" hint={<FieldHint label={FACT} />} help={HELP} defaultValue="a">
        <option value="a">Out and return</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "How it was measured" });
    expect(select).toHaveAccessibleDescription(FACT);
    expect(screen.getByRole("button", { name: "About “How it was measured”" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: FACT })).toBeNull();
  });

  it("a rich hint beside it is the caption too, and describes the field", () => {
    render(
      <Input
        label="Reference"
        hint={
          <>
            At most <strong>35</strong> characters.
          </>
        }
        help={HELP}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Reference" })).toHaveAccessibleDescription("At most 35 characters.");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("a HelpPopover passed as help keeps its own name", () => {
    render(
      <Select
        label="Status"
        help={<HelpPopover label="What do the statuses mean?">{HELP}</HelpPopover>}
        defaultValue="a"
      >
        <option value="a">Pending</option>
      </Select>,
    );
    expect(screen.getByRole("button", { name: "What do the statuses mean?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ABOUT })).toBeNull();
  });

  it("takes the text of a label that is a node", () => {
    render(
      <Input
        label={
          <span>
            Gross <em>amount</em>
          </span>
        }
        help={HELP}
      />,
    );
    expect(screen.getByRole("button", { name: "About “Gross amount”" })).toBeInTheDocument();
  });

  it("an unlabelled field: named by its aria-label, at the end edge outside the box", () => {
    render(<Input aria-label="Status" hint="Four statuses." help={HELP} />);
    const input = screen.getByRole("textbox", { name: "Status" });
    const button = screen.getByRole("button", { name: "About “Status”" });
    const row = button.parentElement!.parentElement!;
    expect(row).toHaveClass("flex");
    expect(row).toContainElement(input);
    expect(input).toHaveAccessibleDescription("Four statuses.");
  });

  it("a field with no name at all: 'Help'", () => {
    render(<Input help={HELP} />);
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });

  it("in the reader's language: the provider's `common.aboutField`", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <Input label="Referenz" help={HELP} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Hilfe zu „Referenz“" })).toBeInTheDocument();
  });

  it("leaves a CheckboxGroup named by its legend's words, the '?' after the legend", () => {
    render(<CheckboxGroup legend="Areas" options={OPTIONS} value={[]} onChange={noop} hint="Pick one or more." help={HELP} />);
    const group = screen.getByRole("group", { name: "Areas" });
    expect(group).toHaveAccessibleDescription("Pick one or more.");
    const button = within(group).getByRole("button", { name: "About “Areas”" });
    expect(button.closest("legend")).not.toBeNull();
  });

  it("leaves a Field's label naming its control, the '?' beside it", () => {
    render(
      <Field label="Address" hint="As on the lease." help={HELP}>
        {(ids) => <input {...ids} />}
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Address" })).toHaveAccessibleDescription("As on the lease.");
    expect(screen.getByRole("button", { name: "About “Address”" })).toBeInTheDocument();
  });

  it("a bound field draws it after its label, and does not hand `help` to the control too", () => {
    render(
      <InForm>
        <RhfTextField name="text" label="Reference" hint="At most 35 characters." help={HELP} />
      </InForm>,
    );
    const input = screen.getByRole("textbox", { name: "Reference" });
    expect(input).toHaveAccessibleDescription("At most 35 characters.");
    expect(screen.getAllByRole("button", { name: "About “Reference”" })).toHaveLength(1);
    // Beside the label above the field — not at the input's end edge.
    const label = screen.getByText("Reference");
    expect(label.parentElement).toContainElement(screen.getByRole("button", { name: "About “Reference”" }));
  });

  it("RhfCheckbox takes no `help`: a box has no label line", () => {
    // @ts-expect-error -- `help` is not a checkbox's prop (its label sits beside the box).
    const el = <RhfCheckbox name="flag" label="Status" help={HELP} />;
    expect(el).toBeTruthy();
  });
});
