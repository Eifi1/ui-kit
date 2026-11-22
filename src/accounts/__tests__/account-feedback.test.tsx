import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "../../components/toast";
import { fakeFetch, fakeHttp } from "../../test/fake-axios";
import { drainTasks } from "../../test/tasks";
import { DESKTOP_WIDTH, stubViewportWidth } from "../../test/viewport";
import type { Answer, Cfg } from "../../test/fake-axios";
import { AccountFeedbackPage, AccountPublicFeedbackPage, useAccountFeedbackSubmit } from "../account-feedback";
import { accountFeedbackApi } from "../account-feedback-api";
import { AccountsProvider, accountQueryKeys } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";
import type { FeedbackSubmit } from "../../feedback/feedback-submit";

/**
 * The feedback pages on server-kit 0.31's `feedback_router` (docs/auth-harmonization.md §12.9):
 * the kit's inbox and public page wired to the routes, through the account client's session.
 */

const ada = { id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace", role: "ADMIN" };
const ben = { id: 7, email: "ben@example.com", first_name: "Ben", last_name: "Example", role: "MEMBER" };
const clients: Array<{ detach(): void }> = [];

const report = (id: number, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: 7,
  user_email: "ben@example.com",
  title,
  body: "Ein Exponat, das sich als Simulation eignet.",
  category: "IDEA",
  status: "OPEN",
  context: null,
  screenshot_url: null,
  attachment_urls: [],
  outcome: null,
  resolved_at: null,
  created_at: "2026-11-14T09:00:00Z",
  updated_at: "2026-11-14T09:00:00Z",
  replies: [],
  ...extra,
});

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

/** The submit hook's latest `open`, as an app's top bar holds it, and its dialog. */
const submitter: { current: FeedbackSubmit | null } = { current: null };
function Submitter() {
  const feedback = useAccountFeedbackSubmit({ environment: "dev", version: "1.0.0" });
  useEffect(() => {
    submitter.current = feedback;
  });
  return <>{feedback.dialog}</>;
}

/** `/auth/me` answering the server's fault: the account is the session's alone. */
const meFails = () => ({ status: 500, data: { detail: "Internal Server Error" } });
/** Until `/auth/me`'s refusal is the query's state: before it, the session's account is the
 *  query's placeholder, which would hide the bug. */
async function meFailed(queryClient: QueryClient) {
  await waitFor(() => expect(queryClient.getQueryState(accountQueryKeys.me)?.status).toBe("error"));
}

function mount(
  ui: ReactNode,
  {
    user = ada,
    routes = {},
    entry = "/feedback",
    me = () => ({ status: 200, data: user }),
  }: {
    user?: object;
    routes?: Record<string, (c: Cfg) => Answer | Promise<Answer>>;
    entry?: string;
    me?: (c: Cfg) => Answer;
  } = {},
) {
  localStorage.setItem("app.session", JSON.stringify({ token: "a1", refreshToken: "r1", user }));
  const calls: Array<{ route: string; params?: unknown }> = [];
  const http = fakeHttp((config) => {
    const route = `${config.method} ${config.url}`;
    calls.push({ route, params: config.params });
    if (route === "get /auth/me") return me(config);
    const answer = routes[route];
    return answer ? answer(config) : { status: 204 };
  });
  const client = createAccountsClient<typeof ada>({
    http,
    storagePrefix: "app.",
    publicPaths: ["/"],
    fetch: fakeFetch(() => ({ status: 401 })),
    navigate: vi.fn(),
  });
  clients.push(client);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider client={queryClient}>
        <AccountsProvider client={client}>
          <Toaster />
          <Routes>
            <Route path="/feedback" element={ui} />
            <Route path="/all-feedback" element={ui} />
            <Route path="/my-feedback" element={<Where />} />
          </Routes>
        </AccountsProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { calls, queryClient };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  for (const client of clients.splice(0)) client.detach();
  vi.unstubAllGlobals();
});

describe("AccountFeedbackPage", () => {
  it("shows the admin every report from the inbox route", async () => {
    const { calls } = mount(<AccountFeedbackPage mine={false} />, {
      routes: {
        "get /feedback": () => ({
          status: 200,
          data: [report(2, "Die Pendelwelle"), report(3, "Der Doppelkegel, der bergauf rollt")],
        }),
      },
    });
    expect((await screen.findAllByText("Die Pendelwelle")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Der Doppelkegel, der bergauf rollt").length).toBeGreaterThan(0);
    expect(calls.map((c) => c.route)).not.toContain("get /feedback/my");
  });

  it("sends anybody but an admin from the inbox to their own reports, the link's report kept", async () => {
    const { calls } = mount(<AccountFeedbackPage mine={false} />, { user: ben, entry: "/feedback?row=2" });
    expect(await screen.findByTestId("where")).toHaveTextContent("/my-feedback?row=2");
    expect(calls.map((c) => c.route)).not.toContain("get /feedback");
  });

  it("lists the caller's own reports on their page", async () => {
    mount(<AccountFeedbackPage mine />, {
      user: ben,
      entry: "/feedback",
      routes: { "get /feedback/my": () => ({ status: 200, data: [report(2, "Die Pendelwelle", { mine: true })] }) },
    });
    expect((await screen.findAllByText("Die Pendelwelle")).length).toBeGreaterThan(0);
  });
});

describe("the account when /auth/me fails (Kurvenschmiede, 0.64.0-dev.6)", () => {
  it("draws the inbox for the session's account rather than loading for ever", async () => {
    const { queryClient } = mount(<AccountFeedbackPage mine={false} />, {
      me: meFails,
      routes: { "get /feedback": () => ({ status: 200, data: [report(2, "Die Pendelwelle")] }) },
    });
    await meFailed(queryClient);
    expect((await screen.findAllByText("Die Pendelwelle")).length).toBeGreaterThan(0);
  });

  it("draws the public page for the session's account", async () => {
    const { queryClient } = mount(
      <AccountPublicFeedbackPage publicReader={() => false} fallback={<p>Nicht gefunden</p>} />,
      {
        me: meFails,
        entry: "/all-feedback",
      },
    );
    await meFailed(queryClient);
    expect(await screen.findByText("Nicht gefunden")).toBeInTheDocument();
  });

  it("files a report in the session account's name", async () => {
    const created: unknown[] = [];
    const { queryClient } = mount(<Submitter />, {
      me: meFails,
      routes: {
        "post /feedback": (config) => {
          created.push(config.data);
          return { status: 201, data: report(9, "Der Doppelkegel") };
        },
      },
    });
    await meFailed(queryClient);
    act(() => submitter.current!.open("IDEA"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Ada Lovelace (ada@example.com)");
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Der Doppelkegel" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));
    await waitFor(() => expect(created).toHaveLength(1));
    expect((created[0] as { context: Record<string, unknown> }).context).toMatchObject({
      user_id: 1,
      user_email: "ada@example.com",
      user_display_name: "Ada Lovelace",
    });
  });
});

describe("the inbox's bulk edit (refactor audit 2026-11-22, FLW-2)", () => {
  const THREE = [report(2, "Die Pendelwelle"), report(3, "Der Doppelkegel"), report(4, "Das Galtonbrett")];
  const inboxReads = (calls: Array<{ route: string }>) => calls.filter((c) => c.route === "get /feedback").length;

  /** The three reports selected and set to Done until the bar says `summary`, each PATCH
   *  answered by `patch` — in a task
   *  of its own, as a browser's network answers (XHR's `loadend`, a `fetch` response). */
  async function bulkDone(patch: (c: Cfg) => Answer, summary: string) {
    const answer = (config: Cfg) => new Promise<Answer>((resolve) => setTimeout(() => resolve(patch(config)), 0));
    const view = mount(<AccountFeedbackPage mine={false} />, {
      routes: {
        "get /feedback": () => ({ status: 200, data: THREE }),
        "patch /feedback/2": answer,
        "patch /feedback/3": answer,
        "patch /feedback/4": answer,
      },
    });
    await screen.findAllByText("Das Galtonbrett");
    await waitFor(() => expect(inboxReads(view.calls)).toBe(1));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    const bar = screen.getByRole("toolbar");
    fireEvent.click(within(bar).getByRole("button", { name: "Set status" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Set status" })).getByRole("button", { name: "Done" }));
    // The bar's summary comes once every PATCH is answered; then the refetches they started.
    expect(await screen.findByText(summary)).toBeInTheDocument();
    expect(view.calls.filter((c) => c.route.startsWith("patch "))).toHaveLength(3);
    await drainTasks();
    return view;
  }

  let restoreWidth: (() => void) | undefined;
  beforeEach(() => {
    restoreWidth = stubViewportWidth(DESKTOP_WIDTH);
  });
  afterEach(() => restoreWidth?.());

  it("reads the inbox again once for the batch, not once per report", async () => {
    const { calls } = await bulkDone(
      (config) => ({ status: 200, data: { ...report(Number(config.url!.split("/").at(-1)), "x"), status: "DONE" } }),
      "Set 3 reports to “Done”",
    );
    expect(inboxReads(calls)).toBe(2);
  });

  it("says a refused batch once, in the bar's summary, not once per report", async () => {
    const { calls } = await bulkDone(
      () => ({ status: 400, data: { detail: "This report is closed." } }),
      "3 reports could not be changed and stay selected.",
    );
    expect(screen.queryByText("This report is closed.")).not.toBeInTheDocument();
    expect(inboxReads(calls)).toBe(2);
  });
});

/** A row of the public list, as `GET /feedback/public` answers it. */
const publicRow = (id: number, title: string) => ({
  id,
  title,
  category: "IDEA",
  status: "OPEN",
  author_name: "Ben Example",
  mine: false,
  comment_count: 0,
  votes: 3,
  voted: false,
  created_at: "2026-11-14T09:00:00Z",
  updated_at: "2026-11-14T09:00:00Z",
  resolved_at: null,
});

describe("a refusal's words (Kurvenschmiede, 0.64.0-dev.6)", () => {
  /** The admin's reply to report 2, refused with `answer`; resolves once it is sent. */
  async function replyRefused(answer: Answer, ui: ReactNode = <AccountFeedbackPage mine={false} />) {
    const { calls } = mount(ui, {
      entry: "/feedback?row=2",
      routes: {
        "get /feedback": () => ({ status: 200, data: [report(2, "Die Pendelwelle")] }),
        "post /feedback/2/replies": () => answer,
      },
    });
    const field = await screen.findByRole("textbox", { name: "Write a reply" });
    fireEvent.change(field, { target: { value: "Geplant." } });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("post /feedback/2/replies"));
  }

  it("asks the app's describeError first", async () => {
    await replyRefused(
      { status: 403, data: { detail: "(English)", code: "admin_required" } },
      <AccountFeedbackPage
        mine={false}
        describeError={(error) => (error ? "Die eigenen Worte der App." : undefined)}
      />,
    );
    expect(await screen.findByText("Die eigenen Worte der App.")).toBeInTheDocument();
  });

  it("says a coded refusal in the account words after it", async () => {
    await replyRefused(
      { status: 403, data: { detail: "(English)", code: "admin_required" } },
      <AccountFeedbackPage mine={false} describeError={() => undefined} />,
    );
    expect(await screen.findByText("Only an administrator can do this.")).toBeInTheDocument();
  });

  it("says an uncoded 4xx in the server's own sentence", async () => {
    await replyRefused({ status: 400, data: { detail: "This report is closed to replies." } });
    expect(await screen.findByText("This report is closed to replies.")).toBeInTheDocument();
  });

  it("keeps the part's own words for an uncoded 4xx with no sentence", async () => {
    await replyRefused({ status: 422, data: { detail: [{ loc: ["body"], msg: "field required" }] } });
    expect(await screen.findByText("Could not send the reply.")).toBeInTheDocument();
  });

  it("says the coded legacy_rework_append in the kit's words", async () => {
    await replyRefused({
      status: 422,
      data: { detail: "(the server's English)", code: "legacy_rework_append" },
    });
    expect(await screen.findByText("This page is out of date. Reload it and try again.")).toBeInTheDocument();
  });

  it("asks the app's describeError first on the public page too", async () => {
    const { calls } = mount(
      <AccountPublicFeedbackPage describeError={(error) => (error ? "Die eigenen Worte der App." : undefined)} />,
      {
        entry: "/all-feedback",
        routes: {
          "get /feedback/public": () => ({ status: 200, data: [publicRow(2, "Die Pendelwelle")] }),
          "put /feedback/2/vote": () => ({ status: 403, data: { detail: "(English)", code: "demo_refused" } }),
        },
      },
    );
    await screen.findAllByText("Die Pendelwelle");
    fireEvent.click(screen.getAllByRole("button", { name: /I want this too/ })[0]);
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("put /feedback/2/vote"));
    expect(await screen.findByText("Die eigenen Worte der App.")).toBeInTheDocument();
  });
});

describe("the writes (refactor audit 2026-11-22, TST-4)", () => {
  const inboxReads = (calls: Array<{ route: string }>) => calls.filter((c) => c.route === "get /feedback").length;
  let restoreWidth: (() => void) | undefined;
  beforeEach(() => {
    restoreWidth = stubViewportWidth(DESKTOP_WIDTH);
  });
  afterEach(() => restoreWidth?.());

  /** Report 2's status cell, pressed at `status`, the PATCH answered by `answer`. */
  async function setStatus(status: string, answer: (c: Cfg) => Answer) {
    const sent: Cfg[] = [];
    const view = mount(<AccountFeedbackPage mine={false} />, {
      routes: {
        "get /feedback": () => ({ status: 200, data: [report(2, "Die Pendelwelle")] }),
        "patch /feedback/2": (config) => {
          sent.push(config);
          return answer(config);
        },
      },
    });
    const row = (await screen.findAllByText("Die Pendelwelle"))[0].closest("tr") as HTMLElement;
    await waitFor(() => expect(inboxReads(view.calls)).toBe(1));
    fireEvent.click(within(row).getByRole("button", { name: status }));
    await waitFor(() => expect(sent).toHaveLength(1));
    return { ...view, sent };
  }

  it("a status change PATCHes the report and reads the inbox again", async () => {
    const { calls, sent } = await setStatus("Won't do", () => ({
      status: 200,
      data: report(2, "Die Pendelwelle", { status: "WONT_DO" }),
    }));
    expect(sent[0].url).toBe("/feedback/2");
    expect(sent[0].data).toEqual({ status: "WONT_DO" });
    await waitFor(() => expect(inboxReads(calls)).toBe(2));
    expect(await screen.findByText("Set to “Won't do”: Die Pendelwelle")).toBeInTheDocument();
  });

  it("a refused PATCH says the update-failed words", async () => {
    await setStatus("Won't do", () => ({ status: 422, data: { detail: [{ loc: ["body"], msg: "invalid" }] } }));
    expect(await screen.findByText("Could not save that change.")).toBeInTheDocument();
  });

  it("puts a reply's answer into the list before the list is read again", async () => {
    const answered = report(2, "Die Pendelwelle", {
      replies: [
        {
          id: 11,
          author_name: "Ada Lovelace",
          body: "Kommt in die nächste Ausstellung.",
          kind: "reply",
          status_to: null,
          created_at: "2026-11-15T10:00:00Z",
        },
      ],
    });
    let reads = 0;
    const { calls, queryClient } = mount(<AccountFeedbackPage mine={false} />, {
      entry: "/feedback?row=2",
      routes: {
        // The first read answers; the one the reply starts never does, so the reply in the
        // list can only be the answer's.
        "get /feedback": () =>
          (reads += 1) === 1 ? { status: 200, data: [report(2, "Die Pendelwelle")] } : new Promise<Answer>(() => {}),
        "post /feedback/2/replies": () => ({ status: 201, data: answered }),
      },
    });
    const field = await screen.findByRole("textbox", { name: "Write a reply" });
    fireEvent.change(field, { target: { value: "Kommt in die nächste Ausstellung." } });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    await waitFor(() => expect(inboxReads(calls)).toBe(2));
    expect(queryClient.getQueryData<Array<{ replies: unknown[] }>>(accountQueryKeys.feedbackAll)?.[0].replies).toEqual(
      answered.replies,
    );
    expect(await screen.findByText("Kommt in die nächste Ausstellung.")).toBeInTheDocument();
  });

  it("puts a vote's count into the public list, the open report and the inbox", async () => {
    const { calls, queryClient } = mount(<AccountPublicFeedbackPage />, {
      entry: "/all-feedback?row=2",
      routes: {
        "get /feedback/public": () => ({ status: 200, data: [publicRow(2, "Die Pendelwelle")] }),
        "get /feedback/public/2": () => ({ status: 200, data: { ...publicRow(2, "Die Pendelwelle"), body: "x" } }),
        "put /feedback/2/vote": () => ({ status: 200, data: { votes: 4, voted: true } }),
      },
    });
    // The admin's inbox, read earlier in the session.
    queryClient.setQueryData(accountQueryKeys.feedbackAll, [report(2, "Die Pendelwelle", { votes: 3, voted: false })]);
    await waitFor(() => expect(queryClient.getQueryData(accountQueryKeys.feedbackPublicOne(2))).toBeDefined());
    await screen.findAllByText("Die Pendelwelle");
    fireEvent.click(screen.getAllByRole("button", { name: /I want this too/ })[0]);
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("put /feedback/2/vote"));
    const counted = { votes: 4, voted: true };
    await waitFor(() => expect(queryClient.getQueryData(accountQueryKeys.feedbackPublicOne(2))).toMatchObject(counted));
    for (const [, rows] of queryClient.getQueriesData<unknown[]>({ queryKey: accountQueryKeys.feedbackPublicLists })) {
      expect(rows?.[0]).toMatchObject(counted);
    }
    expect(queryClient.getQueryData<unknown[]>(accountQueryKeys.feedbackAll)?.[0]).toMatchObject(counted);
  });
});

describe("AccountPublicFeedbackPage", () => {
  it("reads the public titles a page at a time, newest first", async () => {
    const { calls } = mount(<AccountPublicFeedbackPage pageSize={20} />, {
      entry: "/all-feedback",
      routes: {
        "get /feedback/public": () => ({
          status: 200,
          data: [publicRow(2, "Die Pendelwelle")],
        }),
      },
    });
    expect((await screen.findAllByText("Die Pendelwelle")).length).toBeGreaterThan(0);
    expect(calls.find((c) => c.route === "get /feedback/public")?.params).toEqual({
      sort: "newest",
      limit: 20,
      offset: 0,
    });
  });

  it("takes publicReader as a boolean, as the inbox does", async () => {
    const { calls } = mount(<AccountPublicFeedbackPage publicReader={false} fallback={<p>Nicht gefunden</p>} />, {
      entry: "/all-feedback",
    });
    expect(await screen.findByText("Nicht gefunden")).toBeInTheDocument();
    expect(calls.map((c) => c.route)).not.toContain("get /feedback/public");
  });

  it("reads the list for publicReader true, a demo too", async () => {
    mount(<AccountPublicFeedbackPage publicReader />, {
      user: { ...ada, is_demo: true },
      entry: "/all-feedback",
      routes: { "get /feedback/public": () => ({ status: 200, data: [publicRow(2, "Die Pendelwelle")] }) },
    });
    expect((await screen.findAllByText("Die Pendelwelle")).length).toBeGreaterThan(0);
  });

  it("shows a reader the server would refuse the app's fallback, and asks nothing", async () => {
    const { calls } = mount(<AccountPublicFeedbackPage publicReader={() => false} fallback={<p>Nicht gefunden</p>} />, {
      entry: "/all-feedback",
    });
    expect(await screen.findByText("Nicht gefunden")).toBeInTheDocument();
    expect(calls.map((c) => c.route)).not.toContain("get /feedback/public");
  });
});

describe("accountFeedbackApi", () => {
  function api() {
    const requests: Cfg[] = [];
    const http = fakeHttp((config) => {
      requests.push(config);
      if (config.url === "/feedback/attachments")
        return { status: 201, data: { url: "/api/v1/feedback/attachments/k1" } };
      if (config.url?.endsWith("/vote")) return { status: 200, data: { votes: 4, voted: config.method === "put" } };
      return { status: 200, data: new Blob(["x"]) };
    });
    return { routes: accountFeedbackApi(http), requests };
  }

  it("uploads a file as multipart, with no content type of the client's", async () => {
    const { routes, requests } = api();
    await expect(routes.upload(new Blob(["png"]))).resolves.toBe("/api/v1/feedback/attachments/k1");
    expect(requests[0].data).toBeInstanceOf(FormData);
    expect((requests[0].headers as Record<string, unknown>)["Content-Type"]).toBeUndefined();
  });

  it("fetches a report's file under the API's prefix once, as a blob", async () => {
    const { routes, requests } = api();
    await routes.file("/api/v1/feedback/attachments/k1");
    expect(requests[0].url).toBe("/feedback/attachments/k1");
    expect(requests[0].responseType).toBe("blob");
  });

  it("votes with PUT and takes it back with DELETE, answering the server's count", async () => {
    const { routes, requests } = api();
    await expect(routes.vote(2, true)).resolves.toEqual({ votes: 4, voted: true });
    await routes.vote(2, false);
    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual(["put /feedback/2/vote", "delete /feedback/2/vote"]);
  });

  it("sends a reply's status and file only when there is one", async () => {
    const { routes, requests } = api();
    await routes.reply(2, "Geplant.");
    await routes.reply(2, "Erledigt.", "DONE", "/api/v1/feedback/attachments/k1");
    expect(requests.map((r) => r.data)).toEqual([
      { body: "Geplant." },
      { body: "Erledigt.", status: "DONE", attachment_url: "/api/v1/feedback/attachments/k1" },
    ]);
  });
});

describe("the feedback's query keys (0.64, Kurvenschmiede's U10)", () => {
  it("sit under their own root, beside the comment threads, not under the account's", async () => {
    const { accountQueryKeys } = await import("../accounts-context");
    const { feedbackCommentsQueryKey } = await import("../../offline/feedback-comments-query");
    for (const key of [
      accountQueryKeys.feedback,
      accountQueryKeys.feedbackMine,
      accountQueryKeys.feedbackAll,
      accountQueryKeys.feedbackPublicLists,
      accountQueryKeys.feedbackPublic({ sort: "new" }),
      accountQueryKeys.feedbackPublicOne(3),
    ]) {
      expect(key[0]).toBe("feedback");
    }
    expect(feedbackCommentsQueryKey(3, false)[0]).toBe("feedback");
    expect(accountQueryKeys.all[0]).toBe("accounts");
  });
});
