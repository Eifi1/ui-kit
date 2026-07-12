import { createPortal } from "react-dom";
import { Delete } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { evaluateExpression, formatResult, sanitizeLive } from "../lib/calc";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";

/**
 * A full calculator keypad rendered as a bottom sheet — the mobile counterpart to
 * the desktop {@link CalculatorButton} popover, and the replacement for the old
 * under-the-field operator bar (`MathKeys`, feedback #334).
 *
 * A native app (YNAB) can swap the system keyboard for its own keypad; a PWA
 * cannot — but it CAN suppress the OS keyboard with `inputMode="none"` on the
 * host field and paint its own keypad in the freed space. So the host input keeps
 * real focus/caret/selection + the existing value/commit contract, while this
 * sheet drives it: digits + operators + a live `= …` preview, evaluated through
 * the shared {@link evaluateExpression} engine. Desktop is untouched (it keeps the
 * native keyboard and the calculator popover); the host gates this to mobile.
 *
 * Buttons commit through the host's `onChange`/blur, so the sheet is stateless —
 * the field text is the single source of truth. `onPointerDown` preventDefault on
 * the root keeps the host input focused (caret stays, keyboard stays hidden) as
 * the user taps keys; the buttons' `onClick` still fires.
 */
type PadKey =
  | { kind: "ins"; label: string; ins: string; accent?: boolean }
  | { kind: "back" };

// Insert chars that survive `sanitizeLive` (it keeps `× ÷` and ASCII `+ - * /`
// but strips the unicode minus `−`, so minus inserts an ASCII "-" while showing
// the nicer glyph). The evaluator normalises `× ÷` back to `* /`.
const PAD_KEYS: PadKey[] = [
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
  { kind: "ins", label: "−", ins: "-", accent: true },
  { kind: "ins", label: ".", ins: "." },
  { kind: "ins", label: "0", ins: "0" },
  { kind: "back" },
  { kind: "ins", label: "+", ins: "+", accent: true },
];

const PAD_BTN =
  "flex h-14 items-center justify-center rounded-lg text-lg font-medium transition-transform select-none focus:outline-none active:scale-[0.97]";
const PAD_DIGIT = "bg-[var(--bg-surface-2)] text-[var(--text-primary)] active:bg-[var(--border)]";
const PAD_ACCENT = "bg-[var(--border)] text-[var(--text-primary)] active:bg-[var(--bg-surface-2)]";

export function NumberPadSheet({
  value,
  onChange,
  onDone,
  label,
}: {
  value: string;
  /** Fired with the raw (sanitised) field text on every key — same contract as
   * the host field's own `onChange`. */
  onChange: (value: string) => void;
  /** Fired on "Done": the host blurs the input, which commits (evaluates) and
   * unmounts the sheet via its existing blur handler. */
  onDone: () => void;
  /** Optional field label, echoed in the sheet header so the user still knows
   * which field they're editing when the sheet covers it. */
  label?: ReactNode;
}) {
  useBodyScrollLock(true);

  const result = evaluateExpression(value);
  const preview = result !== null && formatResult(result) !== value.trim() ? `= ${formatResult(result)}` : "";

  const insert = (ch: string) => onChange(sanitizeLive(value + ch));
  const backspace = () => onChange(value.slice(0, -1));
  const clearAll = () => onChange("");
  const equals = () => {
    if (result !== null) onChange(formatResult(result));
  };

  const sheet = (
    <div
      role="group"
      aria-label="Number pad"
      // Keep the host input focused when tapping the pad: preventDefault on
      // pointerdown blocks the focus/blur, while the buttons' click still fires.
      onPointerDown={(e) => e.preventDefault()}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--bg-surface)] px-2 pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Header display: which field + the running expression and live result, so
          the value stays visible even when the sheet covers the field. */}
      <div className="flex items-end justify-between gap-3 px-2 pb-2">
        {label != null && (
          <span className="truncate pb-1 text-xs font-medium text-[var(--money-neutral)]">{label}</span>
        )}
        <div className="ml-auto min-w-0 text-right">
          <div className="truncate font-mono text-lg leading-tight text-[var(--text-primary)]">{value || "0"}</div>
          <div className="h-4 font-mono text-xs text-[var(--money-neutral)]">{preview}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {PAD_KEYS.map((key, i) =>
          key.kind === "back" ? (
            <button
              key="back"
              type="button"
              aria-label="Backspace"
              onClick={backspace}
              className={cn(PAD_BTN, PAD_ACCENT)}
            >
              <Delete className="size-5" />
            </button>
          ) : (
            <button
              key={`${key.ins}-${i}`}
              type="button"
              aria-label={key.label}
              onClick={() => insert(key.ins)}
              className={cn(PAD_BTN, key.accent ? PAD_ACCENT : PAD_DIGIT)}
            >
              {key.label}
            </button>
          ),
        )}
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        <button type="button" aria-label="Clear" onClick={clearAll} className={cn(PAD_BTN, PAD_ACCENT)}>
          C
        </button>
        <button type="button" aria-label="Equals" onClick={equals} className={cn(PAD_BTN, PAD_ACCENT)}>
          =
        </button>
        <button
          type="button"
          onClick={onDone}
          className={cn(PAD_BTN, "col-span-2 bg-[var(--brand)] text-[var(--brand-contrast)] active:bg-[var(--brand-hover)]")}
        >
          Done
        </button>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
