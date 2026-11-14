import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "../../components/toast";
import { fakeFetch, fakeHttp } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";
import {
  AccountAdminLogSection,
  AccountAdminOverviewSection,
  AccountMailTestSection,
  AccountUserRosterSection,
} from "../account-admin-sections";
import { AccountsProvider } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";
import type { AccountAdminUser } from "../accounts-api";
import type { DataTableColumn } from "../../components/data-table";

/**
 * The admin's sections on server-kit 0.30–0.31's `user_admin_router` (docs/auth-harmonization.md
 * §12.9): the kit's admin parts — the overview's tiles, the test mail's card, the log — wired to
 * the routes once, where each app wired them to its own `adminApi` (Kurvenschmiede's admin page).
 */

const KEY = "app.session";
const ada = { id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace", role: "ADMIN" };
const clients: Array<{ detach(): void }> = [];

function mount(ui: ReactNode, routes: Record<string, (config: Cfg) => Answer> = {}, initialEntries = ["/admin/users"]) {
  const calls: Array<{ route: string; params: unknown; data?: unknown }> = [];
  const http = fakeHttp((config) => {
    const route = `${config.method} ${config.url}`;
    calls.push({ route, params: config.params, data: config.data });
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
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AccountsProvider client={client}>{ui}</AccountsProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { calls, user: userEvent.setup() };
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

describe("AccountAdminOverviewSection", () => {
  it("shows the server's counts as the overview's tiles", async () => {
    mount(<AccountAdminOverviewSection />, {
      "get /admin/attention": () => ({
        status: 200,
        data: {
          feedback_waiting: null,
          deletion_requests: 2,
          invitations_pending: 3,
          users_total: 17,
          users_new_7d: 1,
          extra: {},
        },
      }),
    });
    expect(await screen.findByText("17")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("AccountMailTestSection", () => {
  it("sends the test mail to the admin's own address, through the server's transport", async () => {
    const { calls, user } = mount(<AccountMailTestSection />, {
      "get /auth/me": () => ({ status: 200, data: ada }),
      "get /admin/mail": () => ({ status: 200, data: { mail_backend: "console" } }),
      "post /admin/mail/test": () => ({ status: 200, data: { sent: true, mail_backend: "console" } }),
    });
    const send = await screen.findByRole("button", { name: /send/i });
    await user.click(send);
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("post /admin/mail/test"));
  });
});

describe("AccountAdminLogSection", () => {
  const row = (id: number, action: string, target: number | null) => ({
    id,
    at: "2026-11-14T09:00:00Z",
    action,
    actor_id: 1,
    target_user_id: target,
    target_email: target ? "b@x" : null,
    detail: {},
    actor: { id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    target: target ? { id: target, email: "b@x", first_name: "Ben", last_name: "Example" } : null,
  });

  it("reads the log a page at a time, the newest first, as the server answers it", async () => {
    const { calls } = mount(<AccountAdminLogSection pageSize={2} />, {
      "get /admin/actions": () => ({ status: 200, data: { actions: [row(9, "deactivate", 7)], total: 5 } }),
    });
    expect(await screen.findByText(/Ben Example/)).toBeInTheDocument();
    expect(calls.find((c) => c.route === "get /admin/actions")?.params).toEqual({ limit: 2, offset: 0 });
  });

  it("names an erased account's row by the address it had", async () => {
    mount(<AccountAdminLogSection />, {
      "get /admin/actions": () => ({
        status: 200,
        data: { actions: [{ ...row(3, "erase", null), target_email: "gone@x" }], total: 1 },
      }),
    });
    expect(await screen.findByText(/gone@x/)).toBeInTheDocument();
  });

  it("says a role change in the app's role words", async () => {
    const words: Record<string, string> = { MEMBER: "Mitglied", ADMIN: "Admin" };
    mount(<AccountAdminLogSection roleLabel={(role) => words[role] ?? role} />, {
      "get /admin/actions": () => ({
        status: 200,
        data: { actions: [{ ...row(4, "role", 7), detail: { from: "MEMBER", to: "ADMIN" } }], total: 1 },
      }),
    });
    expect(await screen.findByText("Mitglied → Admin")).toBeInTheDocument();
  });

  it("shows a team's rows: the team as the target of its own, beside the person in a membership", async () => {
    const team = { target_group_id: 3, target_group: { id: 3, name: "Rig crew" } };
    const words: Record<string, string> = { member: "Mitglied", manager: "Leitung" };
    mount(<AccountAdminLogSection groupNoun="team" groupRoleLabel={(role) => words[role] ?? role} />, {
      "get /admin/actions": () => ({
        status: 200,
        data: {
          actions: [
            { ...row(6, "group_rename", null), ...team },
            { ...row(5, "membership_role", 7), ...team, detail: { from: "member", to: "manager" } },
            { ...row(4, "group_delete", null), target_group_id: 9, target_group: null },
          ],
          total: 3,
        },
      }),
    });
    expect(await screen.findByText("Mitglied → Leitung")).toBeInTheDocument();
    expect(screen.getAllByText("Rig crew").length).toBe(2);
    expect(screen.getByText(/a deleted team/i)).toBeInTheDocument();
  });

  it("asks the app's words first and reads the kit's for the rest (Kurvenschmiede's U9)", async () => {
    mount(
      <AccountAdminLogSection
        roleLabel={(role) => (role === "ADMIN" ? "Admin" : "Mitglied")}
        describeDetail={(entry) => (entry.action === "transfer" ? "3 moved" : undefined)}
      />,
      {
        "get /admin/actions": () => ({
          status: 200,
          data: {
            actions: [
              { ...row(9, "transfer", 7), detail: { moved: { curves: 3 } } },
              { ...row(8, "role", 7), detail: { from: "MEMBER", to: "ADMIN" } },
              { ...row(7, "invite", null), target_email: "c@x", detail: { sent: false } },
              { ...row(6, "reviewer", 7), detail: { locales: [] } },
            ],
            total: 4,
          },
        }),
      },
    );
    expect(await screen.findByText("3 moved")).toBeInTheDocument();
    expect(screen.getByText("Mitglied → Admin")).toBeInTheDocument();
    expect(screen.getByText("Mail not sent")).toBeInTheDocument();
    expect(screen.getByText("No languages")).toBeInTheDocument();
  });

  it("narrows the log to one account by its id, from its name in a row", async () => {
    const { calls, user } = mount(<AccountAdminLogSection />, {
      "get /admin/actions": () => ({ status: 200, data: { actions: [row(9, "deactivate", 7)], total: 1 } }),
    });
    await user.click(await screen.findByRole("button", { name: /Ben Example/ }));
    await waitFor(() =>
      expect(calls.filter((c) => c.route === "get /admin/actions").map((c) => c.params)).toContainEqual({
        limit: 20,
        offset: 0,
        target: 7,
      }),
    );
  });
});

describe("AccountUserRosterSection", () => {
  const roles = { ADMIN: { label: "Admin" }, MEMBER: { label: "Mitglied" }, REVIEWER: { label: "Prüfer" } };
  const person = (id: number, first: string, extra: Record<string, unknown> = {}) => ({
    id,
    email: `${first.toLowerCase()}@example.com`,
    first_name: first,
    last_name: "Example",
    role: "MEMBER",
    is_active: true,
    email_verified: true,
    translation_review_locales: [],
    translation_review_areas: null,
    created_at: "2026-11-01T09:00:00Z",
    last_login_at: null,
    ...extra,
  });
  const page = (users: unknown[], extra: Record<string, unknown> = {}) => ({
    status: 200,
    data: {
      users,
      total: users.length,
      mail_backend: "resend",
      summary: { active_admins: 1 },
      levels: { deactivate: "type_email", role: "acknowledge", password_change_require: "acknowledge" },
      ...extra,
    },
  });

  it("reads the roster a page at a time from the server", async () => {
    const { calls } = mount(<AccountUserRosterSection roles={roles} />, {
      "get /admin/users": () => page([person(1, "Ada", { role: "ADMIN" }), person(7, "Ben")]),
    });
    expect((await screen.findAllByText("Ben Example")).length).toBeGreaterThan(0);
    expect(calls.find((c) => c.route === "get /admin/users")?.params).toEqual({ limit: 25, offset: 0 });
  });

  it("deactivates an account once its address is typed, as the server's level asks", async () => {
    const { calls, user } = mount(<AccountUserRosterSection roles={roles} />, {
      "get /admin/users": () => page([person(1, "Ada", { role: "ADMIN" }), person(7, "Ben")]),
      "post /admin/users/7/active": () => ({ status: 200, data: person(7, "Ben", { is_active: false }) }),
    });
    await user.click((await screen.findAllByRole("button", { name: "Actions for Ben Example" }))[0]);
    const menu = await screen.findByRole("dialog", { name: "Actions for Ben Example" });
    await user.click(within(menu).getByRole("button", { name: "Deactivate" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Deactivate Ben Example?" });
    await user.type(within(dialog).getByLabelText(/ben@example\.com/), "ben@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === "post /admin/users/7/active")?.data).toEqual({
        active: false,
        acknowledged: true,
        confirm_email: "ben@example.com",
      }),
    );
  });

  it("locks the signed-in admin's own deactivation, and says why", async () => {
    const { user } = mount(<AccountUserRosterSection roles={roles} />, {
      "get /admin/users": () => page([person(1, "Ada", { role: "ADMIN" }), person(7, "Ben")]),
    });
    await user.click((await screen.findAllByRole("button", { name: "Actions for Ada Example" }))[0]);
    const menu = await screen.findByRole("dialog", { name: "Actions for Ada Example" });
    expect(within(menu).getByRole("button", { name: "Deactivate" })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows a mail's link to hand on while the server's transport is the console", async () => {
    const { calls, user } = mount(<AccountUserRosterSection roles={roles} />, {
      "get /admin/users": () =>
        page([person(1, "Ada", { role: "ADMIN" }), person(7, "Ben")], { mail_backend: "console" }),
      "post /admin/users/7/mail": () => ({
        status: 200,
        data: { sent: true, mail_backend: "console", link: "http://localhost/reset?token=t1" },
      }),
    });
    expect(await screen.findByText(/sends no mail/)).toBeInTheDocument();
    await user.click((await screen.findAllByRole("button", { name: "Actions for Ben Example" }))[0]);
    const menu = await screen.findByRole("dialog", { name: "Actions for Ben Example" });
    await user.click(within(menu).getByRole("button", { name: "Send a password reset mail" }));
    expect(await screen.findByText("http://localhost/reset?token=t1")).toBeInTheDocument();
    expect(calls.find((c) => c.route === "post /admin/users/7/mail")?.data).toEqual({ kind: "password_reset" });
  });

  it("toasts the app's own words for a refusal as they are, markup too", async () => {
    const { user } = mount(
      <>
        <Toaster />
        <AccountUserRosterSection roles={roles} describeError={() => <em>Not now, says the app</em>} />
      </>,
      {
        "get /admin/users": () => page([person(1, "Ada", { role: "ADMIN" }), person(7, "Ben")]),
        "post /admin/users/7/mail": () => ({ status: 409, data: { code: "account_inactive", detail: "inactive" } }),
      },
    );
    await user.click((await screen.findAllByRole("button", { name: "Actions for Ben Example" }))[0]);
    const menu = await screen.findByRole("dialog", { name: "Actions for Ben Example" });
    await user.click(within(menu).getByRole("button", { name: "Send a password reset mail" }));
    expect(await screen.findByText("Not now, says the app")).toBeInTheDocument();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });

  it("narrows the roster to the deletion requests from the overview tile's link, until everybody is shown", async () => {
    const { calls, user } = mount(
      <AccountUserRosterSection roles={roles} />,
      {
        "get /admin/users": () =>
          page([person(7, "Ben", { is_active: false, deletion_requested_at: "2026-11-10T00:00:00Z" })]),
      },
      ["/admin/users?state=deletion_requested"],
    );
    await user.click(await screen.findByRole("button", { name: "Show everybody" }));
    const asked = calls.filter((c) => c.route === "get /admin/users").map((c) => c.params);
    expect(asked[0]).toEqual({ limit: 25, offset: 0, state: "deletion_scheduled" });
    await waitFor(() =>
      expect(calls.filter((c) => c.route === "get /admin/users").at(-1)?.params).toEqual({ limit: 25, offset: 0 }),
    );
  });

  it("resets another account's second factor, acknowledged, where the app offers it (server-kit 0.32)", async () => {
    const { calls, user } = mount(<AccountUserRosterSection roles={roles} twoFactorReset />, {
      "get /admin/users": () =>
        page([person(1, "Ada", { role: "ADMIN", totp_enabled: true }), person(7, "Ben", { totp_enabled: true })], {
          levels: { two_factor_reset: "acknowledge" },
        }),
      "post /admin/users/7/two-factor-reset": () => ({ status: 200, data: person(7, "Ben", { totp_enabled: false }) }),
    });
    await user.click((await screen.findAllByRole("button", { name: "Actions for Ada Example" }))[0]);
    let menu = await screen.findByRole("dialog", { name: "Actions for Ada Example" });
    expect(within(menu).queryByRole("button", { name: "Reset two-factor sign-in" })).toBeNull();
    await user.keyboard("{Escape}");
    await user.click(screen.getAllByRole("button", { name: "Actions for Ben Example" })[0]);
    menu = await screen.findByRole("dialog", { name: "Actions for Ben Example" });
    await user.click(within(menu).getByRole("button", { name: "Reset two-factor sign-in" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Reset two-factor sign-in for Ben Example?" });
    expect(within(dialog).getByText(/is told by email/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Reset two-factor sign-in" }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === "post /admin/users/7/two-factor-reset")?.data).toEqual({
        acknowledged: true,
        confirm_email: undefined,
      }),
    );
  });

  it("says a mistyped address in the dialog's own words (Kurvenschmiede's U1)", async () => {
    mount(<AccountUserRosterSection roles={roles} />, {
      "get /admin/users": () => page([person(1, "Ada", { role: "ADMIN" }), person(7, "Ben")]),
      "post /admin/users/7/active": () => ({ status: 409, data: { code: "confirmation_mismatch" } }),
    });
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: "Actions for Ben Example" }))[0]);
    const menu = await screen.findByRole("dialog", { name: "Actions for Ben Example" });
    await user.click(within(menu).getByRole("button", { name: "Deactivate" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Deactivate Ben Example?" });
    await user.type(within(dialog).getByLabelText(/ben@example\.com/), "ben@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(
      await within(dialog).findByText("The address doesn’t match this account. Check which account you are on."),
    ).toBeInTheDocument();
  });

  it("says what becoming an admin brings, and losing it (Kurvenschmiede's U4)", async () => {
    const { user } = mount(<AccountUserRosterSection roles={roles} />, {
      "get /admin/users": () =>
        page([person(1, "Ada", { role: "ADMIN" }), person(2, "Cleo", { role: "ADMIN" }), person(7, "Ben")], {
          summary: { active_admins: 2 },
        }),
    });
    await user.selectOptions((await screen.findAllByLabelText("Role of Ben Example"))[0]!, "ADMIN");
    let dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/may manage every account and the app’s settings/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await user.selectOptions(screen.getAllByLabelText("Role of Cleo Example")[0]!, "MEMBER");
    dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/loses its administrator rights at once/)).toBeInTheDocument();
  });

  it("names the areas of a reviewer limited to some, in the reviewer action's words (Kurvenschmiede's U3)", async () => {
    mount(
      <AccountUserRosterSection
        roles={roles}
        reviewer={{ languages: ["de-CH", "fr"], areas: [{ value: "legal", label: "Legal pages" }] }}
      />,
      {
        "get /admin/users": () =>
          page([
            person(1, "Ada", { role: "ADMIN" }),
            person(7, "Ben", {
              role: "REVIEWER",
              translation_review_locales: ["fr"],
              translation_review_areas: ["legal"],
            }),
            person(8, "Dora", { role: "REVIEWER", translation_review_locales: ["de-CH"] }),
          ]),
      },
    );
    expect((await screen.findAllByText("fr · Legal pages")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("de-CH").length).toBeGreaterThan(0);
  });

  it("types the app's columns and actions on its own row (Kurvenschmiede's U2)", async () => {
    type PlanRow = AccountAdminUser & { extra: { plan: string } };
    const plan: DataTableColumn<PlanRow> = { key: "plan", header: "Plan", cell: (row) => row.extra.plan };
    mount(<AccountUserRosterSection<string, PlanRow> roles={roles} extraColumns={[plan]} />, {
      "get /admin/users": () =>
        page([
          person(1, "Ada", { role: "ADMIN", extra: { plan: "Team" } }),
          person(7, "Ben", { extra: { plan: "Solo" } }),
        ]),
    });
    expect((await screen.findAllByText("Solo")).length).toBeGreaterThan(0);
  });

  it("offers the reviewer's scope only where the app reviews translations, and sends it", async () => {
    const { calls, user } = mount(
      <AccountUserRosterSection roles={roles} reviewer={{ languages: ["de-CH", "fr"] }} />,
      {
        "get /admin/users": () => page([person(1, "Ada", { role: "ADMIN" }), person(7, "Ben")]),
        "put /admin/users/7/reviewer": () => ({
          status: 200,
          data: { user_id: 7, role: "REVIEWER", locales: ["fr"], areas: null },
        }),
      },
    );
    await user.click((await screen.findAllByRole("button", { name: "Actions for Ben Example" }))[0]);
    const menu = await screen.findByRole("dialog", { name: "Actions for Ben Example" });
    await user.click(within(menu).getByRole("button", { name: "Translation review" }));
    const dialog = await screen.findByRole("dialog", { name: "What Ben Example reviews" });
    await user.click(within(dialog).getByRole("checkbox", { name: "Français" }));
    await user.click(within(dialog).getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === "put /admin/users/7/reviewer")?.data).toEqual({
        locales: ["fr"],
        areas: null,
      }),
    );
  });
});
