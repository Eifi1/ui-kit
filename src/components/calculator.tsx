import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator as CalculatorIcon, Delete } from "lucide-react";
import { Popover } from "./popover";
import { cn } from "../lib/cn";
import { evaluateExpression, formatResult, isBareAmount, splitLeadingSign } from "../lib/calc";
import {
  DEFAULT_CALCULATOR_LABELS,
  useKitLabels,
  type CalculatorLabels,
} from "../i18n/kit-labels";

/** Screen-reader names for the calculator panel's own controls — any part of the
 *  kit's `calculator` namespace. Once three optional keys of its own; widened, not
 *  replaced, so every object that type-checked before still does. */
export type CalculatorButtonLabels = Partial<CalculatorLabels>;

interface CalculatorButtonProps {
  /** Current field text — seeds the keypad so the user can keep calculating
   * from what's already entered. */
  value: string;
  /**
   * Called with the evaluated result whenever the running expression resolves
   * to a number, so the host field tracks the keypad live.
   *
   * `expression` is the TEXT that result came out of — `"-42+50"` for an 8 — and
   * is omitted when there was no calculation (a cleared pad). A host that keeps
   * the sign of its figure OUTSIDE the text (see `AmountInput`'s `negative` /
   * `onNegativeChange`, where a direction toggle owns it) cannot otherwise tell
   * that 8 from a freshly typed one: the first is a sum that came out positive
   * and has to take the direction with it, the second is a magnitude that must
   * leave the direction alone. Hosts whose text carries its own sign can take
   * the one argument and ignore this.
   */
  onChange: (value: string, expression?: string) => void;
  className?: string;
  /** The trigger's accessible name; wins over `calculator.open` from the provider. */
  ariaLabel?: string;
  /** Screen-reader names for the panel's own controls. `ariaLabel` above already
   *  covers the trigger; these three were hardcoded English inside the popover,
   *  which a translating host had no way to reach. */
  labels?: CalculatorButtonLabels;
}

/** Keypad layout (4 columns). The final C/= row is rendered separately. `name` is
 *  the key of the {@link CalculatorLabels} entry that names a non-digit key; a digit
 *  is named by its own glyph. */
type Key =
  | { kind: "ins"; label: string; ins: string; accent?: boolean; name?: KeyName }
  | { kind: "back" };

type KeyName = "plus" | "minus" | "times" | "divide" | "decimal";

const KEYS: Key[] = [
  { kind: "ins", label: "7", ins: "7" },
  { kind: "ins", label: "8", ins: "8" },
  { kind: "ins", label: "9", ins: "9" },
  { kind: "ins", label: "÷", ins: "÷", accent: true, name: "divide" },
  { kind: "ins", label: "4", ins: "4" },
  { kind: "ins", label: "5", ins: "5" },
  { kind: "ins", label: "6", ins: "6" },
  { kind: "ins", label: "×", ins: "×", accent: true, name: "times" },
  { kind: "ins", label: "1", ins: "1" },
  { kind: "ins", label: "2", ins: "2" },
  { kind: "ins", label: "3", ins: "3" },
  { kind: "ins", label: "−", ins: "−", accent: true, name: "minus" },
  { kind: "ins", label: "0", ins: "0" },
  { kind: "ins", label: ".", ins: ".", name: "decimal" },
  { kind: "back" },
  { kind: "ins", label: "+", ins: "+", accent: true, name: "plus" },
];

const KEY_BASE =
  "flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)]";
// Two key families, two fills: digits sit on the inset surface and darken on
// hover, operators sit a step down on `--border` and lift toward that surface —
// the same split `NumberPadSheet` uses for this keypad on a phone. The tokens
// flip with the theme, so neither needs a `dark:` twin.
const KEY_DIGIT =
  "bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]";
const KEY_ACCENT =
  "bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]";

function seed(initial: string): string {
  const t = initial.trim();
  return t === "-" ? "" : t;
}

function CalculatorPanel({
  initial,
  onChange,
  labels,
}: {
  initial: string;
  onChange: (value: string, expression?: string) => void;
  labels: CalculatorLabels;
}) {
  const [expr, setExpr] = useState(() => seed(initial));
  const inputRef = useRef<HTMLInputElement>(null);
  // What the pad SHOWS. Normally the expression it holds — but when the host owns
  // the sign of the figure, the magnitude it hands back is not the whole number:
  // type 50 into a pad opened on an outflow and the host answers "-50". Derived
  // rather than stored, so there is no echo to guard against and a host that
  // ignores `onChange` entirely (a static `value`) still sees its own keystrokes:
  // the pad only defers when the host's text is character-for-character its own
  // last number with a minus in front.
  const host = splitLeadingSign(initial.trim());
  const text = host.sign === "-" && isBareAmount(expr) && host.rest === expr.trim() ? initial.trim() : expr;
  const result = evaluateExpression(text);

  // Focus the display on open so the user can type or hit Enter immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update the host field whenever the expression resolves to a number; an
  // incomplete expression (e.g. "12+") simply leaves the field untouched. The
  // expression rides along with the result — see `onChange` above.
  const apply = (next: string) => {
    setExpr(next);
    const n = evaluateExpression(next);
    if (n !== null) onChange(formatResult(n), next);
  };

  const clearAll = () => {
    setExpr("");
    onChange("");
  };

  const equals = () => {
    if (result === null) return;
    const out = formatResult(result);
    setExpr(out);
    onChange(out, text);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        aria-label={labels.calculation}
        value={text}
        inputMode="decimal"
        onChange={(e) => apply(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            equals();
          }
        }}
        className="block w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5 text-right font-mono text-sm text-[var(--text-primary)] focus:border-[var(--border-strong)] focus:ring-[var(--border-strong)]"
      />
      <div className="h-4 pr-1 text-right font-mono text-xs text-[var(--text-placeholder)]">
        {result !== null && formatResult(result) !== text.trim() ? `= ${formatResult(result)}` : ""}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.map((key, i) =>
          key.kind === "back" ? (
            <button
              key="back"
              type="button"
              aria-label={labels.backspace}
              onClick={() => apply(text.slice(0, -1))}
              className={cn(KEY_BASE, KEY_ACCENT)}
            >
              <Delete className="size-4" />
            </button>
          ) : (
            <button
              key={`${key.ins}-${i}`}
              type="button"
              aria-label={key.name ? labels[key.name] : undefined}
              onClick={() => apply(text + key.ins)}
              className={cn(KEY_BASE, key.accent ? KEY_ACCENT : KEY_DIGIT)}
            >
              {key.label}
            </button>
          ),
        )}
        <button
          type="button"
          // "C" is a convention, not a name: read aloud it is the letter.
          aria-label={labels.clear}
          onClick={clearAll}
          className={cn(KEY_BASE, "col-span-2 bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]")}
        >
          C
        </button>
        <button
          type="button"
          aria-label={labels.equals}
          onClick={equals}
          className={cn(
            KEY_BASE,
            // The one chip that inverts against the page. There is no hover token for
            // an inverted fill, so the hover is the chip mixed back toward the
            // surface — a step quieter in either theme, and still a colour, so
            // KEY_BASE's `transition-colors` carries it.
            "col-span-2 bg-[var(--bg-inverse)] text-[var(--text-inverse)] hover:bg-[color-mix(in_oklab,var(--bg-inverse)_88%,var(--bg-surface))]",
          )}
        >
          =
        </button>
      </div>
    </div>
  );
}

/**
 * A calculator icon that opens a small keypad popover anchored to its host
 * field. Designed as a trailing-edge adornment: render it inside the field's
 * `relative` wrapper, positioned absolutely. The keypad seeds from the current
 * field value and writes evaluated results straight back through `onChange`.
 */
export function CalculatorButton({
  value,
  onChange,
  className,
  ariaLabel,
  labels: labelsProp,
}: CalculatorButtonProps) {
  // prop > provider > English, with the older `ariaLabel` prop folded in as the
  // `open` key it has always been.
  const fromProps = useMemo(
    () => (ariaLabel === undefined ? labelsProp : { ...labelsProp, open: ariaLabel }),
    [ariaLabel, labelsProp],
  );
  const labels = useKitLabels("calculator", DEFAULT_CALCULATOR_LABELS, fromProps);
  return (
    <Popover
      width={224}
      labels={{ panel: labels.panel }}
      trigger={({ open, toggle, ref }) => (
        <button
          ref={ref}
          type="button"
          tabIndex={-1}
          onClick={toggle}
          aria-label={labels.open}
          aria-expanded={open}
          className={cn(
            "flex items-center justify-center text-[var(--text-placeholder)] transition-colors hover:text-[var(--text-secondary)]",
            className,
          )}
        >
          <CalculatorIcon className="size-4" />
        </button>
      )}
    >
      {() => <CalculatorPanel initial={value} onChange={onChange} labels={labels} />}
    </Popover>
  );
}
