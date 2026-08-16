import { cn } from "../lib/cn";

interface ToggleOption<T extends string> {
  value: T;
  label: string;
  className?: string;
}

interface ToggleGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
  className?: string;
  /** Applied to every option button (e.g. to tune height/rounding to match
   *  adjacent fields). Per-option `className` still wins over this. */
  optionClassName?: string;
  ariaLabel?: string;
}

export function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
  className,
  optionClassName,
  ariaLabel,
}: ToggleGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full rounded-md border border-slate-300 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              // `truncate` (which carries whitespace-nowrap) rather than letting a
              // label wrap: a segmented control sizes its whole row to the tallest
              // option, so one two-word option — Keksdose feedback #147's "Where I
              // am" — silently doubles the height of every segment beside it.
              //
              // `basis-auto` is what keeps that ellipsis a LAST resort rather than
              // the normal state (Keksdose dev#475). With flex-1's `basis-0`, a
              // shrink-to-fit group (`w-auto`) still resolves to the sum of the
              // labels' widths — and then splits it EQUALLY, so the short option
              // got 66px it did not need and "Where I am" got 66 of the 81 it did:
              // truncated at 1778px of free screen. Basing each segment on its own
              // content and sharing only the LEFTOVER space keeps a full-width
              // group's segments near-equal and an auto-width group's exact.
              "min-w-0 flex-1 basis-auto truncate rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300",
              active
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              optionClassName,
              opt.className,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
