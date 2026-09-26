import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useHref, useInRouterContext, useNavigate } from "react-router";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { Tooltip } from "../components/tooltip";
import { TOPBAR_TRIGGER_CLASS } from "../shell/topbar-controls";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { CommandPalette, DEFAULT_COMMAND_PALETTE_LABELS, useCommandKey } from "./command-palette";
import type { CommandItem, CommandPaletteDensity, CommandPaletteLabels } from "./command-palette";
import { createSearchIndex } from "./search-index";
import type { SearchEntry, SearchIndexOptions } from "./search-index";

export interface GlobalSearchLabels {
  /** The trigger's accessible name, and the dialog's. */
  trigger: string;
  /** The field's placeholder — says WHAT can be found, which "Search…" does not. */
  placeholder: string;
  /** The trigger's tooltip, given the shortcut as the platform writes it ("⌘K",
   *  "Ctrl K"). A function so a language can put the keys where its grammar wants. */
  shortcut: (keys: string) => string;
  /** Heading of the suggestions shown for an empty query. */
  suggestions: string;
  /** Heading for entries that name no `group`. */
  results: string;
}

export const DEFAULT_GLOBAL_SEARCH_LABELS: GlobalSearchLabels = {
  trigger: "Search",
  placeholder: "Search or jump to…",
  shortcut: (keys) => `Search (${keys})`,
  suggestions: "Try",
  results: "Results",
};

/**
 * A place results come from that is not the static index — a server search, a
 * local-first store too large to hand over whole. Each source is its own group, with its
 * own debounce, its own "Searching…" line and its own failure: the static groups never
 * wait for it, and one source failing never takes another's results with it.
 */
export interface GlobalSearchSource {
  /** Stable key — the effect that runs the source is keyed by it, not by identity. */
  id: string;
  /** The group its results are shown under (an entry's own `group` is ignored). */
  group: string;
  /** Called with the trimmed query. Its results are shown AS GIVEN — the source ranked
   *  them — and never re-filtered by the index's matcher. `signal` aborts when the query
   *  moves on or the palette closes; a stale answer is dropped either way. */
  search: (query: string, signal: AbortSignal) => Promise<readonly SearchEntry[]> | readonly SearchEntry[];
  /** Shortest query it is asked for. Default 2 — one letter matches half a database. */
  minChars?: number;
  /** Quiet period after the last keystroke before it is asked. Default 200ms. */
  debounceMs?: number;
  /** Rows kept. Default: `indexOptions.groupLimit` (8). */
  limit?: number;
  /** Mask every row of this source for session replay, hints (amounts) included. An
   *  entry's own `redact` still wins. */
  redact?: boolean;
  /** Told when `search` throws or rejects (not when it is aborted). The group then
   *  shows the palette's `error` line instead of rows. */
  onError?: (error: unknown) => void;
}

/** What a custom trigger gets: everything the default button uses. */
export interface GlobalSearchTriggerProps {
  open: () => void;
  /** Resolved `trigger` label — the accessible name. */
  label: string;
  /** Resolved `shortcut(keys)` — the tooltip. */
  tooltip: string;
  /** "⌘K" on Apple platforms, "Ctrl K" elsewhere. */
  keys: string;
  /** For the trigger's `aria-keyshortcuts`. */
  ariaKeyShortcuts: string;
}

/** A suggestion for the empty query: an entry, the `id` of one in `entries`, or a query
 *  to type into the field. */
export type GlobalSearchSuggestion = SearchEntry | string | { query: string };

export interface GlobalSearchProps {
  /**
   * The static index: pages, actions, settings rows — already filtered by the app (by
   * role, by privacy mode). Matched and ranked by {@link createSearchIndex}.
   *
   * Changing it re-runs the open search by itself. Nothing has to be stable: the index is
   * rebuilt only when the entries' TEXT changes (ids, titles, keywords, …), so a list
   * rebuilt on every render — `data = []` while a query is pending, icons as fresh JSX —
   * neither re-indexes nor loops, and the icons and handlers used are always the latest.
   */
  entries?: readonly SearchEntry[];
  /** The async sources, each streamed into its own group. */
  sources?: readonly GlobalSearchSource[];
  /** What the empty query shows, under the `suggestions` heading. */
  suggestions?: readonly GlobalSearchSuggestion[];
  /**
   * Show each suggested ENTRY under its own `group` instead of all of them under the
   * one `suggestions` heading — keksdose's empty palette listed "Pages" and "Actions"
   * apart, and one "Try" heading over both lost the difference. An entry with no
   * `group` and a query suggestion (`{ query }`) stay under `suggestions`. `groupOrder`
   * orders these groups as it orders the results'. Off by default.
   */
  suggestionsKeepGroups?: boolean;
  /** Groups listed here come first, in this order; the rest follow in ranking order. */
  groupOrder?: readonly string[];
  /** Ranking and capping — `groupLimit` (default 8) applies to every group. */
  indexOptions?: SearchIndexOptions;
  /**
   * How an entry's `href` is followed on a plain click or ↵. Default: react-router's
   * `navigate` when the search is rendered inside a router, else a full page load.
   */
  navigate?: (href: string) => void;
  /**
   * The browser URL of an `href`, for the row's real link (middle-/⌘-click opens a tab).
   * Default inside a router: the router's own (`#/page` under a hash router, the
   * basename prefixed under a browser router); outside one, the href itself.
   */
  hrefFor?: (href: string) => string;
  /** Register ⌘K / Ctrl K. Default true; turn it off for a second, scoped search on a
   *  page that already has the app-wide one. */
  shortcut?: boolean;
  /** Controlled open state — so a button anywhere can open it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled query, as on `CommandPalette` (keksdose binds it to the URL's `q`). */
  query?: string;
  onQueryChange?: (query: string) => void;
  searchOn?: "input" | "submit";
  /** Mask every row for session replay (see `CommandPalette`). A source's or an entry's
   *  own `redact` wins. */
  redactLabels?: boolean;
  fullScreenOnPhone?: boolean;
  /** `"button"` (default): the top-bar icon button. `"none"`: no trigger — the shortcut
   *  or a controlled `open` opens it. A function renders a trigger of your own. */
  trigger?: "button" | "none" | ((props: GlobalSearchTriggerProps) => ReactNode);
  /** Hide the default trigger below `sm` (kastlan's phone top bar has no room). */
  hideTriggerOnPhone?: boolean;
  /** Class for the default trigger button, merged over `TOPBAR_TRIGGER_CLASS`. */
  triggerClassName?: string;
  /**
   * The default trigger's magnifier, in px. Default 16 (`size-4`), as it always was;
   * 20 matches the kit's other top-bar triggers (`TopbarIconButton` draws `size-5`) and
   * keksdose's top bar, which reached into the button with `[&_svg]:size-5` for it.
   */
  triggerIconSize?: number;
  /** The palette's row height — `CommandPalette`'s `density`. Default `"compact"`. */
  density?: CommandPaletteDensity;
  labels?: Partial<GlobalSearchLabels>;
  /** Passed through to the palette (`empty`, `loading`, `error`, `hint`, …). */
  paletteLabels?: Partial<CommandPaletteLabels>;
}

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent);
}

const pageLoad = (href: string) => window.location.assign(href);
const identity = (href: string) => href;

/** The entries' text, which is all the index reads — see `entries`. */
function signature(entries: readonly SearchEntry[]): string {
  return entries
    .map((e) =>
      [e.id, e.title, (e.keywords ?? []).join("\u0003"), e.description, e.group, e.hint, e.href, e.weight, e.redact].join(
        "\u0001",
      ),
    )
    .join("\u0002");
}

/** Focus the open palette's field again — after a suggestion typed itself into it, the
 *  row that was clicked (and held focus) is gone. */
function refocusField() {
  requestAnimationFrame(() => {
    const fields = document.querySelectorAll<HTMLInputElement>('[role="dialog"][aria-modal="true"] input[role="combobox"]');
    fields[fields.length - 1]?.focus();
  });
}

interface SourceResult {
  query: string;
  status: "loading" | "done" | "error";
  entries: readonly SearchEntry[];
}

/**
 * The app-wide ⌘K search, whole: the top-bar trigger, the shortcut, and a
 * {@link CommandPalette} fed from a ranked index ({@link createSearchIndex}) and any
 * number of async sources.
 *
 * Every consumer had built this out of `CommandPalette` by hand, and each copy had the
 * same holes — a substring match, no ranking, no typo tolerance, results in declaration
 * order, one monolithic provider in which the static groups waited on the slowest
 * request. This is that wrapper once:
 *
 *     <GlobalSearch
 *       entries={pages}              // { id, title, keywords, group, href, icon }
 *       sources={[{ id: "tx", group: "Transactions", search: (q, signal) => api.search(q, { signal }) }]}
 *       suggestions={["page-budget", "action-new-account"]}
 *     />
 *
 * Inside a react-router tree it navigates with the router and builds its links with it;
 * outside one, pass `navigate` (or accept full page loads).
 */
export function GlobalSearch(props: GlobalSearchProps) {
  // Two components rather than a conditional hook: `useNavigate` throws outside a
  // router, and whether we are in one does not change over a component's life.
  const inRouter = useInRouterContext();
  if (inRouter && (!props.navigate || !props.hrefFor)) return <RoutedGlobalSearch {...props} />;
  return <GlobalSearchImpl {...props} navigate={props.navigate ?? pageLoad} hrefFor={props.hrefFor ?? identity} />;
}

function RoutedGlobalSearch(props: GlobalSearchProps) {
  const routerNavigate = useNavigate();
  // The router's href for "/" is its base ("#/" under a hash router, "/app/" under a
  // basename); every href is that base plus the path.
  const base = useHref("/").replace(/\/$/, "");
  const navigate = useCallback((href: string) => void routerNavigate(href), [routerNavigate]);
  const hrefFor = useCallback((href: string) => (href.startsWith("/") ? base + href : href), [base]);
  return <GlobalSearchImpl {...props} navigate={props.navigate ?? navigate} hrefFor={props.hrefFor ?? hrefFor} />;
}

function GlobalSearchImpl({
  entries,
  sources,
  suggestions,
  suggestionsKeepGroups = false,
  groupOrder,
  indexOptions,
  navigate,
  hrefFor,
  shortcut = true,
  open: openProp,
  onOpenChange,
  query: queryProp,
  onQueryChange,
  searchOn,
  redactLabels = false,
  fullScreenOnPhone,
  trigger = "button",
  hideTriggerOnPhone = false,
  triggerClassName,
  triggerIconSize,
  density,
  labels,
  paletteLabels,
}: GlobalSearchProps & { navigate: (href: string) => void; hrefFor: (href: string) => string }) {
  const l = useKitLabels("globalSearch", DEFAULT_GLOBAL_SEARCH_LABELS, labels);
  const pl = useKitLabels("commandPalette", DEFAULT_COMMAND_PALETTE_LABELS, paletteLabels);
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const [ownQuery, setOwnQuery] = useState("");
  const queryControlled = queryProp !== undefined;
  const query = queryControlled ? queryProp : ownQuery;
  const q = query.trim();

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  const setQuery = useCallback(
    (next: string) => {
      if (!queryControlled) setOwnQuery(next);
      onQueryChange?.(next);
    },
    [queryControlled, onQueryChange],
  );

  // Each open starts blank — unless the owner controls the query (a URL `q`). Adjusted
  // during render, React's pattern for state that follows a prop, so a controlled `open`
  // gets the same reset as the trigger does.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open && !queryControlled) setOwnQuery("");
  }

  const openSearch = useCallback(() => setOpen(true), [setOpen]);
  const noop = useCallback(() => {}, []);
  useCommandKey(shortcut ? openSearch : noop);

  /* ── the static index ─────────────────────────────────────────────────── */

  // Everything below is keyed by CONTENT, never by the identity of what the app passed:
  // inline arrays and `data = []` defaults are the norm, and an identity key would
  // re-index and re-search on every render of the app. Handlers, which can close over
  // anything, are read from refs at the moment a row is chosen — never stale.
  const list = entries ?? EMPTY;
  const sig = signature(list);
  const optionsKey = JSON.stringify(indexOptions ?? {});
  const groupLimit = indexOptions?.groupLimit ?? 8;
  // `sig` and `optionsKey` stand for `list` and `indexOptions`: same text, same index.
  /* eslint-disable react-hooks/exhaustive-deps */
  const index = useMemo(() => createSearchIndex(list, indexOptions), [sig, optionsKey]);
  const byId = useMemo(() => new Map(list.map((e) => [e.id, e])), [sig]);

  const sourceKey = (sources ?? [])
    .map((s) => [s.id, s.group, s.minChars ?? 2, s.debounceMs ?? 200, s.limit, s.redact].join("\u0001"))
    .join("\u0002");
  const sourceList = useMemo(() => sources ?? [], [sourceKey]);

  const suggestionsKey = (suggestions ?? [])
    .map((s) => (typeof s === "string" ? `i:${s}` : "query" in s ? `q:${s.query}` : `e:${signature([s])}`))
    .join("\u0002");
  const suggestionList = useMemo(() => suggestions ?? [], [suggestionsKey]);

  const groupOrderKey = (groupOrder ?? []).join("\u0002");
  const order = useMemo(() => groupOrder ?? [], [groupOrderKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // The live objects, for the moment a row is chosen or a source is asked.
  const live = useRef({ entries: list, sources: sources ?? [], suggestions: suggestions ?? [], navigate });
  useLayoutEffect(() => {
    live.current = { entries: list, sources: sources ?? [], suggestions: suggestions ?? [], navigate };
  });

  /* ── the async sources ────────────────────────────────────────────────── */

  const [sourceResults, setSourceResults] = useState<Record<string, SourceResult>>({});
  useEffect(() => {
    const controllers: AbortController[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const asked = open ? live.current.sources.filter((s) => q.length >= (s.minChars ?? 2)) : [];
    for (const source of asked) {
      const id = source.id;
      const controller = new AbortController();
      controllers.push(controller);
      timers.push(
        setTimeout(async () => {
          const settle = (result: SourceResult) => {
            if (!controller.signal.aborted) setSourceResults((prev) => ({ ...prev, [id]: result }));
          };
          try {
            const found = await source.search(q, controller.signal);
            settle({ query: q, status: "done", entries: found });
          } catch (error) {
            if (controller.signal.aborted) return;
            source.onError?.(error);
            settle({ query: q, status: "error", entries: [] });
          }
        }, source.debounceMs ?? 200),
      );
    }
    return () => {
      timers.forEach(clearTimeout);
      controllers.forEach((c) => c.abort());
    };
  }, [open, q, sourceKey]);

  /* ── rows ─────────────────────────────────────────────────────────────── */

  const toItem = useCallback(
    (prefix: string, entry: SearchEntry, group: string, redact = redactLabels): CommandItem => ({
      id: `${prefix}${entry.id}`,
      label: entry.title,
      hint: entry.hint,
      group,
      icon: entry.icon,
      redact: entry.redact ?? redact,
      href: entry.href !== undefined ? hrefFor(entry.href) : undefined,
      onSelect: () => {
        // The entry as the app has it NOW — its handler may close over newer state
        // than the one this row was built from.
        const current = live.current.entries.find((e) => e.id === entry.id) ?? entry;
        if (current.onSelect) current.onSelect();
        else if (current.href !== undefined) live.current.navigate(current.href);
      },
    }),
    [hrefFor, redactLabels],
  );

  // `toItem` only BUILDS `onSelect` closures here; `live` is read when a row is chosen,
  // which the compiler lint cannot tell from a read during render.
  /* eslint-disable react-hooks/refs */
  const items = useMemo((): CommandItem[] => {
    const ordered = (out: CommandItem[]) => {
      if (!order.length) return out;
      const rank = (group: string) => {
        const i = order.indexOf(group);
        return i === -1 ? order.length : i;
      };
      // Stable: within a rank, groups keep the order their best hit gave them.
      return out
        .map((item, i) => ({ item, i }))
        .sort((a, b) => rank(a.item.group) - rank(b.item.group) || a.i - b.i)
        .map(({ item }) => item);
    };

    if (!q) {
      const out: CommandItem[] = [];
      const groupOf = (entry: SearchEntry) =>
        suggestionsKeepGroups ? (entry.group ?? l.suggestions) : l.suggestions;
      suggestionList.forEach((s, i) => {
        if (typeof s === "string") {
          const entry = byId.get(s);
          if (entry) out.push(toItem("try:", entry, groupOf(entry)));
        } else if ("query" in s) {
          out.push({
            id: `try:q${i}`,
            label: s.query,
            group: l.suggestions,
            icon: <Search className="size-4" />,
            onSelect: () => {
              // The palette closes before it runs a row; a query suggestion keeps it
              // open and types itself in instead.
              setOpen(true);
              setQuery(s.query);
              refocusField();
            },
          });
        } else out.push(toItem("try:", s, groupOf(s)));
      });
      // One heading has nothing to order; kept groups are ordered like results.
      return suggestionsKeepGroups ? ordered(out) : out;
    }

    const out = index.search(q).map((hit) => toItem("s:", hit.entry, hit.entry.group ?? l.results));
    for (const source of sourceList) {
      if (q.length < (source.minChars ?? 2)) continue;
      const result = sourceResults[source.id];
      const status = (label: string, icon: ReactNode): CommandItem => ({
        id: `src:${source.id}:status`,
        label,
        group: source.group,
        icon,
        kind: "status",
        onSelect: noop,
      });
      // Anything but an answer to THIS query is still loading — including the previous
      // query's rows, which would otherwise sit under the new query as if they matched.
      if (!result || result.query !== q) {
        out.push(status(pl.loading, <Loader2 className="size-3.5 animate-spin" />));
      } else if (result.status === "error") {
        out.push(status(pl.error ?? DEFAULT_COMMAND_PALETTE_LABELS.error!, <AlertCircle className="size-3.5" />));
      } else {
        for (const entry of result.entries.slice(0, source.limit ?? groupLimit)) {
          out.push(toItem(`src:${source.id}:`, entry, source.group, source.redact ?? redactLabels));
        }
      }
    }

    return ordered(out);
  }, [q, suggestionList, suggestionsKeepGroups, byId, index, sourceList, sourceResults, order, groupLimit, toItem, l.suggestions, l.results, pl.loading, pl.error, setOpen, setQuery, noop, redactLabels]);
  /* eslint-enable react-hooks/refs */

  // The palette re-runs its provider on a `revision` change, never on the provider's
  // identity — and `items` is everything the provider answers with.
  const provider = useCallback(() => items, [items]);

  const resolvedPaletteLabels = useMemo(
    () => ({ dialog: l.trigger, placeholder: l.placeholder, ...paletteLabels }),
    [l.trigger, l.placeholder, paletteLabels],
  );

  const apple = useMemo(() => isApplePlatform(), []);
  const keys = apple ? "⌘K" : "Ctrl K";
  const triggerProps: GlobalSearchTriggerProps = {
    open: openSearch,
    label: l.trigger,
    tooltip: l.shortcut(keys),
    keys,
    ariaKeyShortcuts: "Meta+K Control+K",
  };

  return (
    <>
      {typeof trigger === "function"
        ? trigger(triggerProps)
        : trigger === "button" && (
            <Tooltip
              label={triggerProps.tooltip}
              side="bottom"
              portal
              className={hideTriggerOnPhone ? "hidden sm:block" : undefined}
            >
              <button
                type="button"
                onClick={openSearch}
                aria-label={l.trigger}
                aria-keyshortcuts={triggerProps.ariaKeyShortcuts}
                aria-haspopup="dialog"
                className={cn(TOPBAR_TRIGGER_CLASS, triggerClassName)}
              >
                <Search
                  className={triggerIconSize === undefined ? "size-4" : undefined}
                  style={triggerIconSize === undefined ? undefined : { width: triggerIconSize, height: triggerIconSize }}
                />
              </button>
            </Tooltip>
          )}
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={provider}
        revision={items}
        query={query}
        onQueryChange={setQuery}
        searchOn={searchOn}
        redactLabels={redactLabels}
        fullScreenOnPhone={fullScreenOnPhone}
        density={density}
        labels={resolvedPaletteLabels}
      />
    </>
  );
}

const EMPTY: readonly SearchEntry[] = [];
