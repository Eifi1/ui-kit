import { useId, useMemo, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { Check } from "lucide-react";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_INVALID, FIELD_FLOATING_PAD } from "./ui";
import { cn } from "../lib/cn";
import { DropdownPanel, DropdownSearchHeader, useDropdownSearch } from "./dropdown";
import { useActiveOptionScroll } from "./combobox-core";
import {
  DEFAULT_COMMON_LABELS,
  DEFAULT_MULTI_SELECT_LABELS,
  useKitLabels,
} from "../i18n/kit-labels";

export interface MultiSelectOption {
  value: string | number;
  label: string;
  hint?: string;
}

/** `onChange` is the kit's — "the selection changed", carrying the new values —
 *  rather than the div's form event. */
export interface MultiSelectProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  options: MultiSelectOption[];
  values: (string | number)[];
  onChange: (next: (string | number)[]) => void;
  /** Displayed when no value is selected (i.e. "all"). Defaults to `placeholder`,
   * then to `multiSelect.all` from the {@link UiKitProvider}, then "All". */
  allLabel?: string;
  /** Singular/plural countable label, used when 1+ items are selected. Default:
   *  `multiSelect.selectedCount` from the provider — the bare count in English. */
  itemLabel?: (count: number) => string;
  placeholder?: string;
  /** Embedded top-boundary label, matching the native Input/Select fields. */
  label?: ReactNode;
  /** Search-box placeholder. Default: `multiSelect.search` from the provider, else "Search". */
  searchLabel?: string;
  /** "Select all" action label. Default: `multiSelect.selectAll`, else "Select all". */
  selectAllLabel?: string;
  /** "Clear" action label. Default: `multiSelect.clear`, else "Clear". */
  clearLabel?: string;
  /** Extra classes for the open dropdown PANEL — the way to widen it past its
   *  16rem default when the rows carry more than a label (Keksdose feedback #147). */
  panelClassName?: string;
  /** Required and unanswered — {@link FIELD_INVALID}, the same rose border the
   *  native `Select` has worn since feedback #235. Every field-styled control in
   *  this package carries it now, so a form can mark any of its fields rather than
   *  only the one that happened to have it first. */
  invalid?: boolean;
}

export function MultiSelect({
  options,
  values,
  onChange,
  allLabel,
  itemLabel,
  placeholder,
  label,
  searchLabel,
  selectAllLabel,
  clearLabel,
  className,
  panelClassName,
  invalid,
  "aria-label": ariaLabel,
  ...rest
}: MultiSelectProps) {
  const { open, setOpen, wrapperRef, triggerRef, closeToTrigger, query, setQuery, inputRef } =
    useDropdownSearch();
  // `allLabel` is deliberately NOT folded in here: between it and the provider's
  // `all` sits `placeholder`, which has always doubled as the "nothing picked" text,
  // and a caller who set it must keep seeing it.
  const labels = useKitLabels("multiSelect", DEFAULT_MULTI_SELECT_LABELS, {
    search: searchLabel,
    selectAll: selectAllLabel,
    clear: clearLabel,
    selectedCount: itemLabel,
  });
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  // One id per instance: `aria-controls` on the trigger names the list while the
  // list is still closed.
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const optionId = (index: number) => `${uid}-option-${index}`;
  // Which row the arrow keys are on. Reset from the handlers that change what the
  // list contains rather than from an effect — a render pass is not where this
  // decision belongs, and the two callers that move the list are right here.
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const valueSet = useMemo(() => new Set(values), [values]);
  const allChecked = options.length > 0 && options.every((o) => valueSet.has(o.value));
  const anyChecked = values.length > 0;
  const selectedSummary = (() => {
    if (!anyChecked || allChecked) return allLabel ?? placeholder ?? labels.all;
    return labels.selectedCount(values.length);
  })();

  const toggle = (val: string | number) => {
    if (valueSet.has(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  };

  const selectAll = () => onChange(options.map((o) => o.value));
  const clearAll = () => onChange([]);

  const activeId = active >= 0 && active < filtered.length ? optionId(active) : undefined;
  useActiveOptionScroll(activeId);

  // The WAI-ARIA APG's listbox keyboard, handled on the search box because that is
  // where focus is while the panel is up. Escape is `useDropdown`'s, on the document.
  const onListKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(filtered.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Toggling keeps the panel open, exactly as clicking a row does: this control
      // exists to answer "which of these", which is rarely one of them.
      if (filtered[active]) toggle(filtered[active].value);
    } else if (e.key === "Tab") {
      e.preventDefault();
      closeToTrigger();
    }
  };

  return (
    // `rest` dresses the wrapper; the name belongs to the trigger below it, which is
    // the thing with a role. Spread FIRST so the ARIA the trigger composes, and the
    // handlers that open the list, cannot be replaced by accident from outside.
    <div {...rest} ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      <button
        ref={triggerRef}
        type="button"
        // A combobox, not a bare button: this trigger carried `aria-invalid`, which
        // `button` does not support, so a required-and-empty filter painted its rose
        // border and announced nothing (ESLint's `role-supports-aria-props`, the
        // audit's §a11y). The role that describes it is the one that also supports
        // the attribute.
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        // The label is a floating <span>, not a <label for>, so without this the
        // trigger announces only its summary — "3 selected", with nothing saying
        // three of WHAT. The label AND the summary, because `aria-label` replaces
        // the content rather than adding to it; the same composition its two
        // siblings use, so a form row of pickers reads the same way throughout.
        // A caller's own name wins: two filters labelled "Accounts" on one screen have
        // to be told apart, and only the caller knows by what.
        aria-label={
          ariaLabel ?? (typeof label === "string" ? common.fieldValue(label, selectedSummary) : undefined)
        }
        onClick={() => {
          setOpen((v) => !v);
          setActive(0);
        }}
        // Down/Up opens the list from the closed trigger, per the APG; Enter and
        // Space already do through the button's own click.
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive(0);
          }
        }}
        aria-invalid={invalid || undefined}
        className={cn(FIELD_TRIGGER, "pr-9", label !== undefined && FIELD_FLOATING_PAD, invalid && FIELD_INVALID)}
      >
        {/* The summary IS the field's value, so it inherits FIELD_BASE's ink rather
            than restating a lighter one (Keksdose dev#477). */}
        <span className="truncate">{selectedSummary}</span>
        <FieldChevron />
      </button>
      {open && (
        <DropdownPanel
          // 16rem by default; `panelClassName` is how a caller widens it (Keksdose
          // feedback #147: the market picker's rows carry a postcode, a town, a
          // distance and a receipt count, all of which were being truncated). The
          // override used to be applied from the OUTSIDE with a
          // `[&>div]:w-full` descendant selector, which worked and was a hack —
          // "change the package" was the right call.
          className={cn("w-64", panelClassName)}
          empty={filtered.length === 0}
          // The rows below are options, so the list around them has to be a listbox
          // — and one that says several answers are allowed, which is the only thing
          // that made the trigger's "3 selected" make sense to a reader.
          listProps={{ id: listboxId, role: "listbox", "aria-multiselectable": true }}
          header={
            <>
              <DropdownSearchHeader
                query={query}
                onQueryChange={(v) => {
                  setQuery(v);
                  // The list under the highlight just changed; keeping the old index
                  // would point `aria-activedescendant` at a different option than
                  // the one the user was on.
                  setActive(0);
                }}
                inputRef={inputRef}
                placeholder={labels.search}
                listboxId={listboxId}
                activeId={activeId}
                onKeyDown={onListKeyDown}
              />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allChecked}
                  className="rounded px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                >
                  {labels.selectAll}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={!anyChecked}
                  className="rounded px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                >
                  {labels.clear}
                </button>
              </div>
            </>
          }
        >
          {filtered.map((o, i) => {
              const checked = valueSet.has(o.value);
              return (
                <li key={o.value} role="presentation">
                  <button
                    type="button"
                    id={optionId(i)}
                    // The checked state used to exist ONLY as the decorative span
                    // below (the audit's §a11y): the row said its label and nothing
                    // else, so "selected" was imperceptible without sight. This is
                    // the same state, in the one place a reader looks for it.
                    role="option"
                    aria-selected={checked}
                    // Focus stays in the search box — that is what
                    // `aria-activedescendant` is for — so the rows are not tab stops.
                    tabIndex={-1}
                    onClick={() => toggle(o.value)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-sm text-left hover:bg-[var(--bg-hover)]",
                      checked && "bg-[var(--bg-active)]",
                      i === active && "bg-[var(--bg-hover)]",
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        // A picture of `aria-selected` above; a reader that met both
                        // would be told twice.
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-[var(--bg-inverse)] bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                            : "border-[var(--border-strong)] bg-[var(--bg-surface)]",
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span className="truncate text-[var(--text-primary)]">{o.label}</span>
                      {o.hint && (
                        <span className="truncate text-xs text-[var(--text-placeholder)]">
                          {o.hint}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
        </DropdownPanel>
      )}
    </div>
  );
}
