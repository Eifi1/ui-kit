import { createPortal } from "react-dom";
import { Delete } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useEscapeKey } from "../hooks/use-dismiss";
import { evaluateExpression, formatResult, sanitizeLive } from "../lib/calc";
import {
  DEFAULT_CALCULATOR_LABELS,
  useKitLabels,
  type CalculatorLabels,
} from "../i18n/kit-labels";

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
/** Names for the pad itself and its four non-digit keys. The first four are
 *  screen-reader names; `done` is the one string here that is READ OFF THE SCREEN —
 *  the brand-filled primary button — and it was a hardcoded English literal while
 *  its three neighbours each took an override, so a German phone showed "Done"
 *  among German labels with no prop able to change it. */
export interface NumberPadSheetLabels extends Partial<CalculatorLabels> {
  /** The pad's own name — the `calculator.panel` key under its older name here. */
  pad?: string;
  backspace?: string;
  clear?: string;
  equals?: string;
  /** Visible text on the primary key, not an `aria-label`. */
  done?: string;
}

type PadKey =
  | { kind: "ins"; label: string; ins: string; accent?: boolean; name?: PadKeyName }
  | { kind: "back" };

/** The {@link CalculatorLabels} key naming a non-digit key; digits are their glyph. */
type PadKeyName = "plus" | "minus" | "times" | "divide" | "decimal";

// Insert chars that survive `sanitizeLive` (it keeps `× ÷` and ASCII `+ - * /`
// but strips the unicode minus `−`, so minus inserts an ASCII "-" while showing
// the nicer glyph). The evaluator normalises `× ÷` back to `* /`.
const PAD_KEYS: PadKey[] = [
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
  { kind: "ins", label: "−", ins: "-", accent: true, name: "minus" },
  { kind: "ins", label: ".", ins: ".", name: "decimal" },
  { kind: "ins", label: "0", ins: "0" },
  { kind: "back" },
  { kind: "ins", label: "+", ins: "+", accent: true, name: "plus" },
];

/** Every key's shape — including the thing this pad used to delete without replacing.
 *
 *  `focus:outline-none` alone is not a style choice, it is the removal of the only
 *  signal a keyboard user has; on a 4×4 grid of identical tiles it leaves no way at all
 *  to tell which key Enter is about to press (the audit's §a11y, and the same defect as
 *  the dropdown search box).
 *
 *  `focus-visible` and `ring-inset`, for the two reasons {@link ToggleGroup} already
 *  writes down. This is a touch control first, and a plain `focus:` ring paints itself
 *  on every TAP, because a tap focuses the button. And the keys sit 6px apart, which is
 *  thinner than an outward ring plus the neighbour it would spill onto — inset keeps the
 *  ring inside the key it describes.
 *
 *  --brand rather than --border-strong: the operator keys are filled with --border, and
 *  a ring in the colour of the thing it surrounds is not an indicator. */
const PAD_BTN =
  "flex h-14 items-center justify-center rounded-lg text-lg font-medium transition-transform select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)] active:scale-[0.97]";
const PAD_DIGIT = "bg-[var(--bg-surface-2)] text-[var(--text-primary)] active:bg-[var(--border)]";
const PAD_ACCENT = "bg-[var(--border)] text-[var(--text-primary)] active:bg-[var(--bg-surface-2)]";

export function NumberPadSheet({
  value,
  onChange,
  onDone,
  label,
  labels,
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
  /** Names for the pad itself and its non-digit keys — screen-reader names, except
   * `done`, which is the visible text on the primary key. Merged over `calculator`
   * from `<UiKitProvider labels>`: this is the same keypad as `CalculatorButton`'s,
   * on a phone, and one translation covers both. Digits need no name — their glyph
   * IS the name; the operators do (see {@link CalculatorLabels.plus}). */
  labels?: NumberPadSheetLabels;
}) {
  // `pad` is this sheet's older spelling of `panel`, so it is folded in as that.
  const fromProps = useMemo(() => {
    if (!labels) return undefined;
    const { pad, ...rest } = labels;
    return pad === undefined ? rest : { ...rest, panel: pad };
  }, [labels]);
  const text = useKitLabels("calculator", DEFAULT_CALCULATOR_LABELS, fromProps);

  // NO `useBodyScrollLock`, and that is the point of the control (Keksdose live
  // #317: *"Background not scrollable when the amount input calculator field is
  // open"*).
  //
  // This sheet is a KEYBOARD, not a dialog. It is opened by focusing a field and
  // exists only because a PWA cannot swap the system keyboard for its own — so it
  // suppresses the OS keyboard with `inputMode="none"` and paints itself in the
  // freed space. An OS keyboard does not freeze the page behind it; it takes the
  // bottom of the screen and leaves you free to scroll what is left, which is how
  // you reach the field you are typing into when the keys cover it.
  //
  // Locking here made the page unreachable at exactly the moment it matters most:
  // correcting a receipt total against the running line sum, where the figure you
  // are comparing against sits below the keypad. The other four holders of that
  // hook are all modal — `Modal`, `PickerSheet`, `FullBleedDialog`, the DataTable
  // row dialog — and they stay locked, because for them the page behind is not
  // part of the task.
  //
  // The pad still does not scroll ITSELF away under a stray drag: the root's
  // `onPointerDown` preventDefault (below) keeps the host input focused and eats
  // the gesture on the sheet, so a touch that starts on a key is not a page scroll.

  // ── NO focus trap either, and for a harder reason than the scroll lock ────────
  //
  // Wave 3 put `useFocusTrap` on every overlay in this package. This one is the
  // exception, and it is not an oversight to be tidied up later: a trap here would
  // DELETE THE COMPONENT IT WAS PROTECTING. Both hosts render the pad with
  // `showNumpad = isMobile && !disabled && focused`, where `focused` is the host
  // input's own focus state. Moving focus into the pad blurs that input, the host
  // sets `focused` false, and the pad unmounts — on mount, before a single key can be
  // pressed. The blur also COMMITS, so the trap would evaluate a half-typed
  // expression on the way out.
  //
  // That is the contract, not an accident of it. This sheet exists because a PWA
  // cannot swap the system keyboard for its own: the host keeps real focus, caret and
  // selection while `inputMode="none"` suppresses the OS keys, and the root's
  // `onPointerDown` preventDefault below is there for the same reason. The pad is
  // `role="group"`, not a dialog. A keyboard does not trap focus; it is what you type
  // WITH.
  //
  // What was genuinely missing is a way OUT that is not a tap. `useEscapeKey` and not
  // a handler on the sheet, because the sheet never has the focus a keydown would
  // bubble from — the host does, and the host is not this component. Escape does what
  // the Done key does rather than cancelling, because committing on blur is the
  // host's contract and a cancel would have to be the host's to offer.
  //
  // The limit, since it is better written down than discovered: inside a `Modal` the
  // dialog's own Escape handler sits on the focus path and stops the event before a
  // document listener sees it, so there the press closes the dialog — which it did
  // before this line existed too, and which takes the pad with it either way.
  useEscapeKey(onDone);

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
      aria-label={text.panel}
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
              aria-label={text.backspace}
              onClick={backspace}
              className={cn(PAD_BTN, PAD_ACCENT)}
            >
              <Delete className="size-5" />
            </button>
          ) : (
            <button
              key={`${key.ins}-${i}`}
              type="button"
              aria-label={key.name ? text[key.name] : key.label}
              onClick={() => insert(key.ins)}
              className={cn(PAD_BTN, key.accent ? PAD_ACCENT : PAD_DIGIT)}
            >
              {key.label}
            </button>
          ),
        )}
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        <button type="button" aria-label={text.clear} onClick={clearAll} className={cn(PAD_BTN, PAD_ACCENT)}>
          C
        </button>
        <button type="button" aria-label={text.equals} onClick={equals} className={cn(PAD_BTN, PAD_ACCENT)}>
          =
        </button>
        <button
          type="button"
          onClick={onDone}
          // The one key whose own fill is --brand, so it rings in the colour that fill
          // was chosen to be legible against instead (tailwind-merge keeps the later
          // ring colour). A --brand ring here would be present in the DOM and invisible
          // on screen, which is the defect this change exists to fix.
          className={cn(
            PAD_BTN,
            "col-span-2 bg-[var(--brand)] text-[var(--brand-contrast)] focus-visible:ring-[var(--brand-contrast)] active:bg-[var(--brand-hover)]",
          )}
        >
          {text.done}
        </button>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
