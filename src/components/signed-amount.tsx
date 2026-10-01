import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "../lib/cn";
import { formatMoney, formatNumber, formatPercent } from "../lib/format";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { DEFAULT_STAT_TILE_LABELS } from "./stat-tile";
import type { StatTileLabels } from "./stat-tile";

/**
 * The text colours a figure can carry, token-backed — `StatTile`'s tones, as a class
 * any span can take.
 *
 *  - `default` — the primary text colour. `muted` — the secondary, quiet one.
 *  - `income` / `expense` / `net` — the money trio (CVD-safe teal / amber / violet).
 *  - `success` / `warning` / `danger` / `info` — a verdict: a rent rise is the tenant's
 *    bad news (kastlan lease-columns), a vote "for" is green (meeting-agenda-tab).
 *  - `brand` — the app's accent.
 *
 * Colour is never the only carrier: pair a verdict with an arrow, a word, or a sign.
 */
export type TextTone =
  | "default"
  | "muted"
  | "brand"
  | "income"
  | "expense"
  | "net"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TEXT_TONE: Record<TextTone, string> = {
  default: "text-[var(--text-primary)]",
  muted: "text-[var(--text-muted)]",
  brand: "text-[var(--brand)]",
  income: "text-[var(--money-income)]",
  expense: "text-[var(--money-expense)]",
  net: "text-[var(--money-net)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  info: "text-[var(--info)]",
};

/**
 * The class that colours text in `tone` — for the spans kastlan colours by hand with
 * `text-[var(--danger)]` / `text-emerald-600` (settlement-table, changelog-page,
 * meeting-agenda-tab), so the palette they draw from is the kit's tokens.
 */
export function toneTextClass(tone: TextTone): string {
  return TEXT_TONE[tone];
}

export interface ToneProps extends ComponentPropsWithoutRef<"span"> {
  tone: TextTone;
}

/** A `<span>` in a {@link TextTone} — `<Tone tone="success">{votesFor}</Tone>`. */
export function Tone({ tone, className, ...rest }: ToneProps) {
  return <span {...rest} className={cn(TEXT_TONE[tone], className)} />;
}

/* ── Signed amounts ──────────────────────────────────────────────────────── */

/** Which way is +1: `up` for a figure where more is good news (income, savings),
 *  `down` where less is (a rent the tenant pays, a cost). */
export type GoodDirection = "up" | "down";

/**
 * How a signed figure is coloured:
 *  - `signed` (default) — money read by its own sign: above zero `income`, below zero
 *    `expense`, zero muted. A balance, a net.
 *  - `income` / `expense` / `neutral` — one colour whatever the sign (`neutral` is the
 *    text's own colour).
 *  - `verdict` — the change judged by {@link SignedAmountProps.goodDirection}: good
 *    news `success`, bad news `danger`, zero muted. Setting `goodDirection` implies it.
 */
export type SignedAmountTone = "signed" | "income" | "expense" | "neutral" | "verdict";

/**
 * The colours a VERDICT is painted in (`goodDirection` set, or `tone="verdict"`):
 *  - `status` (default) — `success` / `danger`: good news, bad news.
 *  - `money` — `income` / `expense` (the `.text-money-pos` / `.text-money-neg` pair):
 *    the app's ONE money palette (keksdose dev#434). A grocery price going UP is money
 *    going out, so with `goodDirection="down"` it wears the expense colour every other
 *    outflow in the app wears — not a red that says "error". keksdose coloured its
 *    three price-change sites by hand for want of this.
 */
export type VerdictPalette = "status" | "money";

/** What a signed figure says to a screen reader, whose readers disagree about a
 *  leading "+" (most skip it) and a "−" (some read "dash", some nothing). */
export interface SignedAmountLabels {
  /** A figure above zero. `amount` is formatted and unsigned. */
  positive: (amount: string) => string;
  /** A figure below zero. `amount` is formatted and unsigned. */
  negative: (amount: string) => string;
}

export const DEFAULT_SIGNED_AMOUNT_LABELS: SignedAmountLabels = {
  positive: (amount) => `plus ${amount}`,
  negative: (amount) => `minus ${amount}`,
};

interface SignedFormatProps {
  /** ISO 4217 code: format as money. */
  currency?: string;
  /** `"percent"` reads `value` as a RATIO (`0.12` → 12 %), as `StatTile`'s delta does
   *  — or as percent POINTS with `ratio={false}`. */
  unit?: "value" | "percent";
  /** With `unit="percent"`: `true` (default) — `value` is a ratio, `0.12` is 12 %.
   *  `false` — `value` is already in percent POINTS, `12` is 12 %, as `formatPercent`'s
   *  `ratio` option reads it. Backends send points (keksdose's price changes, kastlan's
   *  `change_pct`), and without this every site divided by 100 — and wrote its
   *  `flatWithin` as a ratio (`0.005`) beside a value it had to convert. With
   *  `ratio={false}` the value AND `flatWithin` are in points (`flatWithin={0.5}` is
   *  half a point). Ignored for any other unit. */
  ratio?: boolean;
  /** Compact notation: 12 400 → "12K". */
  compact?: boolean;
  /** Fraction digits, as `formatNumber`'s `digits`. */
  digits?: number | { min?: number; max?: number };
  /** Formats the UNSIGNED magnitude, replacing the `Intl` default outright. The sign
   *  is the component's. */
  format?: (magnitude: number) => string;
  locale?: string;
}

function useMagnitudeFormatter({ currency, unit, ratio, compact, digits, format, locale }: SignedFormatProps) {
  const kitLocale = useKitLocale(locale);
  return (magnitude: number): string => {
    if (format) return format(magnitude);
    if (unit === "percent") return formatPercent(magnitude, { locale: kitLocale, compact, digits, ratio });
    if (currency) return formatMoney(magnitude, currency, { locale: kitLocale, compact, digits });
    return formatNumber(magnitude, { locale: kitLocale, compact, digits });
  };
}

/** `flatWithin` widens "no change" from exactly zero to a band round it: a price that
 *  moved by a fraction of a cent, a ratio that rounds to "0.0 %", is not a rise, and an
 *  arrow and a colour for it claim one. Inclusive — `|value| ≤ flatWithin` is flat. */
function directionOf(value: number, flatWithin = 0): "up" | "down" | "flat" {
  if (Math.abs(value) <= Math.max(0, flatWithin)) return "flat";
  return value > 0 ? "up" : "down";
}

function verdictClass(good: boolean, palette: VerdictPalette): string {
  if (palette === "money") return good ? TEXT_TONE.income : TEXT_TONE.expense;
  return good ? TEXT_TONE.success : TEXT_TONE.danger;
}

function signedToneClass(
  tone: SignedAmountTone,
  dir: "up" | "down" | "flat",
  goodDirection: GoodDirection | undefined,
  palette: VerdictPalette,
): string {
  if (tone === "verdict" || (goodDirection && tone === "signed")) {
    if (dir === "flat" || !goodDirection) return TEXT_TONE.muted;
    return verdictClass(dir === goodDirection, palette);
  }
  if (tone === "signed") return dir === "flat" ? TEXT_TONE.muted : dir === "up" ? TEXT_TONE.income : TEXT_TONE.expense;
  if (tone === "neutral") return "";
  return TEXT_TONE[tone];
}

const ARROW = { up: ArrowUp, down: ArrowDown, flat: Minus } as const;

export interface SignedAmountProps
  extends SignedFormatProps,
    Omit<ComponentPropsWithoutRef<"span">, "children"> {
  value: number;
  /** See {@link SignedAmountTone}. Default `signed`, or `verdict` with `goodDirection`. */
  tone?: SignedAmountTone;
  /** Which way is good news — colours by verdict (`success` / `danger`, or the money
   *  pair with `palette="money"`). */
  goodDirection?: GoodDirection;
  /** See {@link VerdictPalette}. Default `status`. Only a verdict reads it. */
  palette?: VerdictPalette;
  /** A magnitude up to which the figure counts as NO change: no sign, no arrow but the
   *  flat dash, muted, spoken without "plus"/"minus" (inclusive; default 0). The digits
   *  still print `|value|` — use a band below the display precision, where they round
   *  to zero anyway (`flatWithin={0.005}` at two digits). */
  flatWithin?: number;
  /** Print "+" before a positive figure (default `true`). A negative always shows its
   *  minus; zero shows neither. */
  showPlus?: boolean;
  /** An arrow before the figure (up / down / a dash at zero) — so the direction does not
   *  ride on colour alone. Decorative; the words say the same. */
  arrow?: boolean;
  /** Tag the figure `data-private`, for the host's demo-mode blur. */
  sensitive?: boolean;
  labels?: Partial<SignedAmountLabels>;
}

/**
 * A figure with a sign that matters: a balance, a rent change, a net.
 *
 * kastlan writes it by hand in five places — `{change > 0 ? "+" : ""}{formatCurrency(
 * change)}` in a span coloured by a ternary (lease-columns:190, settlement-table:58,
 * the tenancy `formatPct`) — and each picks its own colours for the same verdict.
 *
 * The visible figure (sign, digits, arrow) is hidden from assistive tech and spoken as
 * words instead ("plus CHF 50.00" / "minus CHF 50.00", `signedAmount.*`): a "+" is
 * skipped by most screen readers, and `Intl`'s "−" is read as "dash" or not at all.
 */
export function SignedAmount({
  value,
  currency,
  unit,
  ratio,
  compact,
  digits,
  format,
  locale,
  tone = "signed",
  goodDirection,
  palette = "status",
  flatWithin,
  showPlus = true,
  arrow = false,
  sensitive = false,
  labels,
  className,
  ...rest
}: SignedAmountProps) {
  const text = useKitLabels("signedAmount", DEFAULT_SIGNED_AMOUNT_LABELS, labels);
  const fmt = useMagnitudeFormatter({ currency, unit, ratio, compact, digits, format, locale });
  const finite = Number.isFinite(value);
  const dir = finite ? directionOf(value, flatWithin) : "flat";
  const amount = finite ? fmt(Math.abs(value)) : "—";
  // U+2212, the typographic minus: the same width as "+", so a column of signed figures
  // lines up under `tabular-nums`.
  const sign = dir === "up" ? (showPlus ? "+" : "") : dir === "down" ? "−" : "";
  const spoken = dir === "up" ? text.positive(amount) : dir === "down" ? text.negative(amount) : amount;
  const Icon = ARROW[dir];
  return (
    <span
      {...rest}
      data-private={sensitive ? "" : undefined}
      data-direction={dir}
      className={cn(
        "relative inline-flex items-center gap-0.5 whitespace-nowrap tabular-nums",
        signedToneClass(tone, dir, goodDirection, palette),
        className,
      )}
    >
      {arrow && <Icon aria-hidden className="size-[1em] shrink-0" />}
      <span aria-hidden>
        {sign}
        {amount}
      </span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

export interface DeltaProps extends SignedFormatProps, Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /** The change. Above zero is "up". */
  value: number;
  /** Which way is good news. Unset, the change is stated and not judged (muted); set,
   *  it is coloured `success` / `danger` and its sentence says "(better)" / "(worse)". */
  goodDirection?: GoodDirection;
  /** See {@link VerdictPalette}: `money` paints good news `income` and bad news
   *  `expense` instead of `success` / `danger`. Default `status`. */
  palette?: VerdictPalette;
  /** See {@link SignedAmountProps.flatWithin}: up to this magnitude the change is
   *  "unchanged" — flat dash, muted, no verdict. Default 0. */
  flatWithin?: number;
  /** What it is measured against, after it: "vs last month". */
  label?: ReactNode;
  /** Hide the arrow (shown by default, as on a StatTile). At zero the arrow is a flat
   *  dash BESIDE the figure ("– 0.00 %"), never in place of it. */
  arrow?: boolean;
  sensitive?: boolean;
  /** The `statTile` namespace's direction words — a delta says the same as a tile's. */
  labels?: Partial<Pick<StatTileLabels, "increase" | "decrease" | "unchanged" | "better" | "worse">>;
}

/**
 * `StatTile`'s delta on its own: an arrow, the unsigned magnitude, and a sentence for
 * screen readers ("Up 12% (worse)"), coloured only when `goodDirection` judges it —
 * users up and cost up are the same arrow until someone says which is good.
 *
 * For a change shown outside a tile: kastlan's rent-change column
 * (lease-columns:219, a "+1.25%" chip), the breakdown rows of the rent calculator
 * (breakdown-row:5, a trend icon coloured by hand).
 */
export function Delta({
  value,
  currency,
  unit,
  ratio,
  compact,
  digits,
  format,
  locale,
  goodDirection,
  palette = "status",
  flatWithin,
  label,
  arrow = true,
  sensitive = false,
  labels,
  className,
  ...rest
}: DeltaProps) {
  const text = useKitLabels("statTile", DEFAULT_STAT_TILE_LABELS, labels);
  const fmt = useMagnitudeFormatter({ currency, unit, ratio, compact, digits, format, locale });
  if (!Number.isFinite(value)) return null;
  const amount = fmt(Math.abs(value));
  const dir = directionOf(value, flatWithin);
  const Icon = ARROW[dir];
  let spoken = dir === "up" ? text.increase(amount) : dir === "down" ? text.decrease(amount) : text.unchanged;
  let tone = TEXT_TONE.muted;
  if (goodDirection && dir !== "flat") {
    const good = dir === goodDirection;
    spoken = good ? text.better(spoken) : text.worse(spoken);
    tone = verdictClass(good, palette);
  }
  return (
    <span
      {...rest}
      data-direction={dir}
      className={cn("relative inline-flex flex-wrap items-center gap-x-1.5 tabular-nums", className)}
    >
      <span data-private={sensitive ? "" : undefined} className={cn("inline-flex items-center gap-0.5 font-medium", tone)}>
        {arrow && <Icon className="size-[1em] shrink-0" aria-hidden />}
        {/* The figure at zero too, beside the flat dash (kastlan feedback #48). Before
            this a flat delta with an arrow drew the dash ALONE, as a StatTile does — so
            a rent-change column that printed "0.00 %" for an unchanged lease showed a
            bare "–" in its place, and a bare dash is what a table prints for a MISSING
            value: "unchanged" and "not known" looked the same. The Minus icon is the
            neutral indicator, the muted tone the neutral colour, and the figure says
            how much (none) in the column's own digits. A value that is missing never
            reaches here — a non-finite one renders nothing, above. Visible change for
            every `<Delta value={0}>` with the default arrow: "–" became "– 0 %". */}
        <span aria-hidden>{amount}</span>
        <span className="sr-only">{spoken}</span>
      </span>
      {label != null && <span className="text-[var(--text-muted)]">{label}</span>}
    </span>
  );
}
