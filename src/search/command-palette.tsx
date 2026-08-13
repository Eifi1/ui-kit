import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { cn } from "../lib/cn";
import { useOverlayHistory } from "../hooks/use-overlay-history";

export interface CommandItem {
  id: string;
  /** Primary text. */
  label: string;
  /** Secondary text on the right (e.g. an amount, a date, a group hint). */
  hint?: string;
  /** Heading this item is grouped under. */
  group: string;
  /** Leading icon / element. */
  icon?: ReactNode;
  /** Invoked when the item is chosen (navigate, run an action, …). */
  onSelect: () => void;
}

export interface CommandPaletteLabels {
  placeholder: string;
  empty: string;
  loading: string;
  /** Hint shown in the footer, e.g. "↑↓ to navigate · ↵ to select · esc to close". */
  hint?: string;
}

const DEFAULT_LABELS: CommandPaletteLabels = {
  placeholder: "Search…",
  empty: "No results",
  loading: "Searching…",
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /**
   * Returns results for a query (called debounced as the user types; an empty
   * query is allowed — return defaults like pages/recent). Sync or async; stale
   * async responses are ignored. Wrap in useCallback to avoid needless re-runs.
   */
  search: (query: string) => CommandItem[] | Promise<CommandItem[]>;
  labels?: Partial<CommandPaletteLabels>;
}

/** Registers a global ⌘K / Ctrl-K shortcut that calls `onOpen`. */
export function useCommandKey(onOpen: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpen]);
}

/**
 * A ⌘K-style command palette: a top-centred modal with a search field and a
 * grouped, keyboard-navigable result list. Domain-free — the app supplies
 * results via the `search` provider (pages, actions, records, …); each result
 * carries its own `onSelect`.
 */
export function CommandPalette({ open, onClose, search, labels }: CommandPaletteProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef(search);
  searchRef.current = search;
  const reqId = useRef(0);

  // Back dismisses the palette (Keksdose feedback #172). Declared with the other
  // hooks, above the `if (!open) return null` below — a hook past a conditional
  // return changes the hook order between renders. Passing `open` rather than
  // mounting-while-open is what lets it sit here.
  useOverlayHistory(open, onClose);

  // Reset + focus when opened.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Debounced, race-safe search.
  useEffect(() => {
    if (!open) return;
    const id = ++reqId.current;
    setLoading(true);
    const run = async () => {
      try {
        const r = await Promise.resolve(searchRef.current(query));
        if (reqId.current === id) {
          setResults(r);
          setActive(0);
        }
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    };
    const t = setTimeout(run, query ? 150 : 0);
    return () => clearTimeout(t);
  }, [query, open]);

  // Group results, preserving first-seen group order; keep a flat list for nav.
  const { groups, flat } = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, CommandItem[]>();
    for (const item of results) {
      if (!byGroup.has(item.group)) {
        byGroup.set(item.group, []);
        order.push(item.group);
      }
      byGroup.get(item.group)!.push(item);
    }
    return {
      groups: order.map((g) => ({ group: g, items: byGroup.get(g)! })),
      flat: order.flatMap((g) => byGroup.get(g)!),
    };
  }, [results]);

  const choose = (item: CommandItem | undefined) => {
    if (!item) return;
    onClose();
    item.onSelect();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let flatIndex = -1;
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={l.placeholder}
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
          <Search className="size-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls="command-palette-list"
            aria-activedescendant={flat[active] ? `command-item-${flat[active].id}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={l.placeholder}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {loading && <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{l.loading}</span>}
        </div>

        <ul id="command-palette-list" ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
          {flat.length === 0 && !loading && (
            <li className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">{l.empty}</li>
          )}
          {groups.map(({ group, items }) => (
            <li key={group}>
              <div className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {group}
              </div>
              <ul>
                {items.map((item) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  const isActive = idx === active;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        id={`command-item-${item.id}`}
                        role="option"
                        aria-selected={isActive}
                        data-index={idx}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => choose(item)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                          isActive
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        {item.icon && (
                          <span className="flex size-4 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500">
                            {item.icon}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.hint && (
                          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{item.hint}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        {l.hint && (
          <div className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            {l.hint}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
