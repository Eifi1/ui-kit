import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "../lib/cn";
import { DropdownSearchHeader } from "./dropdown";
import { useAnchoredRect, type AnchorRect } from "../hooks/use-anchored-rect";
import { useEscapeKey, useOutsideClick } from "../hooks/use-dismiss";

export interface ComboOption<V extends string | number> {
  value: V;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
}

export interface ComboboxCoreOptions<V extends string | number> {
  /** Already-loaded options (client-side filtered), also used to resolve labels. */
  options?: ComboOption<V>[];
  /** Async option source, debounced and race-safe; stale responses are ignored. */
  loadOptions?: (query: string) => Promise<ComboOption<V>[]>;
  /** External loading flag, OR-ed with the internal async state. */
  loading?: boolean;
}

export interface ComboboxCore<V extends string | number> {
  triggerRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  active: number;
  setActive: Dispatch<SetStateAction<number>>;
  results: ComboOption<V>[];
  busy: boolean;
  rect: AnchorRect | null;
  cacheRef: RefObject<Map<V, ComboOption<V>>>;
  resolve: (v: V) => ComboOption<V> | null;
}

/**
 * Shared plumbing for the entity pickers: open/query/active state, portalled
 * anchoring + outside-click/Escape dismissal, focus-on-open, a debounced
 * race-safe async (or client-side) result list, and a label cache so a selected
 * value still renders its label after the async list has moved on. The single-
 * and multi-value comboboxes render their triggers on top of this and share
 * {@link ComboboxPanel} for the dropdown.
 */
export function useComboboxCore<V extends string | number>({
  options,
  loadOptions,
  loading,
}: ComboboxCoreOptions<V>): ComboboxCore<V> {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const isAsync = typeof loadOptions === "function";
  const [asyncResults, setAsyncResults] = useState<ComboOption<V>[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const loadRef = useRef(loadOptions);
  loadRef.current = loadOptions;
  const reqId = useRef(0);

  const close = () => setOpen(false);
  const rect = useAnchoredRect(triggerRef, open);
  useOutsideClick([triggerRef, panelRef], close, open);
  useEscapeKey(close, open);

  // Reset the query + focus the search box each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Debounced, race-safe async search (only when loadOptions is provided).
  useEffect(() => {
    if (!open || !isAsync) return;
    const id = ++reqId.current;
    setAsyncLoading(true);
    const run = async () => {
      try {
        const r = await loadRef.current!(query);
        if (reqId.current === id) setAsyncResults(r);
      } finally {
        if (reqId.current === id) setAsyncLoading(false);
      }
    };
    const t = setTimeout(run, query ? 150 : 0);
    return () => clearTimeout(t);
  }, [query, open, isAsync]);

  const clientResults = useMemo(() => {
    if (isAsync) return [];
    const src = options ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return src;
    return src.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? "").toLowerCase().includes(q),
    );
  }, [isAsync, options, query]);

  const results = isAsync ? asyncResults : clientResults;
  const busy = Boolean(loading) || (isAsync && asyncLoading);

  // Accumulate every option we've seen so a selected value can render its label
  // even after the async list has moved on to other query results.
  const cacheRef = useRef(new Map<V, ComboOption<V>>());
  useEffect(() => {
    for (const o of options ?? []) cacheRef.current.set(o.value, o);
    for (const o of results) cacheRef.current.set(o.value, o);
  }, [options, results]);
  const resolve = (v: V): ComboOption<V> | null =>
    options?.find((o) => o.value === v) ?? cacheRef.current.get(v) ?? null;

  // Reset the highlighted row whenever the visible set changes.
  useEffect(() => {
    setActive(0);
  }, [query, open]);

  return {
    triggerRef,
    panelRef,
    inputRef,
    open,
    setOpen,
    query,
    setQuery,
    active,
    setActive,
    results,
    busy,
    rect,
    cacheRef,
    resolve,
  };
}

/**
 * The portalled dropdown (search header + result rows + optional create row)
 * shared by the single- and multi-value comboboxes. Left-aligned to the trigger
 * and sized to its width; `multi` swaps the trailing check for a leading
 * checkbox. `onChoose` decides whether to close (single) or stay open (multi).
 */
export function ComboboxPanel<V extends string | number>({
  core,
  searchPlaceholder,
  emptyLabel,
  multi,
  isSelected,
  onChoose,
  showCreate,
  onCreate,
  createContent,
}: {
  core: ComboboxCore<V>;
  searchPlaceholder?: string;
  emptyLabel: string;
  multi?: boolean;
  isSelected: (v: V) => boolean;
  onChoose: (o: ComboOption<V>) => void;
  showCreate: boolean;
  onCreate: () => void;
  createContent: ReactNode;
}) {
  const { rect, panelRef, inputRef, query, setQuery, results, busy, active, setActive } = core;
  const rowCount = results.length + (showCreate ? 1 : 0);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < results.length) onChoose(results[active]);
      else if (showCreate) onCreate();
    }
  };

  if (!core.open || !rect || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      onKeyDown={onKeyDown}
      style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, minWidth: 220 }}
      className="z-50 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <DropdownSearchHeader
        query={query}
        onQueryChange={setQuery}
        inputRef={inputRef}
        placeholder={searchPlaceholder}
      />
      <ul role="listbox" aria-multiselectable={multi} className="max-h-96 overflow-y-auto py-1">
        {busy && results.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">…</li>
        )}
        {!busy && results.length === 0 && !showCreate && (
          <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</li>
        )}
        {results.map((o, i) => {
          const selected = isSelected(o.value);
          return (
            <li key={String(o.value)} role="option" aria-selected={selected}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChoose(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                  i === active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
              >
                {multi && (
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      selected
                        ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                        : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                )}
                {o.icon && <span className="shrink-0">{o.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-slate-900 dark:text-slate-100">{o.label}</span>
                  {o.sublabel && (
                    <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                      {o.sublabel}
                    </span>
                  )}
                </span>
                {!multi && selected && <Check className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />}
              </button>
            </li>
          );
        })}
        {showCreate && (
          <li role="option" aria-selected={active === results.length}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreate();
              }}
              onMouseEnter={() => setActive(results.length)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 dark:text-slate-200",
                active === results.length
                  ? "bg-slate-100 dark:bg-slate-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800",
              )}
            >
              <Plus className="size-4 shrink-0" />
              <span className="truncate">{createContent}</span>
            </button>
          </li>
        )}
      </ul>
    </div>,
    document.body,
  );
}
