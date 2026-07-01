import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FieldLabel, FIELD_BASE, FIELD_FLOATING_PAD } from "./ui";
import { cn } from "../lib/cn";
import { useDropdown } from "./dropdown";

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
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
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
                className={cn(
                  "block w-full truncate px-3 py-1.5 text-left text-sm text-slate-900 dark:text-slate-100",
                  i === active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
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
