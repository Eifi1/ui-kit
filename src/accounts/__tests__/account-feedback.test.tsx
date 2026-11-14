import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeFetch, fakeHttp } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";
import { AccountFeedbackPage, AccountPublicFeedbackPage } from "../account-feedback";
import { accountFeedbackApi } from "../account-feedback-api";
import { AccountsProvider } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";

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

function mount(
  ui: ReactNode,
  {
    user = ada,
    routes = {},
    entry = "/feedback",
  }: { user?: object; routes?: Record<string, (c: Cfg) => Answer>; entry?: string } = {},
) {
  localStorage.setItem("app.session", JSON.stringify({ token: "a1", refreshToken: "r1", user }));
  const calls: Array<{ route: string; params?: unknown }> = [];
  const http = fakeHttp((config) => {
    const route = `${config.method} ${config.url}`;
    calls.push({ route, params: config.params });
    if (route === "get /auth/me") return { status: 200, data: user };
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
          <Routes>
            <Route path="/feedback" element={ui} />
            <Route path="/all-feedback" element={ui} />
            <Route path="/my-feedback" element={<Where />} />
          </Routes>
        </AccountsProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { calls };
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

describe("AccountPublicFeedbackPage", () => {
  it("reads the public titles a page at a time, newest first", async () => {
    const { calls } = mount(<AccountPublicFeedbackPage pageSize={20} />, {
      entry: "/all-feedback",
      routes: {
        "get /feedback/public": () => ({
          status: 200,
          data: [
            {
              id: 2,
              title: "Die Pendelwelle",
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
            },
          ],
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
