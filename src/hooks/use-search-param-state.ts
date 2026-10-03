import { createContext, useContext, useMemo, type Context } from "react";
import * as ReactRouter from "react-router";
import { useLocation, useNavigate, useSearchParams, type Location, type NavigateFunction } from "react-router";

type Updater<T> = T | ((prev: T) => T);

export interface SearchParamStateOptions<T> {
  /**
   * The value of a param that IS present. Return `undefined` (or throw) for a value
   * that does not parse — a hand-edited or stale link — and the default is used.
   * Default: the raw string.
   */
  parse?: (raw: string) => T | undefined;
  /**
   * The param for a value, or `null` to remove it. Default: `String(value)`, and
   * `null` for `null` / `undefined`. A value that serialises the same as the default
   * removes the param too, so the default is always the clean URL.
   */
  serialize?: (value: T) => string | null;
  /** Shorthand for `history: "replace"`. */
  replace?: boolean;
  /**
   * What a change does to the browser history:
   *  - `"push"` (default): a new entry, so Back undoes the change.
   *  - `"replace"`: the current entry is rewritten — a tab, a sort, a view toggle,
   *    which are not steps anyone wants Back to walk through.
   *  - `"replace-on-clear"`: push when a value is set, replace when it is cleared (the
   *    "open a form, close it" pattern).
   *
   * Several writes in one tick (one handler) add at most ONE entry — see
   * {@link useSearchParamState}.
   */
  history?: "push" | "replace" | "replace-on-clear";
}

const defaultSerialize = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

/** The route state of the current entry, carried over a `replace` so a query rewrite
 *  does not drop what a navigation put there (a dialog's opener mark, below). */
function carriedState(state: unknown): Record<string, unknown> | undefined {
  return state && typeof state === "object" ? (state as Record<string, unknown>) : undefined;
}

/* ── One param: read and write ───────────────────────────────────────────── */

/** One param's rules — the single hook's arguments, or one field of the multi-key hook. */
interface ParamRule<T> {
  key: string;
  defaultValue: T;
  parse?: (raw: string) => T | undefined;
  serialize: (value: T) => string | null;
  history: "push" | "replace" | "replace-on-clear";
}

function paramRule<T>(key: string, defaultValue: T, options: SearchParamStateOptions<T>): ParamRule<T> {
  return {
    key,
    defaultValue,
    parse: options.parse,
    serialize: options.serialize ?? (defaultSerialize as (value: T) => string | null),
    history: options.history ?? (options.replace ? "replace" : "push"),
  };
}

/** An absent or unparseable param reads as the default. */
function readParam<T>(params: URLSearchParams, rule: ParamRule<T>): T {
  const raw = params.get(rule.key);
  if (raw === null) return rule.defaultValue;
  if (!rule.parse) return raw as unknown as T;
  try {
    const parsed = rule.parse(raw);
    return parsed === undefined ? rule.defaultValue : parsed;
  } catch {
    return rule.defaultValue;
  }
}

/**
 * Writes `value` into `params` — the default removes the param. Returns `null` when
 * the param already says that (a write that changes nothing has no say in the history),
 * otherwise whether this change asks for an entry of its own.
 */
function putParam<T>(params: URLSearchParams, rule: ParamRule<T>, value: T): boolean | null {
  const serialized = rule.serialize(value);
  const next = serialized === rule.serialize(rule.defaultValue) ? null : serialized;
  const current = params.getAll(rule.key);
  if (next === null ? current.length === 0 : current.length === 1 && current[0] === next) return null;
  if (next === null) params.delete(rule.key);
  else params.set(rule.key, next);
  return rule.history === "push" || (rule.history === "replace-on-clear" && next !== null);
}

/* ── Writes that compose ─────────────────────────────────────────────────── */

/**
 * The query as the writes made against ONE rendered location leave it — shared by every
 * hook on that router, so a write builds on the one before it instead of on the render.
 *
 * Why this exists (keksdose live #378): react-router's `setSearchParams(updater)` hands
 * its updater `new URLSearchParams(searchParams)` — the params of the RENDER the setter
 * came from, in react-router 7 and 8 alike — not the previous call's result. keksdose
 * wired TranslationReviewPanel's `onFilterChange` to four of these setters (status,
 * source, ns, q); each started from the rendered URL, so the last wrote the old values
 * of the other three back and no filter select had any effect.
 *
 * Keyed by react-router's location object, which is one object per committed location
 * per router: every hook under a router reads the same one, a second router (another
 * test) has its own, and when react-router renders the next location this record is
 * unreachable — nothing queued outlives the navigation it belongs to. Until then a
 * later write builds on it even a tick on (a transition or a data router's loaders still
 * pending), which is what keeps two quick clicks from clobbering each other either. The
 * one cost: a navigation a data router's blocker stops leaves its writes here, and the
 * page's next write carries them again — the blocker asks again.
 */
interface QueuedQuery {
  /** The query with every write against this location so far. */
  params: URLSearchParams;
  /** The route state of the entry those writes now sit on, carried over a replace. */
  state: unknown;
  /** A write in the current tick pushed; the tick's later writes rewrite that entry. */
  pushedThisTick: boolean;
  /** The last navigation sent was a push. */
  lastPushed: boolean;
}

const queuedByLocation = new WeakMap<Location, QueuedQuery>();

/**
 * The data router's own state, read for ONE question: is a navigation still loading?
 * A data router whose loaders run commits a navigation only when they finish, and a
 * second `navigate` before then cancels the first — so a push followed by a replace
 * in the same tick would land as a replace alone. `UNSAFE_DataRouterContext` is in
 * react-router 6.4 through 8; read off the namespace with a stand-in, a release
 * without it costs only that refinement, not the import.
 */
type DataRouterProbe = { router?: { state?: { navigation?: { state?: string } } } } | null;
const NO_DATA_ROUTER = createContext<DataRouterProbe>(null);
const DataRouterContext: Context<DataRouterProbe> = readDataRouterContext();

/**
 * A static member read (so a bundler still tree-shakes the namespace), inside a `try`:
 * a test's `vi.mock("react-router", () => ({ … }))` without the original module throws
 * on ANY export it does not define, and it threw here at import (keksdose, 0.25.0) —
 * the hook then runs without the refinement, as on a router without the context.
 */
function readDataRouterContext(): Context<DataRouterProbe> {
  try {
    return (
      (ReactRouter as unknown as { UNSAFE_DataRouterContext?: Context<DataRouterProbe> }).UNSAFE_DataRouterContext ??
      NO_DATA_ROUTER
    );
  } catch {
    return NO_DATA_ROUTER;
  }
}

/**
 * One write: `change` edits the queued query in place and says whether a param it
 * changed asks for its own entry. The navigation goes out at once — a lone write
 * behaves exactly as before, and a test can assert right after `act` — carrying the
 * whole queued query, so it includes every write before it.
 *
 * History, per tick (the writes one handler makes before a microtask runs):
 *  - the FIRST write that asks to push pushes; every later write in the tick REPLACES
 *    that entry, so a handler that sets four params adds one entry, and Back undoes
 *    all four at once — they were one change;
 *  - a write that asks to replace, before any push, rewrites the entry it found;
 *  - so mixed modes combine as "push if any write asked to push", which keeps both
 *    promises: a push-mode param's change is undone by Back, and a replace-mode param
 *    never adds an entry of its own (it rides on the one the push made). A replace
 *    write ahead of a push stays on the entry it rewrote, as it would one tick apart.
 *  - a write that changes nothing has no say, and sends nothing.
 */
function writeQuery(
  location: Location,
  navigate: NavigateFunction,
  dataRouter: DataRouterProbe,
  change: (params: URLSearchParams) => boolean,
): void {
  let queued = queuedByLocation.get(location);
  if (!queued) {
    queued = {
      params: new URLSearchParams(location.search),
      state: location.state,
      pushedThisTick: false,
      lastPushed: false,
    };
    queuedByLocation.set(location, queued);
  }
  const before = queued.params.toString();
  const wantsPush = change(queued.params);
  const search = queued.params.toString();
  if (search === before) return;

  // A data router still loading our push has not written it to the history yet: a
  // replace now would cancel it. Push again — the new navigation takes its place.
  const loading = (dataRouter?.router?.state?.navigation?.state ?? "idle") !== "idle";
  const push = (queued.lastPushed && loading) || (wantsPush && !queued.pushedThisTick);
  if (push) {
    queued.state = null;
    if (!queued.pushedThisTick) {
      queued.pushedThisTick = true;
      const record = queued;
      queueMicrotask(() => {
        record.pushedThisTick = false;
      });
    }
  }
  queued.lastPushed = push;
  void navigate(`?${search}`, push ? undefined : { replace: true, state: carriedState(queued.state) });
}

/** The rendered query, and a write that composes with every other one on the router. */
function useQueryWriter(): [URLSearchParams, (change: (params: URLSearchParams) => boolean) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const dataRouter = useContext(DataRouterContext);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  return [params, (change) => writeQuery(location, navigate, dataRouter, change)];
}

/* ── The hooks ───────────────────────────────────────────────────────────── */

/**
 * One URL search param as React state: `const [view, setView] = useSearchParamState("view", "list")`.
 *
 * Replaces the hand-rolled `setParams((prev) => { const p = new URLSearchParams(prev);
 * …set/delete…; return p })` blocks that keksdose had in a dozen pages and kastlan ported
 * as its own copy of this hook (shared/hooks/use-search-param-state.ts, both apps). The
 * kit's version takes the DEFAULT as an argument rather than inside `parse`, so the
 * two rules that follow from it cannot be forgotten at a call site:
 *
 * * an absent or unparseable param reads as the default, and
 * * setting the default removes the param — the default view is the clean URL.
 *
 * Every other param in the query string is left as it is.
 *
 * **Setters compose** (0.25, keksdose live #378): setters called in a row — of one hook,
 * or of several hooks under the same router — each build on the write before them, so
 * `setStatus("open"); setNs("legal")` in one handler leaves both in the URL. react-
 * router's own `setSearchParams(updater)` does not: it hands every updater the params of
 * the render, so the last call used to write the others' old values back. The tick's
 * writes add at most one history entry; see `history`. When the params belong
 * together, {@link useSearchParamsState} writes them with one setter. A functional
 * update receives the value as the writes before it left it.
 *
 * Requires a react-router Router.
 */
export function useSearchParamState<T = string>(
  key: string,
  defaultValue: T,
  options: SearchParamStateOptions<T> = {},
): [T, (next: Updater<T>) => void] {
  const [params, write] = useQueryWriter();
  const rule = paramRule(key, defaultValue, options);
  const value = readParam(params, rule);

  const setValue = (next: Updater<T>) =>
    write((query) => {
      // Resolved against the queued query, not the render: a second update in the same
      // handler sees the first one's result, as React's own functional updates do.
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(readParam(query, rule)) : next;
      return putParam(query, rule, resolved) === true;
    });

  return [value, setValue];
}

/** One field of {@link useSearchParamsState}: its default, and the single hook's options. */
export interface SearchParamField<T> extends SearchParamStateOptions<T> {
  /** The value when the param is absent or does not parse; writing it removes the param. */
  default: T;
  /** The param's name in the URL. Default: the field's name (`namespace: { param: "ns" }`). */
  param?: string;
}

/** The fields of {@link useSearchParamsState}, one per key of the value object. */
export type SearchParamFields<V> = { [K in keyof V]: SearchParamField<V[K]> };

/** A partial value (fields left out — or `undefined` — stay as they are), or a function
 *  of the current value returning one. */
export type SearchParamsUpdate<V> = Partial<V> | ((prev: V) => Partial<V>);

/**
 * Several URL search params as ONE state object, with one setter that writes them in
 * one navigation:
 *
 *     const [filter, setFilter] = useSearchParamsState({
 *       status: { default: "all" as ReviewStatus | "all", parse: toStatus },
 *       namespace: { param: "ns", default: "all" },
 *       query: { param: "q", default: "", history: "replace" },
 *     });
 *     <TranslationReviewPanel filter={filter} onFilterChange={setFilter} />
 *
 * keksdose live #378: a filter bar reports all its filters on every change, and four
 * single-param setters in a row clobbered each other (see {@link useSearchParamState},
 * whose setters now compose too). This is the shape that never could: one setter, one
 * write, every field's rules in one place.
 *
 * Each field takes what the single hook takes — `parse`, `serialize`, `history` /
 * `replace` — and its `default` (the clean URL, as there) and optional `param` name.
 * The setter takes a partial object or a function of the current one; fields it leaves
 * out, or sets to `undefined`, stay as they are, and keys that are not fields are
 * ignored, so a component's whole filter object can be handed over as it is. Its
 * history is the single hook's rule over the fields that change: one entry, pushed if
 * any of them asks to push, else the current entry rewritten. Setting what the URL
 * already says navigates nowhere.
 *
 * The value object keeps its identity while its params do not change, so it can sit in
 * a dependency array. Requires a react-router Router.
 */
export function useSearchParamsState<V extends object>(
  fields: SearchParamFields<V>,
): [V, (next: SearchParamsUpdate<V>) => void] {
  const [params, write] = useQueryWriter();
  const rules = (Object.keys(fields) as Array<keyof V & string>).map((name) => {
    const field = fields[name];
    return [name, paramRule(field.param ?? name, field.default, field)] as const;
  });
  const readAll = (query: URLSearchParams): V =>
    Object.fromEntries(rules.map(([name, rule]) => [name, readParam(query, rule)])) as V;

  // The fields' own params, not the whole query: another param changing (a tab, a
  // dialog) leaves this object as it was. `fields` is a fresh literal every render;
  // what it reads is the same while the params and the field names are.
  const ownParams = JSON.stringify(rules.map(([name, rule]) => [name, params.getAll(rule.key)]));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on what the value is read from; see above
  const values = useMemo(() => readAll(params), [ownParams]);

  const setValues = (next: SearchParamsUpdate<V>) =>
    write((query) => {
      const patch = typeof next === "function" ? next(readAll(query)) : next;
      let push = false;
      for (const [name, rule] of rules) {
        const value = patch[name];
        if (value === undefined) continue;
        if (putParam(query, rule as ParamRule<unknown>, value) === true) push = true;
      }
      return push;
    });

  return [values, setValues];
}

/**
 * The active tab in `?tab=` (or `key`), with the default tab as the clean URL, for the
 * kit's `Tabs`:
 *
 *     const [tab, setTab] = useTabParam("overview", { tabs: ["overview", "history"] });
 *     <Tabs tabs={…} active={tab} onChange={setTab} />
 *
 * Switching tabs REPLACES the history entry — a tab is a view of this page, not a
 * place Back should step through. `tabs`, when given, turns a param naming no tab (a
 * renamed tab, an old link) into the default rather than into a blank panel.
 * kastlan's use-tab-param.ts, with the validation it did not have.
 */
export function useTabParam<T extends string>(
  defaultTab: T,
  options: { key?: string; tabs?: readonly T[] } = {},
): [T, (tab: T) => void] {
  const { key = "tab", tabs } = options;
  return useSearchParamState<T>(key, defaultTab, {
    parse: (raw) => (!tabs || (tabs as readonly string[]).includes(raw) ? (raw as T) : undefined),
    history: "replace",
  });
}

/** Where a dialog's open state lives: a param's presence (`"edit"` → `?edit=1`), or one
 *  value of a shared param (`{ key: "dialog", value: "create-lease" }`). */
export type DialogParam = string | { key: string; value: string };

/** The route-state mark an opener leaves on the entry it pushes, so the close knows it
 *  may go BACK over it rather than add a second entry. */
const OPENED_BY_KIT = "__uiKitDialogParam";

/**
 * A dialog's open state in the URL, for `Modal`'s `urlParam` and anything else that
 * opens one: `const [open, setOpen] = useDialogParam({ key: "dialog", value: "create" })`.
 *
 * * **Opening pushes** an entry, so the platform Back gesture closes the dialog — by
 *   leaving the entry — and Forward opens it again, like any other step.
 * * **Closing goes back** over that entry when this hook pushed it, so a closed dialog
 *   leaves no dead entry behind. A dialog that arrived OPEN (a deep link, a reload, a
 *   plain `<Link>` to it) has nothing of ours to go back over, and its close removes the
 *   param in place instead — Back from there leaves the page, as it should.
 *
 * That is why it is not `useSearchParamState`: going back is the only close that
 * leaves the history as it was before the dialog, and only the opener knows whether it
 * may.
 */
export function useDialogParam(param: DialogParam): [boolean, (open: boolean) => void] {
  const { key, value } = typeof param === "string" ? { key: param, value: "1" } : param;
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const open = typeof param === "string" ? params.has(key) : params.get(key) === value;
  const mark = `${key}=${value}`;

  const setOpen = (next: boolean) => {
    if (next === open) return;
    const state = carriedState(location.state);
    if (next) {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set(key, value);
          return p;
        },
        { state: { ...state, [OPENED_BY_KIT]: mark } },
      );
      return;
    }
    if (state?.[OPENED_BY_KIT] === mark) {
      void navigate(-1);
      return;
    }
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete(key);
        return p;
      },
      { replace: true, state },
    );
  };

  return [open, setOpen];
}
