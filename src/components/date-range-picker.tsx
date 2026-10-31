// The two-date range picker: presets beside the calendar, `apply` drafts, a custom
// trigger. Moved out of date-picker.tsx as it was (MOD-9, refactor audit
// 2026-10); date-picker still exports every public name here.
import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLocale, type DatePickerLabels } from "../i18n/kit-labels";
import { Button } from "./button";
import { FieldBox, LockedReason, useFieldMessages, useLockReason } from "./field-parts";
import type { CommitScope } from "./write-lock";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import {
  DateField,
  useDatePickerLabels,
  useTriggerFormat,
  withEndHint,
  type DatePickerBaseProps,
  type DateTriggerAttributes,
  type PanelFrame,
} from "./date-field";
import { PanelCalendar, type PanelCalendarProps } from "./jump-calendar";

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
 * The 0.x values of DateRangePicker's `commit`, when it was the panel's mode:
 * `"immediate"` is `apply` left out, `"apply"` is `apply`. See
 * {@link DateRangePickerProps.apply}.
 *
 * @deprecated 0.52 — DateRangePicker's `apply` (`commit="apply"` → `apply`, `"immediate"`
 * → nothing); removed in 0.53. `commit` is the write lock's opt-in on every other kit
 * control, and since 0.52 on this one too (refactor audit 2026-10-30, API-3).
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
  /** Optional named ranges rendered as a start-side column (last month / YTD / …).
   *  `readonly` since 0.52 (API-7): the picker never changes the list. */
  presets?: readonly DateRangePickerPreset[];
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
  /**
   * When the picker hands its range to `onChange`.
   *
   *  - Left out (the default, and all of 0.7): a preset click commits and closes, and
   *    each calendar click is reported as it happens — the half-made `(from, "")`
   *    included. The right shape for quick ranges on a filter, where one click is one
   *    answer.
   *  - `apply`: the panel works on a DRAFT. A preset ARMS the calendar instead of
   *    committing, days can then be nudged ("last 3 months, but end it last Friday"),
   *    and nothing reaches `onChange` until Apply — which stays disabled until both ends
   *    exist. Cancel, Escape and an outside click discard the draft, and every open
   *    starts again from the committed value. keksdose's report range asked for exactly
   *    this: each commit there re-runs a whole page of charts, so an intermediate state
   *    must never escape the panel.
   *
   * `commit="apply"` until 0.52 (refactor audit 2026-10-30, API-3): `commit` is the write
   * lock's prop on every other kit control. The old spelling still works for 0.52 and
   * goes in 0.53 ({@link DateRangeCommit}); `apply` wins where both are given.
   */
  apply?: boolean;
  /**
   * This picker COMMITS — picking a range saves it (a report's period kept per user, a
   * filter persisted as it moves). Under a locked {@link WriteLockProvider} it is locked
   * the `disabledReason` way, with the lock's reason; a {@link CommitScope}, as on every
   * kit control since 0.33, and on this one since 0.52 (API-3). A range inside a form with
   * its own Save stays editable under the lock — leave this off there.
   *
   * The strings `"immediate"` and `"apply"` are the panel's mode, the 0.x meaning of this
   * prop: deprecated, read as `apply` for one minor, removed in 0.53 — see
   * {@link DateRangeCommit}. They cannot be taken for a scope, which is a boolean or an
   * object.
   */
  commit?: CommitScope | DateRangeCommit;
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
   * With `apply`: a line above the calendar saying what Apply would commit —
   * keksdose's report range writes "Custom · 1 Mar 2026 – …" there
   * (report-range-field.tsx), the one place a preset armed and then nudged by a day is
   * seen to have become "Custom", and a half-made range to still lack its end. Called
   * with the DRAFT on every change, in the popover and the phone sheet alike; `preset`
   * is the preset the column marks for it (none once a day was picked by hand), `to` is
   * `""` until the second click. The line is a polite live region, so a screen reader
   * hears the draft change as the calendar is used.
   *
   * Ignored without `apply`, where there is no draft: every click is the value.
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
      className={sheet ? "grid grid-cols-2 gap-0.5" : "flex w-32 shrink-0 flex-col gap-0.5 border-e border-subtle pe-2"}
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
              selected ? "bg-active font-medium text-primary" : "text-secondary hover:bg-hover",
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
 * The panel's body. A component of its own so `apply` can keep its draft in state that
 * is born when the panel opens: `Popover` unmounts its children on close,
 * so the draft is re-seeded from the committed value on every open, and an abandoned
 * half-selection cannot survive into the next one.
 */
function RangePanel({
  from,
  to,
  presets,
  activeId,
  controlled,
  drafting,
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
  /** `apply`: the panel works on a draft. */
  drafting: boolean;
  close: () => void;
  /** Where the body and the Apply row go — see `PanelFrame`. */
  frame: PanelFrame;
  sheet: boolean;
  commitRange: (from: string, to: string, presetId: string | undefined) => void;
  calendarProps: Pick<PanelCalendarProps, "locale" | "min" | "max" | "labels" | "monthJump">;
  labels: DatePickerLabels;
  renderDraftSummary?: DateRangePickerProps["renderDraftSummary"];
}) {
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
          <div aria-live="polite" data-draft-summary="" className="text-xs text-muted">
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
 *  With `presets`, a column of named ranges is shown beside the calendar; with `apply`
 *  the panel drafts and commits on Apply (see {@link DateRangePickerProps.apply}). */
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
    apply,
    commit,
    renderTrigger,
    sheetBackCloses,
    renderDraftSummary,
    calendarLabels,
    monthJump,
    label,
    clearable,
    clearLabel,
    disabled,
    disabledReason,
    disabledReasonDisplay,
    invalid,
    hint,
    help,
    error,
    className,
    // The trigger's (API-3).
    ref,
    ...rest
  } = props;
  const locale = useKitLocale(localeProp);
  const text = useDatePickerLabels(clearLabel, undefined, undefined);
  const render = useTriggerFormat("dateRangePicker", locale, formatOptions, formatValue);
  // `commit` is two props until 0.53: a string is the deprecated mode, anything else
  // the write lock's scope (API-3).
  const drafting = apply ?? commit === "apply";
  const lock = useLockReason(typeof commit === "string" ? undefined : commit, disabledReason);
  const locked = lock.locked;
  const messages = useFieldMessages({
    hint,
    help,
    name: label ?? rest["aria-label"],
    error,
    invalid,
    describedBy: rest["aria-describedby"],
    ariaInvalid: rest["aria-invalid"],
    // A lock's reason between the caption and the error, as on Select.
    reasonId: locked && lock.reasonId,
  });
  // The preset this picker committed itself, for a caller that does not control
  // `preset`. Cleared by a hand-picked range or a clear.
  const [ownPreset, setOwnPreset] = useState<string | undefined>(undefined);
  const controlled = preset !== undefined;
  const activeId = controlled ? preset : ownPreset;
  const a = from ? render(from) : "";
  const b = to ? render(to) : "";
  const triggerText = from ? (to ? `${a}${separator}${b}` : `${a}${separator}…`) : (placeholder ?? "");
  const hasPresets = Boolean(presets && presets.length > 0);
  const sheet = usePhoneLayout();
  const commitRange = (f: string, t: string, presetId: string | undefined) => {
    if (locked) return;
    setOwnPreset(presetId);
    // Two arguments when no preset is involved — exactly the 0.7 call, so a caller's
    // `toHaveBeenCalledWith(from, to)` and a variadic handler see no difference.
    if (presetId === undefined) onChange(f, t);
    else onChange(f, t, presetId);
  };
  const field = (
    <DateField
      {...rest}
      fieldRef={ref}
      aria-describedby={messages.describedBy}
      label={label}
      labelHint={messages.labelHint}
      clearable={clearable}
      clearLabel={text.clear}
      panelLabel={text.rangePanel}
      disabled={disabled}
      locked={locked}
      // Locked, the caller's classes are the reason's frame's (below).
      className={locked ? undefined : className}
      invalid={messages.isInvalid}
      // Widen so the preset column sits beside the calendar (default otherwise).
      width={hasPresets ? "27.5rem" : undefined}
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
          drafting={drafting}
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
  const box = withEndHint(field, label === undefined ? messages.labelHint : undefined);
  return (
    <FieldBox below={messages.below} reserve={"error" in props || "hint" in props}>
      {locked ? (
        // DatePicker's frame: the line under the field, or the Tooltip with a hidden copy
        // for `aria-describedby`; the outermost box, so it takes the caller's classes.
        <LockedReason lock={lock} display={disabledReasonDisplay} className={cn("block", className)}>
          {box}
        </LockedReason>
      ) : (
        box
      )}
    </FieldBox>
  );
}
