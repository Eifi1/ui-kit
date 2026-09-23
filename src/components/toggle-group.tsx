import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  className?: string;
}

/**
 * `onChange` is the group's own — the chosen VALUE, not a DOM event — so the div's
 * `onChange` is omitted rather than shadowed: leaving both in scope would give the
 * prop two incompatible meanings depending on which overload TypeScript picked.
 *
 * `children` is omitted too: this renders its `options` and nothing else, so a `children` the type
 * accepted and the component ignored would be a prop that silently does nothing —
 * worse than one that does not compile.
 */
export interface ToggleGroupProps<T extends string>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "children"> {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
  className?: string;
  /** Applied to every option button (e.g. to tune height/rounding to match
   *  adjacent fields). Per-option `className` still wins over this. */
  optionClassName?: string;
  /**
   * @deprecated Pass `aria-label` instead — the DOM spelling, which every other
   * control in this kit now answers to. Kept working because three applications ship
   * this one today; it names the group only when `aria-label` is absent.
   */
  ariaLabel?: string;
  /**
   * Show, refuse the change (Keksdose live #288: a payment dated in the future has no
   * state to set).
   *
   * Whatever `value` says stays pressed and keeps its own fill rather than going grey
   * with the rest — a reader who cannot see WHICH option is chosen has been told less
   * than before it was disabled. A caller with nothing to show passes no value, and
   * the group renders dimmed with nothing pressed, which is the shape Keksdose's
   * status picker uses for a row whose status does not exist yet.
   *
   * On the whole GROUP, not per option: a segmented control where some segments are
   * live and others are not is a menu with holes in it, and no caller here wants one.
   */
  disabled?: boolean;
}

export function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
  className,
  optionClassName,
  ariaLabel,
  disabled = false,
  "aria-label": ariaLabelAttr,
  ...rest
}: ToggleGroupProps<T>) {
  return (
    <div
      // The audit's named example of a closed prop list (§"Public API design"): the
      // tour locates a step by CSS SELECTOR, so a component that drops every attribute
      // it was not expecting cannot be spotlighted at all — and Keksdose's rule editor
      // carries a comment explaining that it wraps this group in a bare <div> for
      // exactly that reason.
      //
      // `...rest` first, then the attributes the group cannot do without: a caller
      // hanging an anchor or a test id on the group must not be able to overwrite the
      // radiogroup role or the disabled state by accident. `className` is destructured
      // out entirely and merged through `cn`, so it is never in here.
      {...rest}
      role="radiogroup"
      // The DOM spelling wins; `ariaLabel` is the fallback for the call sites that
      // have not moved yet.
      aria-label={ariaLabelAttr ?? ariaLabel}
      // `aria-disabled` on the group as well as `disabled` on each button: a radio
      // group is what the user is being refused, and a screen reader announcing
      // three separately-disabled radios does not say that.
      aria-disabled={disabled || undefined}
      className={cn(
        // `gap-0.5` — the same 2px as the container's own padding, so EVERY segment
        // sits in a uniform 2px moat and no two fills ever touch. Flush segments were
        // Keksdose live #268's rework: the pressed segment wears a saturated fill and
        // an unpressed neighbour wears a pale hover fill, and with a shared edge the
        // two rectangles read as one smeared shape — *"the boundary of the selected
        // option and hovering next to it overlays the boundary of the selected
        // button"*. A gap is what makes each segment its own chip; it cannot be
        // undone by a caller's per-option colour, which a hover-only fix could.
        //
        // (The hover fill is the DESKTOP half of that report: Tailwind v4 wraps every
        // `hover:` in `@media (hover: hover)`, so a phone never paints it. The half a
        // phone does see is the focus ring — see the segment's own note below.)
        "inline-flex w-full gap-0.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] p-0.5 shadow-sm",
        // The whole group fades, the way every other disabled control in this
        // package does; `cursor-not-allowed` is on the buttons, which is what a
        // pointer is actually over.
        disabled && "opacity-60",
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
            disabled={disabled}
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
              //
              // `focus-visible` + `ring-inset`, not `focus` + an outset ring. A ring
              // is a box-shadow that spreads OUTWARD, so on a flush group it painted
              // 2px of ring over both neighbours and over the container's own border
              // — and on a phone it appeared on every TAP, because a tap focuses the
              // button. That is the other half of what live #268's rework saw
              // overlaying the selected segment's boundary. Inset keeps the ring
              // inside the segment it belongs to; focus-visible keeps it for the
              // keyboard, which is the only input that needs it.
              "min-w-0 flex-1 basis-auto truncate rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-strong)]",
              active
                ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
              // No hover fill on a group that cannot be changed — a segment that
              // lights up under the pointer is an offer, and there is none here.
              disabled && "cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent",
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
