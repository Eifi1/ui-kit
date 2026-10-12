// The field both date pickers draw: the trigger, the popover or phone sheet it opens,
// the clear button — and the props, label hook and trigger format the two share.
// Moved out of date-picker.tsx as it was (MOD-9, refactor audit 2026-10); date-picker
// still exports the one public name here, `DateTriggerAttributes`.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref, RefObject } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "../lib/cn";
import { dirOf, type Direction } from "../lib/direction";
import { formatIsoDate } from "../lib/dates";
import {
  DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_PICKER_SHEET_LABELS,
  useKitDateFormatter,
  useKitLabels,
  type DatePickerLabels,
  type KitDateFormatContext,
} from "../i18n/kit-labels";
import { splitTriggerAria } from "./trigger-aria";
import type { TriggerAria } from "./trigger-aria";
import { FIELD_TRIGGER, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import { assignRef, FieldLabelLine, LABEL_ABOVE_BOX } from "./field-parts";
import { FullBleedDialog } from "./full-bleed-dialog";
import type { RemLength } from "../hooks/use-breakpoint";
import type { MiniCalendarProps } from "./mini-calendar";
import { Popover } from "./popover";

/**
 * What both pickers share — and, through `ComponentPropsWithoutRef<"div">`, everything a
 * `<div>` takes, so a `data-tour` anchor, a test id or an `aria-describedby` reaches the
 * field's root element instead of being dropped (audit §api-design).
 *
 * `onChange` is omitted from those attributes: the DOM event of that name carries a
 * `FormEvent`, while both pickers answer with ISO date strings. Each declares its own
 * (date-picker.tsx, date-range-picker.tsx).
 */
export interface DatePickerBaseProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
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
  /**
   * The TRIGGER — the focusable button that opens the calendar, a `renderTrigger` one
   * too — as a React 19 ref prop (0.34, API-3, refactor audit 2026-10). The field took
   * none, so react-hook-form's focus-on-error reached it only through /rhf's id lookup,
   * and an app not at all. Not the wrapper, which takes the rest of the props.
   */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The trigger's date renderer, in the kit's order of precedence: the picker's own
 * `formatValue`, then its `formatOptions` (an explicit `Intl` look for this field),
 * then the provider's `formatDate` (keksdose K12), then the locale's short date. A
 * provider formatter that answers `""` falls through to the default for that date.
 */
export function useTriggerFormat(
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
    // No prop and no provider leaves `locale` undefined: the runtime's default (DUP-11).
    return formatIsoDate(iso, locale, formatOptions);
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
 * The trigger's value wraps instead of truncating at Large and Extra large (0.32.1, the
 * 360 px Extra-large sweep; docs/text-size-harmonization.md §4 "nothing truncates"). A
 * range ("01/09/2026 – 30/09/2026") is 312 px at 150 %, and on a 360 px phone it read
 * "01/09/2026 – 30/…" — its end, the half a reader needs, was the half cut off. A
 * `large:` class, so Normal keeps its one-line field: since 0.33 (§10.17) the kit's one
 * `truncate-until-large` (tokens.css) in place of this file's own `truncate` +
 * `large:whitespace-normal large:break-words`.
 */
const VALUE_TRUNCATE = "truncate-until-large";

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
  fieldRef,
}: {
  /** The caller's naming/description attributes, routed here from the field. */
  aria: TriggerAria;
  /** Draw the button yourself, with these attributes — see {@link DateTriggerAttributes}. */
  renderTrigger?: TriggerRenderer;
  open: boolean;
  toggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** The picker's own `ref` prop (API-3) — the same element as `triggerRef`. */
  fieldRef?: Ref<HTMLButtonElement>;
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
  // The caller's `ref` (API-3, refactor audit 2026-10) is handed the trigger once it is
  // mounted, rather than merged into `attrs.ref`: that one is a `RefObject` by contract
  // (`DateTriggerAttributes`), which a `renderTrigger` button may read, and this way a
  // caller's own trigger is covered as well as the kit's.
  useLayoutEffect(() => {
    if (!fieldRef) return;
    assignRef(fieldRef, triggerRef.current);
    return () => assignRef(fieldRef, null);
  }, [fieldRef, triggerRef]);

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
      <span id={valueId} className={cn(VALUE_TRUNCATE, !hasValue && "text-placeholder")}>
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
export type PanelFrame = (body: ReactNode, actions?: ReactNode) => ReactNode;

const popoverFrame: PanelFrame = (body, actions) =>
  actions ? (
    <div className="flex flex-col gap-2">
      {body}
      <div className="flex items-center justify-end gap-2 border-t border-subtle pt-2">{actions}</div>
    </div>
  ) : (
    body
  );

/** A field-styled trigger that opens a portalled MiniCalendar. Shared by the
 *  single- and range-date pickers (date-picker.tsx, date-range-picker.tsx). */
export function DateField({
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
  fieldRef,
  ...rest
}: Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** The picker's `ref` prop: the trigger (API-3). */
  fieldRef?: Ref<HTMLButtonElement>;
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
  /** Popover panel width; omit for the default (a bare calendar). In rem so it grows
   *  with the text size, like the Popover's own default (§3.2). */
  width?: number | RemLength;
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
      fieldRef={fieldRef}
    />
  );
  return (
    // The caller's attributes land here, on the field's own box — the trigger inside is
    // named by `aria-labelledby` and must keep the id pair it is given.
    // At Large a labelled box is a grid: the label above, the calendar glyph and the
    // clear × measured against the trigger's row (LABEL_ABOVE_BOX, 0.33 §10.17).
    <div {...wrapperRest} ref={rootRef} className={cn("relative", label !== undefined && LABEL_ABOVE_BOX, className)}>
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
          className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-placeholder hover:text-secondary"
        >
          <X className="size-4" />
        </button>
      ) : (
        <Calendar
          aria-hidden
          className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-placeholder"
        />
      )}
    </div>
  );
}

/**
 * The picker's own label props, folded into one `datePicker` override so they sit at
 * the top of the same precedence chain as everything else: prop > provider > English.
 * They predate the provider and stay public API, which is why they are not simply
 * replaced by a `labels` prop.
 */
export function useDatePickerLabels(
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
export function withEndHint(field: ReactNode, hint: ReactNode): ReactNode {
  if (hint === undefined) return field;
  return (
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">{field}</div>
      <span className="flex shrink-0 items-center">{hint}</span>
    </div>
  );
}
