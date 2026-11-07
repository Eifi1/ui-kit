/**
 * Quantities — an amount and its unit ("500 g", "1.5 l", "6 pcs") — as plain data, with
 * the arithmetic, the formatting and the parsing an app needs around them: a shopping
 * list's totals, a comparison table's "per kg", a checklist's "2 × 500 g".
 *
 * Pure TypeScript, no React: {@link QuantityInput} and {@link QuantityField} are built on
 * it, and so is whatever an app prints outside them.
 *
 * WHY MILLI-UNITS. Every unit here is a whole number of thousandths of its family's base
 * — a gram is 1 milli-kilogram, a centilitre 10 millilitres, a piece 1000 milli-pieces —
 * so the arithmetic runs on integers and comes back exact: 0.1 kg + 0.2 kg is 0.3 kg, not
 * the 0.30000000000000004 kg a float sum gives. An amount is read onto that grid on the
 * way in (half away from zero, as `lib/round` rounds: a gram has no decimals, a litre
 * three), and an integer divided by a power of ten is the double the decimal literal
 * would be, so 300 / 1000 IS 0.3.
 *
 * Prices stay the app's: a quantity has no currency, and "per kg" is an app's division.
 */
import { formatNumber } from "./format";
import { decimalMark, normalizeTypedMarks } from "./decimal-marks";
import { roundHalfAway } from "./round";

/** A unit a quantity is measured in: mass `g` `kg`, volume `ml` `cl` `dl` `l`, count `pcs`. */
export type QuantityUnit = "g" | "kg" | "ml" | "cl" | "dl" | "l" | "pcs";

/** Which units convert into each other: mass (g, kg), volume (ml, cl, dl, l), count (pcs). */
export type QuantityFamily = "mass" | "volume" | "count";

/** A family's base unit, what {@link toBaseQuantity} answers in. */
export type QuantityBaseUnit = "kg" | "l" | "pcs";

/** An amount and its unit. `amount: null` is "no amount yet" — the unit is still chosen. */
export interface Quantity {
  amount: number | null;
  unit: QuantityUnit;
}

/** A quantity in its family's base unit, with an amount — {@link toBaseQuantity}'s answer. */
export interface BaseQuantity {
  amount: number;
  unit: QuantityBaseUnit;
}

/** Every unit, family by family, small to large — the order the unit select lists them in. */
export const QUANTITY_UNITS: readonly QuantityUnit[] = ["g", "kg", "ml", "cl", "dl", "l", "pcs"];

/**
 * The decimals each unit is shown and entered with by default: g 0, kg 3, ml 0, cl 1,
 * dl 2, l 3, pcs 0. Each is a whole number of milli-units (a kilogram's third decimal
 * is a gram), so a value at these digits sums exactly. A count is whole by default; a
 * caller may allow up to three decimals (half a cabbage), never more.
 */
export const QUANTITY_DIGITS: Readonly<Record<QuantityUnit, number>> = {
  g: 0,
  kg: 3,
  ml: 0,
  cl: 1,
  dl: 2,
  l: 3,
  pcs: 0,
};

// Milli-units of the family's base in one unit. Every entry is a power of ten, and its
// exponent is the most decimals the unit can carry and stay on the grid.
const MILLI: Readonly<Record<QuantityUnit, number>> = { g: 1, kg: 1000, ml: 1, cl: 10, dl: 100, l: 1000, pcs: 1000 };

const FAMILY: Readonly<Record<QuantityUnit, QuantityFamily>> = {
  g: "mass",
  kg: "mass",
  ml: "volume",
  cl: "volume",
  dl: "volume",
  l: "volume",
  pcs: "count",
};

const BASE: Readonly<Record<QuantityFamily, QuantityBaseUnit>> = { mass: "kg", volume: "l", count: "pcs" };

/** The family a unit belongs to: `"mass"`, `"volume"` or `"count"`. */
export function quantityFamily(unit: QuantityUnit): QuantityFamily {
  return FAMILY[unit];
}

/** Whether `unit` is one of the kit's units — for a value that arrives as JSON. */
function isUnit(unit: unknown): unit is QuantityUnit {
  return typeof unit === "string" && Object.hasOwn(MILLI, unit);
}

/**
 * The most decimals `unit` can carry and stay on the milli grid: g 0, kg 3, ml 0, cl 1,
 * dl 2, l 3, pcs 3. A `digits` override is cut to this — a gram has no decimals to give.
 */
export function quantityMaxDigits(unit: QuantityUnit): number {
  return Math.round(Math.log10(MILLI[unit]));
}

/** `amount` in milli-units of its family's base, rounded onto the grid; `null` for no
 *  (or no finite) amount. */
function toMilli(amount: number | null, unit: QuantityUnit): number | null {
  if (amount === null || !Number.isFinite(amount)) return null;
  // Rounded to the unit's grid as WRITTEN first (1.005 kg is 1.00499… in binary, and
  // `1.005 * 1000` is 1004.9999999999999), then scaled: what is left of the binary error
  // is far below the half `Math.round` decides on.
  return Math.round(roundHalfAway(amount, quantityMaxDigits(unit)) * MILLI[unit]) || 0;
}

/** Milli-units back in `unit`: an integer over a power of ten, the double the decimal is. */
function fromMilli(milli: number, unit: QuantityUnit): number {
  return milli / MILLI[unit] || 0;
}

/**
 * `q` in its family's base unit — kg, l or pcs — or `null` when it has no amount.
 * `{ amount: 500, unit: "g" }` → `{ amount: 0.5, unit: "kg" }`.
 */
export function toBaseQuantity(q: Quantity): BaseQuantity | null {
  if (!isUnit(q.unit)) return null;
  const milli = toMilli(q.amount, q.unit);
  if (milli === null) return null;
  const unit = BASE[FAMILY[q.unit]];
  return { amount: fromMilli(milli, unit), unit };
}

/**
 * `q` in `toUnit`, exactly — `{ amount: 500, unit: "g" }` in kg is 0.5 kg. Within a family
 * only: mass to volume, or pieces to kilograms, is `null` (a piece's weight is the app's
 * to know). A quantity with no amount converts to no amount in `toUnit`.
 */
export function convertQuantity(q: Quantity, toUnit: QuantityUnit): Quantity | null {
  if (!isUnit(q.unit) || !isUnit(toUnit) || FAMILY[q.unit] !== FAMILY[toUnit]) return null;
  const milli = toMilli(q.amount, q.unit);
  return { amount: milli === null ? null : fromMilli(milli, toUnit), unit: toUnit };
}

/**
 * The sum of `qs`, exactly, or `null` when they are not all of one family (grams and
 * pieces do not add up) — or `unit` is of another one.
 *
 * The result is in `unit` when one is given, else in the FIRST quantity's unit:
 * 500 g + 1 kg is 1500 g, 1 kg + 500 g is 1.5 kg; {@link formatQuantity}'s `bestUnit`
 * picks the readable one for display. A quantity with no amount adds nothing (a "some
 * flour" line in a list) but its unit still has to be of the family; if NONE has an
 * amount, the sum has none either. No quantities at all: `null`, or 0 in `unit` when
 * one is given.
 */
export function sumQuantities(qs: readonly Quantity[], unit?: QuantityUnit): Quantity | null {
  const target = unit ?? qs[0]?.unit;
  if (target === undefined || !isUnit(target)) return null;
  const family = FAMILY[target];
  let milli: number | null = qs.length === 0 ? 0 : null;
  for (const q of qs) {
    if (!isUnit(q.unit) || FAMILY[q.unit] !== family) return null;
    const m = toMilli(q.amount, q.unit);
    if (m !== null) milli = (milli ?? 0) + m;
  }
  return { amount: milli === null ? null : fromMilli(milli, target), unit: target };
}

/** The words {@link formatQuantity} and {@link parseQuantity} take — the `quantity` labels'
 *  `pcs`, so a component's provider override reaches them. */
export interface QuantityUnitWords {
  /** The pieces unit as printed after a count ("pcs", "Stk."). Default "pcs". */
  pcs?: string;
}

export interface FormatQuantityOptions {
  /**
   * Show the amount in the unit that reads best: grams and millilitres from 1000 up
   * become kilograms and litres, and kilograms and litres below 1 become grams and
   * millilitres — 1500 g is "1.5 kg", 0.25 l is "250 ml". Centilitres and decilitres
   * are normalised the same way (75 cl is "750 ml", 15 dl is "1.5 l"): a list that
   * mixes them reads in two units, not four. Pieces stay pieces. Default `false`: the
   * quantity's own unit.
   */
  bestUnit?: boolean;
  /** The pieces word — pass the `quantity` labels (`useKitLabels("quantity",
   *  DEFAULT_QUANTITY_LABELS)`) to print the reader's language; default "pcs". */
  labels?: QuantityUnitWords;
}

/** The unit {@link FormatQuantityOptions.bestUnit} shows `milli` milli-units of `family` in. */
function bestUnitFor(milli: number, family: QuantityFamily, unit: QuantityUnit): QuantityUnit {
  if (family === "count") return unit;
  const large = Math.abs(milli) >= 1000;
  if (family === "mass") return large ? "kg" : "g";
  return large ? "l" : "ml";
}

/** The symbol a unit is printed with — SI's in every language, but for the pieces word. */
function unitSymbol(unit: QuantityUnit, words: QuantityUnitWords | undefined): string {
  return unit === "pcs" ? (words?.pcs ?? "pcs") : unit;
}

/**
 * `q` for a reader: "1.5 kg", "500 g", "6 pcs" — through {@link formatNumber}'s `unit`, so
 * the digits and their separators are `locale`'s (de-CH "1.5 kg", de-DE and fr "1,5 kg";
 * "1’500 g" with grouping) and the unit sits after a narrow no-break space. As many
 * decimals as the unit's grid holds (g and ml none, cl 1, dl 2, kg, l and pcs 3), trailing
 * zeros trimmed: 0.5 kg is "0.5 kg", never "0.500 kg". No amount prints `formatNumber`'s
 * empty value, "—", without a unit.
 *
 * g, kg, ml, cl, dl and l are SI symbols in every language; only pieces have a word, which
 * the kit does not translate on its own — pass `labels` (see {@link FormatQuantityOptions}).
 */
export function formatQuantity(q: Quantity, locale?: string, options: FormatQuantityOptions = {}): string {
  let { amount, unit } = q;
  if (options.bestUnit && isUnit(unit) && amount !== null && Number.isFinite(amount)) {
    const milli = toMilli(amount, unit) as number;
    unit = bestUnitFor(milli, FAMILY[unit], unit);
    amount = fromMilli(milli, unit);
  }
  // The unit's whole grid, not its entry digits: a count entered as 0.5 (a caller's
  // `digits`) prints "0.5 pcs", not a rounded "1 pcs".
  const digits = isUnit(unit) ? quantityMaxDigits(unit) : 3;
  return formatNumber(amount, { locale, digits: { min: 0, max: digits }, unit: unitSymbol(unit, options.labels) });
}

/* ── parsing ─────────────────────────────────────────────────────────────── */

// The words a unit is written with, lower-case and without a trailing dot. The SI
// symbols, and every pieces word the kit's catalogues print (`quantity.pcs`) with their
// usual neighbours — a parser that read its own catalogue's word and not the plural on
// the shelf label beside it would be a trap. `parse.test` holds every catalogue's word
// to this list. "x" is "6x", a count written the way a receipt writes it.
const UNIT_WORDS: Readonly<Record<string, QuantityUnit>> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  cl: "cl",
  dl: "dl",
  l: "l",
  // en
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  x: "pcs",
  "×": "pcs",
  // de
  stk: "pcs",
  stück: "pcs",
  st: "pcs",
  // fr
  pce: "pcs",
  pces: "pcs",
  pièce: "pcs",
  pièces: "pcs",
  // it
  pz: "pcs",
  pezzo: "pcs",
  pezzi: "pcs",
  // es
  ud: "pcs",
  uds: "pcs",
  unidad: "pcs",
  unidades: "pcs",
  // hu
  db: "pcs",
  darab: "pcs",
  // zh
  个: "pcs",
  件: "pcs",
};

/** A unit word as the table above holds it: lower-case, no trailing dot. */
function unitKey(word: string): string {
  return word.trim().toLowerCase().replace(/\.$/, "");
}

// A multipack — "6 x 1.5 l", "6x500g", "2 × 250 ml": a count AND a quantity, which one
// Quantity cannot hold. v1 refuses it rather than return either half as the whole.
const MULTIPACK = /\d\s*[x×*]\s*\d/i;

// A figure, then the rest. The figure starts and ends with a digit and may hold the
// marks and grouping spaces between ("1.234,5", "1 500", "1’500"); what follows it is
// the unit, with or without a space ("500g", "500 g").
const QUANTITY_TEXT = /^(\d(?:[\d.,'’ ]*\d)?)\s*(.*)$/u;

// A figure with one mark at most: which one is the decimal is the locale's question,
// answered as the fields answer it (`normalizeTypedMarks`).
const ONE_MARK = /^\d+(?:[.,]\d+)?$/;
// A figure grouped in thousands — one grouping character throughout, then perhaps a
// decimal mark that is not it: "1.234,5", "1,234.5", "1 500", "1’500.5". Grouping in
// anything but threes is no figure: "1.2.3 kg" is refused, where the fields' lenient
// reading of typing would make it 123.
const GROUPED = /^(\d{1,3}(?:([.,'’ ])\d{3})(?:\2\d{3})*)(?:([.,])(\d+))?$/;

/**
 * The quantity `text` says — "500g", "500 g", "1,5 kg", "1.5l", "2.5 dl", "75 cl",
 * "6 Stk", "6 pcs", "6x" — or `null` when it says none.
 *
 * - The figure is read in `locale`'s decimal mark the way the kit's number fields read
 *   typing (`lib/decimal-marks`): de-DE "1,5 kg" and de-CH "1.5 kg" are both 1.5 kg; a
 *   de-DE "1.500 g" is grouping, so 1500 g. A lone comma in a point locale stays the
 *   decimal, as Swiss typists write "1,5" (so an English "1,500 g" is 1.5 g — and
 *   refused, below). Grouping is read in threes only ("1.234,5", "1’500", "1 500").
 * - The unit is an SI symbol in any case ("1.5L"), or a pieces word from any of the
 *   kit's catalogues — "pcs", "Stk.", "pce", "pz.", "ud.", "db", "个" — or "x"; the
 *   words in `options.labels` too, so what {@link formatQuantity} prints reads back.
 * - `null` for no figure, no unit ("500"), an unknown unit, a multipack ("6 x 1.5 l",
 *   "6x500g" — v1), a sign, and an amount finer than the unit's grid ("0.5 g",
 *   "1.0005 kg"): a misreading is likelier than half a gram, and the exact arithmetic
 *   has no place for it.
 */
export function parseQuantity(
  text: string,
  locale?: string,
  options: { labels?: QuantityUnitWords } = {},
): Quantity | null {
  // `\s` is Unicode's: the narrow no-break space formatQuantity writes, and fr's
  // no-break grouping space, are spaces here.
  const s = text.trim().replace(/\s+/g, " ");
  if (s === "" || MULTIPACK.test(s)) return null;
  const match = QUANTITY_TEXT.exec(s);
  if (!match) return null;
  const [, figure, word] = match as unknown as [string, string, string];
  const own = options.labels?.pcs;
  const key = unitKey(word);
  const unit = own !== undefined && key !== "" && unitKey(own) === key ? "pcs" : UNIT_WORDS[key];
  if (unit === undefined) return null;

  let plain: string;
  const grouped = GROUPED.exec(figure);
  if (ONE_MARK.test(figure)) {
    plain = normalizeTypedMarks(figure, decimalMark(locale)).replace(/,/g, ".");
  } else if (grouped && grouped[2] !== grouped[3]) {
    const [, whole, group, , fraction] = grouped as unknown as [string, string, string, string?, string?];
    plain = whole.split(group).join("") + (fraction === undefined ? "" : `.${fraction}`);
  } else {
    return null;
  }
  // Decimals as written, trailing zeros aside ("1.500 kg" is 1.5): more than the unit's
  // grid holds is refused, not rounded.
  const decimals = plain.includes(".") ? plain.split(".")[1]!.replace(/0+$/, "").length : 0;
  if (decimals > quantityMaxDigits(unit)) return null;
  return { amount: Number(plain), unit };
}
