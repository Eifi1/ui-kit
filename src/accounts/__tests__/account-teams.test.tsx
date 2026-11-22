import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "../../components/toast";
import { fakeFetch, fakeHttp } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";
import { AccountTeamsPage, AccountTeamsSection } from "../account-teams";
import { AccountsProvider } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";

/**
 * The teams' parts on server-kit 0.32's opt-in teams: Kurvenschmiede's `TeamsPanel` (the
 * admin's) and `TeamsPage` (a member's and a manager's), lifted.
 */

const KEY = "app.session";
const ada = { id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace", role: "ADMIN" };
const clients: Array<{ detach(): void }> = [];

const person = (id: number, first: string, role: "member" | "manager", extra: object = {}) => ({
  user_id: id,
  first_name: first,
  last_name: "Example",
  display_name: `${first} Example`,
  email: `${first.toLowerCase()}@example.com`,
  role,
  is_active: true,
  ...extra,
});
const rig = (extra: object = {}) => ({
  id: 4,
  name: "Rig crew",
  version: 3,
  created_at: "2026-11-01T09:00:00Z",
  my_role: null,
  members: [person(7, "Ben", "member"), person(8, "Cy", "manager")],
  invitations: [{ id: 11, email: "new@example.com", role: "member", status: "open", expires_at: null }],
  invited: null,
  ...extra,
});
const adminList = (teams: object[] = [{ ...rig(), grant_count: 3 }]) => ({
  status: 200,
  data: { teams, levels: { group_delete: "acknowledge" } },
});

function mount(ui: ReactNode, routes: Record<string, (config: Cfg) => Answer | Promise<Answer>> = {}) {
  const calls: Array<{ route: string; data?: unknown; ifMatch?: unknown }> = [];
  const http = fakeHttp((config) => {
    const route = `${config.method} ${config.url}`;
    calls.push({ route, data: config.data, ifMatch: config.headers?.["If-Match"] });
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AccountsProvider client={client}>
          <Toaster />
          {ui}
        </AccountsProvider>
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
});

/** Opens the team's row: its people are drawn under it. */
async function openRig(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByText("Rig crew"))[0]);
  return (await screen.findAllByText("Ben Example"))[0].closest("[data-team]") as HTMLElement;
}

describe("AccountTeamsSection", () => {
  it("lists every team with its counts and managers, and opens one to its members and invitations", async () => {
    const { user } = mount(<AccountTeamsSection />, { "get /admin/teams": () => adminList() });
    expect((await screen.findAllByText("Cy Example"))[0]).toBeInTheDocument();
    const team = await openRig(user);
    expect(within(team).getByText("ben@example.com")).toBeInTheDocument();
    expect(within(team).getByText("new@example.com")).toBeInTheDocument();
    expect(within(team).getByText("Open")).toBeInTheDocument();
  });

  it("creates a team by its name", async () => {
    const { calls, user } = mount(<AccountTeamsSection />, {
      "get /admin/teams": () => adminList([]),
      "post /admin/teams": () => ({ status: 201, data: rig({ name: "Pit crew", members: [], invitations: [] }) }),
    });
    expect(await screen.findByText("No teams yet.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Team name"), "  Pit crew ");
    await user.click(screen.getByRole("button", { name: "Create team" }));
    await waitFor(() => expect(calls.find((c) => c.route === "post /admin/teams")?.data).toEqual({ name: "Pit crew" }));
    expect(await screen.findByText("Team Pit crew created.")).toBeInTheDocument();
  });

  it("says a taken name in the reader's words, naming it", async () => {
    const { user } = mount(<AccountTeamsSection />, {
      "get /admin/teams": () => adminList(),
      "post /admin/teams": () => ({
        status: 409,
        data: { detail: "(the server's English)", code: "team_name_taken", name: "Rig crew" },
      }),
    });
    await screen.findAllByText("Rig crew");
    await user.type(screen.getByLabelText("Team name"), "Rig crew");
    await user.click(screen.getByRole("button", { name: "Create team" }));
    expect(await screen.findByText("There is already a team called Rig crew.")).toBeInTheDocument();
  });

  it("renames a team against the version read", async () => {
    const { calls, user } = mount(<AccountTeamsSection />, {
      "get /admin/teams": () => adminList(),
      "patch /admin/teams/4": () => ({ status: 200, data: rig({ name: "Pit crew", version: 4 }) }),
    });
    await user.click((await screen.findAllByRole("button", { name: "Rename" }))[0]);
    const dialog = await screen.findByRole("dialog", { name: "Rename the team Rig crew" });
    const field = within(dialog).getByLabelText("Team name");
    await user.clear(field);
    await user.type(field, "Pit crew");
    await user.click(within(dialog).getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(calls.find((c) => c.route === "patch /admin/teams/4")).toBeDefined());
    const sent = calls.find((c) => c.route === "patch /admin/teams/4");
    expect(sent?.data).toEqual({ name: "Pit crew" });
    expect(sent?.ifMatch).toBe("3");
    expect(await screen.findByText("The team is now called Pit crew.")).toBeInTheDocument();
  });

  it("deletes a team once acknowledged, under what goes with it", async () => {
    const { calls, user } = mount(<AccountTeamsSection />, {
      "get /admin/teams": () => adminList(),
      "delete /admin/teams/4": () => ({ status: 204 }),
    });
    await user.click((await screen.findAllByRole("button", { name: /Actions for Rig crew/ }))[0]);
    await user.click(await screen.findByRole("button", { name: "Delete team" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete the team Rig crew?" });
    expect(within(dialog).getByText("What goes with it: 2 members, 3 shares, and 1 invitation.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Delete team" }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === "delete /admin/teams/4")?.data).toEqual({ acknowledged: true }),
    );
    expect(await screen.findByText("The team Rig crew is deleted.")).toBeInTheDocument();
  });

  it("puts anybody in as a manager, and hands on the console's link of an invitation", async () => {
    const { calls, user } = mount(<AccountTeamsSection languages={["en", "fr"]} />, {
      "get /admin/teams": () => adminList(),
      "post /admin/teams/4/members": () => ({
        status: 200,
        data: rig({ invited: { email: "dee@example.com", sent: true, link: "http://localhost/register?invite=t1" } }),
      }),
    });
    const team = await openRig(user);
    await user.type(within(team).getByLabelText("Add by email address"), "dee@example.com");
    await user.click(
      within(within(team).getByRole("radiogroup", { name: "As" })).getByRole("radio", { name: "Manager" }),
    );
    await user.click(within(team).getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === "post /admin/teams/4/members")?.data).toEqual({
        email: "dee@example.com",
        role: "manager",
        locale: "en",
      }),
    );
    expect(await screen.findByText("http://localhost/register?invite=t1")).toBeInTheDocument();
  });

  it("asks the invitation's language before the Add button, in the row's own column", async () => {
    const { user } = mount(<AccountTeamsSection languages={["en", "fr"]} />, { "get /admin/teams": () => adminList() });
    const team = await openRig(user);
    const form = within(team).getByLabelText("Add by email address").closest("form") as HTMLFormElement;
    // Tab order is DOM order: the address, the role, the language, then Add.
    const order = Array.from(
      form.querySelectorAll<HTMLElement>("input[type=email], [role=radiogroup], select, button[type=submit]"),
    );
    expect(order).toEqual([
      within(form).getByLabelText("Add by email address"),
      within(form).getByRole("radiogroup", { name: "As" }),
      within(form).getByLabelText("Language of the invitation"),
      within(form).getByRole("button", { name: "Add" }),
    ]);
    // Four fields, four columns at sm: the select no longer wraps under the address.
    expect(form.className).toContain("sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]");
  });

  it("keeps three columns when there is no language to ask", async () => {
    const { user } = mount(<AccountTeamsSection languages={["en"]} />, { "get /admin/teams": () => adminList() });
    const team = await openRig(user);
    const form = within(team).getByLabelText("Add by email address").closest("form") as HTMLFormElement;
    expect(within(form).queryByLabelText("Language of the invitation")).toBeNull();
    expect(form.className).toContain("sm:grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(form.className).not.toContain("_auto_auto_auto]");
  });

  it("holds the team's rename and delete while a member change is on its way", async () => {
    let answer: (value: Answer) => void = () => undefined;
    const { calls, user } = mount(<AccountTeamsSection />, {
      "get /admin/teams": () => adminList(),
      "patch /admin/teams/4/members/7": () => new Promise<Answer>((resolve) => (answer = resolve)),
    });
    const team = await openRig(user);
    const ben = within(team).getByRole("radiogroup", { name: "Role of Ben Example in the team" });
    await user.click(within(ben).getByRole("radio", { name: "Manager" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("patch /admin/teams/4/members/7"));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Rename" })[0]).toBeDisabled());
    // The segment just pressed is not natively disabled under its focus (INP-1).
    expect(within(ben).getByRole("radio", { name: "Manager" })).toBeEnabled();
    await user.click(screen.getAllByRole("button", { name: /Actions for Rig crew/ })[0]);
    expect(await screen.findByRole("button", { name: "Delete team" })).toBeDisabled();
    answer({ status: 200, data: rig() });
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Rename" })[0]).toBeEnabled());
  });

  it("holds a team's member doors while its rename is on its way", async () => {
    let answer: (value: Answer) => void = () => undefined;
    const { calls, user } = mount(<AccountTeamsSection />, {
      "get /admin/teams": () => adminList(),
      "patch /admin/teams/4": () => new Promise<Answer>((resolve) => (answer = resolve)),
    });
    const team = await openRig(user);
    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Rename the team Rig crew" });
    await user.type(within(dialog).getByLabelText("Team name"), " 2");
    await user.click(within(dialog).getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("patch /admin/teams/4"));
    const ben = within(team).getByRole("radiogroup", { name: "Role of Ben Example in the team" });
    // Held by ignoring a press, not by `disabled`, which dropped the pressed segment's focus
    // to <body> (INP-1): a press meanwhile sends nothing.
    await waitFor(() => expect(ben).toHaveAttribute("aria-busy", "true"));
    expect(within(ben).getByRole("radio", { name: "Manager" })).toBeEnabled();
    await user.click(within(ben).getByRole("radio", { name: "Manager" }));
    expect(calls.map((c) => c.route)).not.toContain("patch /admin/teams/4/members/7");
    answer({ status: 200, data: rig({ name: "Rig crew 2", version: 4 }) });
    await waitFor(() => expect(ben).not.toHaveAttribute("aria-busy"));
  });

  it("names a manager, and re-sends a team's invitation through the admin's invitations", async () => {
    const { calls, user } = mount(<AccountTeamsSection />, {
      "get /admin/teams": () => adminList(),
      "patch /admin/teams/4/members/7": () => ({ status: 200, data: rig() }),
      "post /admin/invitations/11/resend": () => ({
        status: 200,
        data: { id: 11, email: "new@example.com", sent: false, mail_backend: "smtp", status: "open" },
      }),
    });
    const team = await openRig(user);
    const ben = within(team).getByRole("radiogroup", { name: "Role of Ben Example in the team" });
    await user.click(within(ben).getByRole("radio", { name: "Manager" }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === "patch /admin/teams/4/members/7")?.data).toEqual({ role: "manager" }),
    );
    await user.click(within(team).getByRole("button", { name: "Send new@example.com a new link" }));
    expect(
      await screen.findByText("new@example.com has no account yet, and the invitation could not be sent — resend it."),
    ).toBeInTheDocument();
  });
});

describe("AccountTeamsPage", () => {
  it("shows a member their teams and who is in them, with no door", async () => {
    mount(<AccountTeamsPage />, {
      "get /teams": () => ({ status: 200, data: [rig({ my_role: "member", invitations: [] })] }),
    });
    expect(await screen.findByText("Rig crew")).toBeInTheDocument();
    expect(screen.getByText("You are a member.")).toBeInTheDocument();
    expect(screen.getByText("Cy Example")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add by email address")).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("says when the caller is in no team", async () => {
    mount(<AccountTeamsPage />, { "get /teams": () => ({ status: 200, data: [] }) });
    expect(await screen.findByText("You are in no team.")).toBeInTheDocument();
  });

  it("lets a manager add a member against the version read, and says so", async () => {
    const { calls, user } = mount(<AccountTeamsPage languages={["en"]} />, {
      "get /teams": () => ({ status: 200, data: [rig({ my_role: "manager" })] }),
      "post /teams/4/members": () => ({ status: 200, data: rig({ my_role: "manager", version: 4 }) }),
    });
    expect(await screen.findByText("You manage this team.")).toBeInTheDocument();
    // A manager adds members only: no role to pick.
    expect(screen.queryByRole("radio", { name: "Manager" })).toBeNull();
    await user.type(screen.getByLabelText("Add by email address"), "dee@example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(calls.find((c) => c.route === "post /teams/4/members")).toBeDefined());
    const sent = calls.find((c) => c.route === "post /teams/4/members");
    expect(sent?.data).toEqual({ email: "dee@example.com", role: "member", locale: "en" });
    expect(sent?.ifMatch).toBe("3");
    expect(await screen.findByText("dee@example.com is in Rig crew now.")).toBeInTheDocument();
  });

  it("says an address without its shape in the kit's words under the field, and keeps addresses private (DUP-8)", async () => {
    const { calls, user } = mount(<AccountTeamsPage languages={["en"]} />, {
      "get /teams": () => ({ status: 200, data: [rig({ my_role: "manager" })] }),
    });
    expect(await screen.findByText("You manage this team.")).toBeInTheDocument();
    const field = screen.getByLabelText("Add by email address");
    expect(field).toHaveAttribute("data-private");
    expect(field).toHaveAttribute("inputmode", "email");
    await user.type(field, "dee@example");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Enter a complete email address.")).toBeInTheDocument();
    expect(calls.find((c) => c.route === "post /teams/4/members")).toBeUndefined();
    expect(screen.getByText("Cy Example").closest("li")?.querySelector("[data-private]")).not.toBeNull();
  });

  it("asks a manager's invitation language before the Add button", async () => {
    mount(<AccountTeamsPage languages={["en", "fr"]} />, {
      "get /teams": () => ({ status: 200, data: [rig({ my_role: "manager" })] }),
    });
    const form = (await screen.findByLabelText("Add by email address")).closest("form") as HTMLFormElement;
    const order = Array.from(
      form.querySelectorAll<HTMLElement>("input[type=email], [role=radiogroup], select, button[type=submit]"),
    );
    expect(order).toEqual([
      within(form).getByLabelText("Add by email address"),
      within(form).getByLabelText("Language of the invitation"),
      within(form).getByRole("button", { name: "Add" }),
    ]);
    // A manager picks no role: three fields, three columns.
    expect(form.className).toContain("sm:grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(form.className).not.toContain("_auto_auto_auto]");
  });

  it("lets a manager remove a member but not a manager, after asking", async () => {
    const { calls, user } = mount(<AccountTeamsPage />, {
      "get /teams": () => ({ status: 200, data: [rig({ my_role: "manager" })] }),
      "delete /teams/4/members/7": () => ({ status: 200, data: rig({ my_role: "manager", members: [] }) }),
    });
    await screen.findByText("Rig crew");
    expect(screen.queryByRole("button", { name: "Remove Cy Example" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Remove Ben Example" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Remove Ben Example from Rig crew?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(calls.find((c) => c.route === "delete /teams/4/members/7")?.ifMatch).toBe("3"));
    expect(await screen.findByText("Ben Example is no longer in Rig crew.")).toBeInTheDocument();
  });

  it("says a manager's refusal in the reader's words, with the address it names, and reads the team again", async () => {
    const { calls, user } = mount(<AccountTeamsPage languages={["en"]} />, {
      "get /teams": () => ({ status: 200, data: [rig({ my_role: "manager" })] }),
      "post /teams/4/members": () => ({
        status: 409,
        data: { detail: "(English)", code: "manager_kept_by_admin", email: "cy@example.com" },
      }),
    });
    await screen.findByText("Rig crew");
    await user.type(screen.getByLabelText("Add by email address"), "cy@example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(
      await screen.findByText("cy@example.com manages this team; only an administrator changes that."),
    ).toBeInTheDocument();
    // The address stays, to be corrected.
    expect(screen.getByLabelText("Add by email address")).toHaveValue("cy@example.com");
    await waitFor(() => expect(calls.filter((c) => c.route === "get /teams")).toHaveLength(2));
  });

  it("hands a manager the console's link when an add invited, and withdraws an invitation after asking", async () => {
    const { calls, user } = mount(<AccountTeamsPage languages={["en"]} />, {
      "get /teams": () => ({ status: 200, data: [rig({ my_role: "manager" })] }),
      "post /teams/4/members": () => ({
        status: 200,
        data: rig({
          my_role: "manager",
          invited: { email: "eve@example.com", sent: true, link: "http://localhost/register?invite=t2" },
        }),
      }),
      "delete /teams/4/invitations/11": () => ({ status: 200, data: rig({ my_role: "manager", invitations: [] }) }),
    });
    await screen.findByText("Rig crew");
    await user.type(screen.getByLabelText("Add by email address"), "eve@example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("http://localhost/register?invite=t2")).toBeInTheDocument();
    expect(screen.queryByText("eve@example.com is in Rig crew now.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Withdraw the invitation of new@example.com" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Withdraw the invitation of new@example.com?" });
    await user.click(within(dialog).getByRole("button", { name: "Withdraw" }));
    await waitFor(() => expect(calls.some((c) => c.route === "delete /teams/4/invitations/11")).toBe(true));
  });
});
