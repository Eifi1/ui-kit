import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, Search, X } from "lucide-react";
import { cn } from "../lib/cn";
import { PHONE_QUERY } from "../components/ui";
import { useMediaQuery } from "../hooks/use-media-query";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useKitLabels } from "../i18n/kit-labels";

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
  /** Where this item leads, when it is a navigation rather than an action. Renders
   *  the row as a real anchor so it can be middle-/⌘-clicked into a new tab
   *  (Keksdose feedback #451); `onSelect` still runs for a plain click and for ↵, so
   *  in-app navigation stays client-side. `href` only adds what the browser can do
   *  with a link and JavaScript cannot fake — the rejected alternative, an
   *  `onAuxClick` calling `window.open`, gets the middle click and nothing else. */
  href?: string;
  /** Marks this row's label and hint `data-private`, so session replay and screenshot
   *  tooling masks them — a payee, an account name, an amount. Overrides the palette's
   *  {@link CommandPaletteProps.redactLabels} either way, so `false` un-masks one
   *  harmless row ("Settings") in a palette that masks by default. */
  redact?: boolean;
  /**
   * `"status"` makes the row a line of text rather than a choice — a group's
   * "Searching…" while its source is still out, or its error. It is skipped by the
   * arrow keys and ↵, has no hover highlight, and its `onSelect` is never called.
   * Default `"option"`.
   */
  kind?: "option" | "status";
}

/** Group items preserving first-seen group order; `flat` is the navigable rows only. */
function groupItems(items: CommandItem[]) {
  const order: string[] = [];
  const byGroup = new Map<string, CommandItem[]>();
  for (const item of items) {
    if (!byGroup.has(item.group)) {
      byGroup.set(item.group, []);
      order.push(item.group);
    }
    byGroup.get(item.group)!.push(item);
  }
  return {
    groups: order.map((g) => ({ group: g, items: byGroup.get(g)! })),
    flat: order.flatMap((g) => byGroup.get(g)!).filter((item) => item.kind !== "status"),
  };
}

export interface CommandPaletteLabels {
  placeholder: string;
  empty: string;
  loading: string;
  /** Hint shown in the footer, e.g. "↑↓ to navigate · ↵ to select · esc to close". */
  hint?: string;
  /**
   * Accessible name of the dialog itself. It used to borrow `placeholder`, which is
   * written to sit greyed-out in an empty box ("Search…", "Type a command"), not to
   * name a window — and a reader heard the ellipsis read out as part of the name.
   *
   * Optional, unlike `placeholder`, so a translation annotated as
   * `CommandPaletteLabels` keeps compiling; the default always carries it.
   */
  dialog?: string;
  /**
   * Shown in place of the results when the `search` provider throws or its promise
   * rejects. Optional for the same reason as `dialog`; the default always carries it.
   */
  error?: string;
  /** Names the "×" that empties the field. Optional like `dialog`. */
  clear?: string;
  /** Names the button that commits the typed text when `searchOn="submit"`. */
  submit?: string;
  /** Names the close button of the full-screen phone presentation, which has no
   *  backdrop to tap and, on a phone, no Escape key. */
  close?: string;
}

export const DEFAULT_COMMAND_PALETTE_LABELS: CommandPaletteLabels = {
  placeholder: "Search…",
  empty: "No results",
  loading: "Searching…",
  dialog: "Search",
  error: "Search failed. Try again.",
  clear: "Clear search",
  submit: "Search",
  close: "Close",
};

/** The defaults minus `dialog`, so a resolved `dialog` means someone SUPPLIED one —
 *  see the dialog's `aria-label` for why that distinction matters. */
const { dialog: DEFAULT_DIALOG_NAME, ...DEFAULTS_WITHOUT_DIALOG } = DEFAULT_COMMAND_PALETTE_LABELS;

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /**
   * Returns results for a query (called debounced as the user types; an empty
   * query is allowed — return defaults like pages/recent). Sync or async; stale
   * async responses are ignored.
   *
   * Its IDENTITY is not a re-run signal — it is read through a ref, so the palette
   * never re-searches merely because the caller rebuilt the callback. That is
   * deliberate: a provider closing over a list rendered from a query allocates a new
   * function on most renders, and re-running the search on each would make typing
   * stutter. Use {@link CommandPaletteProps.revision} when the DATA behind the
   * provider changes.
   */
  search: (query: string) => CommandItem[] | Promise<CommandItem[]>;
  /**
   * Anything whose change means the current results are out of date — typically the
   * arrays the provider searches over. Compared by identity (as an effect dependency
   * would be), so pass stable references: a `data = []` default allocates a fresh
   * array on every render while a query is pending and would re-search forever.
   *
   * Without it, a provider whose data arrives AFTER the palette opened never gets
   * asked again: the user's last keystroke settles the debounce, the queries resolve a
   * moment later, and the groups they would have contributed are simply absent until
   * another keystroke. That is the ordinary first open on a cold cache.
   */
  revision?: unknown;
  /**
   * The search text, CONTROLLED. Keksdose binds it to the URL's `q`, so a search
   * survives a reload, can be shared as a link, and Back walks through it — none of
   * which state inside the palette can do.
   *
   * Leave it out and the palette keeps its own, as before, starting empty on every
   * open. Given, it is never reset on open: the owner decides what an open shows, and
   * a palette that blanked the URL's `q` each time would fight its own address bar.
   * `onQueryChange` is then how a keystroke gets anywhere, since it is the only writer.
   */
  query?: string;
  /** Every edit of the field's text. Fires in both modes — uncontrolled, it only
   *  observes. */
  onQueryChange?: (query: string) => void;
  /**
   * When the typed text becomes THE query — the one `search` runs on and
   * `onQueryChange` reports.
   *
   * - `"input"` (default): every keystroke, debounced for the search, as before.
   * - `"submit"`: typing edits a draft; the query is committed by ↵ or the submit
   *   button beside the field. Until then the results stay on the last committed query
   *   and `onQueryChange` stays quiet — which is what an owner binding `query` to the
   *   URL's `q` needs, or every keystroke re-filters the page behind and pushes history.
   *   ↵ with a draft that differs from the committed query COMMITS; ↵ with nothing new
   *   typed chooses the highlighted row, as in `"input"` mode. The draft follows any
   *   outside change of the committed query (Back through the URL), and an uncommitted
   *   draft is dropped when the palette is closed.
   *
   * The clear "×" commits the empty query in both modes: an emptied box over results
   * (or a page) still filtered by the old text is the stuck state Keksdose #423 was.
   */
  searchOn?: "input" | "submit";
  /** Mark every row's label and hint `data-private` (see {@link CommandItem.redact},
   *  which overrides it per row). Off by default. */
  redactLabels?: boolean;
  /**
   * Below the phone breakpoint ({@link PHONE_QUERY}) the palette fills the screen:
   * no inset, no rounded panel, the field pinned at the top inside the safe areas and
   * the list scrolling under it, with a close button since there is no backdrop to tap.
   * On by default — a top-centred card at 70vh leaves little room once the keyboard is
   * up. `false` keeps the card on every viewport.
   */
  fullScreenOnPhone?: boolean;
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
export function CommandPalette({
  open,
  onClose,
  search,
  revision,
  query: queryProp,
  onQueryChange,
  searchOn = "input",
  redactLabels = false,
  fullScreenOnPhone = true,
  labels,
}: CommandPaletteProps) {
  const l = useKitLabels("commandPalette", DEFAULTS_WITHOUT_DIALOG, labels);
  // `dialog` is new, and until it existed the dialog was named by `placeholder`. An
  // app that translated `placeholder` and has not heard of `dialog` would otherwise
  // go from a German name to an English "Search" on update — so a translated
  // placeholder keeps doing the job until a `dialog` is supplied.
  const dialogName =
    l.dialog ??
    (l.placeholder !== DEFAULT_COMMAND_PALETTE_LABELS.placeholder ? l.placeholder : DEFAULT_DIALOG_NAME);
  const [ownQuery, setOwnQuery] = useState("");
  const controlled = queryProp !== undefined;
  const query = controlled ? queryProp : ownQuery;
  const setQuery = (next: string) => {
    if (!controlled) setOwnQuery(next);
    onQueryChange?.(next);
  };
  const submitMode = searchOn === "submit";
  // The field's text in `"submit"` mode. It follows the committed query whenever that
  // changes — adjusted during render, React's pattern for state derived from a prop,
  // rather than in an effect that would paint the stale draft first.
  const [draft, setDraft] = useState(query);
  const [draftBase, setDraftBase] = useState(query);
  if (draftBase !== query) {
    setDraftBase(query);
    setDraft(query);
  }
  const fieldText = submitMode ? draft : query;
  const commit = (next: string) => {
    setDraft(next);
    setQuery(next);
  };
  const dirty = submitMode && draft !== query;
  const isPhone = useMediaQuery(PHONE_QUERY, false) && fullScreenOnPhone;
  const [results, setResults] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  // Per instance: these were the literal "command-palette-list" / "command-item-<id>",
  // so two palettes on one page (an app-wide one and a scoped one) pointed each
  // other's `aria-controls` and `aria-activedescendant` at the wrong list.
  const uid = useId();
  const listId = `${uid}-list`;
  const itemId = (id: string) => `${uid}-item-${id}`;
  const groupId = (index: number) => `${uid}-group-${index}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef(search);
  searchRef.current = search;
  const reqId = useRef(0);
  /** The query the results on screen answer, and the row highlighted in them — so a
   *  re-run for the SAME query (a `revision` change: a source streaming in) keeps the
   *  highlight on its row instead of throwing it back to the top mid-arrow. */
  const shownQuery = useRef<string | null>(null);
  const activeIdRef = useRef<string | undefined>(undefined);

  // Back dismisses the palette (Keksdose feedback #172). Declared with the other
  // hooks, above the `if (!open) return null` below — a hook past a conditional
  // return changes the hook order between renders. Passing `open` rather than
  // mounting-while-open is what lets it sit here.
  useOverlayHistory(open, onClose);

  // A modal like any other: Tab stays inside, the page behind does not scroll, and
  // focus goes back to whatever opened it — the palette used to drop it on <body>.
  // Initial focus is the field, not the container: typing is the only reason to open it.
  useFocusTrap(dialogRef, { active: open, initialFocus: () => inputRef.current });
  useBodyScrollLock(open);

  // Reset when opened — the palette's OWN text only; a controlled query belongs to
  // its owner (see the prop).
  useEffect(() => {
    if (!open) return;
    if (!controlled) setOwnQuery("");
    // An uncommitted draft does not outlive the open it was typed in.
    setDraft(controlled ? query : "");
    setActive(0);
    shownQuery.current = null;
    // `controlled` is read at the open, not watched: a caller switching modes while
    // the palette is open is not a reason to wipe what is typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const keep = shownQuery.current === query ? activeIdRef.current : undefined;
          const at = keep === undefined ? -1 : groupItems(r).flat.findIndex((item) => item.id === keep);
          shownQuery.current = query;
          setResults(r);
          setFailed(false);
          setActive(Math.max(at, 0));
        }
      } catch (err) {
        // There was no catch: the previous query's results stayed on screen as if they
        // answered this one, and the rejection went unhandled. Clear them and say so.
        if (reqId.current === id) {
          shownQuery.current = null;
          setResults([]);
          setFailed(true);
          setActive(0);
        }
        console.error("CommandPalette: search failed", err);
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    };
    const t = setTimeout(run, query ? 150 : 0);
    return () => clearTimeout(t);
    // `revision`, not `search`: see the prop's docstring. The debounce is re-armed on a
    // revision change, which is right — data arriving is not a keystroke and there is
    // nothing to feel laggy about.
  }, [query, open, revision]);

  // Group results, preserving first-seen group order; keep a flat list for nav.
  const { groups, flat } = useMemo(() => groupItems(results), [results]);
  useEffect(() => {
    activeIdRef.current = flat[active]?.id;
  });

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
      if (dirty) commit(draft);
      else choose(flat[active]);
    }
  };

  // Escape on the whole dialog, not only the field: once Tab has moved focus to a row
  // (or a footer control), Escape used to do nothing at all.
  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
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
      className={cn(
        "fixed inset-0 z-[70] flex items-start justify-center bg-black/40",
        isPhone ? "p-0" : "p-4 pt-[10vh]",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape from anywhere in the dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={dialogName}
        // The trap's fallback target when the field is not there to take focus.
        tabIndex={-1}
        // Escape bubbling up from anything inside — a dialog is where it belongs.
        onKeyDown={onDialogKeyDown}
        data-fullscreen={isPhone || undefined}
        className={cn(
          "flex w-full flex-col overflow-hidden bg-[var(--bg-surface)] outline-none",
          isPhone
            ? "h-full"
            : "max-h-[70vh] max-w-xl rounded-xl border border-[var(--border)] shadow-2xl",
        )}
        // Full screen means edge to edge, so the notch, the home indicator and the
        // rounded corners are the panel's to keep clear of.
        style={
          isPhone
            ? {
                paddingTop: "max(0px, env(safe-area-inset-top))",
                paddingBottom: "max(0px, env(safe-area-inset-bottom))",
                paddingLeft: "max(0px, env(safe-area-inset-left))",
                paddingRight: "max(0px, env(safe-area-inset-right))",
              }
            : undefined
        }
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3">
          <Search className="size-4 shrink-0 text-[var(--text-placeholder)]" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={flat[active] ? itemId(flat[active].id) : undefined}
            value={fieldText}
            onChange={(e) => (submitMode ? setDraft(e.target.value) : setQuery(e.target.value))}
            onKeyDown={onKeyDown}
            placeholder={l.placeholder}
            enterKeyHint={submitMode ? "search" : undefined}
            className={cn(
              "w-full bg-transparent py-3 outline-none placeholder:text-[var(--text-placeholder)] text-[var(--text-primary)]",
              // 16px on a phone, or iOS zooms the page in on focus.
              isPhone ? "text-base" : "text-sm",
            )}
          />
          {loading && <span className="shrink-0 text-[11px] text-[var(--text-placeholder)]">{l.loading}</span>}
          {fieldText !== "" && (
            <button
              type="button"
              aria-label={l.clear ?? DEFAULT_COMMAND_PALETTE_LABELS.clear}
              onClick={() => {
                commit("");
                // Clearing starts the next query far more often than it ends this one.
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded p-1 text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
            >
              <X className="size-4" />
            </button>
          )}
          {dirty && (
            <button
              type="button"
              aria-label={l.submit ?? DEFAULT_COMMAND_PALETTE_LABELS.submit}
              onClick={() => {
                commit(draft);
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
          {isPhone && (
            <button
              type="button"
              onClick={onClose}
              className="-me-1 shrink-0 rounded px-1 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {l.close ?? DEFAULT_COMMAND_PALETTE_LABELS.close}
            </button>
          )}
        </div>

        {/* The status lines sit outside the listbox: a listbox owns options and groups,
            and "No results" is neither. */}
        {failed && !loading && (
          <div role="alert" className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
            {l.error ?? DEFAULT_COMMAND_PALETTE_LABELS.error}
          </div>
        )}
        {/* `results`, not `flat`: a group whose only row is its "Searching…" line is not
            an empty result. */}
        {!failed && results.length === 0 && !loading && (
          <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">{l.empty}</div>
        )}
        {/* Listbox grouping: each group is a `role="group"` named by its heading, and
            the list markup in between is presentational so the listbox's children are
            groups and options only — as a plain <li>/<ul> tree a reader announced
            "list, 2 items" between options and never tied the heading to its rows. */}
        <ul id={listId} ref={listRef} role="listbox" aria-label={dialogName} className="min-h-0 flex-1 overflow-y-auto py-1">
          {groups.map(({ group, items }, groupIndex) => (
            <li key={group} role="presentation">
              <div
                id={groupId(groupIndex)}
                role="presentation"
                className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-placeholder)]"
              >
                {group}
              </div>
              <ul role="group" aria-labelledby={groupId(groupIndex)}>
                {items.map((item) => {
                  if (item.kind === "status") {
                    return (
                      <li
                        key={item.id}
                        role="presentation"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-placeholder)]"
                      >
                        {item.icon && <span className="flex size-4 shrink-0 items-center justify-center">{item.icon}</span>}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </li>
                    );
                  }
                  flatIndex += 1;
                  const idx = flatIndex;
                  const isActive = idx === active;
                  const redact = item.redact ?? redactLabels;
                  // Written once and worn by either tag below, so the anchor and the
                  // button can never drift apart in looks or in listbox semantics.
                  // `role="option"` on an <a href> is fine: the browser's middle-click
                  // behaviour keys off the element, not the ARIA role.
                  const shared = {
                    id: itemId(item.id),
                    role: "option" as const,
                    "aria-selected": isActive,
                    "data-index": idx,
                    onMouseMove: () => setActive(idx),
                    className: cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm",
                      isActive
                        ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]",
                    ),
                  };
                  const inner = (
                    <>
                      {item.icon && (
                        <span className="flex size-4 shrink-0 items-center justify-center text-[var(--text-placeholder)]">
                          {item.icon}
                        </span>
                      )}
                      <span data-private={redact || undefined} className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {item.hint && (
                        <span data-private={redact || undefined} className="shrink-0 text-xs text-[var(--text-placeholder)]">
                          {item.hint}
                        </span>
                      )}
                    </>
                  );
                  return (
                    <li key={item.id} role="presentation">
                      {item.href ? (
                        <a
                          {...shared}
                          href={item.href}
                          draggable={false}
                          onClick={(e) => {
                            // A modified click belongs to the browser (feedback
                            // #451) — and the palette deliberately stays OPEN for
                            // it: ⌘-clicking three results in a row is the reason to
                            // want this, and closing after the first would undo it.
                            if (
                              e.button !== 0 ||
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.altKey
                            )
                              return;
                            e.preventDefault();
                            choose(item);
                          }}
                        >
                          {inner}
                        </a>
                      ) : (
                        <button type="button" {...shared} onClick={() => choose(item)}>
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        {l.hint && (
          <div className="border-t border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-placeholder)]">
            {l.hint}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
