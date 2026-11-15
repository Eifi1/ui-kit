import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fakeFetch, fakeHttp } from "../../test/fake-axios";
import type { Cfg } from "../../test/fake-axios";
import { accountTeamsApi } from "../account-teams-api";
import { useAdminTeamActions, useMyTeams, useTeamActions } from "../account-teams-hooks";
import { AccountsProvider, accountQueryKeys } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";

/**
 * The routes of server-kit 0.32's `teams_router` and `teams_admin_router` (Kurvenschmiede's
 * `teamsApi` and `adminApi.*Team*`), typed once on the account client's `http`.
 */

const team = { id: 4, name: "Rig crew", version: 3, members: [], invitations: [], invited: null };

function api() {
  const requests: Cfg[] = [];
  const http = fakeHttp((config) => {
    requests.push(config);
    if (config.method === "get" && config.url === "/admin/teams")
      return { status: 200, data: { teams: [{ ...team, grant_count: 2 }], levels: { group_delete: "acknowledge" } } };
    if (config.method === "get" && config.url === "/teams") return { status: 200, data: [team] };
    if (config.method === "delete" && config.url === "/admin/teams/4") return { status: 204 };
    return { status: config.url === "/admin/teams" ? 201 : 200, data: team };
  });
  const sent = () => requests.map((r) => `${r.method} ${r.url}`);
  return { routes: accountTeamsApi(http), requests, sent };
}

describe("accountTeamsApi: a member's and a manager's routes", () => {
  it("reads the caller's teams", async () => {
    const { routes, sent } = api();
    await expect(routes.mine()).resolves.toEqual([team]);
    expect(sent()).toEqual(["get /teams"]);
  });

  it("adds a member by address as a member, in the invitation's language, against the version read", async () => {
    const { routes, requests } = api();
    await routes.addMember(4, { email: "ben@example.com", locale: "de-CH" }, 3);
    expect(`${requests[0].method} ${requests[0].url}`).toBe("post /teams/4/members");
    expect(requests[0].data).toEqual({ email: "ben@example.com", role: "member", locale: "de-CH" });
    expect(requests[0].headers?.["If-Match"]).toBe("3");
  });

  it("sends no If-Match where no version is given, and no locale where none is picked", async () => {
    const { routes, requests } = api();
    await routes.addMember(4, { email: "ben@example.com" });
    expect(requests[0].data).toEqual({ email: "ben@example.com", role: "member" });
    expect(requests[0].headers?.["If-Match"]).toBeUndefined();
  });

  it("removes a member against the version, and re-sends or withdraws a team's invitation", async () => {
    const { routes, requests, sent } = api();
    await routes.removeMember(4, 7, 3);
    await routes.resendInvitation(4, 11);
    await routes.withdrawInvitation(4, 11);
    expect(sent()).toEqual([
      "delete /teams/4/members/7",
      "post /teams/4/invitations/11/resend",
      "delete /teams/4/invitations/11",
    ]);
    expect(requests[0].headers?.["If-Match"]).toBe("3");
  });
});

describe("accountTeamsApi.admin: the admin's routes", () => {
  it("reads every team with its grants and the confirmation levels", async () => {
    const { routes } = api();
    const answer = await routes.admin.list();
    expect(answer.teams[0].grant_count).toBe(2);
    expect(answer.levels.group_delete).toBe("acknowledge");
  });

  it("creates, renames against the version, and deletes with the acknowledgement in the body", async () => {
    const { routes, requests, sent } = api();
    await routes.admin.create("Rig crew");
    await routes.admin.rename(4, "Pit crew", 3);
    await expect(routes.admin.delete(4, { acknowledged: true })).resolves.toBeUndefined();
    expect(sent()).toEqual(["post /admin/teams", "patch /admin/teams/4", "delete /admin/teams/4"]);
    expect(requests.map((r) => r.data)).toEqual([{ name: "Rig crew" }, { name: "Pit crew" }, { acknowledged: true }]);
    expect(requests[1].headers?.["If-Match"]).toBe("3");
  });

  it("adds anybody in either role, sets a role and removes anybody, with no version", async () => {
    const { routes, requests, sent } = api();
    await routes.admin.addMember(4, { email: "cy@example.com", role: "manager", locale: "fr" });
    await routes.admin.setRole(4, 7, "member");
    await routes.admin.removeMember(4, 7);
    expect(sent()).toEqual([
      "post /admin/teams/4/members",
      "patch /admin/teams/4/members/7",
      "delete /admin/teams/4/members/7",
    ]);
    expect(requests.map((r) => r.data)).toEqual([
      { email: "cy@example.com", role: "manager", locale: "fr" },
      { role: "member" },
      undefined,
    ]);
    expect(requests.every((r) => r.headers?.["If-Match"] === undefined)).toBe(true);
  });
});

describe("the teams' query keys", () => {
  it("sit under a root of their own, as the feedback's do, not under the account's", () => {
    for (const key of [accountQueryKeys.teams, accountQueryKeys.teamsMine, accountQueryKeys.teamsAdmin]) {
      expect(key[0]).toBe("teams");
    }
  });

  it("are dropped by AccountsProvider when the account changes", async () => {
    localStorage.setItem(
      "app.session",
      JSON.stringify({ token: "a1", refreshToken: "r1", user: { id: 1, email: "ada@example.com" } }),
    );
    const client = createAccountsClient({
      http: fakeHttp(() => ({ status: 204 })),
      storagePrefix: "app.",
      publicPaths: ["/"],
      fetch: fakeFetch(() => ({ status: 401 })),
      navigate: vi.fn(),
    });
    const queryClient = new QueryClient();
    queryClient.setQueryData(accountQueryKeys.teamsMine, [team]);
    queryClient.setQueryData(["app", "own"], 1);
    render(
      <QueryClientProvider client={queryClient}>
        <AccountsProvider client={client}>{null}</AccountsProvider>
      </QueryClientProvider>,
    );
    act(() => client.useSession.setState({ user: { id: 2, email: "ben@example.com" } as never }));
    expect(queryClient.getQueryData(accountQueryKeys.teamsMine)).toBeUndefined();
    expect(queryClient.getQueryData(["app", "own"])).toBe(1);
    client.detach();
  });
});

describe("the teams' hooks", () => {
  function setup(server: (config: Cfg) => { status: number; data?: unknown }) {
    localStorage.setItem(
      "app.session",
      JSON.stringify({ token: "a1", refreshToken: "r1", user: { id: 1, email: "ada@example.com" } }),
    );
    const sent: string[] = [];
    const client = createAccountsClient({
      http: fakeHttp((config) => {
        sent.push(`${config.method} ${config.url}`);
        return server(config);
      }),
      storagePrefix: "app.",
      publicPaths: ["/"],
      fetch: fakeFetch(() => ({ status: 401 })),
      navigate: vi.fn(),
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AccountsProvider client={client}>{children}</AccountsProvider>
      </QueryClientProvider>
    );
    return { wrapper, queryClient, client, sent };
  }

  it("a manager's change puts the answered team into the list, in its place", async () => {
    const other = { ...team, id: 5, name: "Pit crew" };
    const { wrapper, client } = setup((config) =>
      config.method === "get"
        ? { status: 200, data: [team, other] }
        : { status: 200, data: { ...team, version: 4, members: [{ user_id: 7 }] } },
    );
    const { result } = renderHook(() => ({ list: useMyTeams(), actions: useTeamActions() }), { wrapper });
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    await act(() => result.current.actions.addMember.mutateAsync({ team, email: "ben@example.com" }));
    await waitFor(() =>
      expect(result.current.list.data?.map((row) => [row.id, row.version])).toEqual([
        [4, 4],
        [5, 3],
      ]),
    );
    client.detach();
  });

  it("an admin's change, refused too, reads the teams and the admin's data again", async () => {
    const { wrapper, queryClient, client } = setup(() => ({
      status: 409,
      data: { code: "team_changed", name: "Rig crew" },
    }));
    queryClient.setQueryData(accountQueryKeys.teamsAdmin, { teams: [], levels: {} });
    queryClient.setQueryData(["accounts", "admin", "actions", {}], { actions: [], total: 0 });
    const { result } = renderHook(() => useAdminTeamActions(), { wrapper });
    await act(() => result.current.rename.mutateAsync({ team, name: "Pit crew" }).catch(() => undefined));
    expect(queryClient.getQueryState(accountQueryKeys.teamsAdmin)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["accounts", "admin", "actions", {}])?.isInvalidated).toBe(true);
    client.detach();
  });
});

afterEach(() => localStorage.clear());
