import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
import { PickerSheet, SHEET_ROW_CLASS } from "./picker-sheet";
import { useMediaQuery } from "../hooks/use-media-query";
import { PHONE_QUERY } from "./ui";
import { type AnchorRect } from "../hooks/use-anchored-rect";
import { useAnchoredPanel, type AnchoredPanel } from "../hooks/use-anchored-panel";
import { useEscapeKey, useOutsideClick } from "../hooks/use-dismiss";

export interface ComboOption<V extends string | number> {
  value: V;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  /**
   * Section this option belongs to. Where a consumer renders it as a heading with the
   * members indented beneath — {@link InlineEntityCombobox} does — this is a genuine
   * grouping, not decoration: the name appears once per section rather than trailing
   * every row in small grey type, which is barely legible on a phone (feedback #136).
   * Searchable like `sublabel`.
   */
  group?: string;
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
  /** Where the dropdown goes, clamped to the visible viewport (feedback #135). */
  placement: AnchoredPanel;
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
  // Placement, not just the anchor rect: the panel has to dodge the on-screen
  // keyboard its own search box summons (feedback #135).
  const placement = useAnchoredPanel(triggerRef, open);
  const rect = placement.rect;
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
    placement,
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
  sheetTitle,
  closeLabel,
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
  /** What the sheet calls itself on a phone — the field's label. Ignored on
   *  desktop, where the panel sits under the field that already says it. */
  sheetTitle?: ReactNode;
  closeLabel?: string;
}) {
  const { rect, placement, panelRef, inputRef, query, setQuery, results, busy, active, setActive } =
    core;
  // The phone gets a full-screen sheet instead of an anchored panel (live #200).
  // Same core, same results, same handlers — only the container differs, so the
  // two presentations cannot drift in what they offer.
  const isPhone = useMediaQuery(PHONE_QUERY, false);
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

  if (!core.open || typeof document === "undefined") return null;

  const list = (
    <ul
      role="listbox"
      aria-multiselectable={multi}
      className={cn("min-h-0 flex-1 overflow-y-auto py-1", isPhone && "flex-none")}
    >
      {busy && results.length === 0 && (
        <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">…</li>
      )}
      {!busy && results.length === 0 && !showCreate && (
        <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</li>
      )}
      {results.map((o, i) => {
        const selected = isSelected(o.value);
        // One heading per group rather than a grey suffix on every row (#136), and
        // the thing the native <select>'s <optgroup> used to give the account
        // picker for free (live #200). `results` keeps its source order, so a
        // boundary is simply "different from the row above".
        const startsGroup = o.group != null && o.group !== results[i - 1]?.group;
        return (
          // Keyed by group AND value: an option may deliberately appear twice —
          // Keksdose repeats recently-used categories in a "Recent" group at the
          // top (live #203) — and a bare value key would collide.
          <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
            {startsGroup && (
              <li
                role="presentation"
                className={cn(
                  "font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
                  isPhone ? "px-4 pb-1 pt-3 text-xs" : "px-3 pb-0.5 pt-2 text-[11px] first:pt-1",
                )}
              >
                {o.group}
              </li>
            )}
          <li role="option" aria-selected={selected}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChoose(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                isPhone
                  ? SHEET_ROW_CLASS
                  : "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                i === active && !isPhone
                  ? "bg-slate-100 dark:bg-slate-800"
                  : !isPhone && "hover:bg-slate-50 dark:hover:bg-slate-800",
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
          </Fragment>
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
              isPhone
                ? SHEET_ROW_CLASS
                : "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
              "text-slate-700 dark:text-slate-200",
              active === results.length && !isPhone
                ? "bg-slate-100 dark:bg-slate-800"
                : !isPhone && "hover:bg-slate-50 dark:hover:bg-slate-800",
            )}
          >
            <Plus className="size-4 shrink-0" />
            <span className="truncate">{createContent}</span>
          </button>
        </li>
      )}
    </ul>
  );

  if (isPhone) {
    return (
      <PickerSheet
        open
        onClose={() => core.setOpen(false)}
        title={sheetTitle}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={searchPlaceholder}
        inputRef={inputRef}
        closeLabel={closeLabel}
      >
        <div onKeyDown={onKeyDown}>{list}</div>
      </PickerSheet>
    );
  }

  if (!rect) return null;

  return createPortal(
    <div
      ref={panelRef}
      onKeyDown={onKeyDown}
      // `placement` keeps the panel inside the region actually on screen: on a phone
      // the search box below pulls up the keyboard, and a panel pinned under a
      // low trigger would otherwise sit entirely behind it (feedback #135).
      style={{
        position: "fixed",
        top: placement.top,
        left: rect.left,
        width: rect.width,
        minWidth: 220,
        maxHeight: placement.maxHeight,
      }}
      className="z-50 flex flex-col rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <DropdownSearchHeader
        query={query}
        onQueryChange={setQuery}
        inputRef={inputRef}
        placeholder={searchPlaceholder}
      />
      {/* One list, two containers: the desktop panel and the phone sheet render
          the same rows through the same handlers (live #200). */}
      {list}
    </div>,
    document.body,
  );
}
