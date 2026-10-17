import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type Context } from "react";
import * as ReactRouter from "react-router";
import { useLocation, useNavigate, type Navigator } from "react-router";
import { useSearchParamsState } from "../hooks/use-search-param-state";
import { useTourOptional } from "./tour";

/* ── useTourUrlSync ─────────────────────────────────────────────────────────── */

export interface UseTourUrlSyncOptions {
  /**
   * Start the tour `id` at `startIndex` (0-based) — the app's launcher, which builds the
   * steps, awaits its own `prepare()` and passes `onFinish` (the completion, the points
   * toast) to `useTour().start`. An unknown id should do nothing. May return a promise:
   * the parameters are kept until it settles.
   */
  launch: (id: string, options: { startIndex: number }) => void | Promise<unknown>;
  /**
   * Are the facts a tour's steps are built from loaded yet (keksdose's `ready`: the
   * caches a branching tour reads)? A deep link waits for it, keeping its parameters, so
   * an F5 mid-tour resumes the right variant at the right step. Default `true`.
   */
  ready?: boolean;
  /**
   * Older names of `tourStep`, read when it is absent and removed with it — kastlan's
   * `ts` (§2.7, for one minor). Their value is a 0-based step index, as kastlan wrote it.
   */
  stepAliases?: readonly string[];
}

type Place = { pathname: string; search: string; hash: string };

/**
 * Has the router already moved on from the location React is still rendering?
 * keksdose's check (tour-url-sync.tsx, tours audit 2026-10-02): a mirror write built
 * from the page being LEFT is a replace back onto it, which cancels a step's `go()`.
 *
 * - A data router (`createBrowserRouter`, kastlan): its navigator has no location (build
 *   review 0.43, kastlan A2), so the router's own state answers — a navigation still
 *   loading, or a location it has committed that React has not rendered yet.
 * - A declarative router (`BrowserRouter`, keksdose): its navigator is its history and
 *   carries where it is.
 * - Anything else answers "not in flight".
 */
function navigationInFlight(history: Navigator | undefined, dataRouter: DataRouterProbe, rendered: Place) {
  const state = dataRouter?.router?.state;
  if (state && (state.navigation?.state ?? "idle") !== "idle") return true;
  const live = state?.location ?? (history as (Navigator & { location?: Partial<Place> }) | undefined)?.location;
  if (!live) return false;
  return (
    live.pathname !== rendered.pathname || (live.search ?? "") !== rendered.search || (live.hash ?? "") !== rendered.hash
  );
}

type NavigationProbe = { navigator?: Navigator } | null;
const NO_NAVIGATION = createContext<NavigationProbe>(null);
/** The data router's state, as `useSearchParamState` reads it. */
type DataRouterProbe = {
  router?: { state?: { navigation?: { state?: string }; location?: Partial<Place> } };
} | null;
const NO_DATA_ROUTER = createContext<DataRouterProbe>(null);
const DataRouterContext: Context<DataRouterProbe> = (() => {
  try {
    return (
      (ReactRouter as unknown as { UNSAFE_DataRouterContext?: Context<DataRouterProbe> }).UNSAFE_DataRouterContext ??
      NO_DATA_ROUTER
    );
  } catch {
    return NO_DATA_ROUTER;
  }
})();
/** Read off the namespace inside a `try`, as `useSearchParamState` reads the data router:
 *  a test's partial `vi.mock("react-router")` throws on an export it does not define. */
const NavigationContext: Context<NavigationProbe> = (() => {
  try {
    return (
      (ReactRouter as unknown as { UNSAFE_NavigationContext?: Context<NavigationProbe> }).UNSAFE_NavigationContext ??
      NO_NAVIGATION
    );
  } catch {
    return NO_NAVIGATION;
  }
})();

/** The step a link asks for, 0-based: `tourStep` is 1-based (keksdose), an alias 0-based. */
function stepOf(params: URLSearchParams, aliases: readonly string[]): number {
  const step = Number(params.get("tourStep"));
  if (params.has("tourStep")) return Number.isFinite(step) && step > 0 ? step - 1 : 0;
  for (const alias of aliases) {
    const value = Number(params.get(alias));
    if (params.has(alias)) return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  return 0;
}

/**
 * Tours and the URL (docs/tours-harmonization.md §2.7, §6.4) — keksdose's `TourUrlSync`,
 * on the kit's engine (`useTourOptional`):
 *
 * - **`?tour=<id>` starts that tour whenever it APPEARS** — on load, and on in-app
 *   navigation too (kastlan's assistant links to `/help/tours?tour=<id>`, ka F4) —
 *   resuming at `&tourStep=<n>` (1-based). It waits for `ready`.
 * - **While a tour runs, `?tour=&tourStep=` mirror where it is**, so a reload or a copied
 *   link pins the step (kk K-3). A step that navigates drops them; this puts them back.
 * - **At the end it strips only its own parameters**; `?q=`, `?state=` and the hash stay.
 *
 * Mount it once inside the router and the `TourProvider`. Without a provider it still
 * launches through `launch` and never mirrors.
 */
export function useTourUrlSync({ launch, ready = true, stepAliases = [] }: UseTourUrlSyncOptions): void {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search, hash } = location;
  const history = useContext(NavigationContext)?.navigator;
  const dataRouter = useContext(DataRouterContext);
  const engine = useTourOptional();
  const active = engine?.active ?? false;
  const activeId = engine?.activeId ?? null;
  const index = engine?.index ?? 0;
  const urlTour = new URLSearchParams(search).get("tour");
  const aliases = stepAliases.join("\n");

  const launchRef = useRef(launch);
  const activeIdRef = useRef(activeId);
  useLayoutEffect(() => {
    launchRef.current = launch;
    activeIdRef.current = active ? activeId : null;
  });
  /** The `tour` value last seen in the URL: a tour starts when it CHANGES to an id. */
  const seenRef = useRef<string | null>(null);
  /** A deep link waiting for `ready`. */
  const pendingRef = useRef<{ id: string; startIndex: number } | null>(null);
  /** A launch under way (an app's `prepare()`). */
  const launchingRef = useRef(false);
  /** Bumped when a launch settles, so the mirror looks again. */
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    if (urlTour !== seenRef.current) {
      seenRef.current = urlTour;
      // Its own mirror writing the running tour back is no new link.
      pendingRef.current =
        urlTour && urlTour !== activeIdRef.current
          ? { id: urlTour, startIndex: stepOf(new URLSearchParams(search), aliases ? aliases.split("\n") : []) }
          : null;
    }
    const pending = pendingRef.current;
    if (!pending || !ready) return;
    pendingRef.current = null;
    launchingRef.current = true;
    void Promise.resolve()
      .then(() => launchRef.current(pending.id, { startIndex: pending.startIndex }))
      .catch(() => undefined)
      .finally(() => {
        launchingRef.current = false;
        setSettled((n) => n + 1);
      });
    // Only a change of the parameter, or readiness, starts a tour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTour, ready]);

  useEffect(() => {
    if (navigationInFlight(history, dataRouter, { pathname, search, hash })) return;
    // A link not yet used keeps its parameters: a reload in that window resumes.
    if (pendingRef.current || launchingRef.current) return;
    const tourId = active && activeId ? activeId : null;
    const own = ["tour", "tourStep", ...(aliases ? aliases.split("\n") : [])];
    const current = new URLSearchParams(search);
    // Nothing to mirror and nothing to strip: never touch the URL (a no-op replace
    // clobbers a page's own just-issued navigation, keksdose feedback #4).
    if (!tourId && !own.some((key) => current.has(key))) return;
    const next = new URLSearchParams(search);
    // `set` keeps a parameter where it stands; only the aliases (and, at the end, the
    // tour's own) go.
    for (const key of tourId ? own.slice(2) : own) next.delete(key);
    if (tourId) {
      next.set("tour", tourId);
      next.set("tourStep", String(index + 1));
    }
    if (next.toString() === current.toString()) return;
    // Spelled out, not `setSearchParams` ("?…" drops the hash, keksdose dev#495).
    void navigate({ pathname, search: next.toString(), hash }, { replace: true, state: location.state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activeId, index, pathname, search, hash, settled, aliases]);
}

/* ── useTourCatalogueUrlState ───────────────────────────────────────────────── */

/** The catalogue's state filter. */
export type TourStateFilter = "all" | "todo" | "done";

/** The catalogue's filters: the search, the group (`null`: every group), the state. */
export interface TourCatalogueFilter {
  query: string;
  group: string | null;
  state: TourStateFilter;
}

const STATES: readonly TourStateFilter[] = ["all", "todo", "done"];

/**
 * The catalogue's filters in the URL (§2.8) — keksdose's `?q`, `?topic`, `?state`, each
 * written with `replace` (typing does not bury the Back button), the defaults as the
 * clean URL. Spread it onto the catalogue: `<TourCatalogue {...useTourCatalogueUrlState()} … />`.
 * `params` renames them (kastlan's `?group`). Requires a react-router Router.
 */
export function useTourCatalogueUrlState(
  params: { query?: string; group?: string; state?: string } = {},
): TourCatalogueFilter & { onChange: (patch: Partial<TourCatalogueFilter>) => void } {
  const [filter, setFilter] = useSearchParamsState<TourCatalogueFilter>({
    query: { param: params.query ?? "q", default: "", history: "replace" },
    group: { param: params.group ?? "topic", default: null, history: "replace", parse: (raw) => raw || undefined },
    state: {
      param: params.state ?? "state",
      default: "all",
      history: "replace",
      parse: (raw) => STATES.find((x) => x === raw),
    },
  });
  // `group: null` is a value to the setter (it clears `?topic`); `undefined` leaves it.
  return { ...filter, onChange: setFilter };
}
