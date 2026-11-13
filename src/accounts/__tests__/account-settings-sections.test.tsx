import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeFetch, fakeHttp, tokens } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";
import { fill } from "../../test/fill";
import {
  AccountDeletionSection,
  AccountEmailSection,
  AccountExportSection,
  AccountInvitationsSection,
  AccountPasskeysSection,
  AccountPasswordSection,
  AccountProfileSection,
  AccountSessionsSection,
} from "../account-settings-sections";
import { AccountsProvider } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";

/**
 * The account's settings, wired (docs/auth-harmonization.md §12.9): Kurvenschmiede's account
 * cards and passkeys card on server-kit 0.29's routes, for every app.
 */

const KEY = "app.session";
const ada = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  role: "ADMIN",
  created_at: "2026-10-01T09:00:00Z",
};
const record = () => JSON.parse(localStorage.getItem(KEY) ?? "null") as { token: string; user: typeof ada } | null;
const clients: Array<{ detach(): void }> = [];

function mount(ui: ReactNode, routes: Record<string, (config: Cfg) => Answer> = {}) {
  const calls: Array<{ route: string; data: unknown }> = [];
  const http = fakeHttp((config) => {
    const route = `${config.method} ${config.url}`;
    calls.push({ route, data: config.data });
    const answer = routes[route];
    return answer ? answer(config) : { status: 204 };
  });
  const navigate = vi.fn();
  const client = createAccountsClient<typeof ada>({
    http,
    storagePrefix: "app.",
    publicPaths: ["/"],
    fetch: fakeFetch(() => ({ status: 401 })),
    navigate,
  });
  clients.push(client);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AccountsProvider client={client}>{ui}</AccountsProvider>
    </QueryClientProvider>,
  );
  return { calls, user: userEvent.setup(), navigate };
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

describe("AccountProfileSection", () => {
  it("shows the account and saves the two names to it", async () => {
    const { calls, user } = mount(<AccountProfileSection roleLabel={(role) => `Role ${role}`} />, {
      "patch /auth/me": (config) => ({ status: 200, data: { ...ada, ...(config.data as object) } }),
    });
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Role ADMIN")).toBeInTheDocument();
    const first = screen.getByLabelText("First name");
    await user.clear(first);
    await fill(user, first, "Augusta");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(record()!.user.first_name).toBe("Augusta"));
    expect(calls[0]).toEqual({ route: "patch /auth/me", data: { first_name: "Augusta", last_name: "Lovelace" } });
  });
});

describe("AccountPasswordSection", () => {
  async function change(user: ReturnType<typeof userEvent.setup>) {
    await fill(user, screen.getByLabelText("Current password"), "old password");
    await fill(user, screen.getByLabelText("New password"), "a new password");
    await fill(user, screen.getByLabelText("Confirm new password"), "a new password");
    await user.click(screen.getByRole("button", { name: "Change password" }));
  }

  it("keeps the fresh pair the change answers as the session", async () => {
    const { user } = mount(<AccountPasswordSection />, {
      "post /auth/me/password": () => ({ status: 200, data: tokens("a2", "r2", ada) }),
    });
    await change(user);
    await waitFor(() => expect(record()!.token).toBe("a2"));
  });

  it("leaves a wrong current password to the card, under its field", async () => {
    const { user } = mount(<AccountPasswordSection />, {
      "post /auth/me/password": () => ({ status: 400, data: { code: "password_incorrect" } }),
    });
    await change(user);
    expect(await screen.findByText("The password is incorrect.")).toBeInTheDocument();
  });

  it("says a refusal the card does not know in the account words", async () => {
    const { user } = mount(<AccountPasswordSection />, {
      "post /auth/me/password": () => ({ status: 400, data: { code: "password_unchanged" } }),
    });
    await change(user);
    expect(
      await screen.findByText("The new password is the same as the current one. Choose another."),
    ).toBeInTheDocument();
  });
});

describe("AccountEmailSection", () => {
  it("asks for the change and shows it waiting", async () => {
    const { calls, user } = mount(<AccountEmailSection emailTag="app" />, {
      "get /auth/me/email": () => ({ status: 200, data: { email: ada.email, pending_email: null } }),
      "get /auth/passkeys": () => ({ status: 200, data: [] }),
      "post /auth/me/email": () => ({
        status: 202,
        data: { email: ada.email, pending_email: "ada@new.example", sent: true },
      }),
    });
    await fill(user, await screen.findByLabelText("New email address"), "ada@new.example");
    await fill(user, screen.getByLabelText("Current password"), "pw");
    await user.click(screen.getByRole("button", { name: "Change email address" }));
    expect(await screen.findByText("Confirm the link we sent to ada@new.example.")).toBeInTheDocument();
    expect(calls.find((c) => c.route === "post /auth/me/email")!.data).toEqual({
      new_email: "ada@new.example",
      password: "pw",
    });
  });
});

describe("AccountEmailSection's waiting change", () => {
  it("sends the link again and withdraws the change", async () => {
    const { calls, user } = mount(<AccountEmailSection />, {
      "get /auth/me/email": () => ({ status: 200, data: { email: ada.email, pending_email: "ada@new.example" } }),
      "get /auth/passkeys": () => ({ status: 200, data: [] }),
      "post /auth/me/email/resend": () => ({
        status: 200,
        data: { email: ada.email, pending_email: "ada@new.example", sent: true },
      }),
    });
    await user.click(await screen.findByRole("button", { name: "Send the link again" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("post /auth/me/email/resend"));
    await user.click(screen.getByRole("button", { name: "Cancel the change" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("delete /auth/me/email"));
  });
});

describe("AccountSessionsSection", () => {
  const sessions = [
    { id: "s2", device: "Phone", started_at: "x", last_active: "2026-11-13T08:00:00Z", expires_at: "y" },
    {
      id: "s1",
      device: "Firefox",
      started_at: "x",
      last_active: "2026-11-12T08:00:00Z",
      expires_at: "y",
      current: true,
    },
  ];

  it("lists this device first and marked, never offered to end; ends another", async () => {
    const { calls, user } = mount(<AccountSessionsSection />, {
      "get /auth/sessions": () => ({ status: 200, data: sessions }),
    });
    const list = await screen.findByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Firefox");
    expect(rows[0]).toHaveTextContent("This device");
    expect(within(rows[0]!).queryByRole("button")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign out Phone" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("delete /auth/sessions/s2"));
  });

  it("signs out everywhere in the sign-out's order", async () => {
    const { calls, user, navigate } = mount(<AccountSessionsSection />, {
      "get /auth/sessions": () => ({ status: 200, data: sessions }),
    });
    await user.click(await screen.findByRole("button", { name: "Sign out everywhere…" }));
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await waitFor(() => expect(record()).toBeNull());
    expect(calls.map((c) => c.route)).toContain("post /auth/logout");
    expect(navigate).toHaveBeenCalledWith("/login");
  });
});

describe("AccountPasskeysSection", () => {
  it("draws nothing where passkeys cannot run, unless the app says why", () => {
    mount(<AccountPasskeysSection />);
    expect(screen.queryByText("Passkeys")).toBeNull();
  });

  it("asks for the password before the browser's prompt, and says a wrong one there", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("PublicKeyCredential", function PublicKeyCredential() {});
    const create = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, credentials: { get: vi.fn(), create } });
    const { user } = mount(<AccountPasskeysSection />, {
      "get /auth/passkeys": () => ({
        status: 200,
        data: [{ id: 3, name: "Laptop", created_at: "2026-11-01T09:00:00Z" }],
      }),
      "post /auth/passkey/register/begin": () => ({ status: 400, data: { code: "password_incorrect" } }),
    });
    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add passkey" }));
    const dialog = await screen.findByRole("dialog");
    await fill(user, within(dialog).getByLabelText("Current password"), "wrong");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(await within(dialog).findByText("The password is incorrect.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("AccountPasskeysSection's add, rename and delete", () => {
  it("adds one: the password, then the device, then the finish; renames and deletes", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("PublicKeyCredential", function PublicKeyCredential() {});
    const buf = (values: number[]) => new Uint8Array(values).buffer;
    const create = vi.fn(async () => ({
      id: "cred",
      rawId: buf([1]),
      type: "public-key",
      getClientExtensionResults: () => ({}),
      response: { clientDataJSON: buf([2]), attestationObject: buf([3]) },
    }));
    vi.stubGlobal("navigator", { ...navigator, credentials: { get: vi.fn(), create } });
    const laptop = { id: 3, name: "Laptop", created_at: "2026-11-01T09:00:00Z" };
    const { calls, user } = mount(<AccountPasskeysSection />, {
      "get /auth/passkeys": () => ({ status: 200, data: [laptop] }),
      "post /auth/passkey/register/begin": () => ({
        status: 200,
        data: {
          challenge_token: "c1",
          options: { challenge: "AQID", user: { id: "AQ", name: "a" }, rp: { name: "x" } },
        },
      }),
      "post /auth/passkey/register/finish": () => ({ status: 201, data: { id: 4, name: "Phone", created_at: "x" } }),
      "patch /auth/passkeys/3": () => ({ status: 200, data: { ...laptop, name: "Desk" } }),
    });
    await screen.findByText("Laptop");
    await fill(user, screen.getByLabelText("Name (optional)"), "Phone");
    await user.click(screen.getByRole("button", { name: "Add passkey" }));
    const dialog = await screen.findByRole("dialog");
    await fill(user, within(dialog).getByLabelText("Current password"), "pw");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("post /auth/passkey/register/finish"));
    expect(create).toHaveBeenCalledTimes(1);
    expect(calls.find((c) => c.route === "post /auth/passkey/register/finish")!.data).toMatchObject({
      challenge_token: "c1",
      name: "Phone",
    });

    await user.click(screen.getByRole("button", { name: "Rename Laptop" }));
    const field = screen.getByLabelText("New name for Laptop");
    await user.clear(field);
    await fill(user, field, "Desk");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("patch /auth/passkeys/3"));

    await user.click(screen.getByRole("button", { name: "Delete Laptop" }));
    await user.click(await screen.findByRole("button", { name: "Delete passkey" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("delete /auth/passkeys/3"));
  });
});

describe("AccountExportSection and AccountDeletionSection", () => {
  it("downloads the export", async () => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() }));
    // jsdom cannot follow the download link; the card's own test holds what it saves.
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const { calls, user } = mount(<AccountExportSection />, {
      "get /auth/me/export": () => ({ status: 200, data: new Blob(["{}"]) }),
    });
    await user.click(screen.getByRole("button", { name: "Download my data" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toEqual(["get /auth/me/export"]));
    await waitFor(() => expect(click).toHaveBeenCalled());
    click.mockRestore();
  });

  it("says the server's terms, and a granted request signs the tab out", async () => {
    const { calls, user } = mount(<AccountDeletionSection />, {
      "get /auth/me/deletion": () => ({ status: 200, data: { mode: "operator", days: null } }),
      "post /auth/me/deletion": () => ({ status: 202, data: { mail_sent: true } }),
    });
    expect(
      await screen.findByText("Your account is deactivated at once, and an operator will erase it for good."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete account…" }));
    await fill(user, screen.getByLabelText("Password"), "pw");
    await fill(user, screen.getByLabelText(/Type “ada@example.com”/), ada.email);
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    await waitFor(() => expect(record()).toBeNull());
    expect(calls.find((c) => c.route === "post /auth/me/deletion")!.data).toEqual({
      password: "pw",
      confirm_email: ada.email,
    });
  });
});

describe("AccountInvitationsSection", () => {
  it("invites, and on the console transport offers the link once, from the answer", async () => {
    const row = {
      id: 1,
      email: "bob@example.com",
      role: "MEMBER",
      locale: "en",
      status: "open",
      created_at: "2026-11-13T09:00:00Z",
      expires_at: "2026-11-27T09:00:00Z",
    };
    let invited = false;
    const { user } = mount(<AccountInvitationsSection invitableRoles={["MEMBER"]} defaultRole="MEMBER" />, {
      // The list never carries the link: only the answer that minted it does (§12.5 item 11).
      "get /admin/invitations": () => ({ status: 200, data: invited ? [row] : [] }),
      "post /admin/invitations": () => {
        invited = true;
        return {
          status: 201,
          data: { ...row, sent: false, mail_backend: "console", link: "https://app.example/register?invite=t" },
        };
      },
    });
    await fill(user, await screen.findByLabelText("Email address"), "bob@example.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    // The row offers the link to copy, from the answer that minted it: the list has none.
    const item = await screen.findByRole("listitem");
    expect(await within(item).findByRole("button", { name: "Copy invitation link" })).toBeInTheDocument();
    expect(screen.getByText(/written to the server log/)).toBeInTheDocument();
  });

  it("sends a new link, and says a refusal in the account words", async () => {
    const row = {
      id: 7,
      email: "eve@example.com",
      role: "MEMBER",
      locale: "en",
      status: "open",
      created_at: "2026-11-13T09:00:00Z",
      expires_at: "2026-11-27T09:00:00Z",
    };
    const { calls, user } = mount(<AccountInvitationsSection />, {
      "get /admin/invitations": () => ({ status: 200, data: [row] }),
      "post /admin/invitations/7/resend": () => ({ status: 409, data: { code: "invitation_closed" } }),
    });
    await user.click(await screen.findByRole("button", { name: "Send eve@example.com a new link" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("post /admin/invitations/7/resend"));
  });
});
