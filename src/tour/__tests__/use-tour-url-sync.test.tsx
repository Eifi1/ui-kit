import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, RouterProvider, createMemoryRouter, useLocation, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TourProvider, useTour, type TourLauncher, type TourStep } from "../tour";
import { useTourCatalogueUrlState, useTourUrlSync, type UseTourUrlSyncOptions } from "../use-tour-url-sync";

/** docs/tours-harmonization.md §2.7, §2.8, §6.4: keksdose's tour-url-sync on the kit's engine. */

const STEPS: TourStep[] = [1, 2, 3, 4].map((i) => ({ title: `Step ${i}`, body: `Body ${i}` }));

/** The URL as the router has it, and buttons to drive the engine and the router. */
function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  const { next, stop, start } = useTour();
  return (
    <>
      <output data-testid="url">{`${location.pathname}${location.search}${location.hash}`}</output>
      <button onClick={() => next()}>engine-next</button>
      <button onClick={() => stop()}>engine-stop</button>
      <button onClick={() => start(STEPS, { id: "manual" })}>engine-start</button>
      <button onClick={() => navigate("/help/tours?tour=budget")}>in-app-link</button>
      <button onClick={() => navigate("/other?q=x")}>go-other</button>
    </>
  );
}

function Sync(props: Partial<UseTourUrlSyncOptions> & { launch: UseTourUrlSyncOptions["launch"] }) {
  useTourUrlSync(props);
  return null;
}

/** The app's launcher: start the engine with the steps, at the asked step. */
function useLauncher() {
  const { start } = useTour();
  return vi.fn((id: string, { startIndex }: { startIndex: number }) => start(STEPS, { id, startIndex }));
}

function App({ path, ready, stepAliases, spy }: { path: string; ready?: boolean; stepAliases?: string[]; spy?: (id: string, o: { startIndex: number }) => void }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <TourProvider>
        <Inner ready={ready} stepAliases={stepAliases} spy={spy} />
      </TourProvider>
    </MemoryRouter>
  );
}

function Inner({ ready, stepAliases, spy }: { ready?: boolean; stepAliases?: string[]; spy?: (id: string, o: { startIndex: number }) => void }) {
  const launcher = useLauncher();
  return (
    <>
      <Sync
        ready={ready}
        stepAliases={stepAliases}
        launch={(id, o) => {
          spy?.(id, o);
          launcher(id, o);
        }}
      />
      <Probe />
    </>
  );
}

const url = () => screen.getByTestId("url").textContent;
const flush = () => act(async () => {});

describe("useTourUrlSync", () => {
  it("a deep link starts the tour at ?tourStep (1-based) and mirrors the step from then on", async () => {
    const spy = vi.fn();
    render(<App path="/budget?tour=budget&tourStep=3&q=keep#part" spy={spy} />);
    await flush();
    expect(spy).toHaveBeenCalledWith("budget", { startIndex: 2 });
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 3");
    expect(url()).toBe("/budget?tour=budget&tourStep=3&q=keep#part");
    act(() => screen.getByText("engine-next").click());
    await flush();
    expect(url()).toBe("/budget?tour=budget&tourStep=4&q=keep#part");
  });

  it("at the end it strips only its own parameters — the page's and the hash stay", async () => {
    render(<App path="/tours?tour=budget&q=keep&state=done#h" />);
    await flush();
    act(() => screen.getByText("engine-stop").click());
    await flush();
    expect(url()).toBe("/tours?q=keep&state=done#h");
  });

  it("starts whenever ?tour= appears, in-app navigation too (ka F4)", async () => {
    const spy = vi.fn();
    render(<App path="/help" spy={spy} />);
    await flush();
    expect(spy).not.toHaveBeenCalled();
    expect(url()).toBe("/help");
    act(() => screen.getByText("in-app-link").click());
    await flush();
    expect(spy).toHaveBeenCalledWith("budget", { startIndex: 0 });
    expect(url()).toBe("/help/tours?tour=budget&tourStep=1");
  });

  it("a tour started by hand is mirrored, and its own mirror does not start it again", async () => {
    const spy = vi.fn();
    render(<App path="/x" spy={spy} />);
    await flush();
    act(() => screen.getByText("engine-start").click());
    await flush();
    expect(url()).toBe("/x?tour=manual&tourStep=1");
    expect(spy).not.toHaveBeenCalled();
  });

  it("a deep link waits for ready, keeping its parameters meanwhile", async () => {
    const spy = vi.fn();
    const { rerender } = render(<App path="/b?tour=budget&tourStep=2" ready={false} spy={spy} />);
    await flush();
    expect(spy).not.toHaveBeenCalled();
    expect(url()).toBe("/b?tour=budget&tourStep=2");
    rerender(<App path="/b?tour=budget&tourStep=2" ready spy={spy} />);
    await flush();
    expect(spy).toHaveBeenCalledWith("budget", { startIndex: 1 });
  });

  it("an unknown tour (launch does nothing) has its parameters stripped once the launch settles", async () => {
    function Noop() {
      useTourUrlSync({ launch: async () => {} });
      return <Probe />;
    }
    render(
      <MemoryRouter initialEntries={["/p?tour=gone&tourStep=2&q=1"]}>
        <TourProvider>
          <Noop />
        </TourProvider>
      </MemoryRouter>,
    );
    await flush();
    await flush();
    expect(url()).toBe("/p?q=1");
  });

  it("reads an alias (kastlan's 0-based ts) and replaces it with tourStep", async () => {
    const spy = vi.fn();
    render(<App path="/help/tours?tour=budget&ts=2" stepAliases={["ts"]} spy={spy} />);
    await flush();
    expect(spy).toHaveBeenCalledWith("budget", { startIndex: 2 });
    expect(url()).toBe("/help/tours?tour=budget&tourStep=3");
  });

  it("leaves a URL without tour parameters alone", async () => {
    render(<App path="/plain?x=1" />);
    await flush();
    act(() => screen.getByText("go-other").click());
    await flush();
    expect(url()).toBe("/other?q=x");
  });

  it("one launcher for TourProvider and useTourUrlSync: both hand it the provider's start (keksdose N4)", async () => {
    // At module scope in an app, above its provider: no ref, no useTour().
    const launch = vi.fn<TourLauncher>((id, opts, start) => start(STEPS, { id, startIndex: opts.startIndex, at: opts.at }));
    function Shared() {
      useTourUrlSync({ launch });
      return <Probe />;
    }
    render(
      <MemoryRouter initialEntries={["/budget?tour=budget&tourStep=2"]}>
        <TourProvider launch={launch}>
          <Shared />
        </TourProvider>
      </MemoryRouter>,
    );
    await flush();
    expect(launch).toHaveBeenCalledWith("budget", { startIndex: 1 }, expect.any(Function));
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 2");
  });
});

describe("useTourUrlSync under a data router (createBrowserRouter's kind, kastlan A2)", () => {
  it("does not write the mirror while a navigation is loading: the step's go() lands, then the mirror", async () => {
    let release: () => void = () => {};
    const slow = new Promise<null>((resolve) => {
      release = () => resolve(null);
    });
    function Layout() {
      const launcher = useLauncher();
      return (
        <>
          <Sync launch={launcher} />
          <Probe />
        </>
      );
    }
    const router = createMemoryRouter(
      [
        { path: "/budget", element: <Layout /> },
        { path: "/other", element: <Layout />, loader: () => slow },
      ],
      { initialEntries: ["/budget?tour=budget&tourStep=1"] },
    );
    render(
      <TourProvider>
        <RouterProvider router={router} />
      </TourProvider>,
    );
    await flush();
    expect(url()).toBe("/budget?tour=budget&tourStep=1");
    // A step navigates (its loader is slow), and the engine moves on meanwhile.
    act(() => screen.getByText("go-other").click());
    act(() => screen.getByText("engine-next").click());
    await flush();
    expect(router.state.navigation.state).toBe("loading");
    // A replace onto /budget here would have cancelled the navigation.
    await act(async () => {
      release();
      await slow;
    });
    await flush();
    expect(url()).toBe("/other?q=x&tour=budget&tourStep=2");
  });
});

describe("useTourCatalogueUrlState", () => {
  function Catalogue() {
    const filter = useTourCatalogueUrlState();
    const location = useLocation();
    return (
      <>
        <output data-testid="url">{location.search}</output>
        <output data-testid="filter">{JSON.stringify({ q: filter.query, g: filter.group, s: filter.state })}</output>
        <button onClick={() => filter.onChange({ query: "imp", group: "import", state: "todo" })}>set</button>
        <button onClick={() => filter.onChange({ query: "", group: null, state: "all" })}>clear</button>
      </>
    );
  }

  it("reads ?q, ?topic and ?state, an unknown state as all, and writes them back", () => {
    render(
      <MemoryRouter initialEntries={["/tours?q=bud&topic=start&state=bogus&keep=1"]}>
        <Catalogue />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("filter").textContent).toBe(JSON.stringify({ q: "bud", g: "start", s: "all" }));
    act(() => screen.getByText("set").click());
    expect(screen.getByTestId("url").textContent).toBe("?q=imp&topic=import&state=todo&keep=1");
    act(() => screen.getByText("clear").click());
    expect(screen.getByTestId("url").textContent).toBe("?keep=1");
    expect(screen.getByTestId("filter").textContent).toBe(JSON.stringify({ q: "", g: null, s: "all" }));
  });

  it("keeps the hash when it writes (keksdose N2, dev#495)", () => {
    function WithHash() {
      const location = useLocation();
      return <output data-testid="hash">{location.hash}</output>;
    }
    render(
      <MemoryRouter initialEntries={["/tours?q=bud#import"]}>
        <Catalogue />
        <WithHash />
      </MemoryRouter>,
    );
    act(() => screen.getByText("set").click());
    expect(screen.getByTestId("url").textContent).toBe("?q=imp&topic=import&state=todo");
    expect(screen.getByTestId("hash").textContent).toBe("#import");
  });
});
