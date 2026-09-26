import { useLocation, useNavigate, useSearchParams } from "react-router";

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
 * Every other param in the query string is left as it is. Two updates in one tick do
 * not compose — react-router resolves each against the params of the last render.
 * Requires a react-router Router.
 */
export function useSearchParamState<T = string>(
  key: string,
  defaultValue: T,
  options: SearchParamStateOptions<T> = {},
): [T, (next: Updater<T>) => void] {
  const { parse, serialize = defaultSerialize as (value: T) => string | null } = options;
  const history = options.history ?? (options.replace ? "replace" : "push");
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const read = (raw: string | null): T => {
    if (raw === null) return defaultValue;
    if (!parse) return raw as unknown as T;
    try {
      const parsed = parse(raw);
      return parsed === undefined ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  };
  const value = read(params.get(key));
  const defaultSerialized = serialize(defaultValue);
  const toParam = (v: T): string | null => {
    const s = serialize(v);
    return s === defaultSerialized ? null : s;
  };

  const setValue = (next: Updater<T>) => {
    // Resolved against the rendered value only to choose the history mode; the write
    // resolves again inside react-router's updater, against the params it hands over.
    const preview = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    const replace = history === "replace" || (history === "replace-on-clear" && toParam(preview) === null);
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(read(p.get(key))) : next;
        const serialized = toParam(resolved);
        if (serialized === null) p.delete(key);
        else p.set(key, serialized);
        return p;
      },
      replace ? { replace, state: carriedState(location.state) } : undefined,
    );
  };

  return [value, setValue];
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
