import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { fakeFetch, fakeHttp } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";
import { AccountTranslationReview } from "../account-translation-review";
import { AccountsProvider } from "../accounts-context";
import { createAccountsClient } from "../accounts-client";

/**
 * The review page on server-kit 0.31's `translation_review_router` (docs/auth-harmonization.md
 * §12.9): the strings the app ships beside the reference, the verdicts the server keeps, and the
 * page's answer to a viewer who may review nothing.
 */

const ada = { id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace", role: "ADMIN" };
const clients: Array<{ detach(): void }> = [];

const CATALOGUES: Record<string, Record<string, unknown>> = {
  en: { site: { title: "Hands-on exhibits", save: "Save" }, legal: { privacy: "Privacy policy" } },
  fr: { site: { title: "Expositions à toucher", save: "Enregistrer" }, legal: { privacy: "Confidentialité" } },
  "de-CH": { site: { title: "Exponate zum Anfassen", save: "Speichern" }, legal: { privacy: "Datenschutz" } },
};
const loadStrings = vi.fn(async (code: string) => CATALOGUES[code] ?? {});

function mount(ui: ReactNode, routes: Record<string, (config: Cfg) => Answer> = {}, entry = "/translations") {
  const calls: Array<{ route: string; data?: unknown }> = [];
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
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <MemoryRouter initialEntries={[entry]}>
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
  localStorage.setItem("app.session", JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
  loadStrings.mockClear();
});
afterEach(() => {
  for (const client of clients.splice(0)) client.detach();
});

/** A string's row: the panel draws one table per group (the site's words, the legal pages). */
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;

describe("AccountTranslationReview", () => {
  it("lists the app's strings in the viewer's language beside the reference, with the server's verdicts", async () => {
    mount(<AccountTranslationReview loadStrings={loadStrings} kitWords={false} />, {
      "get /translations/reviews": () => ({
        status: 200,
        data: {
          locales: ["fr"],
          areas: null,
          reviews: [
            {
              locale: "fr",
              key: "site.save",
              text: "Enregistrer",
              reference_text: "Save",
              verdict: "APPROVED",
              note: null,
              suggestion: null,
              reviewer_name: "Amélie",
              reviewed_at: "2026-11-14T10:00:00Z",
            },
          ],
        },
      }),
    });
    expect(await screen.findByText("Expositions à toucher")).toBeInTheDocument();
    expect(within(rowOf("Expositions à toucher")).getByText("Hands-on exhibits")).toBeInTheDocument();
    // An approved row has nothing left to approve.
    expect(within(rowOf("Enregistrer")).queryByRole("button", { name: "Approve" })).toBeNull();
    // French is read against English: only those two catalogues are loaded.
    expect(loadStrings.mock.calls.map(([code]) => code).sort()).toEqual(["en", "fr"]);
  });

  it("says a verdict's day through the app's date preference, the kit's day ladder (DUP-2)", async () => {
    const preference = vi.fn((iso: string) => `day ${iso}`);
    const { user } = mount(
      <UiKitProvider formatDate={preference} timeZone="UTC">
        <AccountTranslationReview loadStrings={loadStrings} kitWords={false} />
      </UiKitProvider>,
      {
        "get /translations/reviews": () => ({
          status: 200,
          data: {
            locales: ["fr"],
            areas: null,
            reviews: [
              {
                locale: "fr",
                key: "site.save",
                text: "Enregistrer",
                reference_text: "Save",
                verdict: "APPROVED",
                note: null,
                suggestion: null,
                reviewer_name: "Amélie",
                reviewed_at: "2026-11-14T10:00:00Z",
              },
            ],
          },
        }),
      },
    );
    await screen.findByText("Enregistrer");
    await user.click(screen.getByText("Enregistrer"));
    expect(await screen.findByText(/day 2026-11-14, 10:00/)).toBeInTheDocument();
  });

  it("stores an approval with the wording it was given on", async () => {
    const { calls, user } = mount(<AccountTranslationReview loadStrings={loadStrings} kitWords={false} />, {
      "get /translations/reviews": () => ({ status: 200, data: { locales: ["fr"], areas: null, reviews: [] } }),
      "put /translations/reviews": (config) => ({
        status: 200,
        data: {
          reviews: (config.data as { items: object[] }).items.map((item) => ({
            ...item,
            reviewer_name: "Ada Lovelace",
            reviewed_at: "2026-11-14T11:00:00Z",
          })),
        },
      }),
    });
    await screen.findByText("Expositions à toucher");
    await user.click(within(rowOf("Expositions à toucher")).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === "put /translations/reviews")?.data).toEqual({
        items: [
          {
            locale: "fr",
            key: "site.title",
            text: "Expositions à toucher",
            reference_text: "Hands-on exhibits",
            verdict: "APPROVED",
            note: null,
            suggestion: null,
          },
        ],
      }),
    );
    // The answer patches the list: no second download of every verdict.
    expect(calls.filter((c) => c.route === "get /translations/reviews")).toHaveLength(1);
  });

  it("offers a tab per language the viewer may review, and keeps the language in the address", async () => {
    const { user } = mount(<AccountTranslationReview loadStrings={loadStrings} kitWords={false} />, {
      "get /translations/reviews": () => ({
        status: 200,
        data: { locales: ["de-CH", "fr"], areas: null, reviews: [] },
      }),
    });
    await screen.findByText("Exponate zum Anfassen");
    await user.click(screen.getByRole("tab", { name: /Français/ }));
    expect(await screen.findByText("Expositions à toucher")).toBeInTheDocument();
  });

  it("says there is nothing to review to a viewer the server grants nothing, and asks once", async () => {
    const { calls } = mount(<AccountTranslationReview loadStrings={loadStrings} />, {
      "get /translations/reviews": () => ({ status: 403, data: { code: "translation_forbidden" } }),
    });
    expect(await screen.findByText("No languages to review")).toBeInTheDocument();
    expect(calls.filter((c) => c.route === "get /translations/reviews")).toHaveLength(1);
    expect(loadStrings).not.toHaveBeenCalled();
  });

  it("reads the kit's own words beside the app's, under kit.", async () => {
    mount(
      <AccountTranslationReview loadStrings={loadStrings} />,
      {
        "get /translations/reviews": () => ({ status: 200, data: { locales: ["fr"], areas: null, reviews: [] } }),
      },
      "/translations?source=kit&q=kit.common.close",
    );
    expect(await screen.findByText("kit.common.close", {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
