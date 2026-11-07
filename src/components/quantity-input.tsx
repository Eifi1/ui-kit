import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { NumberInput } from "./number-input";
import { Select } from "./select";
import { FIELD_FLOATING_PAD } from "./field-base";
import { DEFAULT_QUANTITY_LABELS } from "./quantity-labels";
import { useKitLabels, useKitLocale, type LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { formatResult } from "../lib/calc";
import { dataAttributes, type DataAttributes } from "../lib/data-attributes";
import { decimalMark, localizeMark } from "../lib/decimal-marks";
import { plainText } from "../lib/plain-text";
import {
  QUANTITY_DIGITS,
  QUANTITY_UNITS,
  convertQuantity,
  quantityFamily,
  quantityMaxDigits,
  type Quantity,
  type QuantityFamily,
  type QuantityUnit,
} from "../lib/quantity";
import { roundHalfAway } from "../lib/round";

/** The words of {@link QuantityInput} and {@link QuantityField} — the `quantity` namespace. */
export interface QuantityLabels {
  /** The pieces unit, in the select and after a count: "pcs", "Stk.", "pce", "pz.". The
   *  one unit with a word — g, kg, ml, cl, dl and l are SI symbols in every language. */
  pcs: string;
  /** The unit select's accessible name — with the field's name when it has one ("Unit
   *  for “Flour”"), else alone. */
  unit: (field?: string) => string;
  /** The suggestion line's lead when the app names no source ({@link QuantityField}'s
   *  `suggestionFrom`). */
  suggested: string;
  /** The suggestion button's accessible name: take this quantity ("Use 500 g"). It holds
   *  the quantity the button shows, the words a voice user says (WCAG 2.5.3). */
  takeSuggestion: (quantity: string) => string;
}

// Defined in ./quantity-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_QUANTITY_LABELS };

/** {@link QuantityInput}'s props. */
export interface QuantityInputProps extends DataAttributes {
  /** The quantity: an amount (`null` for none yet) and its unit. */
  value: Quantity;
  /**
   * The next quantity — when a typed amount commits (blur or Enter, as NumberField
   * commits; never per keystroke) and when another unit is picked. The amount is
   * already rounded to the unit's `digits` and clamped to `max`.
   */
  onChange: (next: Quantity) => void;
  /** Offer only this family's units — `"mass"` (g, kg), `"volume"` (ml, cl, dl, l) or
   *  `"count"` (pcs). Without it (and without `units`), every unit. */
  family?: QuantityFamily;
  /**
   * The units to offer, explicitly — WINS over `family`, and is listed small to large
   * whatever its order (`["ml", "dl", "l"]` is a volume list without centilitres). Each
   * should lie inside `family` when both are given; one that does not is still offered,
   * and a development build says so on the console. A value whose unit is not in the
   * list (a 75 cl that `parseQuantity` read off a label) is still shown: the select lists
   * its unit for as long as it is the value's.
   */
  units?: readonly QuantityUnit[];
  /** An emptied amount commits `null`. Without it an empty amount is no answer and snaps
   *  back to the last one, as NumberField's does. */
  nullable?: boolean;
  /** Refuse 0: it snaps back like text that is no number (default `true` — a shopping
   *  list has no "0 g"). A negative amount is refused either way. */
  positive?: boolean;
  /** The largest amount, in whichever unit is chosen — NumberField's `max`: a typed amount
   *  above it commits as `max`. A limit in a physical unit ("at most 25 kg") is the form's
   *  validation, which sees the unit too. */
  max?: number;
  /**
   * Decimals per unit, over {@link QUANTITY_DIGITS} (g 0, kg 3, ml 0, cl 1, dl 2, l 3,
   * pcs 0): `{ kg: 2 }`, `{ pcs: 1 }`. A typed amount is rounded to them on commit, and
   * shown with at most that many. Cut to the unit's milli grid (g and ml none, cl 1, dl 2,
   * kg, l and pcs 3), so every amount still sums exactly.
   */
  digits?: Partial<Record<QuantityUnit, number>>;
  /** BCP 47 tag for the amount's decimal mark ("1,5" in de-DE, "1.5" in de-CH); default
   *  the `<UiKitProvider locale>`, else the runtime's — NumberField's `locale`. */
  locale?: string;
  /**
   * Another unit converts the amount: `true` turns 500 g into 0.5 kg. `false` (default)
   * keeps the amount as typed — 500 g becomes 500 kg — because the usual reason to change
   * the unit is that the unit was wrong, not the weight. Either way the amount lands on
   * the new unit's grid (1.5 kg kept as typed in grams is 2 g); a conversion within a
   * family is exact, and across families (`units` mixing them) the amount is kept.
   */
  convertOnUnitChange?: boolean;
  /** Both controls, the amount and the unit. */
  disabled?: boolean;
  /** Paints both controls as wrong — {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** The amount `<input>`'s id — what a label's `htmlFor` points at. */
  id?: string;
  /** Names the amount when there is no label (a table cell). The unit select is named
   *  after it: "Unit for “<aria-label>”". */
  "aria-label"?: string;
  /** Set on the amount input (and the unit select, which the same caption and error
   *  describe) — a form library's control slot spreads these. */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
  placeholder?: string;
  /** Prop > `<UiKitProvider labels={{ quantity }}>` > English. */
  labels?: LabelOverride<QuantityLabels>;
  /** The root: the row holding the amount and the unit. */
  className?: string;
  /** The amount `<input>`. */
  inputClassName?: string;
  /** The unit `<select>`. */
  selectClassName?: string;
  /** The amount `<input>` — focus on error, `select()`. */
  ref?: Ref<HTMLInputElement>;
}

/** @internal What {@link QuantityField} hands the row on top of the bare control's props. */
export interface QuantityRowProps extends QuantityInputProps {
  /** The floating label in the amount's box. */
  label?: ReactNode;
  /** What rides the label's line — a resolved `labelHint` (a FieldHint, a help "?"). */
  labelHint?: ReactNode;
  /** The field's name for the unit select's ("Unit for “Flour”") where the label is
   *  drawn outside the row — RhfQuantityField's, above it. Default the label's text, else
   *  `aria-label`. */
  fieldName?: string;
}

/** The kit's dev switch, as `lib/logger.ts` reads it: a development build, never a
 *  production one, and never under vitest. Read per call so a test can switch it on with
 *  `vi.stubEnv`. Optional-chained: `import.meta.env` is a Vite injection. */
function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}

/** A unit the kit knows — a `units` entry may be a typo, or a string off an API. */
function isUnit(unit: unknown): unit is QuantityUnit {
  return typeof unit === "string" && (QUANTITY_UNITS as readonly string[]).includes(unit);
}

/** The decimals `unit` is entered with: the caller's, else the default, cut to the grid. */
function digitsFor(unit: QuantityUnit, digits: QuantityInputProps["digits"]): number {
  const wanted = digits?.[unit] ?? QUANTITY_DIGITS[unit] ?? 3;
  const whole = Number.isFinite(wanted) ? Math.trunc(wanted) : QUANTITY_DIGITS[unit];
  return Math.min(Math.max(whole, 0), isUnit(unit) ? quantityMaxDigits(unit) : 3);
}

/**
 * `amount` on `unit`'s milli grid, for a unit switch: half away from zero, except that a
 * positive amount never rounds to 0 under `positive` — 0.4 kg kept as typed in grams is
 * 1 g, the smallest amount the field would accept, not a 0 it would refuse.
 */
function onGrid(amount: number, unit: QuantityUnit, positive: boolean): number {
  const places = isUnit(unit) ? quantityMaxDigits(unit) : 3;
  const rounded = roundHalfAway(amount, places);
  return positive && rounded <= 0 && amount > 0 ? 10 ** -places : rounded;
}

/** The units the select offers: `units` (known ones, deduplicated), else `family`'s,
 *  else all — plus the value's own unit while it is outside them. Small to large. */
function offeredUnits(
  units: readonly QuantityUnit[] | undefined,
  family: QuantityFamily | undefined,
  current: QuantityUnit,
): QuantityUnit[] {
  const known = units?.filter(isUnit) ?? [];
  const allowed = known.length > 0 ? known : QUANTITY_UNITS.filter((u) => !family || quantityFamily(u) === family);
  return QUANTITY_UNITS.filter((u) => allowed.includes(u) || u === current);
}

/** @internal The unit a value with none starts in — the first one the select would offer
 *  (RhfQuantityField's, for a form whose default is `null`). */
export function firstOfferedUnit(units: readonly QuantityUnit[] | undefined, family: QuantityFamily | undefined) {
  const known = units?.filter(isUnit) ?? [];
  return QUANTITY_UNITS.find((u) => (known.length > 0 ? known.includes(u) : !family || quantityFamily(u) === family))!;
}

/** @internal The amount and unit row, with the floating label {@link QuantityField} gives
 *  it. Not on the barrel: QuantityInput is this without a label. */
export function QuantityRow(props: QuantityRowProps) {
  const {
    ref,
    value,
    onChange,
    family,
    units,
    nullable = false,
    positive = true,
    max,
    digits,
    locale: localeProp,
    convertOnUnitChange = false,
    disabled,
    invalid,
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
    placeholder,
    labels: labelsProp,
    className,
    inputClassName,
    selectClassName,
    label,
    labelHint,
    fieldName,
  } = props;
  const labels = useKitLabels("quantity", DEFAULT_QUANTITY_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const mark = decimalMark(locale);
  // A number that is not finite is no amount, as NumberField reads its value (INP-11).
  const amount = value.amount !== null && Number.isFinite(value.amount) ? value.amount : null;
  const unit = value.unit;
  const places = digitsFor(unit, digits);
  // `formatResult` for fixed notation ("1e-7" would read back as 17), in the locale's mark.
  const format = (n: number | null, decimals: number) =>
    n === null ? "" : localizeMark(formatResult(roundHalfAway(n, decimals)), mark);

  // The draft the amount shows while it is typed — NumberField's loop: kept as typed,
  // resolved on commit, re-rendered from the value when that changes from outside (a
  // reset, a unit switch, a suggestion taken) or when the mark or the digits do.
  const [draft, setDraft] = useState(() => format(amount, places));
  const [seen, setSeen] = useState({ amount, unit, mark, places });
  if (!Object.is(seen.amount, amount) || seen.unit !== unit || seen.mark !== mark || seen.places !== places) {
    setSeen({ amount, unit, mark, places });
    setDraft(format(amount, places));
  }

  const commit = (text: string) => {
    const trimmed = text.trim();
    // Unparsable, refused or emptied without `nullable`: back to the value, as NumberField
    // snaps back — never a NaN, a 0 or a negative sent on for the server to reject.
    const snapBack = () => setDraft(format(amount, places));
    let next: number | null;
    if (trimmed === "") {
      if (!nullable) return snapBack();
      next = null;
    } else {
      // NumberInput's committed text: an evaluated calculation, dot-decimal.
      const parsed = Number(trimmed.replace(/,/g, "."));
      if (!Number.isFinite(parsed)) return snapBack();
      next = roundHalfAway(parsed, places);
      if (max !== undefined && next > max) next = max;
      if (next < 0 || (positive && next === 0)) return snapBack();
    }
    setDraft(format(next, places));
    if (!Object.is(next, amount)) onChange({ amount: next, unit });
  };

  const pickUnit = (picked: string) => {
    if (!isUnit(picked) || picked === unit) return;
    let next = amount;
    if (next !== null) {
      if (convertOnUnitChange) next = convertQuantity({ amount: next, unit }, picked)?.amount ?? next;
      next = onGrid(next, picked, positive);
    }
    onChange({ amount: next, unit: picked });
  };

  const offered = offeredUnits(units, family, unit);
  // The units warning, once per field, development only. Keyed on the list's text: a
  // caller's inline `units={["ml", "dl", "l"]}` is a new array on every render.
  const warned = useRef(false);
  const unitsKey = units === undefined ? undefined : JSON.stringify(units);
  useEffect(() => {
    if (warned.current || !devWarnings() || unitsKey === undefined) return;
    const list = JSON.parse(unitsKey) as unknown[];
    const unknown = list.filter((u) => !isUnit(u));
    const outside = family ? list.filter((u) => isUnit(u) && quantityFamily(u) !== family) : [];
    if (unknown.length === 0 && outside.length === 0 && list.length > 0) return;
    warned.current = true;
    const problem =
      list.length === 0
        ? "is empty, so the field offers its family's units"
        : unknown.length > 0
          ? `names ${JSON.stringify(unknown)}, which no quantity is measured in`
          : `${JSON.stringify(outside)} ${outside.length === 1 ? "lies" : "lie"} outside family "${family}"`;
    console.warn(
      `[ui-kit] QuantityInput: \`units\` ${problem}. \`units\` wins over \`family\`: give units of the family, ` +
        `or leave \`family\` out. (Development builds only; once per field.)`,
    );
  }, [unitsKey, family]);

  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const name = fieldName ?? plainText(label) ?? ariaLabel;
  const isInvalid = Boolean(invalid) || ariaInvalid === true || ariaInvalid === "true";
  const labelled = label !== undefined;

  return (
    // `items-end`: at Large the amount's label stands above its box (§10.17), and the
    // select lines up with the box, not with the label.
    <div {...dataAttributes(props)} className={cn("flex items-end", className)}>
      <NumberInput
        ref={ref}
        id={fieldId}
        label={label}
        // Only when there is one: NumberInput keeps a wrapper box for a passed `hint` key,
        // and the box would take the flex item's place in this row.
        {...(labelHint !== undefined ? { hint: labelHint } : {})}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        value={draft}
        onChange={(text) => setDraft(localizeMark(text, mark))}
        onCommit={commit}
        locale={locale}
        placeholder={placeholder}
        disabled={disabled}
        invalid={isInvalid}
        // A count or a weight is typed, not worked out; the trigger beside a unit select
        // in a table cell is noise. A typed "2*500" still evaluates on commit.
        calculator={false}
        // The focused half paints its whole frame over the shared border.
        className="min-w-0 flex-1 focus-within:z-10"
        inputClassName={cn("rounded-e-none", inputClassName)}
      />
      <Select
        id={`${fieldId}-unit`}
        aria-label={labels.unit(name)}
        aria-describedby={ariaDescribedBy}
        value={unit}
        onChange={(e) => pickUnit(e.target.value)}
        disabled={disabled}
        invalid={isInvalid}
        // One border between the two halves, not two side by side.
        className="-ms-px shrink-0 focus-within:z-10"
        // As tall as the floating field beside it, its value on the same line.
        selectClassName={cn("w-auto rounded-s-none", labelled && FIELD_FLOATING_PAD, selectClassName)}
      >
        {offered.map((u) => (
          <option key={u} value={u}>
            {u === "pcs" ? labels.pcs : u}
          </option>
        ))}
      </Select>
    </div>
  );
}

/**
 * A quantity — an amount and its unit — as one control: the amount, typed in the
 * locale's decimal mark, beside a select of units. The bare control, for a table row or
 * a line of a list; {@link QuantityField} is the labelled field with a caption, an error
 * and a suggestion to take.
 *
 * ```tsx
 * <QuantityInput aria-label="Flour" family="mass" value={qty} onChange={setQty} />
 * ```
 *
 * THE AMOUNT is NumberField's loop over {@link NumberInput}: a draft while it is typed
 * (grouping read off, the locale's mark kept), resolved on blur or Enter — rounded to the
 * unit's `digits`, clamped to `max` — and `onChange` only then. Empty, or text that is no
 * number, snaps back (empty commits `null` with `nullable`); so does 0 under `positive`
 * (the default), and a negative amount always.
 *
 * THE UNIT is a native select of {@link QUANTITY_UNITS} — `family`'s, or `units`' — with
 * pieces in the reader's word (`quantity.pcs`). Picking one is a commit of its own;
 * `convertOnUnitChange` decides whether the amount is converted or kept as typed.
 *
 * The value's arithmetic, formatting and parsing are `lib/quantity`'s — {@link toBaseQuantity},
 * {@link convertQuantity}, {@link sumQuantities}, {@link formatQuantity}, {@link parseQuantity} —
 * for the list's totals and a comparison table outside the field.
 */
export function QuantityInput(props: QuantityInputProps) {
  return <QuantityRow {...props} />;
}
