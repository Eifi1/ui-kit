import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input, Select, Textarea } from "../ui";
import { TimeInput } from "../time-input";
import { NumberInput } from "../number-input";
import { AmountInput } from "../amount-input";
import { CurrencySelect } from "../currency-select";
import { Combobox } from "../combobox";
import { MultiSelect } from "../multi-select";
import { DatePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";
import { OneTimeCodeInput } from "../one-time-code-input";
import { CountrySelect } from "../country-select";
import { IbanInput } from "../iban-input";
import { PhoneInput } from "../phone-input";

/**
 * keksdose (0.22): a Select whose hint came and went was rebuilt — its field box was
 * drawn only while something showed under it — so focus left the control mid-edit (the
 * goal form's kind switch). The rule 0.18 gave `error` holds for `hint` too: passed at
 * all, even as `undefined`, the field keeps one box and the same control element.
 */

const noop = vi.fn();

const FIELDS: Array<[string, (hint: string | undefined) => ReactElement]> = [
  ["Input", (hint) => <Input label="Name" hint={hint} />],
  ["Textarea", (hint) => <Textarea label="Note" hint={hint} />],
  [
    "Select",
    (hint) => (
      <Select label="Kind" hint={hint} defaultValue="a">
        <option value="a">A</option>
      </Select>
    ),
  ],
  ["TimeInput", (hint) => <TimeInput label="Start" value="09:00" hint={hint} />],
  ["NumberInput", (hint) => <NumberInput label="Amount" value="" onChange={noop} hint={hint} />],
  ["AmountInput", (hint) => <AmountInput label="Rent" currency="EUR" value="1" onChange={noop} hint={hint} />],
  ["CurrencySelect", (hint) => <CurrencySelect label="Currency" value="EUR" onChange={noop} hint={hint} />],
  ["Combobox", (hint) => <Combobox label="Payee" value="" onChange={noop} options={["A", "B"]} hint={hint} />],
  [
    "MultiSelect",
    (hint) => <MultiSelect label="Markets" options={[{ value: 1, label: "EU" }]} values={[1]} onChange={noop} hint={hint} />,
  ],
  ["DatePicker", (hint) => <DatePicker label="Due" value="2026-09-06" onChange={noop} locale="en-GB" hint={hint} />],
  [
    "MonthPicker",
    (hint) => <MonthPicker label="Month" value="2026-09" onChange={noop} locale="en-GB" hint={hint} />,
  ],
  ["OneTimeCodeInput", (hint) => <OneTimeCodeInput label="Code" value="" onChange={noop} hint={hint} />],
  ["CountrySelect", (hint) => <CountrySelect label="Country" value={null} onChange={noop} hint={hint} />],
  ["IbanInput", (hint) => <IbanInput label="IBAN" value="" hint={hint} />],
  ["PhoneInput", (hint) => <PhoneInput label="Phone" value="" hint={hint} />],
];

const FOCUSABLE = "input:not([type=hidden]),textarea,select,button,[tabindex='0']";

describe.each(FIELDS)("%s: a hint coming and going keeps the control", (_name, field) => {
  it("keeps the same, focused element", () => {
    const { container, rerender } = render(field(undefined));
    const control = container.querySelector<HTMLElement>(FOCUSABLE);
    expect(control).not.toBeNull();
    control!.focus();
    expect(document.activeElement).toBe(control);

    rerender(field("Shown under the field"));
    expect(control!.isConnected).toBe(true);
    expect(document.activeElement).toBe(control);

    rerender(field(undefined));
    expect(control!.isConnected).toBe(true);
    expect(document.activeElement).toBe(control);
  });
});
