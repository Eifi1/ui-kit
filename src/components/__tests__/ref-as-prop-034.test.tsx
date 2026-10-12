import { render } from "@testing-library/react";
import { createRef, type ComponentProps, type ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "../input";
import { Select } from "../select";
import { Textarea } from "../textarea";
import { Chip } from "../chip";
import { SearchField } from "../search-field";
import { Switch } from "../switch";
import { PhoneInput } from "../phone-input";
import { Slider } from "../slider";
import { SignaturePad, type SignaturePadHandle } from "../signature-pad";
import { Checkbox } from "../checkbox";
import { Autocomplete } from "../autocomplete";
import { OneTimeCodeInput } from "../one-time-code-input";
import { LanguageSelect } from "../language-select";
import { FileButton } from "../file-button";
import { ActionCard, ChoiceCard } from "../choice-card";
import { MenuItem } from "../menu-item";
import { AmountInput } from "../amount-input";
import { TimeInput } from "../time-input";
import { List, ListItem } from "../list";
import { CurrentPasswordInput, TypedConfirmField } from "../danger-confirm";
import { IbanInput } from "../iban-input";
import { PlanCard, type BillingPlan } from "../../billing/plan-card";

/**
 * MOD-4 (refactor audit 2026-10, round 0.34 Wave 3): the 25 components that were
 * `forwardRef(...)` at module scope, each with an `X.displayName = …` line beside it, are
 * plain function components that take `ref` as a prop (React 19, the peer floor). The two
 * module-level side effects were what kept a module's every component in a bundle that
 * imported one of them: `{ Spinner }` cost Input, Select, Textarea, IconButton and Tooltip
 * with it (scripts/check-module-graph.mjs measures that). Nothing changes for a caller —
 * `<Input ref>` still reaches the `<input>`, and `ComponentProps<typeof Input>["ref"]`
 * still exists (the type tests below, checked by `tsc --noEmit`).
 */

const noop = () => {};

const CONVERTED: Array<[string, unknown]> = [
  ["Input", Input],
  ["Select", Select],
  ["Textarea", Textarea],
  ["Chip", Chip],
  ["SearchField", SearchField],
  ["Switch", Switch],
  ["PhoneInput", PhoneInput],
  ["Slider", Slider],
  ["SignaturePad", SignaturePad],
  ["Checkbox", Checkbox],
  ["Autocomplete", Autocomplete],
  ["OneTimeCodeInput", OneTimeCodeInput],
  ["LanguageSelect", LanguageSelect],
  ["FileButton", FileButton],
  ["ChoiceCard", ChoiceCard],
  ["ActionCard", ActionCard],
  ["MenuItem", MenuItem],
  ["AmountInput", AmountInput],
  ["TimeInput", TimeInput],
  ["List", List],
  ["ListItem", ListItem],
  ["CurrentPasswordInput", CurrentPasswordInput],
  ["TypedConfirmField", TypedConfirmField],
  ["IbanInput", IbanInput],
  ["PlanCard", PlanCard],
];

const PLAN: BillingPlan = { code: "pro", name: "Gardener", prices: { CHF: { year: 4900 } }, limits: {} };

describe("ref as a prop (MOD-4)", () => {
  it.each(CONVERTED)("%s is a plain, named function component — no forwardRef wrapper", (name, component) => {
    // `forwardRef` returns an object ({ $$typeof, render }); a function component is a
    // function, and its own name is what React DevTools shows (no `displayName` line).
    expect(typeof component).toBe("function");
    expect((component as ComponentType).name).toBe(name);
    expect((component as ComponentType).displayName).toBeUndefined();
  });

  it("each hands its ref to the element it always did", () => {
    const refs = {
      input: createRef<HTMLInputElement>(),
      select: createRef<HTMLSelectElement>(),
      textarea: createRef<HTMLTextAreaElement>(),
      chip: createRef<HTMLElement>(),
      search: createRef<HTMLInputElement>(),
      switch: createRef<HTMLInputElement>(),
      phone: createRef<HTMLInputElement>(),
      slider: createRef<HTMLInputElement>(),
      signature: createRef<SignaturePadHandle>(),
      checkbox: createRef<HTMLInputElement>(),
      autocomplete: createRef<HTMLInputElement>(),
      code: createRef<HTMLInputElement>(),
      language: createRef<HTMLSelectElement>(),
      file: createRef<HTMLButtonElement>(),
      choice: createRef<HTMLInputElement>(),
      action: createRef<HTMLButtonElement>(),
      menuItem: createRef<HTMLElement>(),
      amount: createRef<HTMLInputElement>(),
      time: createRef<HTMLInputElement>(),
      list: createRef<HTMLUListElement>(),
      listItem: createRef<HTMLElement>(),
      password: createRef<HTMLInputElement>(),
      typed: createRef<HTMLInputElement>(),
      iban: createRef<HTMLInputElement>(),
      plan: createRef<HTMLInputElement>(),
    };
    render(
      <>
        <Input ref={refs.input} aria-label="Name" />
        <Select ref={refs.select} aria-label="Role">
          <option>Admin</option>
        </Select>
        <Textarea ref={refs.textarea} aria-label="Note" />
        <Chip ref={refs.chip}>Draft</Chip>
        <SearchField ref={refs.search} aria-label="Search" value="" onChange={noop} />
        <Switch ref={refs.switch} aria-label="Dark" />
        <PhoneInput ref={refs.phone} aria-label="Phone" value="" />
        <Slider ref={refs.slider} aria-label="Volume" value={3} onChange={noop} min={0} max={10} />
        <SignaturePad ref={refs.signature} />
        <Checkbox ref={refs.checkbox} aria-label="Agree" />
        <Autocomplete ref={refs.autocomplete} aria-label="Address" value="" onChange={noop} options={[]} />
        <OneTimeCodeInput ref={refs.code} aria-label="Code" value="" onChange={noop} />
        <LanguageSelect ref={refs.language} aria-label="Language" value="en" onChange={noop} />
        <FileButton ref={refs.file} onFiles={noop}>
          Upload
        </FileButton>
        <ChoiceCard ref={refs.choice} title="Monthly" />
        <ActionCard ref={refs.action} title="Import" />
        <MenuItem ref={refs.menuItem} onClick={noop}>
          Rename
        </MenuItem>
        <AmountInput ref={refs.amount} aria-label="Amount" value="" onChange={noop} />
        <TimeInput ref={refs.time} aria-label="Start" value="" />
        <List ref={refs.list}>
          <ListItem ref={refs.listItem} title="Row" />
        </List>
        <CurrentPasswordInput ref={refs.password} />
        <TypedConfirmField ref={refs.typed} target="delete" />
        <IbanInput ref={refs.iban} aria-label="IBAN" value="" />
        <PlanCard ref={refs.plan} name="plan" plan={PLAN} currency="CHF" interval="year" />
      </>,
    );
    expect(refs.input.current).toBeInstanceOf(HTMLInputElement);
    expect(refs.select.current).toBeInstanceOf(HTMLSelectElement);
    expect(refs.textarea.current).toBeInstanceOf(HTMLTextAreaElement);
    expect(refs.chip.current).toHaveTextContent("Draft");
    expect(refs.search.current).toBe(document.querySelector('input[aria-label="Search"]'));
    expect(refs.switch.current).toHaveAttribute("role", "switch");
    expect(refs.phone.current).toHaveAttribute("type", "tel");
    expect(refs.slider.current).toHaveAttribute("type", "range");
    expect(refs.signature.current?.isEmpty()).toBe(true);
    expect(refs.checkbox.current).toHaveAttribute("type", "checkbox");
    expect(refs.autocomplete.current).toHaveAttribute("role", "combobox");
    expect(refs.code.current).toHaveAttribute("autocomplete", "one-time-code");
    expect(refs.language.current).toBeInstanceOf(HTMLSelectElement);
    expect(refs.file.current).toHaveTextContent("Upload");
    expect(refs.choice.current).toHaveAttribute("type", "checkbox");
    expect(refs.action.current).toHaveTextContent("Import");
    expect(refs.menuItem.current).toHaveTextContent("Rename");
    expect(refs.amount.current).toBeInstanceOf(HTMLInputElement);
    expect(refs.time.current).toBeInstanceOf(HTMLInputElement);
    expect(refs.list.current?.tagName).toBe("UL");
    expect(refs.listItem.current).toHaveTextContent("Row");
    expect(refs.password.current).toHaveAttribute("type", "password");
    expect(refs.typed.current).toBeInstanceOf(HTMLInputElement);
    expect(refs.iban.current).toBeInstanceOf(HTMLInputElement);
    expect(refs.plan.current).toHaveAttribute("type", "radio");
  });

  it("types: ComponentProps<typeof X> still carries the ref (checked by tsc)", () => {
    // What an app writes around a kit field: its props, ref included, from the component.
    const input: ComponentProps<typeof Input>["ref"] = createRef<HTMLInputElement>();
    const select: ComponentProps<typeof Select>["ref"] = createRef<HTMLSelectElement>();
    const textarea: ComponentProps<typeof Textarea>["ref"] = createRef<HTMLTextAreaElement>();
    const chip: ComponentProps<typeof Chip>["ref"] = createRef<HTMLElement>();
    const search: ComponentProps<typeof SearchField>["ref"] = createRef<HTMLInputElement>();
    const switchRef: ComponentProps<typeof Switch>["ref"] = createRef<HTMLInputElement>();
    const phone: ComponentProps<typeof PhoneInput>["ref"] = createRef<HTMLInputElement>();
    const slider: ComponentProps<typeof Slider>["ref"] = createRef<HTMLInputElement>();
    const signature: ComponentProps<typeof SignaturePad>["ref"] = createRef<SignaturePadHandle>();
    const checkbox: ComponentProps<typeof Checkbox>["ref"] = createRef<HTMLInputElement>();
    const autocomplete: ComponentProps<typeof Autocomplete>["ref"] = createRef<HTMLInputElement>();
    const code: ComponentProps<typeof OneTimeCodeInput>["ref"] = createRef<HTMLInputElement>();
    const language: ComponentProps<typeof LanguageSelect>["ref"] = createRef<HTMLSelectElement>();
    const file: ComponentProps<typeof FileButton>["ref"] = createRef<HTMLButtonElement>();
    const choice: ComponentProps<typeof ChoiceCard>["ref"] = createRef<HTMLInputElement>();
    const action: ComponentProps<typeof ActionCard>["ref"] = createRef<HTMLButtonElement>();
    const menuItem: ComponentProps<typeof MenuItem>["ref"] = createRef<HTMLElement>();
    const amount: ComponentProps<typeof AmountInput>["ref"] = createRef<HTMLInputElement>();
    const time: ComponentProps<typeof TimeInput>["ref"] = createRef<HTMLInputElement>();
    const list: ComponentProps<typeof List>["ref"] = createRef<HTMLUListElement>();
    const listItem: ComponentProps<typeof ListItem>["ref"] = createRef<HTMLElement>();
    const password: ComponentProps<typeof CurrentPasswordInput>["ref"] = createRef<HTMLInputElement>();
    const typed: ComponentProps<typeof TypedConfirmField>["ref"] = createRef<HTMLInputElement>();
    const iban: ComponentProps<typeof IbanInput>["ref"] = createRef<HTMLInputElement>();
    const plan: ComponentProps<typeof PlanCard>["ref"] = createRef<HTMLInputElement>();
    // @ts-expect-error — still typed to its element: an <input>'s ref is not a <select>'s
    const wrong: ComponentProps<typeof Input>["ref"] = createRef<HTMLSelectElement>();
    // Autocomplete keeps its generic over the option value, now with no cast behind it.
    type NumberAutocomplete = ComponentProps<typeof Autocomplete<number>>;
    const numberOptions: NumberAutocomplete["options"] = [{ value: 1, label: "One" }];
    // @ts-expect-error — a string value is not an option of Autocomplete<number>
    const stringOptions: NumberAutocomplete["options"] = [{ value: "one", label: "One" }];
    const typedAutocomplete = <Autocomplete<number> value="" onChange={noop} options={numberOptions} />;
    const all: unknown[] = [input, select, textarea, chip, search, switchRef, phone, slider, signature, checkbox];
    all.push(autocomplete, code, language, file, choice, action, menuItem, amount, time, list, listItem);
    all.push(password, typed, iban, plan, wrong);
    expect(all.every(Boolean)).toBe(true);
    expect([stringOptions, typedAutocomplete].every(Boolean)).toBe(true);
  });
});
