import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { KitReviewPage } from "../kit-review/kit-review-page";
import { TOKEN_KEY, storeToken } from "../kit-review/session";

/**
 * The kit review page's states against a stubbed keksdose: not configured, no token, the
 * token handed over in the address (and gone from it), a token that expired, a refusal,
 * a failure with Retry. The retry and timeout rules are client.ts's and tested there.
 */

const BASE = "https://api.test/api/v1";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/kit-review" element={<KitReviewPage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const json = (status: number, body: unknown) =>
  ({ status, text: async () => JSON.stringify(body), headers: new Headers() }) as unknown as Response;

/** keksdose, by route: `/health` is up; `/translations/reviews` answers from `reviews`. */
function keksdose(...reviews: Response[]) {
  return vi.fn(async (url: RequestInfo | URL) => {
    const path = String(url).slice(BASE.length);
    if (path === "/health") return json(200, { status: "ok", version: "test" });
    if (path === "/translations/reviews") return reviews.length > 1 ? reviews.shift()! : reviews[0];
    throw new TypeError(`unexpected ${path}`);
  });
}

const READY = json(200, { locales: ["fr"], areas: null, reviews: [] });
const authOf = (call: unknown[]) => ((call[1] as RequestInit).headers as Record<string, string>).Authorization;
const reviewCalls = (fetch: ReturnType<typeof keksdose>) =>
  fetch.mock.calls.filter(([url]) => String(url).endsWith("/translations/reviews"));

beforeAll(() => vi.stubGlobal("ResizeObserver", ResizeObserverStub));
beforeEach(() => vi.stubEnv("VITE_REVIEW_API_BASE", BASE));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.restoreAllMocks();
  storeToken(null);
  sessionStorage.clear();
  localStorage.clear();
});

describe("the kit review page", () => {
  it("without an API base: says so, and requests nothing", () => {
    vi.stubEnv("VITE_REVIEW_API_BASE", "");
    const fetch = keksdose(READY);
    vi.stubGlobal("fetch", fetch);
    renderAt("/kit-review");
    expect(screen.getByText("The live review is not configured in this build")).toBeInTheDocument();
    // vitest is a dev build: the base can be typed in.
    expect(screen.getByLabelText("API base (development only)")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("without a token: explains itself, offers the paste field, and only wakes the server", async () => {
    const fetch = keksdose(READY);
    vi.stubGlobal("fetch", fetch);
    renderAt("/kit-review");
    expect(screen.getByLabelText("Review token")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("keksdose is awake.")).toBeInTheDocument());
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([`${BASE}/health`]);

    fireEvent.change(screen.getByLabelText("Review token"), { target: { value: " pasted " } });
    fireEvent.click(screen.getByRole("button", { name: "Use this token" }));
    await waitFor(() => expect(reviewCalls(fetch)).toHaveLength(1));
    expect(authOf(reviewCalls(fetch)[0])).toBe("Bearer pasted");
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe("pasted");
  });

  it("takes the token out of the address into this tab's storage, and loads the review with it", async () => {
    const fetch = keksdose(READY);
    vi.stubGlobal("fetch", fetch);
    renderAt("/kit-review?token=abc&locale=fr");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/kit-review\?locale=fr$/));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe("abc");
    await waitFor(() => expect(reviewCalls(fetch).length).toBeGreaterThan(0));
    expect(authOf(reviewCalls(fetch)[0])).toBe("Bearer abc");
    expect(await screen.findByText(/kit strings in one language/, undefined, { timeout: 10_000 })).toBeInTheDocument();
  }, 30_000);

  it("keeps a handed-over token for a remount when sessionStorage is blocked", async () => {
    // What the showcase's lazySection does on the re-render that cleans the address.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const fetch = keksdose(READY);
    vi.stubGlobal("fetch", fetch);
    const first = renderAt("/kit-review?token=abc");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/kit-review$/));
    first.unmount();
    fetch.mockClear();
    renderAt("/kit-review");
    await waitFor(() => expect(reviewCalls(fetch).length).toBeGreaterThan(0));
    expect(authOf(reviewCalls(fetch)[0])).toBe("Bearer abc");
  });

  it("drops an expired token and says how to get a new one", async () => {
    sessionStorage.setItem(TOKEN_KEY, "old");
    vi.stubGlobal("fetch", keksdose(json(401, { detail: "Token expired" })));
    renderAt("/kit-review");
    expect(await screen.findByText("Your review token has expired or was revoked")).toBeInTheDocument();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(screen.getByLabelText("Review token")).toBeInTheDocument();
  });

  it("shows keksdose's refusal in its own words", async () => {
    sessionStorage.setItem(TOKEN_KEY, "abc");
    vi.stubGlobal("fetch", keksdose(json(403, { detail: "No translation review access" })));
    renderAt("/kit-review");
    expect(await screen.findByText("keksdose refused this token")).toBeInTheDocument();
    expect(screen.getByText("No translation review access")).toBeInTheDocument();
    expect(screen.getByLabelText("Another review token")).toBeInTheDocument();
  });

  it("offers Retry after a failure that is not the token's", async () => {
    sessionStorage.setItem(TOKEN_KEY, "abc");
    const fetch = keksdose(json(500, { detail: "boom" }), READY);
    vi.stubGlobal("fetch", fetch);
    renderAt("/kit-review");
    expect(await screen.findByText("keksdose answered 500: boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/kit strings in one language/, undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(reviewCalls(fetch)).toHaveLength(2);
  }, 30_000);

  it("aborts what is in flight when the page goes", async () => {
    sessionStorage.setItem(TOKEN_KEY, "abc");
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        signals.push(init!.signal!);
        return new Promise<Response>(() => {});
      }),
    );
    const { unmount } = renderAt("/kit-review");
    await waitFor(() => expect(signals.length).toBe(2)); // /health and the review
    unmount();
    expect(signals.every((s) => s.aborted)).toBe(true);
  });
});
