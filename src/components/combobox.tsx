import { Fragment, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FieldLabel, FIELD_BASE, FIELD_FLOATING_PAD, PHONE_QUERY } from "./ui";
import { cn } from "../lib/cn";
import { useDropdown } from "./dropdown";
import { useMediaQuery } from "../hooks/use-media-query";
import { PickerSheet, SHEET_ROW_CLASS } from "./picker-sheet";
import type { ComboOption } from "./combobox-core";

// One look for both combobox flavors below — the suggestion list and its rows
// must stay pixel-identical between the free-text and the id-keyed variant.
const LIST_CLASS =
  "absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900";
const rowClass = (isActive: boolean) =>
  cn(
    "block w-full truncate px-3 py-1.5 text-left text-sm text-slate-900 dark:text-slate-100",
    isActive ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800",
  );

/**
 * Free-text combobox that looks like the shared {@link Select} (same FIELD_BASE
 * styling, chevron and static floating label) but lets the user type a value
 * that isn't in the list — e.g. naming a brand-new payee. Picking from the
 * filtered suggestion list fills the value; typing keeps whatever was entered.
 *
 * Use this instead of an `<Input list="…">` + `<datalist>` so the control is
 * visually and behaviourally consistent with the other dropdowns (feedback
 * #230 — the payee field looked/behaved differently from every other select).
 */
export function Combobox({
  value,
  onChange,
  options,
  label,
  id,
  placeholder,
  className,
  groupBy,
  maxSuggestions,
  searchPlaceholder,
  closeLabel,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Suggestion pool (e.g. existing payee names). */
  options: string[];
  label?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  /** Heading an option belongs under. Supplying it makes this list read exactly
   *  like {@link InlineEntityCombobox}'s — one heading per group with its rows
   *  indented beneath — instead of a flat list (feedback #136 rework: the payee
   *  field sat next to the newly-grouped category field and no longer matched).
   *  Omit for a plain list. */
  groupBy?: (option: string) => string;
  "aria-label"?: string;
  /** Rows to offer when the field is empty. 8 on a dropdown, where that is all
   *  that fits; the phone sheet asks for more because it has a screen. */
  maxSuggestions?: number;
  searchPlaceholder?: string;
  closeLabel?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const { open, setOpen, wrapperRef } = useDropdown();
  const [active, setActive] = useState(-1);
  // A phone opens the list as a full-screen sheet with its own input, the way a
  // native <select> does — live #200: "Paid as full screen dialog with input.
  // Similar to the account select that already appears as full screen." The
  // anchored list stays for pointer devices, where it is the better shape.
  const isPhone = useMediaQuery(PHONE_QUERY, false);
  const sheetInputRef = useRef<HTMLInputElement | null>(null);

  const query = value.trim().toLowerCase();
  const matches = useMemo(() => {
    const seen = new Set<string>();
    const uniq = options.filter((o) => o && !seen.has(o) && seen.add(o));
    let ranked: string[];
    const cap = maxSuggestions ?? (isPhone ? 50 : 8);
    if (!query) {
      ranked = uniq.slice(0, cap);
    } else {
      // Prefix matches first, then substring matches — most relevant on top.
      const starts = uniq.filter((o) => o.toLowerCase().startsWith(query));
      const contains = uniq.filter(
        (o) => !o.toLowerCase().startsWith(query) && o.toLowerCase().includes(query),
      );
      ranked = [...starts, ...contains].slice(0, cap);
    }
    if (!groupBy) return ranked;
    // Keep each group contiguous so a heading appears once instead of every time
    // the ranking interleaves two groups — while preserving "best match first":
    // a Map keeps insertion order, so groups come out ordered by their best-ranked
    // member and members keep their rank order inside the group.
    const byGroup = new Map<string, string[]>();
    for (const o of ranked) {
      const key = groupBy(o);
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(o);
    }
    return [...byGroup.values()].flat();
  }, [options, query, groupBy, maxSuggestions, isPhone]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      {/* The chevron centers against this inner wrapper, which hugs the input.
          The outer div can be taller than the input (as a grid item it
          stretches to the row height, e.g. next to the editor's category cell
          with its split button), which used to drag a top-1/2 chevron down to
          the input's bottom edge (feedback #248). */}
      <div className="relative">
        <input
          id={fieldId}
          value={value}
          placeholder={placeholder}
          // The visual label is a floating <span>, not a <label for>, so fall back to
          // it for the accessible name — otherwise the field announces only what is
          // typed in it (dev#477, applied to all three entity fields of a transaction
          // form at once).
          aria-label={ariaLabel ?? label}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            // The sheet carries its own input, so the field behind it must not also
            // pull up the keyboard and scroll the page under the dialog.
            if (isPhone) sheetInputRef.current?.focus();
          }}
          // `inputMode="none"` rather than readOnly: the field must not look
          // uneditable (FIELD_BASE greys a read-only field since dev#468) and must
          // still take focus — it just has no keyboard of its own, the same trick
          // the amount field uses for the numpad.
          inputMode={isPhone ? "none" : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (open && active >= 0 && active < matches.length) {
                e.preventDefault();
                commit(matches[active]);
              } else {
                setOpen(false);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          className={cn(FIELD_BASE, label !== undefined && FIELD_FLOATING_PAD, "pr-9")}
        />
        <ChevronDown
          aria-hidden
          onMouseDown={(e) => {
            // Toggle on the chevron without stealing focus from the input.
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 cursor-pointer text-slate-400 dark:text-slate-500"
        />
      </div>
      {isPhone && (
        <PickerSheet
          open={open}
          onClose={() => setOpen(false)}
          title={label}
          // The sheet's input IS the field: this is a free-text control, so what is
          // typed here is the value (a brand-new payee is just a name nothing
          // matches), and the list below narrows as it changes.
          query={value}
          onQueryChange={onChange}
          searchPlaceholder={searchPlaceholder ?? placeholder}
          inputRef={sheetInputRef}
          closeLabel={closeLabel}
        >
          <ul role="listbox">
            {matches.map((o) => {
              const group = groupBy?.(o);
              const startsGroup =
                group != null && group !== (matches[matches.indexOf(o) - 1] && groupBy?.(matches[matches.indexOf(o) - 1]));
              return (
                <Fragment key={o}>
                  {startsGroup && (
                    <li
                      role="presentation"
                      className="px-4 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      {group}
                    </li>
                  )}
                  <li role="option" aria-selected={o === value}>
                    <button type="button" onClick={() => commit(o)} className={SHEET_ROW_CLASS}>
                      {o}
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </PickerSheet>
      )}
      {!isPhone && open && matches.length > 0 && (
        <ul role="listbox" className={LIST_CLASS}>
          {matches.map((o, i) => {
            const group = groupBy?.(o);
            // Heading at each group boundary only — `matches` is group-contiguous,
            // so comparing against the previous row is enough.
            const startsGroup = group != null && group !== (matches[i - 1] && groupBy?.(matches[i - 1]));
            return (
              <Fragment key={o}>
                {startsGroup && (
                  <li
                    role="presentation"
                    className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 first:pt-1 dark:text-slate-400"
                  >
                    {group}
                  </li>
                )}
                <li role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // mousedown (not click) so the blur from the input firing first
                      // doesn't close the list before the selection registers.
                      e.preventDefault();
                      commit(o);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(rowClass(i === active), group != null && "pl-6")}
                  >
                    {o}
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * The id-keyed sibling of {@link Combobox}: identical anatomy (a real text input
 * with the shared field styling, chevron and inline as-you-type filtering) but
 * the value is an option id, not free text. Built so an entity picker can sit
 * next to a free-text combobox without any visible difference — a button-trigger
 * panel picker ({@link EntityCombobox}) never matches an input field exactly.
 *
 * Text-vs-value reconciliation: the input's text is transient. Picking a row or
 * typing an exact (unique) label commits that option; emptying the text commits
 * a clear; anything else reverts to the selected option's label on blur/Escape.
 *
 * **On a phone the list opens as a full-screen sheet**, exactly like {@link Combobox}
 * beside it (Keksdose live #200, extended by dev#477 — the account picker moved onto
 * this component and must not lose its sheet). The sheet carries its OWN query state
 * rather than reusing `text`: `text` is what {@link reconcile} judges on blur, so a
 * sheet that emptied it to show the full list would read as "the user cleared the
 * field" the moment it closed.
 */
export function InlineEntityCombobox<V extends string | number>({
  value,
  onChange,
  options,
  label,
  id,
  placeholder,
  className,
  disabled,
  searchPlaceholder,
  emptyLabel,
  closeLabel,
  "aria-label": ariaLabel,
}: {
  /** Selected option id, or null when nothing is selected. */
  value: V | null;
  /** A picked/typed option emits its id; emptying the field emits `null`. */
  onChange: (v: V | null) => void;
  options: ComboOption<V>[];
  label?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Phone sheet only — the anchored list has the field itself to type in. */
  searchPlaceholder?: string;
  /** Phone sheet only: a full screen showing nothing has to say why. The anchored
   *  list simply does not open. */
  emptyLabel?: string;
  closeLabel?: string;
  "aria-label"?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const { open, setOpen, wrapperRef } = useDropdown();
  const [active, setActive] = useState(-1);
  // null = not editing → the input shows the selected option's label.
  const [text, setText] = useState<string | null>(null);
  const isPhone = useMediaQuery(PHONE_QUERY, false);
  const sheetInputRef = useRef<HTMLInputElement | null>(null);
  // The sheet's search box. Starts empty on every open, so a field that already
  // holds a value still offers the whole list — the shape a native <select> has
  // on a phone, and what the anchored panel gets from `query` below.
  const [sheetQuery, setSheetQuery] = useState("");

  const selected = useMemo(
    () => (value == null ? null : (options.find((o) => o.value === value) ?? null)),
    [options, value],
  );
  const shown = text ?? selected?.label ?? "";

  // Focusing select-alls the current label; filtering only kicks in once the
  // text actually differs from it, so an already-filled field still opens on
  // the FULL list instead of a single-row "filter" of its own value.
  const typedQuery =
    text !== null && text !== (selected?.label ?? "") ? text.trim().toLowerCase() : "";
  const query = isPhone ? sheetQuery.trim().toLowerCase() : typedQuery;
  const matches = useMemo(() => {
    let ranked = options;
    if (query) {
      const hit = (s: string | undefined) => s?.toLowerCase().includes(query) ?? false;
      const starts = options.filter((o) => o.label.toLowerCase().startsWith(query));
      const rest = options.filter(
        (o) =>
          !o.label.toLowerCase().startsWith(query) &&
          (hit(o.label) || hit(o.sublabel) || hit(o.group)),
      );
      ranked = [...starts, ...rest];
    }
    if (!ranked.some((o) => o.group)) return ranked;
    // Keep each group contiguous so the headings below appear once instead of
    // re-appearing every time the ranking interleaves two groups — while preserving
    // "best match first": a Map keeps insertion order, so groups come out ordered by
    // their best-ranked member and members keep their rank order inside the group.
    const blocks = new Map<string, ComboOption<V>[]>();
    for (const o of ranked) {
      const key = o.group ?? "";
      if (!blocks.has(key)) blocks.set(key, []);
      blocks.get(key)!.push(o);
    }
    return [...blocks.values()].flat();
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setActive(-1);
    setSheetQuery("");
  };
  const commit = (o: ComboOption<V>) => {
    if (o.value !== value) onChange(o.value);
    setText(null);
    close();
  };
  /** Turn loose text into a decision: empty clears, an exact label match that names
   *  ONE entity commits, anything else reverts to the selected label.
   *
   *  Unique by VALUE, not by row. An option may deliberately appear twice — Keksdose
   *  repeats recently-used categories in a "Recent" group at the top (live #203) — and
   *  counting rows made every such option uncommittable: two hits, so nothing fired and
   *  the field reverted to whatever was selected before. Typing a category you had just
   *  used, then tabbing away, silently discarded it, and the more categories you used
   *  the more of them stopped working. Two rows naming the same id are not an ambiguity;
   *  two ids sharing a label are. */
  const reconcile = () => {
    if (text !== null) {
      const q = text.trim();
      if (!q) {
        if (value != null) onChange(null);
      } else {
        const hits = options.filter((o) => o.label.toLowerCase() === q.toLowerCase());
        const ids = new Set(hits.map((h) => h.value));
        if (ids.size === 1 && hits[0].value !== value) onChange(hits[0].value);
      }
      setText(null);
    }
    close();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      {/* Inner wrapper for chevron centering — same reasoning as Combobox above. */}
      <div className="relative">
        <input
          id={fieldId}
          value={shown}
          placeholder={placeholder}
          // The visual label is a floating <span>, not a <label for>, so without this
          // the field has NO accessible name — it announces its value and nothing
          // else. Just the label, never "label: value" the way a trigger button has
          // to compose it: an input already exposes its value separately.
          aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          // `inputMode="none"` rather than readOnly, for the same reason Combobox
          // above gives: the sheet carries the keyboard, and a readOnly field would
          // take FIELD_BASE's settled look on a field that is perfectly editable.
          inputMode={isPhone ? "none" : undefined}
          onFocus={(e) => {
            setText(shown);
            e.currentTarget.select();
            setOpen(true);
            // The sheet has its own input; the field behind it must not also pull up
            // the keyboard and scroll the page under the dialog.
            if (isPhone) sheetInputRef.current?.focus();
          }}
          onBlur={() => {
            // On a phone the blur is the SHEET taking focus, not the user leaving the
            // field — reconciling there would close the sheet the instant it opened.
            if (!isPhone) reconcile();
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (open && active >= 0 && active < matches.length) {
                e.preventDefault();
                commit(matches[active]);
              } else {
                reconcile();
              }
            } else if (e.key === "Escape") {
              setText(null);
              close();
            }
          }}
          className={cn(FIELD_BASE, label !== undefined && FIELD_FLOATING_PAD, "pr-9")}
        />
        <ChevronDown
          aria-hidden
          onMouseDown={(e) => {
            // Toggle on the chevron without stealing focus from the input.
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className={cn(
            "absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500",
            disabled ? "opacity-50" : "cursor-pointer",
          )}
        />
      </div>
      {isPhone && (
        <PickerSheet
          open={open}
          // Closing without choosing keeps the value: `text` was never emptied, so
          // reconcile has nothing to undo — it just puts the label back.
          onClose={reconcile}
          title={label}
          query={sheetQuery}
          onQueryChange={(v) => {
            setSheetQuery(v);
            setActive(-1);
          }}
          searchPlaceholder={searchPlaceholder ?? placeholder}
          inputRef={sheetInputRef}
          closeLabel={closeLabel}
        >
          <ul role="listbox">
            {matches.map((o, i) => (
              // Keyed by group AND value, like combobox-core.tsx: an option may
              // deliberately appear twice (see `reconcile`), and a bare value key
              // would collide.
              <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
                {o.group && o.group !== matches[i - 1]?.group && (
                  <li
                    role="presentation"
                    className="px-4 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {o.group}
                  </li>
                )}
                <li role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    onClick={() => commit(o)}
                    className={cn(SHEET_ROW_CLASS, o.value === value && "font-medium")}
                  >
                    {o.label}
                  </button>
                </li>
              </Fragment>
            ))}
            {matches.length === 0 && emptyLabel && (
              <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</li>
            )}
          </ul>
        </PickerSheet>
      )}
      {!isPhone && open && matches.length > 0 && (
        <ul role="listbox" className={LIST_CLASS}>
          {matches.map((o, i) => (
            // A group heading is emitted at each group boundary rather than repeating
            // the group on every row (feedback #136). `matches` is group-contiguous,
            // so comparing with the previous row is enough. Fragment key sits here;
            // the heading and the option carry their own list semantics — keyed by
            // group AND value, because an option may deliberately appear twice (see
            // `reconcile`).
            <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
              {o.group && o.group !== matches[i - 1]?.group && (
                <li
                  role="presentation"
                  className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 first:pt-1 dark:text-slate-400"
                >
                  {o.group}
                </li>
              )}
              <li role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // mousedown (not click) so the input's blur can't close the
                    // list before the selection registers.
                    e.preventDefault();
                    commit(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    rowClass(i === active),
                    // Indented under its heading, so the hierarchy is readable at a
                    // glance instead of inferred from grey trailing text.
                    o.group && "pl-6",
                    o.value === value && "font-medium",
                  )}
                >
                  {o.label}
                  {o.sublabel && (
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                      {o.sublabel}
                    </span>
                  )}
                </button>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
