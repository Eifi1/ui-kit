import { useEffect, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { DropdownSearchHeader, useDropdownSearch } from "./dropdown";
import { useKitLocale } from "../i18n/kit-labels";

export interface PickerGroup {
  key: string;
  label: string;
  /** `icon` is an optional leading glyph, drawn before the label — the same slot
   *  `ComboOption` has always had, so the two pickers can present one option set
   *  the same way. Omitted, a row is exactly what it was: label only, with no
   *  reserved space, so a list where nothing has an icon does not indent. */
  items: { key: string; label: string; icon?: ReactNode }[];
}

/**
 * `onSelect` is omitted from the div's own attributes because this component's
 * means "an item was chosen", not the DOM's "text was selected inside me" — two
 * different signatures under one name, and the kit's meaning is the one three apps
 * are written against.
 */
export interface GroupedPickerProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  groups: PickerGroup[];
  /** Face of the closed picker button. */
  buttonLabel: ReactNode;
  /** Keys of the current selection, if any. */
  selected: { group: string; item: string } | null;
  onSelect: (groupKey: string, itemKey: string) => void;
  /**
   * @deprecated Use `aria-label`, the DOM spelling every control in the kit now
   * takes. Kept working — three apps pass it — and it applies only when
   * `aria-label` is absent; it goes in a later minor.
   */
  ariaLabel?: string;
  filterPlaceholder?: string;
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
  "aria-label": ariaLabelAttr,
  filterPlaceholder,
  className,
  ...rest
}: GroupedPickerProps) {
  const { open, setOpen, wrapperRef, query, setQuery, inputRef } = useDropdownSearch();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Case folding in the provider's locale — see `rowMatches` for the Turkish "İ"
  // that plain `toLowerCase` gets wrong.
  const locale = useKitLocale();
  const filtered = useMemo(() => {
    const fold = (s: string) => s.toLocaleLowerCase(locale);
    const q = fold(query.trim());
    if (!q) return groups;
    return groups
      .map((g) =>
        fold(g.label).includes(q)
          ? g
          : { ...g, items: g.items.filter((i) => fold(i.label).includes(q)) },
      )
      .filter((g) => g.items.length > 0);
  }, [groups, query, locale]);

  return (
    // `rest` goes on the wrapper, but the accessible NAME does not: this div is a
    // positioning box with no role, so a label parked on it would be announced by
    // nothing. It belongs to the control — the same split every picker in this wave
    // makes, and the reason `aria-label` is destructured out rather than left in
    // `rest`. Spread FIRST so the attributes below, each of them a fix with an
    // incident behind it, cannot be clobbered from outside.
    <div {...rest} ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabelAttr ?? ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-[var(--text-placeholder)]" />
      </button>
      {open && (
        <div className="absolute start-0 z-30 mt-1 flex max-h-96 w-[min(56rem,85vw)] flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg">
          <DropdownSearchHeader
            query={query}
            onQueryChange={setQuery}
            inputRef={inputRef}
            placeholder={filterPlaceholder}
          />
          <div className="overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">—</p>
            ) : (
              <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
                {filtered.map((g) => (
                  <div key={g.key} className="mb-3 break-inside-avoid">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
                                "flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-start text-sm",
                                isSelected
                                  ? "bg-[var(--brand-bg)] font-medium text-[var(--brand-muted)]"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                              )}
                            >
                              {item.icon && <span className="shrink-0">{item.icon}</span>}
                              <span className="min-w-0 truncate">{item.label}</span>
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
