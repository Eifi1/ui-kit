import { StrictMode, useEffect, type ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  RouterProvider,
  createMemoryRouter,
  useLocation,
  useNavigate,
  useNavigationType,
  type InitialEntry,
} from "react-router";
import { describe, expect, it } from "vitest";
import { useSearchParamState, useSearchParamsState, useTabParam } from "../use-search-param-state";

/**
 * 0.25 — writes that compose (keksdose live #378). react-router hands
 * `setSearchParams(updater)` the RENDER's params, so four setters in one handler each
 * started from the rendered URL and the last wrote the others' old values back. The
 * kit's setters now build on the write before them and add at most one history entry
 * per tick, and `useSearchParamsState` writes several params with one setter.
 */

type Probe = { location: ReturnType<typeof useLocation>; navigate: ReturnType<typeof useNavigate>; type: string };
let probe: Probe | null = null;
function Where() {
  const location = useLocation();
  const navigate = useNavigate();
  const type = useNavigationType();
  // In an effect, not during render: read after `act`, which flushes it.
  useEffect(() => {
    probe = { location, navigate, type };
  });
  return null;
}
const query = () => probe!.location.search;
const param = (key: string) => new URLSearchParams(probe!.location.search).get(key);
const back = () => act(() => void probe!.navigate(-1));

/** Hands a hook's result to the test after each commit — never during render. */
type Sink<T> = { current: T; put: (value: T) => void };
function sink<T>(): Sink<T> {
  const box: Sink<T> = {
    current: undefined as T,
    put: (value) => {
      box.current = value;
    },
  };
  return box;
}
function useExpose<T>(to: Sink<T>, value: T) {
  const { put } = to;
  useEffect(() => {
    put(value);
  });
}

/** `/before` behind the page, so Back past the page's own entries is visible. */
function mount(ui: ReactNode, initial: InitialEntry = "/start") {
  return render(
    <MemoryRouter initialEntries={["/before", initial]} initialIndex={1}>
      {ui}
      <Where />
    </MemoryRouter>,
  );
}

/** The keksdose shape: four single-param hooks, one handler setting them all. */
function FilterBar() {
  const [status, setStatus] = useSearchParamState("status", "all");
  const [source, setSource] = useSearchParamState("source", "all");
  const [ns, setNs] = useSearchParamState("ns", "all");
  const [q, setQ] = useSearchParamState("q", "");
  const apply = (next: { status: string; source: string; ns: string; q: string }) => {
    setStatus(next.status);
    setSource(next.source);
    setNs(next.ns);
    setQ(next.q);
  };
  return (
    <>
      <output data-testid="filters">{[status, source, ns, q].join("|")}</output>
      <button onClick={() => apply({ status: "open", source: "screen", ns: "legal", q })}>pick</button>
      <button onClick={() => apply({ status, source, ns, q: "tax" })}>type</button>
      <button onClick={() => apply({ status: "all", source: "all", ns: "all", q: "" })}>reset</button>
    </>
  );
}

/** A push-mode `status` and a replace-mode `q`. */
type Pair = { status: (v: string) => void; q: (v: string) => void };
function PairOf({ to }: { to: Sink<Pair> }) {
  const [, status] = useSearchParamState("status", "all");
  const [, q] = useSearchParamState("q", "", { replace: true });
  useExpose(to, { status, q });
  return null;
}

describe("useSearchParamState — setters compose", () => {
  it("four setters in one handler all land, in ONE history entry", () => {
    mount(<FilterBar />, "/start?keep=1");
    fireEvent.click(screen.getByText("pick"));
    expect(screen.getByTestId("filters")).toHaveTextContent("open|screen|legal|");
    expect(param("status")).toBe("open");
    expect(param("source")).toBe("screen");
    expect(param("ns")).toBe("legal");
    expect(param("keep")).toBe("1");
    // One entry for the handler: Back undoes all three at once.
    back();
    expect(probe!.location.pathname).toBe("/start");
    expect(query()).toBe("?keep=1");
  });

  it("the last setter writing its unchanged value no longer wipes the others (the #378 bug)", () => {
    mount(<FilterBar />, "/start?q=x");
    fireEvent.click(screen.getByText("pick"));
    expect(screen.getByTestId("filters")).toHaveTextContent("open|screen|legal|x");
    fireEvent.click(screen.getByText("type"));
    expect(screen.getByTestId("filters")).toHaveTextContent("open|screen|legal|tax");
    fireEvent.click(screen.getByText("reset"));
    expect(query()).toBe("");
  });

  it("separate handlers are separate steps", () => {
    mount(<FilterBar />);
    fireEvent.click(screen.getByText("pick"));
    fireEvent.click(screen.getByText("type"));
    back();
    expect(screen.getByTestId("filters")).toHaveTextContent("open|screen|legal|");
    back();
    expect(query()).toBe("");
  });

  it("setters of hooks in DIFFERENT components compose in one act", () => {
    const a = sink<(v: string) => void>();
    const b = sink<(v: string) => void>();
    function One({ k, to }: { k: string; to: Sink<(v: string) => void> }) {
      useExpose(to, useSearchParamState(k, "")[1]);
      return null;
    }
    mount(
      <>
        <One k="a" to={a} />
        <One k="b" to={b} />
      </>,
    );
    act(() => {
      a.current("1");
      b.current("2");
      a.current("3");
    });
    expect(query()).toBe("?a=3&b=2");
    back();
    expect(query()).toBe("");
  });

  it("functional updates in a row see each other's result", () => {
    const set = sink<(next: (n: number) => number) => void>();
    function Counter() {
      const [n, setN] = useSearchParamState<number>("n", 0, { parse: Number });
      useExpose(set, setN);
      return <output data-testid="n">{n}</output>;
    }
    mount(<Counter />, "/start?n=3");
    act(() => {
      set.current((n) => n + 1);
      set.current((n) => n + 1);
      set.current((n) => n * 10);
    });
    expect(screen.getByTestId("n")).toHaveTextContent("50");
  });

  it("works under StrictMode", () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/before", "/start"]} initialIndex={1}>
          <FilterBar />
          <Where />
        </MemoryRouter>
      </StrictMode>,
    );
    fireEvent.click(screen.getByText("pick"));
    expect(screen.getByTestId("filters")).toHaveTextContent("open|screen|legal|");
    back();
    expect(query()).toBe("");
  });

  it("does not leak between two routers", () => {
    const left = sink<(v: string) => void>();
    const right = sink<(v: string) => void>();
    function One({ id, to }: { id: string; to: Sink<(v: string) => void> }) {
      const [v, set] = useSearchParamState("v", "");
      useExpose(to, set);
      return <output data-testid={id}>{v || "-"}</output>;
    }
    render(
      <>
        <MemoryRouter>
          <One id="left" to={left} />
        </MemoryRouter>
        <MemoryRouter>
          <One id="right" to={right} />
        </MemoryRouter>
      </>,
    );
    act(() => {
      left.current("L");
      right.current("R");
    });
    expect(screen.getByTestId("left")).toHaveTextContent("L");
    expect(screen.getByTestId("right")).toHaveTextContent("R");
  });

  it("a write that changes nothing navigates nowhere", () => {
    mount(<FilterBar />, "/start?status=open");
    const key = probe!.location.key;
    fireEvent.click(screen.getByText("reset"));
    expect(probe!.location.key).not.toBe(key);
    const after = probe!.location.key;
    // Four setters, every value already at its default: no navigation, no dead entry.
    fireEvent.click(screen.getByText("reset"));
    expect(probe!.location.key).toBe(after);
  });

  it("useTabParam's setter composes with the others", () => {
    const set = sink<{ tab: (t: "a" | "b") => void; q: (q: string) => void }>();
    function Page() {
      const [, tab] = useTabParam<"a" | "b">("a");
      const [, q] = useSearchParamState("q", "");
      useExpose(set, { tab, q });
      return null;
    }
    mount(<Page />);
    act(() => {
      set.current.tab("b");
      set.current.q("x");
    });
    expect(param("tab")).toBe("b");
    expect(param("q")).toBe("x");
  });
});

describe("useSearchParamState — history across a tick", () => {
  it("all replace: the entry is rewritten, nothing pushed", () => {
    const set = sink<Pair>();
    function Grab() {
      const [, status] = useSearchParamState("status", "all", { replace: true });
      const [, q] = useSearchParamState("q", "", { replace: true });
      useExpose(set, { status, q });
      return null;
    }
    mount(<Grab />);
    act(() => {
      set.current.status("open");
      set.current.q("tax");
    });
    expect(probe!.type).toBe("REPLACE");
    expect(query()).toBe("?status=open&q=tax");
    back();
    expect(probe!.location.pathname).toBe("/before");
  });

  it("push then replace: one entry with both; Back undoes both", () => {
    const set = sink<Pair>();
    mount(<PairOf to={set} />);
    act(() => {
      set.current.status("open");
      set.current.q("tax");
    });
    expect(query()).toBe("?status=open&q=tax");
    back();
    expect(probe!.location.pathname).toBe("/start");
    expect(query()).toBe("");
  });

  it("replace then push: the replace stays on the entry it rewrote, the push adds one", () => {
    const set = sink<Pair>();
    mount(<PairOf to={set} />);
    act(() => {
      set.current.q("tax");
      set.current.status("open");
    });
    expect(query()).toBe("?q=tax&status=open");
    back();
    expect(probe!.location.pathname).toBe("/start");
    expect(query()).toBe("?q=tax");
  });

  it("replace-on-clear votes by what each write does", () => {
    const set = sink<{ row: (v: string | null) => void; q: (v: string) => void }>();
    function Grab() {
      const [, row] = useSearchParamState<string | null>("row", null, { history: "replace-on-clear" });
      const [, q] = useSearchParamState("q", "", { replace: true });
      useExpose(set, { row, q });
      return null;
    }
    mount(<Grab />, "/start?row=7");
    act(() => {
      set.current.row(null);
      set.current.q("tax");
    });
    // Clearing replaces, so nothing in the tick asked to push.
    expect(probe!.type).toBe("REPLACE");
    expect(query()).toBe("?q=tax");
  });

  it("a replace carries the entry's route state; after a push it does not stamp it on the new entry", () => {
    const set = sink<Pair>();
    mount(<PairOf to={set} />, { pathname: "/start", state: { mark: "opened" } });
    act(() => set.current.q("a"));
    expect(probe!.location.state).toEqual({ mark: "opened" });
    act(() => {
      set.current.status("open");
      set.current.q("b");
    });
    expect(query()).toBe("?q=b&status=open");
    expect(probe!.location.state).toBeNull();
    back();
    expect(probe!.location.state).toEqual({ mark: "opened" });
  });
});

describe("useSearchParamState — data routers", () => {
  /** A push-mode and a replace-mode param, set in one handler in that order. */
  function PushThenReplace() {
    const [status, setStatus] = useSearchParamState("status", "all");
    const [q, setQ] = useSearchParamState("q", "", { replace: true });
    return (
      <>
        <output data-testid="pair">{`${status}|${q}`}</output>
        <button
          onClick={() => {
            setStatus("open");
            setQ("tax");
          }}
        >
          both
        </button>
      </>
    );
  }

  it("createMemoryRouter without loaders: composed, one entry", async () => {
    const router = createMemoryRouter([{ path: "/start", element: <FilterBar /> }], {
      initialEntries: ["/before", "/start"],
      initialIndex: 1,
    });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText("pick"));
    await waitFor(() => expect(screen.getByTestId("filters")).toHaveTextContent("open|screen|legal|"));
    expect(router.state.location.search).toBe("?status=open&source=screen&ns=legal");
    // The first write pushed and landed at once (no loader); the rest rewrote that
    // entry — so one Back is the whole handler.
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/start");
    expect(router.state.location.search).toBe("");
  });

  it("createMemoryRouter WITH a loader: a later replace in the tick does not cancel the push", async () => {
    let release: () => void = () => {};
    const router = createMemoryRouter(
      [
        {
          id: "page",
          path: "/start",
          element: <PushThenReplace />,
          // A search change revalidates the loader; each load waits to be released, so
          // the push is still in flight when the replace is written.
          loader: () => new Promise<null>((resolve) => (release = () => resolve(null))),
        },
      ],
      { initialEntries: ["/before", "/start"], initialIndex: 1, hydrationData: { loaderData: { page: null } } },
    );
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText("both"));
    expect(router.state.navigation.state).toBe("loading");
    expect(router.state.location.search).toBe("");
    await act(async () => release());
    await waitFor(() => expect(router.state.navigation.state).toBe("idle"));
    expect(screen.getByTestId("pair")).toHaveTextContent("open|tax");
    // Pushed. Had the second write replaced while the first was loading, react-router
    // would have cancelled the push and landed a bare replace.
    expect(router.state.historyAction).toBe("PUSH");
    const backwards = router.navigate(-1);
    await act(async () => release());
    await act(() => backwards);
    expect(router.state.location.pathname).toBe("/start");
    expect(router.state.location.search).toBe("");
  });
});

describe("useSearchParamsState", () => {
  type Status = "all" | "open" | "done";
  const STATUSES: readonly Status[] = ["all", "open", "done"];
  type Filter = { status: Status; namespace: string; query: string; page: number };
  type Result = [Filter, (next: Partial<Filter> | ((prev: Filter) => Partial<Filter>)) => void];

  const latest = sink<Result>();
  const commits = { count: 0 };
  function Filters() {
    const state = useSearchParamsState({
      status: { default: "all" as Status, parse: (raw) => (STATUSES.includes(raw as Status) ? (raw as Status) : undefined) },
      namespace: { param: "ns", default: "all" },
      query: { param: "q", default: "", history: "replace" },
      page: { default: 1, parse: (raw) => (Number(raw) > 0 ? Number(raw) : undefined) },
    });
    useExpose(latest, state);
    useEffect(() => {
      commits.count++;
    });
    return null;
  }

  it("reads every field with its default, parse and param name", () => {
    mount(<Filters />, "/start?status=bogus&ns=legal&page=3&other=1");
    expect(latest.current[0]).toEqual({ status: "all", namespace: "legal", query: "", page: 3 });
  });

  it("writes several fields in one navigation; defaults leave the URL", () => {
    mount(<Filters />, "/start?ns=legal&other=1");
    act(() => latest.current[1]({ status: "open", namespace: "all", page: 2 }));
    expect(query()).toBe("?other=1&status=open&page=2");
    expect(latest.current[0]).toEqual({ status: "open", namespace: "all", query: "", page: 2 });
    back();
    expect(query()).toBe("?ns=legal&other=1");
  });

  it("takes a functional update, against the current value", () => {
    mount(<Filters />, "/start?page=2");
    act(() => {
      latest.current[1]((prev) => ({ page: prev.page + 1 }));
      latest.current[1]((prev) => ({ page: prev.page + 1 }));
    });
    expect(latest.current[0].page).toBe(4);
  });

  it("history: replace when only replace fields change, push when any push field does", () => {
    mount(<Filters />);
    act(() => latest.current[1]({ query: "tax" }));
    expect(probe!.type).toBe("REPLACE");
    act(() => latest.current[1]({ query: "vat", status: "done" }));
    expect(probe!.type).toBe("PUSH");
    back();
    // The pushed entry held both; the query typed before it was rewritten into /start.
    expect(query()).toBe("?q=tax");
  });

  it("ignores keys that are not fields, and undefined; setting what the URL says navigates nowhere", () => {
    mount(<Filters />, "/start?status=open");
    const key = probe!.location.key;
    act(() => latest.current[1]({ status: "open", query: undefined, placeholdersOnly: true } as Partial<Filter>));
    expect(probe!.location.key).toBe(key);
    expect(query()).toBe("?status=open");
  });

  it("composes with single-param setters in the same tick", () => {
    const setView = sink<(v: string) => void>();
    function View() {
      useExpose(setView, useSearchParamState("view", "list")[1]);
      return null;
    }
    mount(
      <>
        <Filters />
        <View />
      </>,
    );
    act(() => {
      setView.current("grid");
      latest.current[1]({ status: "open" });
      setView.current("map");
    });
    expect(query()).toBe("?view=map&status=open");
    back();
    expect(query()).toBe("");
  });

  it("keeps the value object's identity while its own params do not change", () => {
    const setOther = sink<(v: string) => void>();
    function Other() {
      useExpose(setOther, useSearchParamState("other", "")[1]);
      return null;
    }
    mount(
      <>
        <Filters />
        <Other />
      </>,
      "/start?status=open",
    );
    const before = latest.current[0];
    const count = commits.count;
    act(() => setOther.current("x"));
    expect(commits.count).toBeGreaterThan(count);
    expect(latest.current[0]).toBe(before);
    act(() => latest.current[1]({ status: "done" }));
    expect(latest.current[0]).not.toBe(before);
  });

  it("fits a component that reports its whole filter object (TranslationReviewPanel's onFilterChange)", () => {
    type PanelFilter = { status: Status; source: string; namespace: string; query: string; placeholdersOnly: boolean };
    function Panel({ onFilterChange }: { onFilterChange: (f: PanelFilter) => void }) {
      return (
        <button
          onClick={() =>
            onFilterChange({ status: "open", source: "all", namespace: "legal", query: "", placeholdersOnly: true })
          }
        >
          filter
        </button>
      );
    }
    function Page() {
      const [, setFilter] = useSearchParamsState({
        status: { default: "all" as Status },
        source: { default: "all" },
        namespace: { param: "ns", default: "all" },
        query: { param: "q", default: "" },
      });
      // Type-level too: the setter is assignable to the panel's callback as it stands.
      return <Panel onFilterChange={setFilter} />;
    }
    mount(<Page />);
    fireEvent.click(screen.getByText("filter"));
    expect(query()).toBe("?status=open&ns=legal");
  });
});
