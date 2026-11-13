import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  onlineManager,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { toast } from "../../components/toast";
import { drainTasks } from "../../test/tasks";
import { DESKTOP_WIDTH, stubPhone, stubViewportWidth } from "../../test/viewport";
import { FeedbackPageFrame } from "../feedback-page-frame";
import {
  FeedbackPublicPage,
  useFeedbackPublicPage,
  type FeedbackPublicApi,
  type FeedbackPublicPageProps,
  type FeedbackPublicRead,
  type FeedbackPublicRequest,
} from "../feedback-public-page";
import type { FeedbackComment, FeedbackPublicListItem, FeedbackPublicRecord } from "../feedback-public-types";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

/**
 * docs/feedback-harmonization.md §14: the public page assembled once — keksdose's
 * `/all-feedback` (the canon) and Kurvenschmiede's, which kept its sort and page in
 * component state and had no Try again. The app's queries are TanStack's, passed as they
 * are, as both apps pass them; the server is a fake. Synthetic reports only.
 */

const item = (id: number, over: Partial<FeedbackPublicListItem> = {}): FeedbackPublicListItem => ({
  id,
  title: `Report ${id}`,
  category: "BUG",
  status: "IN_PROGRESS",
  author_name: "Anna",
  mine: false,
  votes: 4,
  voted: false,
  comment_count: 1,
  created_at: "2026-10-12T09:12:00Z",
  updated_at: "2026-10-13T16:40:00Z",
  resolved_at: null,
  ...over,
});

const ROW = item(52, { title: "Chart jumps on save" });

const record = (row: FeedbackPublicListItem): FeedbackPublicRecord => ({
  ...row,
  body: `The text of #${row.id}.`,
  replies: [
    {
      id: 1,
      author_name: "Marcel",
      body: `Reproduced #${row.id}, fix on its way.`,
      status_to: "IN_PROGRESS",
      created_at: "2026-10-13T10:00:00Z",
    },
  ],
});

const COMMENT: FeedbackComment = {
  id: 9,
  author_name: "Ben",
  mine: false,
  staff: false,
  body: "Same on the iPad.",
  hidden: false,
  created_at: "2026-10-12T11:00:00Z",
};

/** The app's client: `GET /feedback/public` answers `rows`, a report by its id. */
function server(rows: FeedbackPublicListItem[] = [ROW], known: FeedbackPublicListItem[] = rows) {
  return {
    listPublic: vi.fn(async (_request: FeedbackPublicRequest) => rows),
    getPublic: vi.fn(async (id: number) => {
      const row = known.find((r) => r.id === id);
      if (!row) throw new Error("Not found");
      return record(row);
    }),
    vote: vi.fn(async (_id: number, next: boolean) => ({ votes: next ? 5 : 4, voted: next })),
    comments: vi.fn(async (_id: number) => [COMMENT]),
    comment: vi.fn(async (_id: number, _body: string, _attachmentUrl?: string) => undefined),
    hideComment: vi.fn(async (_id: number, _commentId: number, _hidden: boolean) => undefined),
    deleteComment: vi.fn(async (_id: number, _commentId: number) => undefined),
  };
}
type Server = ReturnType<typeof server>;

/** The app's page, as both apps write it from 0.61: the hook, two queries, the component. */
function AllFeedback({
  api,
  search = false,
  ...props
}: { api: Server; search?: boolean } & Partial<FeedbackPublicPageProps>) {
  const view = useFeedbackPublicPage({ search });
  const list = useQuery({
    queryKey: ["feedback", "public", view.request],
    queryFn: () => api.listPublic(view.request),
    placeholderData: keepPreviousData,
  });
  const one = useQuery({
    queryKey: ["feedback", "public-one", view.openId],
    queryFn: () => api.getPublic(view.openId ?? 0),
    enabled: view.openId !== null,
  });
  return <FeedbackPublicPage view={view} list={list} record={one} api={api} {...props} />;
}

let location: ReturnType<typeof useLocation> | null = null;
function Where() {
  const here = useLocation();
  useEffect(() => {
    location = here;
  });
  return null;
}
const param = (key: string) => new URLSearchParams(location!.search).get(key);

function renderPage(
  url = "/all-feedback",
  {
    api = server(),
    client,
    ...props
  }: { api?: Server; client?: QueryClient } & Partial<Parameters<typeof AllFeedback>[0]> = {},
) {
  const queryClient = client ?? new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <AllFeedback api={api} {...props} />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, api, queryClient };
}

/** The open report's detail. */
const detail = () => document.querySelector<HTMLElement>("[data-feedback-public-detail]");

let restore: (() => void) | undefined;
beforeEach(() => {
  restore = stubViewportWidth(DESKTOP_WIDTH);
  vi.mocked(toast.error).mockClear();
});
afterEach(() => {
  restore?.();
  restore = undefined;
  onlineManager.setOnline(true);
  vi.useRealTimers();
});

describe("the list, and the URL it keeps", () => {
  it("asks for the first page, newest first, and draws the reports under the page's title", async () => {
    const { api } = renderPage();
    expect(await screen.findByText("Chart jumps on save")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Feedback discussion" })).toBeInTheDocument();
    expect(api.listPublic).toHaveBeenCalledWith({ sort: "newest", limit: 50, offset: 0 });
  });

  it("reads the sort and the page from the address, as a shared link names them", async () => {
    const { api } = renderPage("/all-feedback?sort=votes&p=2");
    await screen.findByText("Chart jumps on save");
    expect(api.listPublic).toHaveBeenCalledWith({ sort: "votes", limit: 50, offset: 100 });
    expect(screen.getByRole("radio", { name: "Most wanted" })).toBeChecked();
  });

  it("writes a new sort into the address and goes back to the first page", async () => {
    // Kurvenschmiede kept both in useState: a reload started over, newest first.
    const { api } = renderPage("/all-feedback?p=3");
    await screen.findByText("Chart jumps on save");
    fireEvent.click(screen.getByRole("radio", { name: "Recently updated" }));
    expect(param("sort")).toBe("updated");
    expect(param("p")).toBeNull();
    await waitFor(() => expect(api.listPublic).toHaveBeenLastCalledWith({ sort: "updated", limit: 50, offset: 0 }));
  });

  it.each([["?sort=oldest&p=-1"], ["?sort=&p=1e2"], ["?p=01"], ["?p=1.5"]])(
    "reads a hand-edited %s as the first page, newest first",
    async (query) => {
      const { api } = renderPage(`/all-feedback${query}`);
      await screen.findByText("Chart jumps on save");
      expect(api.listPublic).toHaveBeenCalledWith({ sort: "newest", limit: 50, offset: 0 });
    },
  );

  it("pages on while a page comes back full — Next waits for the page it asked for — and back", async () => {
    const full = Array.from({ length: 50 }, (_, i) => item(100 + i));
    const api = server(full);
    let second: ((rows: FeedbackPublicListItem[]) => void) | undefined;
    api.listPublic.mockImplementation((request) =>
      request.offset === 0
        ? Promise.resolve(full)
        : new Promise<FeedbackPublicListItem[]>((resolve) => {
            second = resolve;
          }),
    );
    renderPage("/all-feedback", { api });
    await screen.findByText("Report 100");
    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });
    expect(previous).toBeDisabled();
    fireEvent.click(next);
    expect(param("p")).toBe("1");
    await waitFor(() => expect(api.listPublic).toHaveBeenLastCalledWith({ sort: "newest", limit: 50, offset: 50 }));
    // The first page stays on screen while the second loads, and says nothing about whether
    // a third exists: Next waits (Kurvenschmiede's `!isPlaceholderData`).
    expect(screen.getByText("Report 100")).toBeInTheDocument();
    expect(next).toBeDisabled();
    await act(async () => second?.([item(200)]));
    expect(await screen.findByText("Report 200")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(param("p")).toBeNull();
  });

  it("says a list that did not load, with Try again, and keeps the sort to change what is asked", async () => {
    // keksdose drew "No reports yet" — the empty state for a server that failed.
    const api = server();
    api.listPublic.mockRejectedValueOnce(new Error("down"));
    renderPage("/all-feedback", { api });
    expect(await screen.findByText("That didn’t load.")).toBeInTheDocument();
    expect(screen.queryByText("No reports yet")).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Sort" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Chart jumps on save")).toBeInTheDocument();
    expect(api.listPublic).toHaveBeenCalledTimes(2);
  });

  it("says the device is offline when the list's read waits for the network", async () => {
    onlineManager.setOnline(false);
    renderPage();
    expect(await screen.findByText("You’re offline")).toBeInTheDocument();
    expect(screen.getByText("This needs a connection. It loads as soon as you’re back online.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});

describe("the search", () => {
  it("is off by default: no box, and a `q` in the address is never sent (sealed titles)", async () => {
    // Where titles are sealed, the server answers `q` with a 422 (`public_search=False`).
    const { api } = renderPage("/all-feedback?q=chart");
    await screen.findByText("Chart jumps on save");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(api.listPublic).toHaveBeenCalledWith({ sort: "newest", limit: 50, offset: 0 });
  });

  it("with `search`, starts from ?q= and ?p=, and a new text goes back to the first page", async () => {
    const { api } = renderPage("/all-feedback?q=chart&p=2", { search: true });
    expect(await screen.findByText("Chart jumps on save")).toBeInTheDocument();
    expect(api.listPublic).toHaveBeenCalledWith({ sort: "newest", q: "chart", limit: 50, offset: 100 });
    const box = screen.getByRole("searchbox");
    expect(box).toHaveValue("chart");
    fireEvent.change(box, { target: { value: "charts" } });
    expect(param("q")).toBe("charts");
    expect(param("p")).toBeNull();
  });

  it("asks once the typing pauses, for the trimmed text, the rows kept on screen meanwhile", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const api = server();
    renderPage("/all-feedback", { api, search: true });
    expect(await screen.findByText("Chart jumps on save")).toBeInTheDocument();
    const box = screen.getByRole("searchbox");

    api.listPublic.mockClear();
    let answer: ((rows: FeedbackPublicListItem[]) => void) | undefined;
    api.listPublic.mockImplementation(
      () =>
        new Promise<FeedbackPublicListItem[]>((resolve) => {
          answer = resolve;
        }),
    );
    fireEvent.change(box, { target: { value: "e" } });
    fireEvent.change(box, { target: { value: "ex" } });
    fireEvent.change(box, { target: { value: "exp " } });
    // The box and `?q=` follow every keystroke; the server is not asked yet.
    expect(param("q")).toBe("exp ");
    expect(api.listPublic).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    // One request, for the settled text, trimmed.
    expect(api.listPublic).toHaveBeenCalledTimes(1);
    expect(api.listPublic).toHaveBeenCalledWith({ sort: "newest", q: "exp", limit: 50, offset: 0 });
    expect(screen.getByText("Chart jumps on save")).toBeInTheDocument();
    await act(async () => answer?.([]));
    await waitFor(() => expect(screen.queryByText("Chart jumps on save")).toBeNull());
  });
});

describe("the open report", () => {
  it("opens the report ?row= names: its text, the answer and the comments", async () => {
    // A notice about a report one follows lands here (`/all-feedback?row=<id>`).
    const { api } = renderPage("/all-feedback?row=52");
    expect(await screen.findByText("The text of #52.")).toBeInTheDocument();
    expect(screen.getByText("Reproduced #52, fix on its way.")).toBeInTheDocument();
    expect(await screen.findByText("Same on the iPad.")).toBeInTheDocument();
    expect(api.getPublic).toHaveBeenCalledWith(52);
    expect(api.comments).toHaveBeenCalledWith(52);
  });

  it("writes ?row= when a row opens and takes it out when it closes", async () => {
    renderPage("/all-feedback?sort=votes");
    fireEvent.click(await screen.findByText("Chart jumps on save"));
    expect(param("row")).toBe("52");
    expect(param("sort")).toBe("votes");
    expect(await screen.findByText("The text of #52.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Chart jumps on save")[0]);
    expect(param("row")).toBeNull();
    expect(detail()).toBeNull();
  });

  it.each([["abc"], ["1e2"], ["0"], ["52.0"]])("opens nothing for ?row=%s", async (raw) => {
    const { api } = renderPage(`/all-feedback?row=${raw}`);
    await screen.findByText("Chart jumps on save");
    expect(api.getPublic).not.toHaveBeenCalled();
    expect(detail()).toBeNull();
  });

  it("draws a report the page does not list above its rows, open", async () => {
    const api = server([item(6, { title: "Another one" })], [ROW, item(6, { title: "Another one" })]);
    renderPage("/all-feedback?row=52", { api });
    expect(await screen.findByText("The text of #52.")).toBeInTheDocument();
    expect(screen.getByText("Another one")).toBeInTheDocument();
    const titles = screen.getAllByText(/Chart jumps on save|Another one/).map((el) => el.textContent);
    expect(titles[0]).toBe("Chart jumps on save");
  });

  it("says once that a linked report from another page could not be opened, instead of doing nothing", async () => {
    // Removed, or made private since the notice was sent: the read answers 404.
    const { api } = renderPage("/all-feedback?row=99");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Report #99 could not be opened. It may have been removed or hidden from others.",
        { id: "feedback-row-99" },
      ),
    );
    expect(api.getPublic).toHaveBeenCalledWith(99);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Chart jumps on save")).toBeInTheDocument();
  });

  it("shows the report loading as a Skeleton", async () => {
    const api = server();
    api.getPublic.mockImplementation(() => new Promise(() => {}));
    renderPage("/all-feedback?row=52", { api });
    await screen.findByText("Chart jumps on save");
    expect(document.querySelector("[data-feedback-public-loading]")).not.toBeNull();
  });

  it("says the open report did not load, with Try again, and draws it when it does", async () => {
    // Listed, but its author turned "Visible to others" off since: the detail read fails.
    // Kurvenschmiede drew a red line with nothing to press.
    const api = server();
    api.getPublic.mockRejectedValueOnce(new Error("Not found"));
    renderPage("/all-feedback?row=52", { api });
    expect(await screen.findByText("That didn’t load.")).toBeInTheDocument();
    // On the page, so no toast: the row is there to say it.
    expect(toast.error).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("The text of #52.")).toBeInTheDocument();
    expect(api.getPublic).toHaveBeenCalledTimes(2);
  });

  it("says the device is offline when the open report's read pauses", async () => {
    // keksdose's case: under offlineFirst the first attempt fails and the retry waits for
    // the network.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: 1, retryDelay: 0, gcTime: Infinity, networkMode: "offlineFirst" } },
    });
    const api = server();
    renderPage("/all-feedback", { api, client });
    await screen.findByText("Chart jumps on save");
    onlineManager.setOnline(false);
    api.getPublic.mockRejectedValue(new TypeError("Failed to fetch"));
    fireEvent.click(screen.getByText("Chart jumps on save"));
    expect(await screen.findByText("You’re offline")).toBeInTheDocument();
  });

  it("keeps the report open when a later read of it fails", async () => {
    const { api, queryClient } = renderPage("/all-feedback?row=52");
    expect(await screen.findByText("The text of #52.")).toBeInTheDocument();
    api.getPublic.mockRejectedValueOnce(new Error("down"));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["feedback", "public-one"] });
    });
    // TanStack tells its observers a macrotask later (notifyManager): let the page render
    // before asserting what it does not draw.
    await drainTasks();
    // The read did fail: the query holds the error beside the report it had.
    expect(api.getPublic).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryState(["feedback", "public-one", 52])?.status).toBe("error");
    expect(screen.getByText("The text of #52.")).toBeInTheDocument();
    expect(screen.queryByText("That didn’t load.")).toBeNull();
  });

  it("says comments that did not load in the conversation's place, with Try again", async () => {
    // keksdose's thread showed its loading lines for good.
    const api = server();
    api.comments.mockRejectedValueOnce(new Error("down"));
    renderPage("/all-feedback?row=52", { api });
    expect(await screen.findByText("The text of #52.")).toBeInTheDocument();
    const conversation = await screen.findByText("That didn’t load.");
    expect(screen.queryByRole("textbox", { name: "Write a comment" })).toBeNull();
    fireEvent.click(within(conversation.closest("[data-feedback-public-read]") as HTMLElement).getByRole("button"));
    expect(await screen.findByText("Same on the iPad.")).toBeInTheDocument();
  });
});

describe("the vote and the conversation", () => {
  it("votes through the client and tells the app the server's count", async () => {
    const onChanged = vi.fn();
    const { api } = renderPage("/all-feedback?row=52", { onChanged });
    await screen.findByText("Same on the iPad.");
    fireEvent.click(within(detail()!).getByRole("button", { name: /I want this too/ }));
    await waitFor(() => expect(api.vote).toHaveBeenCalledWith(52, true));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(52, { votes: 5, voted: true }));
  });

  it("toasts a refused vote — the server's sentence through errorMessage — and the button rolls back", async () => {
    const api = server();
    api.vote.mockRejectedValueOnce(new Error("Demo sessions cannot vote."));
    const errorMessage = vi.fn((error: unknown, fallback: string) =>
      error instanceof Error ? error.message : fallback,
    );
    renderPage("/all-feedback?row=52", { api, errorMessage });
    await screen.findByText("Same on the iPad.");
    const button = within(detail()!).getByRole("button", { name: /I want this too/ });
    fireEvent.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Demo sessions cannot vote."));
    expect(errorMessage).toHaveBeenCalledWith(expect.any(Error), "Could not save your vote.");
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
  });

  it("votes from the list's row too", async () => {
    const { api } = renderPage();
    await screen.findByText("Chart jumps on save");
    fireEvent.click(screen.getByRole("button", { name: /I want this too/ }));
    await waitFor(() => expect(api.vote).toHaveBeenCalledWith(52, true));
  });

  it("comments on the open report and tells the app", async () => {
    const onChanged = vi.fn();
    const { api } = renderPage("/all-feedback?row=52", { onChanged });
    await screen.findByText("Same on the iPad.");
    fireEvent.change(screen.getByRole("textbox", { name: "Write a comment" }), { target: { value: "Me too" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() => expect(api.comment).toHaveBeenCalledWith(52, "Me too"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(52));
  });

  it("draws the app's own thread instead of reading one, as keksdose's offline cache hands it", async () => {
    // keksdose persists its threads for offline reading; the kit's hook holds them in memory.
    const onComment = vi.fn(async (_body: string, _attachmentUrl?: string): Promise<unknown> => undefined);
    const thread = {
      comments: [{ ...COMMENT, id: 91, body: "From the device's cache." }],
      loading: false,
      failed: false,
      offline: false,
      retry: vi.fn(),
      pending: false,
      onComment,
    };
    const { api } = renderPage("/all-feedback?row=52", { thread });
    expect(await screen.findByText("From the device's cache.")).toBeInTheDocument();
    expect(screen.queryByText("Same on the iPad.")).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Write a comment" }), { target: { value: "Me too" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() => expect(onComment).toHaveBeenCalled());
    expect(onComment.mock.calls[0][0]).toBe("Me too");
    expect(api.comments).not.toHaveBeenCalled();
  });

  it("offers Hide to the admin alone", async () => {
    const { unmount } = renderPage("/all-feedback?row=52");
    await screen.findByText("Same on the iPad.");
    expect(screen.queryByRole("button", { name: "Hide" })).toBeNull();
    unmount();
    const { api } = renderPage("/all-feedback?row=52", { isAdmin: true });
    fireEvent.click(await screen.findByRole("button", { name: "Hide" }));
    await waitFor(() => expect(api.hideComment).toHaveBeenCalledWith(52, 9, true));
  });
});

describe("the header and the frame", () => {
  it("draws the frame's compact header with the page's title in a FeedbackPageFrame", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/all-feedback"]}>
          <FeedbackPageFrame>
            <AllFeedback api={server()} />
          </FeedbackPageFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const headings = (await screen.findAllByRole("heading")).map((h) => h.textContent);
    expect(headings).toEqual(["Feedback discussion"]);
    expect(screen.getByRole("heading").className).not.toContain("sm:text-2xl");
  });

  it("draws no title of its own where the frame has one, and the app's header wins over both", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <FeedbackPageFrame title="All reports">
            <AllFeedback api={server()} />
          </FeedbackPageFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect((await screen.findAllByRole("heading")).map((h) => h.textContent)).toEqual(["All reports"]);
    unmount();
    renderPage("/all-feedback", { header: (title) => <h2>{`${title}!`}</h2> });
    expect((await screen.findAllByRole("heading")).map((h) => h.textContent)).toEqual(["Feedback discussion!"]);
  });
});

describe("on a phone", () => {
  it("draws the cards with the counts, and opens a report from one", async () => {
    restore?.();
    restore = stubPhone();
    renderPage();
    const title = await screen.findByText("Chart jumps on save");
    expect(document.querySelector("[data-feedback-vote-count='4']")).not.toBeNull();
    fireEvent.click(title);
    expect(await screen.findByText("The text of #52.")).toBeInTheDocument();
    expect(param("row")).toBe("52");
  });
});

describe("what it takes", () => {
  it("TanStack's useQuery results and both apps' feedbackApi, as they are (checked by tsc)", () => {
    expectTypeOf<UseQueryResult<FeedbackPublicListItem[], Error>>().toExtend<
      FeedbackPublicRead<readonly FeedbackPublicListItem[]>
    >();
    expectTypeOf<UseQueryResult<FeedbackPublicRecord, Error>>().toExtend<FeedbackPublicRead<FeedbackPublicRecord>>();
    expectTypeOf<Server>().toExtend<FeedbackPublicApi>();
  });
});
