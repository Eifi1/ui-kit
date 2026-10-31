import type { ComponentType, ReactNode } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { addDaysIso } from "../lib/dates";
import { useKitLocale } from "../i18n/kit-labels";
import { splitTriggerAria } from "./trigger-aria";
import { FIELD_BASE } from "./field-base";
import { FieldBox, LockedReason, useFieldMessages, useLockReason } from "./field-parts";
import { Tooltip } from "./tooltip";
import type { CommitScope } from "./write-lock";
import { DateField, useDatePickerLabels, useTriggerFormat, withEndHint, type DatePickerBaseProps } from "./date-field";
import { PanelCalendar } from "./jump-calendar";
// The shared field, the month-jump calendar and the range picker live in date-field.tsx,
// jump-calendar.tsx and date-range-picker.tsx (MOD-9); their public names are still this
// module's, so the barrel exports them as before.
export type { DateTriggerAttributes } from "./date-field";
export { DateRangePicker } from "./date-range-picker";
export type {
  DateRangeCommit,
  DateRangeDraftSummary,
  DateRangePickerPreset,
  DateRangePickerProps,
  DateRangeTriggerRenderProps,
} from "./date-range-picker";

/**
 * The ‹ date › (today) row on a phone at Large and Extra large (0.32.1, the 360 px
 * Extra-large sweep; docs/text-size-harmonization.md §4): the field takes the first line
 * on its own, whole and with all four corners, and the buttons share the line under it
 * as one joined strip. Three 2.5rem buttons are 180 px at 150 %, and on a 360 px phone
 * they left the field 84 px — "Book… 0" for "Booking date 07/09/2026" — where a 360 px
 * row would hold the date only by cutting it. `large:max-sm:`, the scaled phone width,
 * so a tablet or a desktop at Large keeps the one row, and Normal is unchanged.
 */
const STEP_ROW_STACK_AT_LARGE = cn(
  "large:max-sm:flex-wrap large:max-sm:gap-y-2",
  "large:max-sm:[&>[data-slot=date-step-field]]:order-first large:max-sm:[&>[data-slot=date-step-field]]:basis-full",
  "large:max-sm:[&>[data-slot=date-step-field]]:ms-0 large:max-sm:[&_[role=combobox]]:rounded-md",
  // The buttons (each in its tooltip's wrapper) share the line under the field.
  "large:max-sm:[&>span]:flex-1 large:max-sm:[&>span>button]:w-full",
);

// The focused part of the ‹ date › (today) row framed 2px wide, not 1 (keksdose live
// #394, fourth round; kk K5). The row raises the focused part over the neighbour it
// overlaps (`[&>*:focus-within]:z-20`), so all four of its sides are its own brand
// border — but at a fractional device-pixel ratio a 1px line covers 1.25 device pixels
// (at 125 %), and on whichever sides fall across a pixel boundary it is spread over two
// pixels at partial strength: ‹'s left side and the date field's right read grey beside
// the crisp ones (dark theme, measured: 82,87,146 against 139,147,248).
//
// A 1px INSET ring in the focus colour beside the 1px border doubles the line inward, so
// every side keeps at least one fully covered device pixel at any scale — FIELD_INVALID's
// border-plus-ring, for the same reason (live #295). A box-shadow, and inset: nothing
// outside the part moves or is covered. `focus`, not `focus-visible`, as the row's
// raise: a tap focuses too.
//
// 0.34 drew it here, on the parts — `focus:ring-1 focus:ring-inset` on each step and
// `[&_[role=combobox]:focus]:…` from the row — and the K5 follow-up then moved that very
// ring into FIELD_BASE for every field (keksdose run 78). Each part of this row is
// FIELD_BASE, the steps directly and the trigger through FIELD_TRIGGER, so the copies went
// (round 0.34 Wave 2). Not on every button in the row: keksdose's local fix
// (`[&_button:focus]:ring-1 [&_button:focus]:ring-inset` on the row) also reached the
// label's "?" and thinned its 2px focus frame to 1.

/**
 * One ‹ / › day-step (or today) button, sized to sit flush beside the field.
 *
 * Two kinds of "cannot" (refactor audit 2026-10-30, INP-4). `off` is natively `disabled`,
 * out of the tab order: the field is `disabled`, or empty with nothing to step from — no
 * press of these buttons gets there, so the focus is never on one as it turns. `refused`
 * is `aria-disabled` with a click that does nothing, JumpCalendar's rule: › pressed onto
 * `max`, ‹ onto `min` and Today onto today are refused by the very press the focus is on,
 * and a focused button that turns `disabled` drops the focus to <body>, mid-form
 * (keksdose's shared date field passes `step` and `today` in 14 files). A lock refuses
 * too, and the lock's reason describes the button.
 */
function StepButton({
  icon: Icon,
  label,
  off,
  refused,
  reasonId,
  onClick,
  mirror,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  off: boolean;
  refused: boolean;
  /** While locked: the id of the lock's reason, which the row's frame shows. */
  reasonId?: string;
  onClick: () => void;
  /** Flip the icon in RTL — for the ‹ › day steps, whose "previous" points to the
   *  reading start. Not for the today icon, which has no direction. */
  mirror?: boolean;
  /** The button's corners in the joined group (see DatePicker). */
  className?: string;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={off}
      aria-disabled={(!off && refused) || undefined}
      aria-describedby={reasonId}
      onClick={() => {
        if (!refused) onClick();
      }}
      className={cn(
        FIELD_BASE,
        // FIELD_BASE is `block w-full` for text inputs; a step button is neither, and
        // px-3 would make it wider than it needs to be. twMerge lets these win.
        "relative flex h-full w-10 shrink-0 items-center justify-center px-0 text-muted",
        "hover:bg-hover hover:text-secondary",
        // Dimmed ICON, not a dimmed box: at 40% opacity the whole button — border
        // included — faded out of the group and read as a broken, detached control. The
        // same look for the focusable kind (INP-4).
        "disabled:cursor-not-allowed disabled:text-placeholder disabled:opacity-60 disabled:hover:bg-surface",
        "aria-disabled:cursor-not-allowed aria-disabled:text-placeholder aria-disabled:opacity-60 aria-disabled:hover:bg-surface",
        // A part of a joined row: FIELD_BASE's 2px focus line, whole at 125 % (K5, the
        // note above this function).
        className,
      )}
    >
      <Icon className={cn("size-4", mirror && "rtl:-scale-x-100")} />
    </button>
  );
  // Locked, the row's frame holds the reason's bubble; a name bubble of its own as well
  // would be two on one hover (IconButton drops its own the same way). The wrapper stays
  // — STEP_ROW_STACK_AT_LARGE lays the buttons out by it.
  if (reasonId) return <span className="relative inline-flex">{button}</span>;
  return (
    <Tooltip label={label} portal>
      {button}
    </Tooltip>
  );
}

export interface DatePickerProps extends DatePickerBaseProps {
  /** ISO "YYYY-MM-DD", or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
  /**
   * Flank the field with ‹ › buttons that move the value one day. For fields whose
   * typical edit is a day or two — opening a calendar to go "yesterday" is three
   * interactions for what should be one. A button whose day is outside `min` / `max` is
   * refused (`aria-disabled`, still focusable — 0.52); with no value both are disabled.
   *
   * Off by default: on a filter or a far-away date the buttons are dead weight, and
   * they cost ~5rem of width that a narrow layout may not have.
   */
  step?: boolean;
  /** Accessible names for the step buttons. Optional: they resolve from
   *  `datePicker.previousDay` / `nextDay` in `<UiKitProvider labels>`, then from the
   *  English defaults. This prop wins over both, for the one field that says it
   *  differently. */
  stepLabels?: { prev: string; next: string };
  /**
   * Today's date as ISO "YYYY-MM-DD". Adds a jump-to-today button beside the field,
   * refused once the value already is that day — `aria-disabled`, so the focus stays on
   * the button that was just pressed (0.52).
   *
   * Passed in rather than read from a clock here: a component that decides what "today"
   * is cannot be tested at a fixed date, and the consumer already has one definition of
   * it. The button is always RENDERED — going flat instead of disappearing — because a
   * control that comes and goes with the value reflows whatever sits beside it, which
   * is the report this exists to answer.
   */
  today?: string;
  /** Accessible name for the today button; wins over `datePicker.today`. */
  todayLabel?: string;
  /**
   * This picker COMMITS — picking a date saves it (a row's date edited in place, a
   * filter kept as it moves). Under a locked {@link WriteLockProvider} it is locked the
   * `disabledReason` way, with the lock's reason; a {@link CommitScope}, as on every kit
   * control. A date field inside a form with its own Save stays editable under the lock —
   * leave this off there, and put `commit` on the Save. 0.52 (refactor audit 2026-10-30,
   * API-3).
   */
  commit?: CommitScope;
}

/** Single-date picker: a field showing the formatted date, opening a calendar. */
export function DatePicker(props: DatePickerProps) {
  const {
    value,
    onChange,
    locale: localeProp,
    placeholder,
    min,
    max,
    formatOptions,
    formatValue,
    step,
    stepLabels,
    today,
    todayLabel,
    className,
    calendarLabels,
    monthJump,
    label,
    clearable,
    clearLabel,
    disabled,
    disabledReason,
    disabledReasonDisplay,
    commit,
    invalid,
    hint,
    help,
    error,
    // Named so it reaches the field (and so its trigger) when a step/today row is the
    // root and takes the rest of the caller's props.
    "aria-required": ariaRequired,
    // The trigger's, wherever the rest go (API-3).
    ref,
    ...rest
  } = props;
  const locale = useKitLocale(localeProp);
  const text = useDatePickerLabels(clearLabel, stepLabels, todayLabel);
  const render = useTriggerFormat("datePicker", locale, formatOptions, formatValue);
  // The write lock (API-3): Select's — the trigger stays reachable and says why.
  const lock = useLockReason(commit, disabledReason);
  const locked = lock.locked;
  const change = (iso: string) => {
    if (!locked) onChange(iso);
  };
  // keksdose K4: the caption and the error under the field, attached to the TRIGGER
  // (the element a screen reader is on) after any description of the caller's own; a
  // lock's reason between the two, as on Select.
  const messages = useFieldMessages({
    hint,
    help,
    name: label ?? rest["aria-label"],
    error,
    invalid,
    describedBy: rest["aria-describedby"],
    ariaInvalid: rest["aria-invalid"],
    reasonId: locked && lock.reasonId,
  });
  // With a step or a today button beside it the field is no longer the outermost
  // element — the flex row at the bottom is, and a caller's attributes belong on
  // whichever of the two is actually the root. Naming the shared props rather than
  // letting `...rest` carry them is what makes that choice possible.
  const wrapped = Boolean(step || today);
  const [triggerAria, wrapperRest] = splitTriggerAria(rest);
  const field = (
    <DateField
      // With step/today buttons the flex row is the root and takes the caller's props —
      // except the ones that name the field, which still belong on its trigger.
      {...(wrapped ? triggerAria : rest)}
      fieldRef={ref}
      aria-describedby={messages.describedBy}
      aria-required={ariaRequired}
      label={label}
      labelHint={messages.labelHint}
      clearable={clearable}
      clearLabel={text.clear}
      panelLabel={text.panel}
      disabled={disabled}
      locked={locked}
      invalid={messages.isInvalid}
      // In the row, the field fills what the buttons leave and the caller's classes are
      // the row's — with `today` alone too: dressed on `step` alone, a today-only row put
      // them on both (refactor audit 2026-10-30, INP-13). Locked, they are the frame's.
      className={wrapped ? "min-w-0 flex-1" : locked ? undefined : className}
      // Named for STEP_ROW_STACK_AT_LARGE; only in the row, so a caller's own
      // `data-slot` on a bare field is left alone.
      {...(wrapped ? { "data-slot": "date-step-field" } : {})}
      hasValue={Boolean(value)}
      triggerText={value ? render(value) : (placeholder ?? "")}
      onClear={() => change("")}
    >
      {(close) => (
        <PanelCalendar
          monthJump={monthJump}
          mode="single"
          focusOnOpen
          from={value}
          to={value}
          locale={locale}
          min={min}
          max={max}
          labels={calendarLabels}
          onSelect={(iso) => {
            change(iso);
            close();
          }}
        />
      )}
    </DateField>
  );
  // Passed at all — even as `undefined` — the field keeps its box; see FieldBox.
  const reserve = "error" in props || "hint" in props;
  const endHint = label === undefined ? messages.labelHint : undefined;
  // Locked, the field — or the whole row, whose buttons change the value too — sits in
  // the reason's frame (the line, or the Tooltip), which becomes the outermost box: the
  // caller's classes move onto it, as on Select, so a lock does not reflow the form.
  const withReason = (box: ReactNode) =>
    locked ? (
      <LockedReason lock={lock} display={disabledReasonDisplay} className={cn("block", className)}>
        {box}
      </LockedReason>
    ) : (
      box
    );
  if (!wrapped) {
    return (
      <FieldBox below={messages.below} reserve={reserve}>
        {withReason(withEndHint(field, endHint))}
      </FieldBox>
    );
  }

  // An empty field has nothing to step from, so both buttons are off until a date is
  // picked. Bounds are compared as strings: "YYYY-MM-DD" sorts chronologically.
  const target = (days: number) => (value ? addDaysIso(value, days) : "");
  const outOfBounds = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  // A lock's reason wins over `disabled`, as on Select: the buttons stay focusable then.
  const fieldOff = Boolean(disabled) && !locked;
  const reasonId = locked ? lock.reasonId : undefined;
  const row = (
    // ONE joined control, not three boxes in a row: the buttons and the field share
    // their borders (each piece overlaps the previous by a pixel) and only the outer
    // ends are rounded — the button-group shape, so ‹ date › reads as one field with
    // controls rather than a field with loose buttons parked beside it, which is what
    // the `gap-1` version looked like.
    //
    // items-stretch, not items-center: the buttons match the field's height, which
    // varies with whether it carries a floating label. The field's trigger is nested
    // inside DateField, so its inner corners are squared from here.
    <div
      {...wrapperRest}
      className={cn(
        "flex items-stretch [&>*:not(:first-child)]:-ms-px",
        step && "[&_[role=combobox]]:rounded-s-none",
        (step || today) && "[&_[role=combobox]]:rounded-e-none",
        // The PART that is focused, pressed or invalid is raised over the neighbour it
        // overlaps by a pixel, so its blue (or red) border shows on all four sides
        // (keksdose live #394). `:focus-within`, not `:focus-visible`: a tap focuses
        // without it, as does the sheet handing focus back, and the next part — later in
        // the DOM — painted its grey left edge over the tapped one's right. Raising the
        // whole part (each is `relative`) keeps the floating label and the icon above
        // the trigger, which raising the trigger alone covered. Hover raises nothing: it
        // changes no border, and would let a hovered › cover a focused field's edge.
        "[&>*:focus-within]:z-20 [&>*:active]:z-20 [&>*:has([aria-invalid=true])]:z-10",
        // …and its line is 2px, so no side of it reads half-strength at 125 % (live #394,
        // fourth round): FIELD_BASE's inset ring, which every part of the row carries.
        STEP_ROW_STACK_AT_LARGE,
        !locked && className,
      )}
    >
      {step && (
        <StepButton
          icon={ChevronLeft}
          mirror
          label={text.previousDay}
          off={fieldOff || !value}
          refused={locked || outOfBounds(target(-1))}
          reasonId={reasonId}
          onClick={() => change(target(-1))}
          className="rounded-e-none"
        />
      )}
      {field}
      {step && (
        <StepButton
          icon={ChevronRight}
          mirror
          label={text.nextDay}
          off={fieldOff || !value}
          refused={locked || outOfBounds(target(1))}
          reasonId={reasonId}
          onClick={() => change(target(1))}
          className={cn("rounded-s-none", today && "rounded-e-none")}
        />
      )}
      {today && (
        // Refused once the value is today: pressable as a no-op would keep the focus too
        // (INP-4), and this also says there is nothing to jump to.
        <StepButton
          icon={CalendarClock}
          label={text.today}
          off={fieldOff}
          refused={locked || value === today || outOfBounds(today)}
          reasonId={reasonId}
          onClick={() => change(today)}
          className="rounded-s-none"
        />
      )}
    </div>
  );
  // Under the whole row, not under the field between the buttons: the message is about
  // the date, and the steppers are part of how it is entered.
  return (
    <FieldBox below={messages.below} reserve={reserve}>
      {withReason(withEndHint(row, endHint))}
    </FieldBox>
  );
}
