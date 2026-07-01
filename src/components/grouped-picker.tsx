import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { DropdownSearchHeader, useDropdownSearch } from "./dropdown";

export interface PickerGroup {
  key: string;
  label: string;
  items: { key: string; label: string }[];
}

/** Panel picker for large grouped option sets: instead of one long flat
 * dropdown, the groups sit side by side as columns with their items listed
 * beneath (feedback #267/#276), narrowed by a filter box at the top (feedback
 * #267 rework). A query that matches a group's name keeps the whole group;
 * otherwise groups are reduced to their matching items. */
export function GroupedPicker({
  groups,
  buttonLabel,
  selected,
  onSelect,
  ariaLabel,
  filterPlaceholder,
  className,
}: {
  groups: PickerGroup[];
  /** Face of the closed picker button. */
  buttonLabel: ReactNode;
  /** Keys of the current selection, if any. */
  selected: { group: string; item: string } | null;
  onSelect: (groupKey: string, itemKey: string) => void;
  ariaLabel?: string;
  filterPlaceholder?: string;
  className?: string;
}) {
  const { open, setOpen, wrapperRef, query, setQuery, inputRef } = useDropdownSearch();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) =>
        g.label.toLowerCase().includes(q)
          ? g
          : { ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) },
      )
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 flex max-h-96 w-[min(56rem,85vw)] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <DropdownSearchHeader
            query={query}
            onQueryChange={setQuery}
            inputRef={inputRef}
            placeholder={filterPlaceholder}
          />
          <div className="overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
            ) : (
              <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
                {filtered.map((g) => (
                  <div key={g.key} className="mb-3 break-inside-avoid">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {g.label}
                    </div>
                    <ul className="space-y-0.5">
                      {g.items.map((item) => {
                        const isSelected =
                          selected !== null &&
                          g.key === selected.group &&
                          item.key === selected.item;
                        return (
                          <li key={item.key}>
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(g.key, item.key);
                                setOpen(false);
                              }}
                              className={cn(
                                "w-full rounded px-1.5 py-0.5 text-left text-sm",
                                isSelected
                                  ? "bg-sky-100 font-medium text-sky-900 dark:bg-sky-900/40 dark:text-sky-200"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                              )}
                            >
                              {item.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
