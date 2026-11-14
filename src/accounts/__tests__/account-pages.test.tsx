import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { RouteObject } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSharedComputer } from "../../offline/shared-computer";
import { fakeFetch, fakeHttp, noAnswer, tokens } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";
import { fill } from "../../test/fill";
import { accountRouteElements, accountRoutes, RequireSession } from "../account-pages";
import type { AccountRoutesOptions } from "../account-pages";
import { AccountsProvider } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";

/**
 * The account layer's signed-out pages (docs/auth-harmonization.md §7, §12.9 "The pages"),
 * as Staunlabor needs them: its own paths, no terms page, no demo, no 2FA, invitation-only
 * sign-up — each page the kit's form wired to the client, Kurvenschmiede's `features/auth`.
 */

const KEY = "app.session";
const ada = { id: 1, email: "ada@example.com", first_name: "Ada", last_name: "L" };
const clients: Array<{ detach(): void }> = [];

function mount(
  entry: string,
  routes: Record<string, (config: Cfg) => Answer | Promise<Answer>> = {},
  options: AccountRoutesOptions = {},
  extra: RouteObject[] = [],
) {
  const calls: Array<{ route: string; data: unknown }> = [];
  const http = fakeHttp((config) => {
    const route = `${config.method} ${config.url}`;
    calls.push({ route, data: config.data });
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
  const router = createMemoryRouter(
    [
      ...accountRoutes(options),
      { path: "/", element: <p>Home</p> },
      { path: "/settings", element: <p>Settings</p> },
      ...extra,
    ],
    { initialEntries: [entry] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AccountsProvider client={client}>
        <RouterProvider router={router} />
      </AccountsProvider>
    </QueryClientProvider>,
  );
  return { calls, router, user: userEvent.setup(), client };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  for (const client of clients.splice(0)) client.detach();
});

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY) ?? "null") as unknown;

describe("the sign-in page", () => {
  it("signs in with shared_device and lands where ?next= says", async () => {
    const { calls, router, user } = mount("/login?next=%2Fsettings", {
      "post /auth/login": () => ({ status: 200, data: tokens("a1", "r1", ada) }),
    });
    await fill(user, screen.getByLabelText("Email"), "ada@example.com");
    await fill(user, screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Settings");
    expect(calls[0]).toEqual({
      route: "post /auth/login",
      data: { email: "ada@example.com", password: "pw", shared_device: false },
    });
    expect(router.state.location.pathname).toBe("/settings");
    expect(stored()).toMatchObject({ token: "a1" });
  });

  it("offers “This is a shared computer” under the password, and keeps the session with the tab when ticked", async () => {
    const { user } = mount("/login", { "post /auth/login": () => ({ status: 200, data: tokens("a1", "r1", ada) }) });
    await user.click(screen.getByRole("checkbox", { name: /shared computer/ }));
    await fill(user, screen.getByLabelText("Email"), "ada@example.com");
    await fill(user, screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Home");
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("asks for the new password an admin required, and signs in with it", async () => {
    const { calls, user } = mount("/login", {
      "post /auth/login": () => ({ status: 200, data: { requires_password_change: true, challenge_token: "c1" } }),
      "post /auth/login/set-password": () => ({ status: 200, data: tokens("a1", "r1", ada) }),
    });
    await fill(user, screen.getByLabelText("Email"), "ada@example.com");
    await fill(user, screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await fill(user, await screen.findByLabelText("New password"), "a new password");
    await fill(user, screen.getByLabelText("Repeat new password"), "a new password");
    await user.click(screen.getByRole("button", { name: "Set password and sign in" }));
    await screen.findByText("Home");
    expect(calls[1]).toEqual({
      route: "post /auth/login/set-password",
      data: { challenge_token: "c1", new_password: "a new password" },
    });
  });

  it("leaves the shared-computer choice out when the app says so", () => {
    mount("/login", {}, { sharedComputerChoice: false });
    expect(screen.queryByRole("checkbox", { name: /shared computer/ })).toBeNull();
  });

  it("says a wrong password in the form's words, and a server out of reach in the account words", async () => {
    let answer: () => Answer | Promise<Answer> = () => ({ status: 401, data: { code: "invalid_credentials" } });
    const { user } = mount("/login", { "post /auth/login": () => answer() });
    await fill(user, screen.getByLabelText("Email"), "ada@example.com");
    await fill(user, screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("The email or password is incorrect.")).toBeInTheDocument();
    answer = () => Promise.reject(noAnswer());
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Can’t reach the server. Check your connection and try again.")).toBeInTheDocument();
  });

  it("links to no sign-up while sign-up is by invitation, and to it when open", () => {
    mount("/login");
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });
});

describe("the sign-up page", () => {
  async function fillIn(user: ReturnType<typeof userEvent.setup>, email = true) {
    await fill(user, screen.getByLabelText("First name"), "Ada");
    await fill(user, screen.getByLabelText("Last name"), "L");
    if (email) await fill(user, screen.getByLabelText("Email"), "ada@example.com");
    await fill(user, screen.getByLabelText("Password"), "a good password");
    await fill(user, screen.getByLabelText("Repeat password"), "a good password");
    await user.click(screen.getByRole("checkbox"));
  }

  it("says sign-up is by invitation to a visitor without one, and still lets the first account in", async () => {
    const { calls, user } = mount(
      "/register",
      { "post /auth/register": () => ({ status: 201, data: tokens("a1", "r1", ada) }) },
      { registerLocale: "de-CH" },
    );
    expect(screen.getByText(/New accounts are by invitation only/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Language")).toBeNull();
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText("Home");
    expect(calls[0]!.data).toEqual({
      email: "ada@example.com",
      password: "a good password",
      first_name: "Ada",
      last_name: "L",
      locale: "de-CH",
      shared_device: false,
    });
  });

  it("checks an invitation first, fixes its address, and sends its token with the app's fields", async () => {
    function Company({ onChange }: { onChange: (fields: Record<string, unknown>, complete: boolean) => void }) {
      return (
        <button type="button" onClick={() => onChange({ company: "Rig" }, true)}>
          Pick company
        </button>
      );
    }
    const { calls, user } = mount(
      "/register?invite=tok",
      {
        "post /auth/invitations/check": () => ({
          status: 200,
          data: { email: "ada@example.com", expires_at: "2026-12-01T00:00:00Z", account_exists: false },
        }),
        "post /auth/register": () => ({ status: 201, data: tokens("a1", "r1", ada) }),
      },
      { registerFields: Company },
    );
    await screen.findByLabelText("First name");
    expect(screen.queryByText(/New accounts are by invitation only/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Pick company" }));
    await fillIn(user, false);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText("Home");
    expect(calls[0]).toEqual({ route: "post /auth/invitations/check", data: { token: "tok" } });
    expect(calls[1]!.data).toMatchObject({ email: "ada@example.com", company: "Rig", invite_token: "tok" });
  });

  it("says a dead invitation link in the kit's words", async () => {
    mount("/register?invite=old", {
      "post /auth/invitations/check": () => ({ status: 400, data: { code: "invitation_expired" } }),
    });
    expect(await screen.findByText("This invitation has expired")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("lets a signed-in account accept the invitation", async () => {
    localStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
    const { calls } = mount("/register?invite=tok", {
      "post /auth/invitations/check": () => ({
        status: 200,
        data: { email: "ada@example.com", expires_at: "2026-12-01T00:00:00Z", account_exists: true },
      }),
      "post /auth/invitations/accept": () => ({ status: 200, data: { email: "ada@example.com" } }),
    });
    // Signed in, the page takes the invitation up at once (AcceptInvitation's own rule).
    expect(await screen.findByText("Invitation accepted.")).toBeInTheDocument();
    expect(calls.map((c) => c.route)).toContain("post /auth/invitations/accept");
  });

  it("asks an address that has an account to sign in and accept", async () => {
    mount("/register?invite=tok", {
      "post /auth/invitations/check": () => ({
        status: 200,
        data: { email: "ada@example.com", expires_at: "2026-12-01T00:00:00Z", account_exists: true },
      }),
    });
    const signIn = await screen.findByRole("link", { name: "Sign in" });
    expect(signIn.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/register?invite=tok")}`);
  });
});

describe("the password pages", () => {
  it("asks for a reset link", async () => {
    const { calls, user } = mount("/forgot-password?email=ada%40example.com");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() =>
      expect(calls).toEqual([{ route: "post /auth/password-reset/request", data: { email: "ada@example.com" } }]),
    );
  });

  it("checks the link, sets the new password, and ends on the sign-in with the address", async () => {
    const { calls, router, user } = mount("/reset-password?token=t1", {
      "post /auth/password-reset/check": () => ({ status: 200, data: { email: "ada@example.com" } }),
      "post /auth/password-reset/confirm": () => ({ status: 200, data: { email: "ada@example.com" } }),
    });
    await fill(user, await screen.findByLabelText("New password"), "a new password");
    await fill(user, screen.getByLabelText("Repeat new password"), "a new password");
    await user.click(screen.getByRole("button", { name: "Save password" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("post /auth/password-reset/confirm"));
    expect(calls.find((c) => c.route === "post /auth/password-reset/confirm")!.data).toEqual({
      token: "t1",
      new_password: "a new password",
    });
    await user.click(await screen.findByRole("button", { name: "Go to sign in" }));
    await waitFor(() => expect(router.state.location.search).toBe("?email=ada%40example.com"));
  });
});

describe("the mailed links", () => {
  it("redeems a verification link by POST", async () => {
    const { calls } = mount("/verify-email?token=v1", {
      "post /auth/verify-email": () => ({ status: 200, data: { email: "ada@example.com", email_verified: true } }),
    });
    await waitFor(() => expect(calls).toEqual([{ route: "post /auth/verify-email", data: { token: "v1" } }]));
  });

  it("offers a signed-in reader a new link where the old one is dead", async () => {
    localStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
    const { calls, user } = mount("/verify-email?token=v1", {
      "post /auth/verify-email": () => ({ status: 400, data: { code: "token_invalid" } }),
      "post /auth/resend-verification": () => ({ status: 200, data: { email: ada.email, email_verified: false } }),
    });
    await user.click(await screen.findByRole("button", { name: "Send again" }));
    await waitFor(() => expect(calls.map((c) => c.route)).toContain("post /auth/resend-verification"));
  });

  it("confirms an address change, and the signed-in account shows the new address", async () => {
    localStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
    const { calls, client } = mount("/confirm-email?token=c1", {
      "post /auth/me/email/confirm": () => ({ status: 200, data: { email: "ada@new.example", email_verified: true } }),
      "get /auth/me": () => ({ status: 200, data: { ...ada, email: "ada@new.example" } }),
    });
    await waitFor(() => expect(calls[0]).toEqual({ route: "post /auth/me/email/confirm", data: { token: "c1" } }));
    await waitFor(() => expect(client.useSession.getState().user).toMatchObject({ email: "ada@new.example" }));
  });
});

describe("the routes", () => {
  it("are the contract's paths, the app's where it names them, and the demo's end only with a demo", () => {
    const paths = (options?: AccountRoutesOptions) => accountRoutes(options).map((route) => route.path);
    expect(paths()).toEqual([
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/confirm-email",
    ]);
    expect(paths({ paths: { signIn: "/sign-in" } })[0]).toBe("/sign-in");
    expect(paths({ demo: { model: "sandbox", access: { kind: "register", href: "/register" } } })).toContain(
      "/demo/ended",
    );
  });

  it("draw the demo's end page with a demo", () => {
    mount("/demo/ended", {}, { demo: { model: "sandbox", access: { kind: "register", href: "/register" } } });
    expect(screen.getByRole("link", { name: "Start a new demo" })).toBeInTheDocument();
  });

  it("draw each page in the app's frame", () => {
    mount(
      "/login",
      {},
      {
        frame: ({ title, children }) => (
          <main aria-label="site">
            {title}
            {children}
          </main>
        ),
      },
    );
    expect(screen.getByRole("main", { name: "site" })).toHaveTextContent("Sign in");
  });
});

describe("RequireSession", () => {
  it("sends a reader without a session to the sign-in, carrying where they were", async () => {
    const { router } = mount("/private?tab=a#x", {}, {}, [
      {
        path: "/private",
        element: (
          <RequireSession>
            <p>Private</p>
          </RequireSession>
        ),
      },
    ]);
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent("/private?tab=a#x")}`);
  });

  it("shows the page to a reader with one", () => {
    setSharedComputer(false);
    localStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
    mount("/private", {}, {}, [
      {
        path: "/private",
        element: (
          <RequireSession>
            <p>Private</p>
          </RequireSession>
        ),
      },
    ]);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });
});

describe("accountRouteElements (0.64, Staunlabor)", () => {
  it("are the same pages as <Route> elements, for an app that writes its routes as JSX", async () => {
    const { MemoryRouter, Route, Routes } = await import("react-router");
    const client = createAccountsClient<typeof ada>({
      http: fakeHttp(() => ({ status: 204 })),
      storagePrefix: "app.",
      publicPaths: ["/"],
      fetch: fakeFetch(() => ({ status: 401 })),
      navigate: vi.fn(),
    });
    clients.push(client);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AccountsProvider client={client}>
          <MemoryRouter initialEntries={["/forgot-password"]}>
            <Routes>
              {accountRouteElements()}
              <Route path="/" element={<p>Home</p>} />
            </Routes>
          </MemoryRouter>
        </AccountsProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("button", { name: /send/i })).toBeInTheDocument();
    expect(accountRouteElements().map((element) => (element.props as { path?: string }).path)).toEqual(
      accountRoutes().map((route) => route.path),
    );
  });
});
