import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuantityInput, type QuantityInputProps } from "../quantity-input";
import { QuantityField, type QuantityFieldProps } from "../quantity-field";
import { UiKitProvider } from "../../i18n/kit-labels";
import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { formatQuantity, parseQuantity, type Quantity } from "../../lib/quantity";

/**
 * QuantityInput and QuantityField (0.57, keksdose SL-10): an amount typed in the locale's
 * mark beside a unit select, committed as one `Quantity`. A controlled harness throughout,
 * so what the field shows is what its value says.
 */

const NNBSP = "\u202F";

function Controlled({
  initial,
  onChange,
  field = false,
  ...props
}: Omit<QuantityFieldProps, "value" | "onChange"> & {
  initial: Quantity;
  onChange?: (q: Quantity) => void;
  field?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const change = (next: Quantity) => {
    onChange?.(next);
    setValue(next);
  };
  return field ? (
    <QuantityField {...props} value={value} onChange={change} />
  ) : (
    <QuantityInput {...(props as Omit<QuantityInputProps, "value" | "onChange">)} value={value} onChange={change} />
  );
}

function setup(initial: Quantity, props: Partial<QuantityFieldProps> & { field?: boolean } = {}) {
  const onChange = vi.fn();
  render(<Controlled aria-label="Flour" initial={initial} onChange={onChange} {...props} />);
  const amount = screen.getByRole("textbox") as HTMLInputElement;
  const unit = screen.getByRole("combobox") as HTMLSelectElement;
  return { onChange, amount, unit, user: userEvent.setup() };
}

const optionValues = (select: HTMLSelectElement) => [...select.options].map((o) => o.value);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("QuantityInput — the amount", () => {
  it("commits the typed amount with the unit on blur, not per keystroke", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" });
    expect(amount).toHaveValue("500");
    await user.clear(amount);
    await user.type(amount, "750");
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ amount: 750, unit: "g" });
  });

  it("shows and reads the locale's decimal mark: de-DE a comma, de-CH a point", async () => {
    const de = setup({ amount: 1.5, unit: "kg" }, { locale: "de-DE" });
    expect(de.amount).toHaveValue("1,5");
    await de.user.clear(de.amount);
    await de.user.type(de.amount, "2,25");
    await de.user.tab();
    expect(de.onChange).toHaveBeenLastCalledWith({ amount: 2.25, unit: "kg" });
    expect(de.amount).toHaveValue("2,25");
  });

  it("shows a point in de-CH", () => {
    const { amount } = setup({ amount: 1.5, unit: "kg" }, { locale: "de-CH" });
    expect(amount).toHaveValue("1.5");
  });

  it("rounds to the unit's digits: grams are whole, kilograms to the gram", async () => {
    const g = setup({ amount: 500, unit: "g" });
    await g.user.clear(g.amount);
    await g.user.type(g.amount, "2.6");
    await g.user.tab();
    expect(g.onChange).toHaveBeenLastCalledWith({ amount: 3, unit: "g" });
    expect(g.amount).toHaveValue("3");
  });

  it("takes a per-unit `digits`, cut to the milli grid", async () => {
    const kg = setup({ amount: 1, unit: "kg" }, { digits: { kg: 1 } });
    await kg.user.clear(kg.amount);
    await kg.user.type(kg.amount, "1.26");
    await kg.user.tab();
    expect(kg.onChange).toHaveBeenLastCalledWith({ amount: 1.3, unit: "kg" });
  });

  it("never gives a gram decimals, whatever `digits` asks", async () => {
    const { onChange, amount, user } = setup({ amount: 1, unit: "g" }, { digits: { g: 2 } });
    await user.clear(amount);
    await user.type(amount, "2.25");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({ amount: 2, unit: "g" });
  });

  it("refuses 0 under `positive` (the default): it snaps back like text that is no number", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" });
    await user.clear(amount);
    await user.type(amount, "0");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(amount).toHaveValue("500");
  });

  it("refuses an amount that rounds to 0 too", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" });
    await user.clear(amount);
    await user.type(amount, "0.4");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(amount).toHaveValue("500");
  });

  it("takes 0 with positive={false}, and refuses a negative either way", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" }, { positive: false });
    await user.clear(amount);
    await user.type(amount, "0");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({ amount: 0, unit: "g" });
    await user.clear(amount);
    await user.type(amount, "-5");
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(amount).toHaveValue("0");
  });

  it("snaps back unparsable text", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" });
    await user.clear(amount);
    await user.type(amount, "-");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(amount).toHaveValue("500");
  });

  it("snaps an emptied amount back unless `nullable`", async () => {
    const strict = setup({ amount: 500, unit: "g" });
    await strict.user.clear(strict.amount);
    await strict.user.tab();
    expect(strict.onChange).not.toHaveBeenCalled();
    expect(strict.amount).toHaveValue("500");
  });

  it("commits an emptied amount as null with `nullable`, the unit kept", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" }, { nullable: true });
    await user.clear(amount);
    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ amount: null, unit: "g" });
    expect(amount).toHaveValue("");
  });

  it("clamps to `max`, in the unit chosen", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" }, { max: 1000 });
    await user.clear(amount);
    await user.type(amount, "5000");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({ amount: 1000, unit: "g" });
  });

  it("evaluates a typed calculation", async () => {
    const { onChange, amount, user } = setup({ amount: 500, unit: "g" });
    await user.clear(amount);
    await user.type(amount, "2*250");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled(); // 500 again: nothing new
    await user.clear(amount);
    await user.type(amount, "3*250{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ amount: 750, unit: "g" });
  });
});

describe("QuantityInput — the unit", () => {
  it("offers every unit without family or units, small to large, pieces in the reader's word", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <QuantityInput aria-label="Mehl" value={{ amount: 6, unit: "pcs" }} onChange={() => {}} />
      </UiKitProvider>,
    );
    const unit = screen.getByRole("combobox", { name: "Einheit für „Mehl“" }) as HTMLSelectElement;
    expect(optionValues(unit)).toEqual(["g", "kg", "ml", "cl", "dl", "l", "pcs"]);
    expect(within(unit).getByRole("option", { name: "Stk." })).toHaveValue("pcs");
  });

  it("limits the select to `family`", () => {
    const { unit } = setup({ amount: 1, unit: "l" }, { family: "volume" });
    expect(optionValues(unit)).toEqual(["ml", "cl", "dl", "l"]);
    expect(unit).toHaveAccessibleName("Unit for “Flour”");
  });

  it("lets `units` win over `family`, listed small to large", () => {
    const { unit } = setup({ amount: 1, unit: "l" }, { family: "volume", units: ["l", "ml", "dl"] });
    expect(optionValues(unit)).toEqual(["ml", "dl", "l"]);
  });

  it("still lists the value's unit when `units` leaves it out (75 cl read off a label)", () => {
    const { unit } = setup({ amount: 75, unit: "cl" }, { family: "volume", units: ["ml", "dl", "l"] });
    expect(optionValues(unit)).toEqual(["ml", "cl", "dl", "l"]);
    expect(unit).toHaveValue("cl");
  });

  it("warns in development when `units` lies outside `family`, once, and offers them anyway", () => {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unit } = setup({ amount: 1, unit: "kg" }, { family: "volume", units: ["l", "kg"] });
    expect(optionValues(unit)).toEqual(["kg", "l"]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/QuantityInput: `units` \["kg"\] lies outside family "volume"/);
  });

  it("says nothing when `units` lies inside `family`", () => {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setup({ amount: 1, unit: "l" }, { family: "volume", units: ["ml", "dl", "l"] });
    expect(warn).not.toHaveBeenCalled();
  });

  it("keeps the amount as typed on a unit change by default: 500 g becomes 500 kg", async () => {
    const { onChange, amount, unit, user } = setup({ amount: 500, unit: "g" }, { family: "mass" });
    await user.selectOptions(unit, "kg");
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ amount: 500, unit: "kg" });
    expect(amount).toHaveValue("500");
  });

  it("converts with convertOnUnitChange: 500 g becomes 0.5 kg", async () => {
    const { onChange, amount, unit, user } = setup(
      { amount: 500, unit: "g" },
      { family: "mass", convertOnUnitChange: true },
    );
    await user.selectOptions(unit, "kg");
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ amount: 0.5, unit: "kg" });
    expect(amount).toHaveValue("0.5");
    await user.selectOptions(unit, "g");
    expect(onChange).toHaveBeenLastCalledWith({ amount: 500, unit: "g" });
  });

  it("lands an amount kept as typed on the new unit's grid, never on 0 under `positive`", async () => {
    const big = setup({ amount: 1.5, unit: "kg" }, { family: "mass" });
    await big.user.selectOptions(big.unit, "g");
    expect(big.onChange).toHaveBeenLastCalledWith({ amount: 2, unit: "g" });
  });

  it("keeps the smallest step where the grid would make 0", async () => {
    const { onChange, unit, user } = setup({ amount: 0.4, unit: "kg" }, { family: "mass" });
    await user.selectOptions(unit, "g");
    expect(onChange).toHaveBeenLastCalledWith({ amount: 1, unit: "g" });
  });

  it("keeps no amount as no amount on a unit change", async () => {
    const { onChange, unit, user } = setup({ amount: null, unit: "g" }, { family: "mass", convertOnUnitChange: true });
    await user.selectOptions(unit, "kg");
    expect(onChange).toHaveBeenLastCalledWith({ amount: null, unit: "kg" });
  });

  it("disables both halves", () => {
    const { amount, unit } = setup({ amount: 1, unit: "kg" }, { disabled: true });
    expect(amount).toBeDisabled();
    expect(unit).toBeDisabled();
  });

  it("puts data-* on the row once", () => {
    render(
      <QuantityInput aria-label="Flour" data-testid="qty" value={{ amount: 1, unit: "kg" }} onChange={() => {}} />,
    );
    expect(screen.getByTestId("qty")).toContainElement(screen.getByRole("textbox"));
  });
});

describe("QuantityField", () => {
  it("names the amount by its label and the unit after it", () => {
    render(<QuantityField label="Flour" value={{ amount: 1, unit: "kg" }} onChange={() => {}} family="mass" />);
    expect(screen.getByRole("textbox", { name: "Flour" })).toHaveValue("1");
    expect(screen.getByRole("combobox", { name: "Unit for “Flour”" })).toHaveValue("kg");
  });

  it("describes and paints both halves by its error, and announces `required`", () => {
    render(
      <QuantityField
        label="Flour"
        value={{ amount: 1, unit: "kg" }}
        onChange={() => {}}
        hint="As on the pack"
        error="Too much"
        required
      />,
    );
    const amount = screen.getByRole("textbox", { name: "Flour" });
    const unit = screen.getByRole("combobox");
    for (const control of [amount, unit]) {
      expect(control).toHaveAccessibleDescription("As on the pack Too much");
      expect(control).toHaveAttribute("aria-invalid", "true");
    }
    expect(amount).toHaveAttribute("aria-required", "true");
  });

  it("offers the suggestion as one tap: the app's words, the quantity a button that takes it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlled
        field
        label="Milk"
        initial={{ amount: null, unit: "ml" }}
        onChange={onChange}
        family="volume"
        suggestion={{ amount: 1.5, unit: "l" }}
        suggestionFrom="Usual pack"
      />,
    );
    const amount = screen.getByRole("textbox", { name: "Milk" });
    expect(amount).toHaveAccessibleDescription(`Usual pack 1.5${NNBSP}l`);
    const take = screen.getByRole("button", { name: `Use 1.5${NNBSP}l` });
    expect(take.textContent).toBe(`1.5${NNBSP}l`);
    await user.click(take);
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ amount: 1.5, unit: "l" });
    expect(amount).toHaveValue("1.5");
    expect(screen.getByRole("combobox")).toHaveValue("l");
    // Taken already: the line stays, and a second tap changes nothing.
    await user.click(take);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("leads the suggestion with the kit's word when the app names no source, in the reader's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <QuantityField
          label="Eier"
          value={{ amount: null, unit: "pcs" }}
          onChange={() => {}}
          suggestion={{ amount: 6, unit: "pcs" }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("textbox", { name: "Eier" })).toHaveAccessibleDescription(`Vorgeschlagen 6${NNBSP}Stk.`);
    expect(screen.getByRole("button", { name: `6${NNBSP}Stk. übernehmen` })).toBeInTheDocument();
  });

  it("shows no suggestion without an amount", () => {
    render(
      <QuantityField
        label="Milk"
        value={{ amount: 1, unit: "l" }}
        onChange={() => {}}
        suggestion={{ amount: null, unit: "l" }}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("puts data-* on the field's box once, with the className", () => {
    render(
      <QuantityField
        label="Flour"
        data-testid="qty"
        className="w-64"
        value={{ amount: 1, unit: "kg" }}
        onChange={() => {}}
      />,
    );
    const box = screen.getByTestId("qty");
    expect(box).toHaveClass("w-64");
    expect(box).toContainElement(screen.getByRole("combobox"));
  });
});

describe("the `quantity` catalogues", () => {
  const CATALOGUES = {
    en: DEFAULT_UI_KIT_LABELS,
    "de-CH": UI_KIT_LABELS_DE_CH,
    es: UI_KIT_LABELS_ES,
    fr: UI_KIT_LABELS_FR,
    hu: UI_KIT_LABELS_HU,
    it: UI_KIT_LABELS_IT,
    zh: UI_KIT_LABELS_ZH,
  };

  it.each(Object.entries(CATALOGUES))(
    "%s: parseQuantity reads the pieces word the catalogue prints, without being handed it",
    (locale, labels) => {
      const text = formatQuantity({ amount: 6, unit: "pcs" }, locale, { labels: labels.quantity });
      expect(text).toBe(`6${NNBSP}${labels.quantity.pcs}`);
      expect(parseQuantity(text, locale)).toEqual({ amount: 6, unit: "pcs" });
    },
  );
});
