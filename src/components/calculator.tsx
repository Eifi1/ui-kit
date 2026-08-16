import { useEffect, useRef, useState } from "react";
import { Calculator as CalculatorIcon, Delete } from "lucide-react";
import { Popover } from "./popover";
import { cn } from "../lib/cn";
import { evaluateExpression, formatResult, isBareAmount, splitLeadingSign } from "../lib/calc";

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
  ariaLabel?: string;
}

/** Keypad layout (4 columns). The final C/= row is rendered separately. */
type Key =
  | { kind: "ins"; label: string; ins: string; accent?: boolean }
  | { kind: "back" };

const KEYS: Key[] = [
  { kind: "ins", label: "7", ins: "7" },
  { kind: "ins", label: "8", ins: "8" },
  { kind: "ins", label: "9", ins: "9" },
  { kind: "ins", label: "÷", ins: "÷", accent: true },
  { kind: "ins", label: "4", ins: "4" },
  { kind: "ins", label: "5", ins: "5" },
  { kind: "ins", label: "6", ins: "6" },
  { kind: "ins", label: "×", ins: "×", accent: true },
  { kind: "ins", label: "1", ins: "1" },
  { kind: "ins", label: "2", ins: "2" },
  { kind: "ins", label: "3", ins: "3" },
  { kind: "ins", label: "−", ins: "−", accent: true },
  { kind: "ins", label: "0", ins: "0" },
  { kind: "ins", label: ".", ins: "." },
  { kind: "back" },
  { kind: "ins", label: "+", ins: "+", accent: true },
];

const KEY_BASE =
  "flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400";
const KEY_DIGIT =
  "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";
const KEY_ACCENT =
  "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600";

function seed(initial: string): string {
  const t = initial.trim();
  return t === "-" ? "" : t;
}

function CalculatorPanel({
  initial,
  onChange,
}: {
  initial: string;
  onChange: (value: string, expression?: string) => void;
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
        aria-label="Calculation"
        value={text}
        inputMode="decimal"
        onChange={(e) => apply(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            equals();
          }
        }}
        className="block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right font-mono text-sm text-slate-900 focus:border-slate-500 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
      />
      <div className="h-4 pr-1 text-right font-mono text-xs text-slate-400 dark:text-slate-500">
        {result !== null && formatResult(result) !== text.trim() ? `= ${formatResult(result)}` : ""}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.map((key, i) =>
          key.kind === "back" ? (
            <button
              key="back"
              type="button"
              aria-label="Backspace"
              onClick={() => apply(text.slice(0, -1))}
              className={cn(KEY_BASE, KEY_ACCENT)}
            >
              <Delete className="size-4" />
            </button>
          ) : (
            <button
              key={`${key.ins}-${i}`}
              type="button"
              onClick={() => apply(text + key.ins)}
              className={cn(KEY_BASE, key.accent ? KEY_ACCENT : KEY_DIGIT)}
            >
              {key.label}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={clearAll}
          className={cn(KEY_BASE, "col-span-2 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600")}
        >
          C
        </button>
        <button
          type="button"
          aria-label="Equals"
          onClick={equals}
          className={cn(
            KEY_BASE,
            "col-span-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
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
export function CalculatorButton({ value, onChange, className, ariaLabel = "Open calculator" }: CalculatorButtonProps) {
  return (
    <Popover
      width={224}
      trigger={({ open, toggle, ref }) => (
        <button
          ref={ref}
          type="button"
          tabIndex={-1}
          onClick={toggle}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            "flex items-center justify-center text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
            className,
          )}
        >
          <CalculatorIcon className="size-4" />
        </button>
      )}
    >
      {() => <CalculatorPanel initial={value} onChange={onChange} />}
    </Popover>
  );
}
