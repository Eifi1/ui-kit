import { Delete } from "lucide-react";
import { cn } from "../lib/cn";

// The operator chars the calc grammar understands (`+ - * /` and parens); shown
// with the nicer math glyphs but inserting the ASCII the evaluator parses.
const MATH_KEYS: { label: string; ch: string }[] = [
  { label: "+", ch: "+" },
  { label: "−", ch: "-" },
  { label: "×", ch: "*" },
  { label: "÷", ch: "/" },
  { label: "(", ch: "(" },
  { label: ")", ch: ")" },
];

/**
 * A compact operator bar for numeric fields on mobile (feedback #334): phone
 * keypads expose digits + a decimal but rarely `+ × ÷`, so this sits under the
 * focused field and inserts operators for simple equations (evaluated on blur).
 * Buttons use pointerDown + preventDefault so tapping them does NOT blur the
 * input — the native number keypad stays open between taps.
 */
export function MathKeys({
  onInsert,
  onBackspace,
  className,
}: {
  onInsert: (ch: string) => void;
  onBackspace: () => void;
  className?: string;
}) {
  const keyClass =
    "flex-1 rounded-md border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:active:bg-slate-800";
  return (
    <div className={cn("flex gap-1", className)}>
      {MATH_KEYS.map((k) => (
        <button
          key={k.ch}
          type="button"
          tabIndex={-1}
          aria-label={k.label}
          onPointerDown={(e) => {
            e.preventDefault();
            onInsert(k.ch);
          }}
          className={keyClass}
        >
          {k.label}
        </button>
      ))}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Backspace"
        onPointerDown={(e) => {
          e.preventDefault();
          onBackspace();
        }}
        className={cn(keyClass, "flex max-w-12 items-center justify-center")}
      >
        <Delete className="size-4" />
      </button>
    </div>
  );
}
