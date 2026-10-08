import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ComponentType, KeyboardEvent, ReactNode, RefObject } from "react";
import { Calendar, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../lib/cn";
import { dirOf, horizontalStep, type Direction } from "../lib/direction";
import { addDaysIso, monthKey, pad, parseIsoDate } from "../lib/dates";
import {
  DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_PICKER_SHEET_LABELS,
  useKitDateFormatter,
  useKitLabels,
  useKitLocale,
  type DatePickerLabels,
  type KitDateFormatContext,
} from "../i18n/kit-labels";
import { splitTriggerAria } from "./trigger-aria";
import type { TriggerAria } from "./trigger-aria";
import { Button, FIELD_BASE, FIELD_TRIGGER, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import { FieldBox, FieldLabelLine, useFieldMessages } from "./field-parts";
import { FullBleedDialog } from "./full-bleed-dialog";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { DEFAULT_MINI_CALENDAR_LABELS, MiniCalendar, type MiniCalendarProps } from "./mini-calendar";
import { DEFAULT_MONTH_PICKER_LABELS } from "./month-picker";
import { Popover } from "./popover";
import { Tooltip } from "./tooltip";

/**
 * What both pickers share — and, through `ComponentPropsWithoutRef<"div">`, everything a
 * `<div>` takes, so a `data-tour` anchor, a test id or an `aria-describedby` reaches the
 * field's root element instead of being dropped (audit §api-design).
 *
 * `onChange` is omitted from those attributes: the DOM event of that name carries a
 * `FormEvent`, while both pickers answer with ISO date strings. Each declares its own
 * below.
 */
interface DatePickerBaseProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /** BCP 47 tag for the trigger's date and the calendar. Falls back to
   *  `<UiKitProvider locale>`, then to the runtime's default. */
  locale?: string;
  /** Embedded top-boundary label, matching the native Input/Select fields. */
  label?: ReactNode;
  placeholder?: string;
  /** Inclusive ISO bounds for selectable days. */
  min?: string;
  max?: string;
  /** Show an X to clear the value (emits `""`). */
  clearable?: boolean;
  /** Accessible name of the clear button. Wins over `datePicker.clear` from
   *  `<UiKitProvider labels>`; kept as a prop because it predates the provider. */
  clearLabel?: string;
  disabled?: boolean;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /**
   * Standing advice for the field (keksdose K4, "uniform field anatomy"), as on a
   * {@link Select}: plain TEXT is a caption under the field, attached with
   * `aria-describedby`; a {@link FieldHint} rides the label line (or, unlabelled, sits
   * at the field's end, outside the box).
   */
  hint?: ReactNode;
  /**
   * What is wrong with the date, in the caller's words ("The due date is before the
   * invoice date") — {@link Input}'s `error` (keksdose K4: DateField errors had no slot).
   * Rendered under the field (under the whole row, with `step` / `today`), attached to
   * the trigger with `aria-describedby` — merged with any the caller passed, after the
   * caption — and implies `invalid`. Passing the key at all keeps the field's box while
   * there is no message, so the trigger is never remounted as one comes and goes.
   */
  error?: ReactNode;
  className?: string;
  /** Intl options for the trigger's formatted date (default: locale short date). Win
   *  over the provider's `formatDate`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Render the trigger's text for an ISO date yourself; wins over `formatOptions` and
   *  over the provider's `formatDate`.
   *  For a host whose date rendering is more than one `Intl` call can say — Keksdose
   *  puts the weekday's name in the UI language beside digits ordered by a separate
   *  format preference, two locales in one string. `locale` still drives the calendar.
   *  Set that rendering once with `<UiKitProvider formatDate>` (keksdose K12) and this
   *  is for the one field that differs. */
  formatValue?: (iso: string) => string;
  /** Passed through to the {@link MiniCalendar} this opens. Its month arrows are
   *  icon-only, so their `aria-label` is the only name they have — and the package
   *  ships English defaults, which a translating host has to be able to replace.
   *  Usually unnecessary now: the calendar reads `miniCalendar` from the provider. */
  calendarLabels?: MiniCalendarProps["labels"];
  /**
   * Make the panel's caption ("July 2026") a button that opens the year's twelve
   * months, with ‹ › stepping a year; picking a month returns to its days. Far dates
   * stop being a march of month arrows.
   *
   * kastlan is why: its service-charge period runs July to June, and with one month on
   * screen and ‹ › the only way across, the end of the period was eleven clicks past
   * the start — so kastlan kept two date fields instead of `RhfDateRangePicker`. With
   * the jump the whole period is open, caption, Jul, 1, caption, next year, Jun, 30.
   *
   * What it adds, for the keyboard and a screen reader:
   *  - the caption is a disclosure button (`aria-expanded`). Its name is the month it
   *    shows, so speech input can say what it sees; it is `aria-live`, as the
   *    calendar's caption was, so paging months still says where you landed; and it is
   *    described by `monthPicker.panel` ("Choose a month").
   *  - the month grid is `MonthPicker`'s grid: one tab stop, arrows walk the months
   *    (across the year's edge), Home/End the row, PageUp/PageDown a year, Enter or a
   *    click picks. Focus opens on the month on show and comes back on its days — the
   *    selected day if it is in that month, else the 1st. Months outside `min`/`max`
   *    are `aria-disabled`, and a year arrow is once the whole year beyond is.
   *  - Escape in the month grid goes back to the days without closing the panel (focus
   *    on the caption); in the days, Escape closes the panel as before.
   *
   * No new strings: the month arrows keep `miniCalendar.previousMonth` / `nextMonth`
   * (`calendarLabels`), and the month grid speaks with `MonthPicker`'s words —
   * `monthPicker.previousYear` / `nextYear` / `month` / `panel` — because it is that
   * grid, and a host that translated it once should not have to again.
   *
   * Off by default: the caption becomes one more stop in the panel's tab order, which a
   * 0.x minor does not spring on a form. Works in the popover and in
   * `DateRangePicker`'s phone sheet alike, beside presets and in `commit="apply"`
   * (a preset picked while the months are open goes back to the days, on its start).
   *
   * Why not a two-month panel (`months={2}`) instead, or beside it: for a twelve-month
   * period it still pages six times where this takes one year step, and two
   * `MiniCalendar`s side by side each follow the value on their own — picking the end
   * in the right-hand month would pull the left one onto it — so the calendar would
   * have to learn to share a month first. Not worth that for a saving of one arrow on a
   * range across a single month boundary.
   */
  monthJump?: boolean;
}

/** Format an ISO date for the trigger. `lib/dates`' `formatIsoDate` insists on a
 *  locale, and here there may be none — no prop and no provider — which `Intl` reads
 *  as "the runtime's default", as every other kit formatter does. */
function formatDate(iso: string, locale: string | undefined, options?: Intl.DateTimeFormatOptions) {
  return parseIsoDate(iso)?.toLocaleDateString(locale, options) ?? "";
}

/**
 * The trigger's date renderer, in the kit's order of precedence: the picker's own
 * `formatValue`, then its `formatOptions` (an explicit `Intl` look for this field),
 * then the provider's `formatDate` (keksdose K12), then the locale's short date. A
 * provider formatter that answers `""` falls through to the default for that date.
 */
function useTriggerFormat(
  source: KitDateFormatContext["source"],
  locale: string | undefined,
  formatOptions: Intl.DateTimeFormatOptions | undefined,
  formatValue: ((iso: string) => string) | undefined,
): (iso: string) => string {
  const fromProvider = useKitDateFormatter();
  if (formatValue) return formatValue;
  return (iso) => {
    if (formatOptions === undefined && fromProvider) {
      // A single date stands alone, where the weekday helps; a range's two ends do not.
      const text = fromProvider(iso, { unit: "day", source, locale, weekday: source === "datePicker" });
      if (text) return text;
    }
    return formatDate(iso, locale, formatOptions);
  };
}

/**
 * Everything the kit's own trigger button carries, handed to a custom one
 * ({@link DateRangePickerProps.renderTrigger}) to spread onto its `<button>`. Spread
 * it WHOLE: the ref is how focus comes back when the panel closes, the id pair and
 * `aria-labelledby` are the 0.5.1 naming (an external `<label htmlFor>`, a form
 * library's `aria-describedby`), and `role`/`aria-haspopup`/`aria-controls`/
 * `aria-expanded` are what tell a screen reader this opens a calendar and whether it
 * is open. `className` is the kit's field look (42px with a label, `pe-9` for the
 * glyph the field draws at its end) — merge yours after it with `cn`.
 */
export interface DateTriggerAttributes {
  ref: RefObject<HTMLButtonElement | null>;
  type: "button";
  id?: string;
  role: "combobox";
  "aria-haspopup": "dialog";
  "aria-controls": string;
  "aria-expanded": boolean;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  /** The field's required state — `Field required` hands it down with the id pair. */
  "aria-required"?: boolean | "true" | "false";
  disabled?: boolean;
  onClick: () => void;
  className: string;
}

/** A custom trigger, as `DateField` calls it; each picker adapts it to its own props. */
type TriggerRenderer = (attrs: DateTriggerAttributes, valueId: string) => ReactNode;

/** A caller's trigger, as an element of its own: the attributes carry the trigger's
 *  ref, and a ref is handed to a child as a prop, not passed to a function in the
 *  middle of the parent's render. */
function CustomTrigger({
  render,
  attrs,
  valueId,
}: {
  render: TriggerRenderer;
  attrs: DateTriggerAttributes;
  valueId: string;
}) {
  return render(attrs, valueId);
}

/**
 * The field-shaped button that opens the calendar.
 *
 * A component of its own rather than JSX inline in `Popover`'s `trigger` render prop,
 * because handing focus back to it is an effect and a render prop is not somewhere a
 * hook can go.
 */
function DateFieldTrigger({
  open,
  toggle,
  triggerRef,
  triggerText,
  hasValue,
  labelledBy,
  valueId,
  padded,
  disabled,
  invalid,
  required,
  panelId,
  aria,
  renderTrigger,
}: {
  /** The caller's naming/description attributes, routed here from the field. */
  aria: TriggerAria;
  /** Draw the button yourself, with these attributes — see {@link DateTriggerAttributes}. */
  renderTrigger?: TriggerRenderer;
  open: boolean;
  toggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** The panel's id — `role="combobox"` requires `aria-controls`. */
  panelId: string;
  triggerText: string;
  hasValue: boolean;
  /** ids of the hidden label twin + the value span, in the order they are spoken. */
  labelledBy?: string;
  valueId: string;
  padded: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** `aria-required`, on the trigger with the rest of the field's ARIA. */
  required?: boolean | "true" | "false";
}) {
  const wasOpen = useRef(false);
  useEffect(() => {
    const justClosed = wasOpen.current && !open;
    wasOpen.current = open;
    if (!justClosed) return;
    // Only when the panel still HAD focus. The day the user was standing on has just
    // been unmounted with the panel, which drops focus to <body> and leaves a
    // keyboard user back at the top of the document with no idea where they were.
    // But an outside click closes this panel too, and that click has already given
    // focus to whatever it landed on — dragging it back here would be worse than the
    // bug, so a focus that is somewhere real is left alone.
    const active = document.activeElement;
    if (!active || active === document.body) triggerRef.current?.focus();
    // Here rather than through `useFocusTrap`'s `restoreFocus`, and not only because
    // `Popover` runs no trap to carry it: that option restores to whatever held focus
    // when the panel opened, and on Safari — and on Firefox on macOS — clicking a
    // button does not focus it, so "whatever held focus" is the page. The requirement
    // is this trigger, every time, however the panel was opened.
  }, [open, triggerRef]);

  // One attribute object, worn either by the kit's own button below or by a caller's
  // (`renderTrigger`) — so a custom trigger cannot quietly fall out of step with the
  // naming and state this one announces.
  const isInvalid = Boolean(invalid) || aria["aria-invalid"] === true || aria["aria-invalid"] === "true";
  const attrs: DateTriggerAttributes = {
    ref: triggerRef,
    type: "button",
    disabled,
    onClick: toggle,
    // The name has to carry the VALUE. A bare `aria-label={label}` — which is what
    // this was — replaces the button's text outright, so the one field in the form
    // whose entire job is to show a date announced "Due date" and stopped there,
    // and a screen-reader user could not read back what they had picked without
    // opening the calendar and hunting for the selected day.
    //
    // Two ids rather than one composed string (`common.fieldValue`): "label: value"
    // is a sentence, and a name reference is spoken as the two texts in order with
    // no punctuation to translate at all. The hidden twin of the FieldLabel lives
    // in DateField, next to the label it copies.
    id: aria.id,
    "aria-labelledby": aria["aria-label"] && !aria["aria-labelledby"] ? undefined : labelledBy,
    "aria-label": aria["aria-label"],
    "aria-describedby": aria["aria-describedby"],
    // `role="combobox"` on a button that opens a calendar is the APG date-picker
    // shape, and it is what makes the next two lines legal: `button` supports
    // neither `aria-expanded` nor `aria-invalid`, so the previous markup set an
    // invalid state that announced nothing (ESLint's `role-supports-aria-props`).
    //
    // `aria-haspopup="dialog"` is now honest — it was not when this comment first
    // said so. `Popover` gained a real `role="dialog"` in the same wave, so the
    // trigger's promise and the panel's role finally agree. The phone sheet is a
    // `role="dialog"` too, and carries the same id.
    role: "combobox",
    "aria-haspopup": "dialog",
    "aria-controls": panelId,
    "aria-expanded": open,
    "aria-invalid": isInvalid || undefined,
    "aria-required": required,
    className: cn(
      FIELD_TRIGGER,
      "pe-9",
      padded && FIELD_FLOATING_PAD,
      disabled && "cursor-not-allowed opacity-50",
      // An `aria-invalid` from a Field spread paints too, as on Input and AmountInput.
      isInvalid && FIELD_INVALID,
    ),
  };
  if (renderTrigger) return <CustomTrigger render={renderTrigger} attrs={attrs} valueId={valueId} />;

  return (
    <button {...attrs}>
      <span id={valueId} className={cn("truncate", !hasValue && "text-[var(--text-placeholder)]")}>
        {/* `|| " "` (a NON-BREAKING space) — triggerText is "" when there is no value and no
            placeholder was passed. An empty span has no line box, so the
            trigger collapses to its padding and sits shorter than every
            other field beside it.

            It has to be a NON-BREAKING space. This read `|| " "` first, and
            that fix did nothing at all: an ordinary space is collapsible
            white space, and white space at the start and end of a line is
            removed — so the span rendered with height 0 and the trigger
            stayed 22px against the 42px of the fields either side of it
            (Keksdose live #294, measured in the browser: `span.textContent`
            WAS `" "` and `getBoundingClientRect().height` was 0). U+00A0 is
            not collapsible, so it holds the line. */}
        {triggerText || " "}
      </span>
    </button>
  );
}

/**
 * How a panel's body and its action row are put on screen — the popover stacks them,
 * the phone sheet pins the actions in its footer. Handed to the panel rather than
 * applied around it because the actions belong to the panel's own draft state
 * (`RangePanel`), while the frame they sit in belongs to the field.
 */
type PanelFrame = (body: ReactNode, actions?: ReactNode) => ReactNode;

const popoverFrame: PanelFrame = (body, actions) =>
  actions ? (
    <div className="flex flex-col gap-2">
      {body}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-2">{actions}</div>
    </div>
  ) : (
    body
  );

/** A field-styled trigger that opens a portalled MiniCalendar. Shared by the
 *  single- and range-date pickers below. */
function DateField({
  triggerText,
  hasValue,
  label,
  disabled,
  clearable,
  clearLabel,
  panelLabel,
  className,
  width,
  onClear,
  invalid,
  sheet = false,
  sheetBackCloses = true,
  renderTrigger,
  labelHint,
  children,
  // The trigger's, not the wrapper's: `Field`'s render-prop spreads it with the id
  // pair, and a required date read as optional while it sat on the role-less div.
  // Taken here rather than in `splitTriggerAria`, which MonthPicker shares.
  "aria-required": ariaRequired,
  ...rest
}: Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  triggerText: string;
  hasValue: boolean;
  label?: ReactNode;
  /** A `FieldHint` for the label line, beside the label. */
  labelHint?: ReactNode;
  disabled?: boolean;
  clearable?: boolean;
  /** Already resolved by the picker (prop > provider > English). */
  clearLabel: string;
  /** The popover panel's accessible name, resolved likewise. */
  panelLabel: string;
  invalid?: boolean;
  className?: string;
  /** Popover panel width; omit for the default (a bare calendar). */
  width?: number;
  onClear: () => void;
  /** Open as a full-screen sheet instead of the popover — the picker decides when
   *  (in the phone layout, `usePhoneLayout()`). */
  sheet?: boolean;
  /** The sheet's `FullBleedDialog backCloses`. */
  sheetBackCloses?: boolean;
  renderTrigger?: TriggerRenderer;
  children: (close: () => void, frame: PanelFrame) => ReactNode;
}) {
  const showClear = Boolean(clearable && hasValue && !disabled);
  const [aria, wrapperRest] = splitTriggerAria(rest);
  // The panel is portalled to <body> and leaves the subtree whose `dir` it inherited,
  // so a calendar in an RTL form opened LTR — the grid's columns, its arrow keys and
  // its chevrons all the wrong way round. Read at the moment of opening (the only way
  // the popover opens is through `toggle`) and put back on the panel.
  const rootRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState<Direction>("ltr");
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const panelId = `${id}-panel`;
  // Only a STRING label can be reused as a name; a ReactNode may be a whole row with
  // its own interactive "?" hint in it, and naming a button with that reads the hint
  // out as part of the field's name.
  const named = typeof label === "string";
  // The sheet's open flag. Only the phone branch owns one: on desktop `Popover` owns
  // it, so the two can never disagree about what is on screen.
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTriggerRef = useRef<HTMLButtonElement>(null);
  const closeSheet = () => setSheetOpen(false);
  const sheetLabels = useKitLabels("pickerSheet", DEFAULT_PICKER_SHEET_LABELS);
  const sheetFrame: PanelFrame = (body, actions) => (
    <FullBleedDialog
      open
      onClose={closeSheet}
      // The same id the popover panel wears, so the trigger's `aria-controls` holds in
      // both presentations; named the way the popover is.
      id={panelId}
      aria-label={panelLabel}
      header={panelLabel}
      // `pickerSheet.close`: the one "close this full-screen picker" string the kit
      // already translates, rather than a second key saying the same thing.
      closeLabel={sheetLabels.close}
      backCloses={sheetBackCloses}
      dir={dir}
      // Portalled to <body>, the sheet is not inside the field's wrapper, so a
      // document-level "outside click" listener — a Popover or dropdown this field
      // sits in — would read a tap on a day as outside and unmount the cell before
      // its click (Keksdose dev#477, the fix `PickerSheet` carries).
      onMouseDown={(e) => e.stopPropagation()}
      footer={actions}
    >
      {body}
    </FullBleedDialog>
  );
  const fieldTrigger = ({
    open,
    toggle,
    ref,
  }: {
    open: boolean;
    toggle: () => void;
    ref: RefObject<HTMLButtonElement | null>;
  }) => (
    <DateFieldTrigger
      open={open}
      toggle={() => {
        setDir(dirOf(rootRef.current));
        toggle();
      }}
      triggerRef={ref}
      triggerText={triggerText}
      hasValue={hasValue}
      // ALWAYS a name reference, never `undefined`. A `<button>` takes its
      // accessible name from its contents, so an unlabelled trigger used to
      // announce its own date text for free. `role="combobox"` does not —
      // content is excluded from name computation for that role — so leaving
      // this undefined made an unlabelled date field announce nothing at all.
      // Named: "label, value". Unnamed: the value alone, which is what the
      // button was saying before.
      //
      // A caller's own reference comes first. And when the caller gives the field
      // an `id` (so an external `<label htmlFor>` can point at it), the trigger
      // lists ITSELF first: a self-reference in `aria-labelledby` is resolved
      // from the element's native label (accname 2B → 2D), so "Due date" from
      // that <label> is spoken before the value, instead of being overridden.
      labelledBy={[
        aria["aria-labelledby"],
        named ? labelId : !aria["aria-labelledby"] && aria.id ? aria.id : undefined,
        valueId,
      ]
        .filter(Boolean)
        .join(" ")}
      aria={aria}
      panelId={panelId}
      valueId={valueId}
      padded={label !== undefined}
      disabled={disabled}
      invalid={invalid}
      required={ariaRequired}
      renderTrigger={renderTrigger}
    />
  );
  return (
    // The caller's attributes land here, on the field's own box — the trigger inside is
    // named by `aria-labelledby` and must keep the id pair it is given.
    <div {...wrapperRest} ref={rootRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabelLine label={label} hint={labelHint} />}
      {/* The visible FieldLabel is a plain span, not a `<label htmlFor>`, so it names
          nothing on its own — this hidden twin is what the trigger is named by.
          `aria-hidden` because a name reference reads a hidden element deliberately
          (accname §4.3.1), and without it the label would be announced twice: once as
          loose text before the button, once inside the button's own name.
          `sr-only-fixed` rather than `sr-only` — see the note on the class in
          tokens.css. */}
      {named && (
        <span id={labelId} aria-hidden className="sr-only-fixed">
          {label}
        </span>
      )}
      {sheet ? (
        <>
          {fieldTrigger({ open: sheetOpen, toggle: () => setSheetOpen((v) => !v), ref: sheetTriggerRef })}
          {/* Mounted only while open, like the popover's children: the panel's draft is
              born with it, so every open starts again from the committed value. */}
          {sheetOpen && children(closeSheet, sheetFrame)}
        </>
      ) : (
        <Popover
          width={width}
          panelId={panelId}
          // Named for what it is. Unnamed, it fell back to `popover.panel`, and a date
          // field announced its calendar as "Popover" — in English, in every language.
          labels={{ panel: panelLabel }}
          dir={dir}
          trigger={fieldTrigger}
        >
          {(close) => children(close, popoverFrame)}
        </Popover>
      )}
      {showClear ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={onClear}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
        >
          <X className="size-4" />
        </button>
      ) : (
        <Calendar
          aria-hidden
          className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-placeholder)]"
        />
      )}
    </div>
  );
}

/** One ‹ / › day-step button, sized to sit flush beside the field. */
function StepButton({
  icon: Icon,
  label,
  disabled,
  onClick,
  mirror,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  disabled: boolean;
  onClick: () => void;
  /** Flip the icon in RTL — for the ‹ › day steps, whose "previous" points to the
   *  reading start. Not for the today icon, which has no direction. */
  mirror?: boolean;
  /** The button's corners in the joined group (see DatePicker). */
  className?: string;
}) {
  return (
    <Tooltip label={label} portal>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          FIELD_BASE,
          // FIELD_BASE is `block w-full` for text inputs; a step button is neither, and
          // px-3 would make it wider than it needs to be. twMerge lets these win.
          "relative flex h-full w-10 shrink-0 items-center justify-center px-0 text-[var(--text-muted)]",
          "hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]",
          // Dimmed ICON, not a dimmed box: at 40% opacity the whole button — border
          // included — faded out of the group and read as a broken, detached control.
          "disabled:cursor-not-allowed disabled:text-[var(--text-placeholder)] disabled:opacity-60 disabled:hover:bg-[var(--bg-surface)]",
          className,
        )}
      >
        <Icon className={cn("size-4", mirror && "rtl:-scale-x-100")} />
      </button>
    </Tooltip>
  );
}

// ── Month jump (`monthJump`, kastlan) ─────────────────────────────────────

/** A "YYYY-MM" key as a count of months, and back: month arithmetic with no `Date`
 *  rollover to step around. */
const monthIndex = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
const keyOfIndex = (index: number) =>
  `${String(Math.floor(index / 12)).padStart(4, "0")}-${pad((index % 12) + 1)}`;
const shiftKey = (key: string, delta: number) => keyOfIndex(monthIndex(key) + delta);
/** The 1st of a "YYYY-MM" month, for `Intl` to name. */
const firstOfKey = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);

/** Upper-case the first letter only, as `MonthPicker` does: "julio de 2026" heads a
 *  panel as "Julio de 2026" — not "Julio De 2026", which CSS `capitalize` would write. */
const upperFirst = (text: string, locale: string | undefined) =>
  text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

/** Months per row of the month grid — `MonthPicker`'s 4×3. */
const MONTH_COLUMNS = 3;

/**
 * The month `MiniCalendar` opens on — the selection, or today, pulled inside the
 * bounds — worked out the way it does, so the caption drawn over a calendar that was
 * given no `month` names the month that calendar is showing.
 */
function openingMonth(from: string, to: string, lo: Date | null, hi: Date | null): string {
  const start = parseIsoDate(from) ?? parseIsoDate(to) ?? new Date();
  if (lo && start < lo) return monthKey(lo);
  if (hi && start > hi) return monthKey(hi);
  return monthKey(start);
}

type PanelCalendarProps = Pick<
  MiniCalendarProps,
  "mode" | "from" | "to" | "locale" | "min" | "max" | "labels" | "onSelect" | "focusOnOpen"
> & {
  /** See {@link DatePickerBaseProps.monthJump}. */
  monthJump?: boolean;
};

/** The panel's calendar: the plain {@link MiniCalendar}, exactly as before — or, with
 *  `monthJump`, the same calendar under a caption that opens a month grid. */
function PanelCalendar({ monthJump, ...calendar }: PanelCalendarProps) {
  return monthJump ? <JumpCalendar {...calendar} /> : <MiniCalendar {...calendar} />;
}

/** How the day grid is mounted: `key` remounts it, `month` is the month it follows
 *  (left out until the panel first moves, so it opens exactly where it always has), and
 *  `focus` is its `focusOnOpen`. */
interface DayGridMount {
  key: number;
  month?: string;
  focus: boolean;
}

/**
 * {@link MiniCalendar} with its navigation drawn here — ‹ caption › — so the caption can
 * be a button that swaps the days for a month grid ({@link DatePickerBaseProps.monthJump}).
 *
 * Built on the calendar's own `hideNavigation` / `month` / `onMonthChange`, not a fork
 * of it: the days, their keys, the range band and every announcement stay the
 * calendar's. What this keeps is `shown`, the month on screen, for the caption — fed by
 * the arrows here, by the calendar's `onMonthChange` (PageUp, arrowing off the edge),
 * and by the value, whose changes the calendar follows WITHOUT reporting them (a preset
 * in `commit="apply"` moves the grid to its start). That last one is mirrored below with
 * the calendar's own rule, and when it lands in another month the day grid is remounted
 * there rather than steered by `month`: a `month` that changes in the same render as the
 * value would win over the value's day, and the grid's tab stop would land on the
 * month's same-numbered day instead of the preset's start.
 *
 * The month grid is `MonthPicker`'s, redrawn here because that one is internal to its
 * file; same roles, keys and words (`monthPicker` labels).
 */
function JumpCalendar({
  from = "",
  to = "",
  mode = "range",
  locale,
  min,
  max,
  labels,
  onSelect,
  focusOnOpen,
}: Omit<PanelCalendarProps, "monthJump">) {
  // The month arrows say what they said when the calendar drew them; the month grid
  // says what `MonthPicker`'s says.
  const calendarText = useKitLabels("miniCalendar", DEFAULT_MINI_CALENDAR_LABELS, labels);
  const monthText = useKitLabels("monthPicker", DEFAULT_MONTH_PICKER_LABELS);
  const id = useId();
  const captionId = `${id}-caption`;
  const hintId = `${id}-hint`;
  const captionRef = useRef<HTMLButtonElement>(null);
  const monthsRef = useRef<HTMLDivElement>(null);

  const lo = min ? parseIsoDate(min) : null;
  const hi = max ? parseIsoDate(max) : null;
  const minKey = lo ? monthKey(lo) : null;
  const maxKey = hi ? monthKey(hi) : null;
  const outOfBounds = (key: string) => Boolean((minKey && key < minKey) || (maxKey && key > maxKey));
  const clampKey = (key: string) => (minKey && key < minKey ? minKey : maxKey && key > maxKey ? maxKey : key);

  const [view, setView] = useState<"days" | "months">("days");
  const [shown, setShown] = useState(() => openingMonth(from, to, lo, hi));
  const [dayGrid, setDayGrid] = useState<DayGridMount>(() => ({ key: 0, focus: Boolean(focusOnOpen) }));
  // The month holding the month grid's tab stop — and with it the year on show.
  const [active, setActive] = useState(shown);

  // The value moved from outside the day grid (a preset, a reset): follow the end that
  // changed, by the calendar's own rule, and remount the days there — see above. Also
  // what takes an open month grid back to the days when a preset is picked beside it.
  const [lastValue, setLastValue] = useState({ from, to });
  if (lastValue.from !== from || lastValue.to !== to) {
    const changed = lastValue.from !== from ? from : to;
    setLastValue({ from, to });
    const next = parseIsoDate(changed) ?? parseIsoDate(from) ?? parseIsoDate(to);
    const key = next ? monthKey(next) : null;
    if (key && (key !== shown || view === "months")) {
      setShown(key);
      setView("days");
      setDayGrid((d) => ({ key: d.key + 1, month: key, focus: false }));
    }
  }

  // A month cell that has to take focus once it exists: opening the grid, and arrowing
  // across a year's edge, which relabels the same twelve buttons.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    monthsRef.current?.querySelector<HTMLElement>(`[data-month="${key}"]`)?.focus();
  });

  const showMonth = (key: string) => {
    setShown(key);
    // Follows by `month`: the calendar keeps the day of the month (clamped), and the
    // focus stays on the arrow being pressed.
    setDayGrid((d) => ({ ...d, month: key }));
  };
  const openMonths = () => {
    const start = clampKey(shown);
    pendingFocus.current = start;
    setActive(start);
    setView("months");
  };
  const closeMonths = (focusCaption: boolean) => {
    setView("days");
    setDayGrid((d) => ({ ...d, month: shown, focus: false }));
    if (focusCaption) captionRef.current?.focus();
  };
  const pick = (key: string) => {
    setShown(key);
    setView("days");
    // Picked to go there: the focus goes with it, onto the days.
    setDayGrid((d) => ({ key: d.key + 1, month: key, focus: true }));
  };
  const moveActive = (key: string, focus: boolean) => {
    if (focus) pendingFocus.current = key;
    setActive(key);
  };

  const inDays = view === "days";
  // Escape in the month grid is "back", not "close": the month grid is a step INSIDE the
  // panel, and losing the half-made range to a key meant to undo that step would be the
  // worse surprise. Stopped here, so neither the popover nor the phone sheet sees it.
  const escapeToDays = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || inDays) return;
    e.preventDefault();
    e.stopPropagation();
    closeMonths(true);
  };

  const onMonthKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") return escapeToDays(e);
    // Left and right are visual: the grid runs the other way in a right-to-left panel.
    const step = horizontalStep(e.key, e.currentTarget);
    const col = (monthIndex(active) % 12) % MONTH_COLUMNS;
    let delta: number;
    switch (step ? "horizontal" : e.key) {
      case "horizontal":
        delta = step;
        break;
      case "ArrowUp":
        delta = -MONTH_COLUMNS;
        break;
      case "ArrowDown":
        delta = MONTH_COLUMNS;
        break;
      case "Home":
        delta = -col;
        break;
      case "End":
        delta = MONTH_COLUMNS - 1 - col;
        break;
      case "PageUp":
        delta = -12;
        break;
      case "PageDown":
        delta = 12;
        break;
      default:
        return;
    }
    // Before the no-op check: these keys also scroll the panel.
    e.preventDefault();
    if (delta !== 0) moveActive(shiftKey(active, delta), true);
  };

  const year = Number(active.slice(0, 4));
  // A year arrow is dead once every month of the year it leads to is out of bounds.
  const prevYearBlocked = Boolean(minKey && year - 1 < Number(minKey.slice(0, 4)));
  const nextYearBlocked = Boolean(maxKey && year + 1 > Number(maxKey.slice(0, 4)));
  const prevBlocked = !inDays && prevYearBlocked;
  const nextBlocked = !inDays && nextYearBlocked;

  const longName = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }), [locale]);
  const shortNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
    return Array.from({ length: 12 }, (_, i) => upperFirst(fmt.format(new Date(2000, i, 1)), locale));
  }, [locale]);
  const caption = inDays
    ? upperFirst(longName.format(firstOfKey(shown)), locale)
    : new Intl.DateTimeFormat(locale, { year: "numeric" }).format(new Date(year, 0, 1));

  // The selection, as months: both ends, and the months between (a range's band).
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  const fromKey = fromDate ? monthKey(fromDate) : null;
  const toKey = toDate ? monthKey(toDate) : null;
  const low = fromKey ?? toKey;
  const high = toKey ?? fromKey;
  const currentKey = monthKey(new Date());

  // Aria-disabled rather than disabled, like the day cells: a focused button that
  // turns `disabled` drops the focus to <body>, mid-panel.
  const arrow =
    "rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-transparent";

  return (
    <div className="select-none">
      {/* The calendar's own row, redrawn: the same arrows in the same places. Each
          button stays mounted across the two views and changes what it steps, so a
          press never pulls the element out from under the pointer or the focus. */}
      <div className="flex items-center justify-between gap-1 pb-1">
        <button
          type="button"
          aria-label={inDays ? calendarText.previousMonth : monthText.previousYear}
          aria-disabled={prevBlocked || undefined}
          onClick={() => {
            if (inDays) showMonth(shiftKey(shown, -1));
            else if (!prevBlocked) moveActive(shiftKey(active, -12), false);
          }}
          onKeyDown={escapeToDays}
          className={arrow}
        >
          {/* Mirrored in RTL: "previous" points to the reading START, which is right. */}
          <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        </button>
        <button
          ref={captionRef}
          type="button"
          aria-expanded={!inDays}
          aria-describedby={inDays ? hintId : undefined}
          onClick={inDays ? openMonths : () => closeMonths(false)}
          onKeyDown={escapeToDays}
          className="inline-flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          {/* The name is the text, so it says what is on screen; `aria-live` because
              pressing an arrow leaves focus ON the arrow, and this is the only thing
              that says where it went. It also names the month grid. */}
          <span id={captionId} aria-live="polite" className="truncate">
            {caption}
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-3.5 shrink-0 text-[var(--text-muted)]", !inDays && "rotate-180")}
          />
        </button>
        <button
          type="button"
          aria-label={inDays ? calendarText.nextMonth : monthText.nextYear}
          aria-disabled={nextBlocked || undefined}
          onClick={() => {
            if (inDays) showMonth(shiftKey(shown, 1));
            else if (!nextBlocked) moveActive(shiftKey(active, 12), false);
          }}
          onKeyDown={escapeToDays}
          className={arrow}
        >
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
      {/* The caption's description — read through the reference, never on its own. */}
      <span id={hintId} hidden>
        {monthText.panel}
      </span>
      {inDays ? (
        <MiniCalendar
          key={dayGrid.key}
          mode={mode}
          from={from}
          to={to}
          locale={locale}
          min={min}
          max={max}
          labels={labels}
          onSelect={onSelect}
          focusOnOpen={dayGrid.focus}
          hideNavigation
          month={dayGrid.month}
          onMonthChange={showMonth}
        />
      ) : (
        <div ref={monthsRef} role="grid" aria-labelledby={captionId} className="grid gap-1">
          {Array.from({ length: 12 / MONTH_COLUMNS }, (_, row) => (
            <div key={row} role="row" className="grid grid-cols-3 gap-1">
              {Array.from({ length: MONTH_COLUMNS }, (_, c) => {
                const index = row * MONTH_COLUMNS + c;
                const key = keyOfIndex(year * 12 + index);
                const disabled = outOfBounds(key);
                const selected = low !== null && high !== null && key >= low && key <= high;
                const end = key === fromKey || key === toKey;
                const current = key === currentKey;
                return (
                  <button
                    key={c}
                    type="button"
                    role="gridcell"
                    data-month={key}
                    tabIndex={key === active ? 0 : -1}
                    aria-label={monthText.month(longName.format(firstOfKey(key)))}
                    aria-selected={selected}
                    aria-disabled={disabled || undefined}
                    aria-current={current ? "date" : undefined}
                    onClick={() => {
                      // The guard `disabled` would have been: out-of-bounds months stay
                      // focusable, so the roving tab stop never falls into a hole.
                      if (!disabled) pick(key);
                    }}
                    onKeyDown={onMonthKeyDown}
                    className={cn(
                      // 44px rows: the touch-target size, and four of them stand as tall
                      // as a month of days, so the panel does not jump as the views swap.
                      "h-11 rounded px-1 text-sm tabular-nums transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                      // A --brand ring on a --brand fill exists only in the DOM.
                      end && !disabled ? "focus-visible:ring-[var(--brand-contrast)]" : "focus-visible:ring-[var(--brand)]",
                      disabled
                        ? "cursor-not-allowed text-[var(--text-placeholder)]"
                        : end
                          ? "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)]"
                          : selected
                            ? "bg-[var(--brand-bg)] font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-bg-hover)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                      current && !selected && !disabled && "ring-1 ring-inset ring-[var(--border-strong)]",
                    )}
                  >
                    {shortNames[index]}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface DatePickerProps extends DatePickerBaseProps {
  /** ISO "YYYY-MM-DD", or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
  /**
   * Flank the field with ‹ › buttons that move the value one day. For fields whose
   * typical edit is a day or two — opening a calendar to go "yesterday" is three
   * interactions for what should be one.
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
   * disabled once the value already is that day.
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
}

/**
 * The picker's own label props, folded into one `datePicker` override so they sit at
 * the top of the same precedence chain as everything else: prop > provider > English.
 * They predate the provider and stay public API, which is why they are not simply
 * replaced by a `labels` prop.
 */
function useDatePickerLabels(
  clearLabel: string | undefined,
  stepLabels: { prev: string; next: string } | undefined,
  todayLabel: string | undefined,
): DatePickerLabels {
  const prev = stepLabels?.prev;
  const next = stepLabels?.next;
  const fromProps = useMemo(() => {
    const out: Partial<DatePickerLabels> = {};
    if (clearLabel !== undefined) out.clear = clearLabel;
    if (prev !== undefined) out.previousDay = prev;
    if (next !== undefined) out.nextDay = next;
    if (todayLabel !== undefined) out.today = todayLabel;
    return out;
  }, [clearLabel, prev, next, todayLabel]);
  return useKitLabels("datePicker", DEFAULT_DATE_PICKER_LABELS, fromProps);
}

/**
 * The caller's `hint` when it has no label line to ride: at the end of the field,
 * outside the box, as an unlabelled {@link Select} places its FieldHint (0.15.5 P8).
 */
function withEndHint(field: ReactNode, hint: ReactNode): ReactNode {
  if (hint === undefined) return field;
  return (
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">{field}</div>
      <span className="flex shrink-0 items-center">{hint}</span>
    </div>
  );
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
    invalid,
    hint,
    error,
    // Named so it reaches the field (and so its trigger) when a step/today row is the
    // root and takes the rest of the caller's props.
    "aria-required": ariaRequired,
    ...rest
  } = props;
  const locale = useKitLocale(localeProp);
  const text = useDatePickerLabels(clearLabel, stepLabels, todayLabel);
  const render = useTriggerFormat("datePicker", locale, formatOptions, formatValue);
  // keksdose K4: the caption and the error under the field, attached to the TRIGGER
  // (the element a screen reader is on) after any description of the caller's own.
  const messages = useFieldMessages({
    hint,
    error,
    invalid,
    describedBy: rest["aria-describedby"],
    ariaInvalid: rest["aria-invalid"],
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
      aria-describedby={messages.describedBy}
      aria-required={ariaRequired}
      label={label}
      labelHint={messages.labelHint}
      clearable={clearable}
      clearLabel={text.clear}
      panelLabel={text.panel}
      disabled={disabled}
      invalid={messages.isInvalid}
      className={step ? "min-w-0 flex-1" : className}
      hasValue={Boolean(value)}
      triggerText={value ? render(value) : (placeholder ?? "")}
      onClear={() => onChange("")}
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
            onChange(iso);
            close();
          }}
        />
      )}
    </DateField>
  );
  // Passed at all — even as `undefined` — the field keeps its box; see FieldBox.
  const reserve = "error" in props || "hint" in props;
  const endHint = label === undefined ? messages.labelHint : undefined;
  if (!wrapped) {
    return (
      <FieldBox below={messages.below} reserve={reserve}>
        {withEndHint(field, endHint)}
      </FieldBox>
    );
  }

  // An empty field has nothing to step from, so both buttons are dead until a date
  // is picked. Bounds are compared as strings: "YYYY-MM-DD" sorts chronologically.
  const target = (days: number) => (value ? addDaysIso(value, days) : "");
  const outOfBounds = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  const blocked = (days: number) => {
    const next = target(days);
    if (!next || disabled) return true;
    return outOfBounds(next);
  };
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
        className,
      )}
    >
      {step && (
        <StepButton
          icon={ChevronLeft}
          mirror
          label={text.previousDay}
          disabled={blocked(-1)}
          onClick={() => onChange(target(-1))}
          className="rounded-e-none"
        />
      )}
      {field}
      {step && (
        <StepButton
          icon={ChevronRight}
          mirror
          label={text.nextDay}
          disabled={blocked(1)}
          onClick={() => onChange(target(1))}
          className={cn("rounded-s-none", today && "rounded-e-none")}
        />
      )}
      {today && (
        <StepButton
          icon={CalendarClock}
          label={text.today}
          disabled={Boolean(disabled) || value === today || outOfBounds(today)}
          onClick={() => onChange(today)}
          className="rounded-s-none"
        />
      )}
    </div>
  );
  // Under the whole row, not under the field between the buttons: the message is about
  // the date, and the steppers are part of how it is entered.
  return (
    <FieldBox below={messages.below} reserve={reserve}>
      {withEndHint(row, endHint)}
    </FieldBox>
  );
}

export interface DateRangePickerPreset {
  /**
   * The preset's identity, independent of its dates — `"last_3_months"`, not two ISO
   * strings. Optional for the 0.x callers that pass anonymous pairs.
   *
   * keksdose's report range field (report-range-field.tsx, "Why this is app-level")
   * is why it exists: its URL stores `?preset=last_3_months` and recomputes the dates
   * from today on every read, so a preset that is only its dates froze "last 3 months"
   * at whatever day the panel rendered, and two presets that happen to cover the same
   * days (this week and today, on a Monday) could not be told apart. With an `id` the
   * choice is reported to `onChange` and shown as selected for as long as the range
   * still matches it. Recompute `from`/`to` on every render (`calendarMonthPresets()`,
   * `dateRangePresets()`) and pass the key as the id.
   */
  id?: string;
  label: ReactNode;
  from: string;
  to: string;
}

/**
 * When the picker hands its range to `onChange`.
 *
 *  - `"immediate"` (the default, and all of 0.7): a preset click commits and closes,
 *    and each calendar click is reported as it happens — the half-made `(from, "")`
 *    included. The right shape for quick ranges on a filter, where one click is one
 *    answer.
 *  - `"apply"`: the panel works on a DRAFT. A preset ARMS the calendar instead of
 *    committing, days can then be nudged ("last 3 months, but end it last Friday"),
 *    and nothing reaches `onChange` until Apply — which stays disabled until both ends
 *    exist. Cancel, Escape and an outside click discard the draft, and every open
 *    starts again from the committed value. keksdose's report range asked for exactly
 *    this: each commit there re-runs a whole page of charts, so an intermediate state
 *    must never escape the panel.
 */
export type DateRangeCommit = "immediate" | "apply";

export interface DateRangePickerProps extends DatePickerBaseProps {
  from: string;
  to: string;
  /** The committed range. `presetId` is the chosen preset's `id` when a preset
   *  produced it (and the range was not nudged since), `undefined` for days picked by
   *  hand. A 0.x two-argument handler simply ignores it. */
  onChange: (from: string, to: string, presetId?: string) => void;
  /** Separator between the two formatted dates in the trigger (default " – "). */
  separator?: string;
  /** Optional named ranges rendered as a start-side column (last month / YTD / …). */
  presets?: DateRangePickerPreset[];
  /**
   * The active preset's `id`, controlled — e.g. straight from keksdose's `?preset=`.
   * `null` (or an id no preset has, such as `"custom"`) says "no preset": nothing in
   * the column is marked even if a preset happens to cover the same days. A preset is
   * marked only while its dates still equal `from`/`to`.
   *
   * Leave it `undefined` and the picker remembers the last preset it committed
   * itself; with no memory at all it falls back to the first preset whose dates match.
   */
  preset?: string | null;
  /** See {@link DateRangeCommit}. Default `"immediate"`. */
  commit?: DateRangeCommit;
  /**
   * Draw the trigger yourself. keksdose's report range field
   * (reports/report-range-field.tsx, "Why this is app-level") is why: its trigger
   * NAMES the active preset ("Last 3 months", the window as a muted suffix) where the
   * kit's shows two dates, sits inside a Tooltip, and is squared off on one side so the
   * granularity control can join it flush at the field's 42px.
   *
   * Spread `props.triggerProps` onto a `<button>` whole and put `props.valueProps` on
   * the element that shows the value — see {@link DateTriggerAttributes} for what each
   * part is for. The field around it (label, hidden name twin, clear/calendar glyph,
   * popover or phone sheet) is unchanged.
   */
  renderTrigger?: (props: DateRangeTriggerRenderProps) => ReactNode;
  /**
   * In the phone layout (`usePhoneLayout()`) the panel opens as a full-screen sheet (`FullBleedDialog`)
   * with presets in a grid above the calendar and Apply pinned in the footer, instead
   * of the 440px popover that hung off a 360px screen (keksdose's report range field,
   * which hand-rolled exactly this). This is its `backCloses`: on by default, so Back
   * dismisses the sheet; off for a caller whose commit rewrites the URL with
   * `replaceState` in the same tick — keksdose's `?preset/from/to` — where the router
   * would overwrite the sheet's history marker.
   */
  sheetBackCloses?: boolean;
  /**
   * With `commit="apply"`: a line above the calendar saying what Apply would commit —
   * keksdose's report range writes "Custom · 1 Mar 2026 – …" there
   * (report-range-field.tsx), the one place a preset armed and then nudged by a day is
   * seen to have become "Custom", and a half-made range to still lack its end. Called
   * with the DRAFT on every change, in the popover and the phone sheet alike; `preset`
   * is the preset the column marks for it (none once a day was picked by hand), `to` is
   * `""` until the second click. The line is a polite live region, so a screen reader
   * hears the draft change as the calendar is used.
   *
   * Ignored in `"immediate"` mode, where there is no draft: every click is the value.
   */
  renderDraftSummary?: (draft: DateRangeDraftSummary) => ReactNode;
}

/** What {@link DateRangePickerProps.renderDraftSummary} is called with. */
export interface DateRangeDraftSummary {
  from: string;
  to: string;
  /** The preset the column marks for the draft, if any. */
  preset: DateRangePickerPreset | undefined;
}

/** What {@link DateRangePickerProps.renderTrigger} is called with. */
export interface DateRangeTriggerRenderProps {
  /** Spread onto the `<button>`, whole. Merge your class after `triggerProps.className`. */
  triggerProps: DateTriggerAttributes;
  /** Put on the element showing the value: the trigger is named "label, value" by
   *  reference to this id. Without it the name is the label alone. */
  valueProps: { id: string };
  open: boolean;
  from: string;
  to: string;
  /** The preset the column marks for the committed range, if any — the one to name. */
  preset: DateRangePickerPreset | undefined;
  /** What the kit's own trigger would show: the formatted range, or the placeholder. */
  text: string;
}

interface RangeDraft {
  from: string;
  to: string;
  presetId: string | undefined;
}

/** Which preset (by index) the column marks, or -1. See `DateRangePickerProps.preset`. */
function markedPreset(
  presets: readonly DateRangePickerPreset[],
  from: string,
  to: string,
  activeId: string | null | undefined,
  controlled: boolean,
): number {
  const matches = (p: DateRangePickerPreset) => p.from === from && p.to === to;
  if (activeId != null) {
    const byId = presets.findIndex((p) => p.id === activeId && matches(p));
    if (byId !== -1 || controlled) return byId;
  } else if (controlled) {
    return -1;
  }
  return presets.findIndex(matches);
}

/**
 * The preset column: a named group of toggle buttons, `aria-pressed` on the marked one.
 * Pressed-state rather than colour alone, because "which range is this" is the one
 * thing a screen-reader user opening the panel needs to hear.
 */
function PresetColumn({
  presets,
  marked,
  label,
  onPick,
  sheet,
}: {
  presets: readonly DateRangePickerPreset[];
  marked: number;
  label: string;
  onPick: (p: DateRangePickerPreset) => void;
  /** The phone sheet's shape: a two-column grid ABOVE the calendar with 44px rows —
   *  a 128px column beside a month grid leaves the grid ~200px on a 360px screen. */
  sheet?: boolean;
}) {
  return (
    // `border-e`/`pe`, not `-r`: the preset column is on the START side, and the rule
    // between it and the calendar has to follow it in a right-to-left UI.
    <div
      role="group"
      aria-label={label}
      className={
        sheet
          ? "grid grid-cols-2 gap-0.5"
          : "flex w-32 shrink-0 flex-col gap-0.5 border-e border-[var(--border)] pe-2"
      }
    >
      {presets.map((p, i) => {
        const selected = i === marked;
        return (
          <button
            key={p.id ?? i}
            type="button"
            aria-pressed={selected}
            data-preset={p.id}
            onClick={() => onPick(p)}
            className={cn(
              "rounded px-2 text-start",
              // 44px on a phone: the kit's touch-target size (`SHEET_ROW_CLASS`).
              sheet ? "min-h-11 py-2 text-sm" : "py-1.5 text-xs",
              selected
                ? "bg-[var(--bg-active)] font-medium text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The panel's body. A component of its own so `commit="apply"` can keep its draft in
 * state that is born when the panel opens: `Popover` unmounts its children on close,
 * so the draft is re-seeded from the committed value on every open, and an abandoned
 * half-selection cannot survive into the next one.
 */
function RangePanel({
  from,
  to,
  presets,
  activeId,
  controlled,
  commit,
  close,
  frame,
  sheet,
  commitRange,
  calendarProps,
  labels,
  renderDraftSummary,
}: {
  from: string;
  to: string;
  presets: readonly DateRangePickerPreset[] | undefined;
  activeId: string | null | undefined;
  controlled: boolean;
  commit: DateRangeCommit;
  close: () => void;
  /** Where the body and the Apply row go — see `PanelFrame`. */
  frame: PanelFrame;
  sheet: boolean;
  commitRange: (from: string, to: string, presetId: string | undefined) => void;
  calendarProps: Pick<PanelCalendarProps, "locale" | "min" | "max" | "labels" | "monthJump">;
  labels: DatePickerLabels;
  renderDraftSummary?: DateRangePickerProps["renderDraftSummary"];
}) {
  const drafting = commit === "apply";
  const [draft, setDraft] = useState<RangeDraft>({
    from,
    to,
    presetId: activeId ?? undefined,
  });
  // What the panel SHOWS: the draft while drafting, the committed value otherwise.
  const shown = drafting ? draft : { from, to, presetId: activeId ?? undefined };
  const marked = presets
    ? markedPreset(presets, shown.from, shown.to, drafting ? draft.presetId : activeId, drafting || controlled)
    : -1;
  const complete = Boolean(draft.from && draft.to);

  const summary =
    drafting && renderDraftSummary
      ? renderDraftSummary({ from: draft.from, to: draft.to, preset: presets?.[marked] })
      : null;

  const picker = (
    <PanelCalendar
      {...calendarProps}
      focusOnOpen
      from={shown.from}
      to={shown.to}
      onSelect={(f, t) => {
        if (drafting) {
          setDraft({ from: f, to: t, presetId: undefined });
          return;
        }
        commitRange(f, t, undefined);
        // Two-click range: only dismiss once both ends are chosen.
        if (f && t) close();
      }}
    />
  );
  // The summary heads the CALENDAR's column, not the panel: beside a preset column it
  // reads as the calendar's caption, and in the sheet it sits between the presets and
  // the month it describes. `null` renders no line — a caller may opt out per draft —
  // but keeps the wrapper, so the calendar is not remounted (and its month and focus
  // lost) when a line comes or goes.
  const calendar =
    drafting && renderDraftSummary ? (
      <div className="flex flex-col gap-2">
        {summary != null && (
          <div aria-live="polite" data-draft-summary="" className="text-xs text-[var(--text-muted)]">
            {summary}
          </div>
        )}
        {picker}
      </div>
    ) : (
      picker
    );

  const body =
    presets && presets.length > 0 ? (
      <div className={sheet ? "flex flex-col gap-3" : "flex gap-3"}>
        <PresetColumn
          sheet={sheet}
          presets={presets}
          marked={marked}
          label={labels.presets}
          onPick={(p) => {
            if (drafting) {
              setDraft({ from: p.from, to: p.to, presetId: p.id });
              return;
            }
            commitRange(p.from, p.to, p.id);
            close();
          }}
        />
        {/* `flex-1`: the calendar takes the rest of the panel. Content-sized it was
            seven tiny cells beside a wide preset column. */}
        <div className="min-w-0 flex-1">{calendar}</div>
      </div>
    ) : (
      calendar
    );

  if (!drafting) return frame(body);
  return frame(
    body,
    <>
      {/* `flex-1` in the sheet: two thumb-wide halves of the footer, not two small
          buttons in its corner. */}
      <Button type="button" variant="ghost" className={sheet ? "flex-1" : undefined} onClick={close}>
        {labels.cancel}
      </Button>
      <Button
        type="button"
        className={sheet ? "flex-1" : undefined}
        // A half-made `(from, "")` would commit a window with no end — a blank
        // report, one click into a two-click gesture.
        disabled={!complete}
        onClick={() => {
          if (!complete) return;
          commitRange(draft.from, draft.to, draft.presetId);
          close();
        }}
      >
        {labels.apply}
      </Button>
    </>,
  );
}

/** Two-date range picker: click a start then an end; closes once both are set.
 *  With `presets`, a column of named ranges is shown beside the calendar; with
 *  `commit="apply"` the panel drafts and commits on Apply (see {@link DateRangeCommit}). */
export function DateRangePicker(props: DateRangePickerProps) {
  const {
    from,
    to,
    onChange,
    locale: localeProp,
    placeholder,
    min,
    max,
    formatOptions,
    formatValue,
    separator = " – ",
    presets,
    preset,
    commit = "immediate",
    renderTrigger,
    sheetBackCloses,
    renderDraftSummary,
    calendarLabels,
    monthJump,
    label,
    clearable,
    clearLabel,
    disabled,
    invalid,
    hint,
    error,
    ...rest
  } = props;
  const locale = useKitLocale(localeProp);
  const text = useDatePickerLabels(clearLabel, undefined, undefined);
  const render = useTriggerFormat("dateRangePicker", locale, formatOptions, formatValue);
  const messages = useFieldMessages({
    hint,
    error,
    invalid,
    describedBy: rest["aria-describedby"],
    ariaInvalid: rest["aria-invalid"],
  });
  // The preset this picker committed itself, for a caller that does not control
  // `preset`. Cleared by a hand-picked range or a clear.
  const [ownPreset, setOwnPreset] = useState<string | undefined>(undefined);
  const controlled = preset !== undefined;
  const activeId = controlled ? preset : ownPreset;
  const a = from ? render(from) : "";
  const b = to ? render(to) : "";
  const triggerText = from
    ? to
      ? `${a}${separator}${b}`
      : `${a}${separator}…`
    : (placeholder ?? "");
  const hasPresets = Boolean(presets && presets.length > 0);
  const sheet = usePhoneLayout();
  const commitRange = (f: string, t: string, presetId: string | undefined) => {
    setOwnPreset(presetId);
    // Two arguments when no preset is involved — exactly the 0.7 call, so a caller's
    // `toHaveBeenCalledWith(from, to)` and a variadic handler see no difference.
    if (presetId === undefined) onChange(f, t);
    else onChange(f, t, presetId);
  };
  const field = (
    <DateField
      {...rest}
      aria-describedby={messages.describedBy}
      label={label}
      labelHint={messages.labelHint}
      clearable={clearable}
      clearLabel={text.clear}
      panelLabel={text.rangePanel}
      disabled={disabled}
      invalid={messages.isInvalid}
      // Widen so the preset column sits beside the calendar (default otherwise).
      width={hasPresets ? 440 : undefined}
      hasValue={Boolean(from || to)}
      triggerText={triggerText}
      onClear={() => commitRange("", "", undefined)}
      sheet={sheet}
      sheetBackCloses={sheetBackCloses}
      renderTrigger={
        renderTrigger &&
        ((triggerProps, valueId) =>
          renderTrigger({
            triggerProps,
            valueProps: { id: valueId },
            open: triggerProps["aria-expanded"],
            from,
            to,
            preset: presets?.[markedPreset(presets, from, to, activeId, controlled)],
            text: triggerText,
          }))
      }
    >
      {(close, frame) => (
        <RangePanel
          from={from}
          to={to}
          presets={presets}
          activeId={activeId}
          controlled={controlled}
          commit={commit}
          close={close}
          frame={frame}
          sheet={sheet}
          commitRange={commitRange}
          calendarProps={{ locale, min, max, labels: calendarLabels, monthJump }}
          labels={text}
          renderDraftSummary={renderDraftSummary}
        />
      )}
    </DateField>
  );
  return (
    <FieldBox below={messages.below} reserve={"error" in props || "hint" in props}>
      {withEndHint(field, label === undefined ? messages.labelHint : undefined)}
    </FieldBox>
  );
}
