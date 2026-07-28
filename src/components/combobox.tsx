import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FieldLabel, FIELD_BASE, FIELD_FLOATING_PAD } from "./ui";
import { cn } from "../lib/cn";
import { useDropdown } from "./dropdown";
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
  "aria-label"?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const { open, setOpen, wrapperRef } = useDropdown();
  const [active, setActive] = useState(-1);

  const query = value.trim().toLowerCase();
  const matches = useMemo(() => {
    const seen = new Set<string>();
    const uniq = options.filter((o) => o && !seen.has(o) && seen.add(o));
    if (!query) return uniq.slice(0, 8);
    // Prefix matches first, then substring matches — most relevant on top.
    const starts = uniq.filter((o) => o.toLowerCase().startsWith(query));
    const contains = uniq.filter(
      (o) => !o.toLowerCase().startsWith(query) && o.toLowerCase().includes(query),
    );
    return [...starts, ...contains].slice(0, 8);
  }, [options, query]);

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
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          onFocus={() => setOpen(true)}
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
      {open && matches.length > 0 && (
        <ul role="listbox" className={LIST_CLASS}>
          {matches.map((o, i) => (
            <li key={o} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // mousedown (not click) so the blur from the input firing first
                  // doesn't close the list before the selection registers.
                  e.preventDefault();
                  commit(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={rowClass(i === active)}
              >
                {o}
              </button>
            </li>
          ))}
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
 */
export function InlineEntityCombobox<V extends string | number>({
  value,
  onChange,
  options,
  label,
  id,
  placeholder,
  className,
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
  "aria-label"?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const { open, setOpen, wrapperRef } = useDropdown();
  const [active, setActive] = useState(-1);
  // null = not editing → the input shows the selected option's label.
  const [text, setText] = useState<string | null>(null);

  const selected = useMemo(
    () => (value == null ? null : (options.find((o) => o.value === value) ?? null)),
    [options, value],
  );
  const shown = text ?? selected?.label ?? "";

  // Focusing select-alls the current label; filtering only kicks in once the
  // text actually differs from it, so an already-filled field still opens on
  // the FULL list instead of a single-row "filter" of its own value.
  const query = text !== null && text !== (selected?.label ?? "") ? text.trim().toLowerCase() : "";
  const matches = useMemo(() => {
    if (!query) return options;
    const hit = (s: string | undefined) => s?.toLowerCase().includes(query) ?? false;
    const starts = options.filter((o) => o.label.toLowerCase().startsWith(query));
    const rest = options.filter(
      (o) => !o.label.toLowerCase().startsWith(query) && (hit(o.label) || hit(o.sublabel)),
    );
    return [...starts, ...rest];
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const commit = (o: ComboOption<V>) => {
    if (o.value !== value) onChange(o.value);
    setText(null);
    close();
  };
  /** Turn loose text into a decision: empty clears, a unique exact label match
   *  commits, anything else reverts to the selected label. */
  const reconcile = () => {
    if (text !== null) {
      const q = text.trim();
      if (!q) {
        if (value != null) onChange(null);
      } else {
        const hits = options.filter((o) => o.label.toLowerCase() === q.toLowerCase());
        if (hits.length === 1 && hits[0].value !== value) onChange(hits[0].value);
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
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          onFocus={(e) => {
            setText(shown);
            e.currentTarget.select();
            setOpen(true);
          }}
          onBlur={reconcile}
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
          className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 cursor-pointer text-slate-400 dark:text-slate-500"
        />
      </div>
      {open && matches.length > 0 && (
        <ul role="listbox" className={LIST_CLASS}>
          {matches.map((o, i) => (
            <li key={String(o.value)} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // mousedown (not click) so the input's blur can't close the
                  // list before the selection registers.
                  e.preventDefault();
                  commit(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(rowClass(i === active), o.value === value && "font-medium")}
              >
                {o.label}
                {o.sublabel && (
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{o.sublabel}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
