import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ComponentPropsWithoutRef,
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
import { DEFAULT_COMBOBOX_LABELS, useKitLabels } from "../i18n/kit-labels";

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
  /** Close and hand focus back to the trigger — the keyboard paths only. See
   *  {@link useDropdown} for why a pointer dismissal must not do this. */
  closeToTrigger: () => void;
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
  // Escape unmounts the panel the user is typing in; without this the browser drops
  // focus on <body>, so the caret disappears and the next Tab restarts at the top of
  // the page. A pointer dismissal deliberately does NOT do this — the press has
  // already decided where focus belongs.
  const closeToTrigger = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  // Placement, not just the anchor rect: the panel has to dodge the on-screen
  // keyboard its own search box summons (feedback #135).
  const placement = useAnchoredPanel(triggerRef, open);
  const rect = placement.rect;
  // Outside-click dismissal belongs to the ANCHORED panel, and only to it. On a
  // phone `ComboboxPanel` renders a full-screen `PickerSheet` instead (live #200),
  // portalled to <body> and carrying its own ways out — the close X, Escape, and
  // Back through `useOverlayHistory` — so there is no outside left to press.
  //
  // Leaving the listener on there was not merely redundant, it was the bug:
  // `panelRef` is attached to the desktop panel alone, so with the sheet up every
  // press inside it answered "outside". While `useOutsideClick` listened for
  // `mousedown` the rows survived by accident — they commit on `onMouseDown` too,
  // and won the race — but `pointerdown` PRECEDES `mousedown`, so the sheet closed
  // at finger-down and the commit landed on an unmounted tree: a tapped row kept the
  // old value, and tapping the search box or the X was equally fatal. `PickerSheet`
  // stops `mousedown` for exactly this reason, but that guard was written for
  // `useDropdown`'s listener and never covered this hook.
  const isPhone = useMediaQuery(PHONE_QUERY, false);
  useOutsideClick([triggerRef, panelRef], close, open && !isPhone);
  useEscapeKey(closeToTrigger, open);

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
    closeToTrigger,
  };
}

/**
 * Keep the option the keyboard is on inside the visible part of the list.
 *
 * `aria-activedescendant` moves a highlight WITHOUT moving focus, which is the whole
 * point of it — and the cost is that the browser scrolls nothing on its own. In a
 * panel capped at a few hundred pixels over an account list two hundred long, Down
 * walked the highlight straight out of the box and the list sat still.
 *
 * Optional-called because jsdom does not implement `scrollIntoView`: three consumers
 * run this component in their own suites, and a picker that throws there is a worse
 * trade than a list that does not scroll in a test.
 */
export function useActiveOptionScroll(activeId: string | undefined): void {
  useEffect(() => {
    if (!activeId) return;
    document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);
}

export interface ComboboxPanelProps<V extends string | number>
  extends ComponentPropsWithoutRef<"div"> {
  core: ComboboxCore<V>;
  /** What the trigger's `aria-controls` names. Owned by the component that renders
   *  the trigger, not by the core: one id has to reach both, and only one of them
   *  can be the origin. */
  listboxId: string;
  /** Default: `combobox.search` from the {@link UiKitProvider}, else English. */
  searchPlaceholder?: string;
  /** Default: `combobox.noResults` from the {@link UiKitProvider}, else English. */
  emptyLabel?: string;
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
}

/**
 * The portalled dropdown (search header + result rows + optional create row)
 * shared by the single- and multi-value comboboxes. Left-aligned to the trigger
 * and sized to its width; `multi` swaps the trailing check for a leading
 * checkbox. `onChoose` decides whether to close (single) or stay open (multi).
 *
 * ## The ARIA, which is `CommandPalette`'s
 *
 * This rendered a `role="listbox"` of `role="option"` rows and stopped there, so a
 * reader was handed a text box and silence: the highlight the arrow keys move lived
 * only in a background colour, and nothing tied the box being typed in to the list
 * being filtered. `CommandPalette` has had the whole model since it was written —
 * `aria-controls` from the field to the list, `aria-activedescendant` naming the row
 * the keyboard is on — and it was the only thing in the package that did.
 *
 * Two distinct states, deliberately not conflated:
 *   - `aria-selected` is CHOSEN. It is the check mark, and in `multi` the checkbox.
 *   - `aria-activedescendant` is where the KEYBOARD is. Announcing that as selected
 *     would tell a reader that the row they are merely passing over is the answer.
 *
 * `role="option"` sits on the `<button>`, not on the `<li>` around it, for the same
 * reason it does in `CommandPalette`: an option may not contain a separately
 * focusable control, and the button is the thing a pointer presses. The rows are
 * `tabIndex={-1}` because focus never leaves the search box — that is what
 * `aria-activedescendant` is FOR.
 */
export function ComboboxPanel<V extends string | number>({
  core,
  listboxId,
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
  className,
  style,
  ...rest
}: ComboboxPanelProps<V>) {
  const {
    rect,
    placement,
    panelRef,
    inputRef,
    query,
    setQuery,
    results,
    busy,
    active,
    setActive,
    closeToTrigger,
  } = core;
  // The phone gets a full-screen sheet instead of an anchored panel (live #200).
  // Same core, same results, same handlers — only the container differs, so the
  // two presentations cannot drift in what they offer.
  const isPhone = useMediaQuery(PHONE_QUERY, false);
  const rowCount = results.length + (showCreate ? 1 : 0);
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const activeId = active >= 0 && active < rowCount ? optionId(active) : undefined;
  useActiveOptionScroll(activeId);
  // The consumers resolve their own props against the provider already; this is
  // for the loading row, which no consumer names, and for a caller that renders the
  // panel directly and leaves the two optional strings out.
  const labels = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS);

  // The WAI-ARIA APG's listbox keyboard, in full: Up/Down step, Home/End jump, Enter
  // commits, Tab leaves. Escape is the one key handled elsewhere — `useComboboxCore`
  // registers it on the document, so it answers wherever focus has ended up.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(rowCount - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < results.length) onChoose(results[active]);
      else if (showCreate) onCreate();
    } else if (e.key === "Tab") {
      // The panel is PORTALLED to <body>, so the browser's own Tab would move from
      // here to whatever follows the portal — i.e. off the end of the document. The
      // trade is one extra Tab (trigger, then onward) against never stranding focus
      // at the bottom of the page.
      e.preventDefault();
      closeToTrigger();
    }
  };

  if (!core.open || typeof document === "undefined") return null;

  const list = (
    <ul
      id={listboxId}
      role="listbox"
      aria-multiselectable={multi}
      className={cn("min-h-0 flex-1 overflow-y-auto py-1", isPhone && "flex-none")}
    >
      {busy && results.length === 0 && (
        // The ellipsis is the picture; the words are for a reader, who otherwise met
        // an empty-looking list with a lone "…" in it — or, in most readers, nothing
        // at all, since punctuation alone is skipped. `relative` so the sr-only text
        // has a local containing block (see sr-only-containment.test).
        <li className="relative px-3 py-2 text-sm text-[var(--text-muted)]">
          <span aria-hidden>…</span>
          <span className="sr-only">{labels.loading}</span>
        </li>
      )}
      {!busy && results.length === 0 && !showCreate && (
        <li className="px-3 py-2 text-sm text-[var(--text-muted)]">
          {emptyLabel ?? labels.noResults}
        </li>
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
                  "font-semibold uppercase tracking-wide text-[var(--text-muted)]",
                  isPhone ? "px-4 pb-1 pt-3 text-xs" : "px-3 pb-0.5 pt-2 text-[11px] first:pt-1",
                )}
              >
                {o.group}
              </li>
            )}
          <li role="presentation">
            <button
              type="button"
              id={optionId(i)}
              role="option"
              aria-selected={selected}
              tabIndex={-1}
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
                  ? "bg-[var(--bg-active)]"
                  : !isPhone && "hover:bg-[var(--bg-hover)]",
              )}
            >
              {multi && (
                <span
                  // The checkbox is a PICTURE of `aria-selected` above, so a reader
                  // that met both would be told twice.
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    selected
                      ? "border-[var(--bg-inverse)] bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                      : "border-[var(--border-strong)] bg-[var(--bg-surface)]",
                  )}
                >
                  {selected && <Check className="size-3" />}
                </span>
              )}
              {o.icon && <span className="shrink-0">{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[var(--text-primary)]">{o.label}</span>
                {o.sublabel && (
                  <span className="block truncate text-xs text-[var(--text-placeholder)]">
                    {o.sublabel}
                  </span>
                )}
              </span>
              {!multi && selected && <Check className="size-4 shrink-0 text-[var(--brand)]" />}
            </button>
          </li>
          </Fragment>
        );
      })}
      {showCreate && (
        <li role="presentation">
          <button
            type="button"
            id={optionId(results.length)}
            role="option"
            // Never chosen — it is an action, and it disappears the moment it has
            // been taken. Whether the keyboard is ON it is `aria-activedescendant`'s
            // job to say.
            aria-selected={false}
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              onCreate();
            }}
            onMouseEnter={() => setActive(results.length)}
            className={cn(
              isPhone
                ? SHEET_ROW_CLASS
                : "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
              "text-[var(--text-secondary)]",
              active === results.length && !isPhone
                ? "bg-[var(--bg-active)]"
                : !isPhone && "hover:bg-[var(--bg-hover)]",
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
        // First, so the sheet's own props below win: `rest` is typed as div
        // attributes, and the DOM's `title` is a tooltip string where the sheet's is
        // its heading — one name, two meanings, and the sheet's is the one the caller
        // asked for.
        {...rest}
        className={className}
        style={style}
        open
        onClose={() => core.setOpen(false)}
        title={sheetTitle}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={searchPlaceholder ?? labels.search}
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
      // Spread FIRST: `onKeyDown` below is the listbox keyboard (Up/Down/Home/End/
      // Enter/Tab) and the placement is measured rather than chosen, so neither is a
      // caller's to replace by accident — while a `data-*` anchor or an
      // `aria-describedby` has nothing to collide with.
      {...rest}
      ref={panelRef}
      onKeyDown={onKeyDown}
      // `placement` keeps the panel inside the region actually on screen: on a phone
      // the search box below pulls up the keyboard, and a panel pinned under a
      // low trigger would otherwise sit entirely behind it (feedback #135).
      style={{
        ...style,
        position: "fixed",
        top: placement.top,
        left: rect.left,
        width: rect.width,
        minWidth: 220,
        maxHeight: placement.maxHeight,
      }}
      className={cn(
        "z-50 flex flex-col rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg",
        className,
      )}
    >
      <DropdownSearchHeader
        query={query}
        onQueryChange={setQuery}
        inputRef={inputRef}
        placeholder={searchPlaceholder ?? labels.search}
        // Focus is in this box while the list is up, so this is what has to name the
        // list and the row the arrows are on.
        listboxId={listboxId}
        activeId={activeId}
      />
      {/* One list, two containers: the desktop panel and the phone sheet render
          the same rows through the same handlers (live #200). */}
      {list}
    </div>,
    document.body,
  );
}
