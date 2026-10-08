import { ArrowUpDown, Minus, Plus } from "lucide-react";
import { Chip } from "./chip";
import { Tooltip } from "./tooltip";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { useLargeText } from "../hooks/use-large-text";

// ── Labels ────────────────────────────────────────────────────────────────────

/** The words a {@link SignChip} says — the `signChip` namespace of
 *  `<UiKitProvider labels>`, and per chip through its `labels` prop. */
export interface SignChipLabels {
  /** The chip's text while the figure is negative — money going out. */
  outflow: string;
  /** The chip's text while the figure is positive — money coming in. */
  inflow: string;
  /** The chip's accessible name and its tooltip: the state it is in, and what a press
   *  turns it into — `current` and `next` are the two words above. The other option is
   *  nowhere on screen to be read, so the name has to say both. */
  direction: (current: string, next: string) => string;
  /** 0.32: what a press does, in words under the chip at Large and Extra large —
   *  `next` is the other direction's word ("Switch to Inflow"). The tooltip's half of
   *  `direction`, shown, since a fact may not live only in a tooltip there (§4). */
  switchTo: (next: string) => string;
}

export const DEFAULT_SIGN_CHIP_LABELS: SignChipLabels = {
  outflow: "Outflow",
  inflow: "Inflow",
  direction: (current, next) => `Direction: ${current} — switch to ${next}`,
  switchTo: (next) => `Switch to ${next}`,
};

export interface SignChipProps {
  /** The figure is negative (an outflow) — the same flag {@link AmountInput}'s
   *  `negative` is, so one state feeds both: `<AmountInput negative={neg}
   *  onNegativeChange={setNeg} />` and `<SignChip negative={neg}
   *  onNegativeChange={setNeg} />`. */
  negative: boolean;
  /** A press: the other direction. */
  onNegativeChange: (negative: boolean) => void;
  disabled?: boolean;
  /** Per-chip overrides of the `signChip` namespace. */
  labels?: Partial<SignChipLabels>;
  /** On the chip. Place it in its row from here — keksdose's form passes `self-end`
   *  to sit it on the display figure's baseline strip. */
  className?: string;
}

/**
 * The SIGN of an amount, as one chip that shows only the state it is in — keksdose
 * K15, its `DirectionToggle` (feedback #417, #430, #431, dev#434) made a kit piece,
 * so the figure and its direction come from one package and wear one palette.
 *
 * WHY A CHIP, NOT A SEGMENTED CONTROL. A two-option toggle spends half its width
 * telling you what the figure is NOT, and at a phone's width it was the widest thing on
 * the form after the figure itself (#417). This sits beside the amount and reads as one
 * phrase with it — "−42,50 Outflow" — and a press flips it. Hiding the alternative costs
 * discoverability, so two things pay it back: the ± glyph and the swap arrows say "this
 * is a control", not a badge; and the name and tooltip spell out both the current state
 * and what a press will do.
 *
 * NOT A PRESSED/UNPRESSED TOGGLE. A {@link Chip} toggle has a FIXED label naming its
 * on-state, with `aria-pressed` carrying the state. Here the word IS the state, so it
 * is an action button with no `aria-pressed`: "Direction: Inflow, not pressed" would
 * name no on-state for "not pressed" to be the absence of. The name changing under
 * focus is the echo.
 *
 * THE COLOUR is the money pairing — the chip's `expense` / `income` tones, the same
 * `--money-expense` / `--money-income` that {@link AmountInput}'s `tone` paints the
 * figure with (dev#434): only the text and the border carry the tint, on a neutral
 * surface, because a filled pill next to a tinted figure reads as one smear.
 *
 * SIZE. `lg` on a phone — the 44px touch target beside a display figure that has no
 * field height to match — and from `md` up exactly a labelled field's 42px, so it never
 * stands taller than the fields in its grid row (#431).
 *
 * An exported chip rather than an `AmountInput signControl` slot: the slot would have
 * to own the row the two share, and every form lays that row out differently (beside
 * the figure on a phone, in a grid column on a desktop). The chip is the part that was
 * being re-written; the row stays the form's.
 */
export function SignChip({ negative, onNegativeChange, disabled, labels: labelsProp, className }: SignChipProps) {
  const labels = useKitLabels("signChip", DEFAULT_SIGN_CHIP_LABELS, labelsProp);
  const current = negative ? labels.outflow : labels.inflow;
  const next = negative ? labels.inflow : labels.outflow;
  const name = labels.direction(current, next);
  // §4: at Large the chip's word is joined by what a press does, as a line under it —
  // and the bubble that said only that goes.
  const large = useLargeText();
  const chip = (
      <Chip
        size="lg"
        tone={negative ? "expense" : "income"}
        icon={negative ? Minus : Plus}
        onClick={() => onNegativeChange(!negative)}
        disabled={disabled}
        aria-label={name}
        // `gap-1.5 px-3`: the chip's narrower body, because on a 375px screen every
        // pixel of it is taken from the figure beside it (#430). `md:py-2.5` with the
        // hairline border is the 42px a labelled field measures (#431).
        className={cn("shrink-0 gap-1.5 whitespace-nowrap px-3 font-medium md:min-h-0 md:py-2.5", !large && className)}
      >
        {current}
        {/* The swap arrows after the word, in the label's own row: decoration (the
            name already says what a press does), set a little apart from the word. */}
        <ArrowUpDown className="ms-1.5 inline size-3.5 align-[-0.2em] opacity-60" aria-hidden />
      </Chip>
  );
  if (!large) {
    return (
      <Tooltip label={name} lazy>
        {chip}
      </Tooltip>
    );
  }
  return (
    // The caller's placement (`self-end`…) moves to the pair, which is now the row's item.
    <span data-slot="sign-chip" className={cn("inline-flex shrink-0 flex-col items-start gap-0.5", className)}>
      {chip}
      {/* Hidden from the accessibility tree: the chip's name already says it. */}
      <span aria-hidden className="text-xs text-[var(--text-muted)]">
        {labels.switchTo(next)}
      </span>
    </span>
  );
}
