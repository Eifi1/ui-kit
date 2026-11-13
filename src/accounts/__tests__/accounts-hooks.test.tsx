import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeFetch, fakeHttp, tokens } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";
import { accountQueryKeys, AccountsProvider, useAccountsClient } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";
import {
  useAccountDeletion,
  useAccountExport,
  useAccountSessions,
  useChangePassword,
  useCurrentUser,
  useEmailChange,
  useInvitationsAdmin,
  usePasskeys,
  useUpdateProfile,
} from "../accounts-hooks";

/**
 * The account's TanStack Query hooks on server-kit 0.29's routes (docs/auth-harmonization.md
 * §12.9): what each app wired around its own `authApi` — Kurvenschmiede's account cards — once,
 * keeping each answer where the kit keeps it.
 */

const KEY = "app.session";
const ada = { id: 1, email: "ada@example.com", first_name: "Ada", last_name: "L" };
const record = () => JSON.parse(localStorage.getItem(KEY) ?? "null") as { token: string; user: unknown } | null;

type Routes = Record<string, (config: Cfg) => Answer>;
const clients: Array<{ detach(): void }> = [];

function setup(routes: Routes = {}) {
  const calls: string[] = [];
  const http = fakeHttp((config) => {
    const route = `${config.method} ${config.url}`;
    calls.push(route);
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
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AccountsProvider client={client}>{children}</AccountsProvider>
    </QueryClientProvider>
  );
  return { client, http, calls, queryClient, wrapper };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
});
afterEach(() => {
  for (const client of clients.splice(0)) client.detach();
  vi.unstubAllGlobals();
});

describe("useAccountsClient", () => {
  it("refuses to run outside an AccountsProvider, rather than act as signed out", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useAccountsClient())).toThrow(/AccountsProvider/);
  });
});

describe("useCurrentUser", () => {
  it("shows the stored account at once, then the server's, written back to the session", async () => {
    const { wrapper } = setup({ "get /auth/me": () => ({ status: 200, data: { ...ada, first_name: "Augusta" } }) });
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    expect(result.current.data).toEqual(ada);
    await waitFor(() => expect(result.current.data).toMatchObject({ first_name: "Augusta" }));
    expect(record()!.user).toMatchObject({ first_name: "Augusta" });
  });

  it("asks nothing while signed out", async () => {
    localStorage.clear();
    const { wrapper, calls } = setup();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    await act(async () => undefined);
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toEqual([]);
  });
});

describe("useUpdateProfile and useChangePassword", () => {
  it("keeps the changed account in the session and the /me query", async () => {
    const { wrapper, queryClient, calls } = setup({
      "patch /auth/me": (config) => ({ status: 200, data: { ...ada, ...(config.data as object) } }),
    });
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    await act(() => result.current.mutateAsync({ first_name: "Augusta" }));
    expect(calls).toEqual(["patch /auth/me"]);
    expect(record()!.user).toMatchObject({ first_name: "Augusta" });
    expect(queryClient.getQueryData(accountQueryKeys.me)).toMatchObject({ first_name: "Augusta" });
  });

  it("keeps a password change's fresh pair as the session, so the next request is not signed out by it", async () => {
    const { wrapper } = setup({ "post /auth/me/password": () => ({ status: 200, data: tokens("a2", "r2", ada) }) });
    const { result } = renderHook(() => useChangePassword(), { wrapper });
    await act(() => result.current.mutateAsync({ current_password: "old", new_password: "new-secret" }));
    expect(record()).toMatchObject({ token: "a2", refreshToken: "r2" });
  });
});

describe("useEmailChange", () => {
  it("reads the server's state, and writes each answer to it", async () => {
    const { wrapper } = setup({
      "get /auth/me/email": () => ({ status: 200, data: { email: ada.email, pending_email: null } }),
      "post /auth/me/email": () => ({ status: 202, data: { email: ada.email, pending_email: "a@new", sent: true } }),
    });
    const { result } = renderHook(() => useEmailChange(), { wrapper });
    await waitFor(() => expect(result.current.state.data).toEqual({ email: ada.email, pending_email: null }));
    await act(() => result.current.request.mutateAsync({ new_email: "a@new", password: "pw" }));
    await waitFor(() => expect(result.current.state.data).toMatchObject({ pending_email: "a@new" }));
  });

  it("clears the pending address when the change is withdrawn", async () => {
    let pending: string | null = "a@new";
    const { wrapper } = setup({
      "get /auth/me/email": () => ({ status: 200, data: { email: ada.email, pending_email: pending } }),
      "delete /auth/me/email": () => {
        pending = null;
        return { status: 204 };
      },
    });
    const { result } = renderHook(() => useEmailChange(), { wrapper });
    await waitFor(() => expect(result.current.state.data?.pending_email).toBe("a@new"));
    await act(() => result.current.cancel.mutateAsync());
    await waitFor(() => expect(result.current.state.data?.pending_email).toBeNull());
  });
});

describe("useAccountSessions", () => {
  const sessions = [
    {
      id: "s1",
      device: "Firefox",
      started_at: "2026-11-01T09:00:00Z",
      last_active: "2026-11-13T09:00:00Z",
      expires_at: "2026-12-01T09:00:00Z",
      current: true,
    },
    {
      id: "s2",
      device: "Phone",
      started_at: "2026-11-02T09:00:00Z",
      last_active: "2026-11-12T09:00:00Z",
      expires_at: "2026-12-02T09:00:00Z",
    },
  ];

  it("lists the sessions with the caller's marked, ends another, and asks again", async () => {
    const { wrapper, calls } = setup({ "get /auth/sessions": () => ({ status: 200, data: sessions }) });
    const { result } = renderHook(() => useAccountSessions(), { wrapper });
    await waitFor(() => expect(result.current.list.data?.find((s) => s.current)?.id).toBe("s1"));
    await act(() => result.current.revoke.mutateAsync("s2"));
    await waitFor(() => expect(calls.filter((c) => c === "get /auth/sessions")).toHaveLength(2));
    expect(calls).toContain("delete /auth/sessions/s2");
  });

  it("signs out everywhere in the sign-out's order", async () => {
    const { wrapper, calls } = setup({ "get /auth/sessions": () => ({ status: 200, data: sessions }) });
    const { result } = renderHook(() => useAccountSessions(), { wrapper });
    await act(() => result.current.signOutEverywhere());
    expect(calls).toContain("post /auth/logout");
    expect(record()).toBeNull();
  });
});

describe("usePasskeys", () => {
  it("says a wrong password at the begin, before any browser prompt", async () => {
    const create = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, credentials: { create, get: vi.fn() } });
    const { wrapper } = setup({
      "post /auth/passkey/register/begin": () => ({ status: 400, data: { code: "password_incorrect" } }),
    });
    const { result } = renderHook(() => usePasskeys(), { wrapper });
    await expect(act(() => result.current.begin.mutateAsync("wrong"))).rejects.toMatchObject({
      response: { data: { code: "password_incorrect" } },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("adds one: the browser's ceremony on the begin's options, then the finish with its name", async () => {
    const buf = (values: number[]) => new Uint8Array(values).buffer;
    const create = vi.fn(async () => ({
      id: "cred",
      rawId: buf([1]),
      type: "public-key",
      getClientExtensionResults: () => ({}),
      response: { clientDataJSON: buf([2]), attestationObject: buf([3]), getTransports: () => ["internal"] },
    }));
    vi.stubGlobal("navigator", { ...navigator, credentials: { create, get: vi.fn() } });
    let finished: unknown;
    const { wrapper, calls } = setup({
      "get /auth/passkeys": () => ({ status: 200, data: [] }),
      "post /auth/passkey/register/finish": (config) => {
        finished = config.data;
        return { status: 201, data: { id: 9, name: "Laptop", created_at: "2026-11-13T09:00:00Z" } };
      },
    });
    const { result } = renderHook(() => usePasskeys(), { wrapper });
    await act(() =>
      result.current.register.mutateAsync({
        options: {
          challenge_token: "c1",
          options: { challenge: "AQID", user: { id: "AQ", name: "a" }, rp: { name: "x" } },
        },
        name: "Laptop",
      }),
    );
    expect(finished).toEqual({
      challenge_token: "c1",
      credential: expect.objectContaining({
        rawId: "AQ",
        response: { clientDataJSON: "Ag", attestationObject: "Aw", transports: ["internal"] },
      }),
      name: "Laptop",
    });
    await waitFor(() => expect(calls.filter((c) => c === "get /auth/passkeys").length).toBeGreaterThanOrEqual(2));
  });
});

describe("useAccountExport and useAccountDeletion", () => {
  it("hands the export over as a Blob", async () => {
    const blob = new Blob(["{}"]);
    const { wrapper } = setup({ "get /auth/me/export": () => ({ status: 200, data: blob }) });
    const { result } = renderHook(() => useAccountExport(), { wrapper });
    await expect(act(() => result.current.mutateAsync())).resolves.toBe(blob);
  });

  it("reads the terms, and a granted request signs this tab out", async () => {
    const { wrapper, calls } = setup({
      "get /auth/me/deletion": () => ({ status: 200, data: { mode: "operator", days: null } }),
      "post /auth/me/deletion": () => ({ status: 202, data: { mail_sent: true } }),
    });
    const { result } = renderHook(() => useAccountDeletion(), { wrapper });
    await waitFor(() => expect(result.current.terms.data).toEqual({ mode: "operator", days: null }));
    await act(() => result.current.request.mutateAsync({ password: "pw", confirm_email: ada.email }));
    await waitFor(() => expect(record()).toBeNull());
    expect(calls).toContain("delete /auth/sessions/current");
  });
});

describe("useInvitationsAdmin", () => {
  it("hands back the console link once, and asks for the list again", async () => {
    const { wrapper, calls } = setup({
      "get /admin/invitations": () => ({ status: 200, data: [] }),
      "post /admin/invitations": () => ({
        status: 201,
        data: {
          id: 1,
          email: "b@x",
          locale: "en",
          status: "open",
          created_at: "x",
          expires_at: "y",
          sent: false,
          mail_backend: "console",
          link: "https://app/register?invite=t",
        },
      }),
    });
    const { result } = renderHook(() => useInvitationsAdmin(), { wrapper });
    await waitFor(() => expect(result.current.list.data).toEqual([]));
    const issued = await act(() => result.current.invite.mutateAsync({ email: "b@x", role: "MEMBER" }));
    expect(issued.link).toBe("https://app/register?invite=t");
    await waitFor(() => expect(calls.filter((c) => c === "get /admin/invitations")).toHaveLength(2));
  });
});

describe("AccountsProvider", () => {
  it("drops the kit's account queries when the account in the session changes", async () => {
    const { wrapper, queryClient, client } = setup({
      "get /auth/sessions": () => ({ status: 200, data: [] }),
      "post /auth/login": () => ({ status: 200, data: tokens("b1", "rb", { ...ada, id: 2, email: "bob@x" }) }),
    });
    const { result } = renderHook(() => useAccountSessions(), { wrapper });
    await waitFor(() => expect(result.current.list.data).toEqual([]));
    queryClient.setQueryData(["app", "own"], 1);
    await act(() => client.signIn({ email: "bob@x", password: "pw" }));
    expect(queryClient.getQueryData(accountQueryKeys.sessions)).toBeUndefined();
    // The app's own queries are its `onSessionEnded`'s to drop.
    expect(queryClient.getQueryData(["app", "own"])).toBe(1);
  });
});
