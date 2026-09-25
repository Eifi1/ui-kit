import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from "react-router";
import { GlobalSearch } from "../global-search";
import type { GlobalSearchProps, GlobalSearchSource } from "../global-search";
import type { SearchEntry } from "../search-index";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE } from "../../i18n/locales/de";

/**
 * `GlobalSearch` is what kastlan's and keksdose's hand-built ⌘K wrappers become, so these
 * pin the parts both apps depend on: the shortcut and the trigger, the empty-query
 * suggestions, navigation that stays a real link, async sources that stream in without
 * holding the static groups back, and entries that re-search when they change.
 */

const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;
beforeAll(() => {
  if (!JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
});
afterAll(() => {
  if (!JSDOM_HAS_IT) delete PROTO.scrollIntoView;
});

const ENTRIES: SearchEntry[] = [
  { id: "budget", title: "Budget", group: "Pages", href: "/budget" },
  { id: "accounts", title: "Accounts", group: "Pages", href: "/accounts" },
  { id: "new-account", title: "New account", group: "Actions", href: "/accounts?action=new" },
  { id: "dark", title: "Dark mode", group: "Settings", keywords: ["theme"], href: "/settings#theme" },
];

function Where() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="where">{pathname + search + hash}</output>;
}

function renderInRouter(props: Partial<GlobalSearchProps> = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <GlobalSearch entries={ENTRIES} {...props} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const pressCmdK = (init: KeyboardEventInit = { metaKey: true }) =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", bubbles: true, ...init }));
  });

const type = (text: string) =>
  fireEvent.change(screen.getByRole("combobox"), { target: { value: text } });

describe("GlobalSearch: opening", () => {
  it("opens on ⌘K and on Ctrl K", async () => {
    renderInRouter();
    pressCmdK();
    expect(await screen.findByRole("dialog", { name: "Search" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    pressCmdK({ ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("does not register the shortcut when `shortcut={false}`", () => {
    renderInRouter({ shortcut: false });
    pressCmdK();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from its trigger, which names itself and its shortcut", async () => {
    renderInRouter();
    const trigger = screen.getByRole("button", { name: "Search" });
    expect(trigger).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("can be opened from anywhere through a controlled `open`, with no trigger of its own", async () => {
    function Elsewhere() {
      const [open, setOpen] = useState(false);
      return (
        <MemoryRouter>
          <button type="button" onClick={() => setOpen(true)}>
            Find
          </button>
          <GlobalSearch entries={ENTRIES} trigger="none" open={open} onOpenChange={setOpen} />
        </MemoryRouter>
      );
    }
    render(<Elsewhere />);
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("renders a custom trigger with what the default one uses", () => {
    renderInRouter({
      trigger: ({ open, label, keys }) => (
        <button type="button" onClick={open}>
          {`${label} ${keys}`}
        </button>
      ),
    });
    expect(screen.getByRole("button", { name: /^Search (⌘K|Ctrl K)$/ })).toBeInTheDocument();
  });
});

describe("GlobalSearch: results", () => {
  it("shows the suggestions for the empty query: entries by id, and queries to try", async () => {
    renderInRouter({ suggestions: ["budget", { query: "theme" }, "no-such-id"] });
    pressCmdK();
    const listbox = await screen.findByRole("listbox");
    const group = await within(listbox).findByRole("group", { name: "Try" });
    const options = within(group).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Budget", "theme"]);

    // A query suggestion types itself in and keeps the palette open.
    fireEvent.click(options[1]);
    expect(screen.getByRole("combobox")).toHaveValue("theme");
    expect(await screen.findByRole("option", { name: "Dark mode" })).toBeInTheDocument();
  });

  it("navigates through the router, and keeps the row a real link for a new tab", async () => {
    renderInRouter();
    pressCmdK();
    type("dark");
    const option = await screen.findByRole("option", { name: "Dark mode" });
    expect(option.tagName).toBe("A");
    expect(option).toHaveAttribute("href", "/settings#theme");

    // A ⌘-click belongs to the browser: nothing runs, the palette stays.
    const cmdClick = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, metaKey: true });
    expect(fireEvent(option, cmdClick)).toBe(true);
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/);

    fireEvent.click(option);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/settings#theme"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  /**
   * The palette's Back-closes-it history entry is taken off with a deferred
   * `history.go(-1)` when it closes. A router push in the same tick landed on top of it,
   * the unwind re-tagged the NEW entry as its own and went back from it — the page
   * changed and changed straight back (seen in the browser under a HashRouter). The
   * hook now tells a router push from a wiped marker by the router's `idx`, so the href
   * is followed straight away and nothing undoes it.
   */
  it("is not undone by the palette's own history entry being unwound", async () => {
    window.history.replaceState(null, "", "/");
    render(
      <BrowserRouter>
        <GlobalSearch entries={ENTRIES} />
        <Where />
      </BrowserRouter>,
    );
    pressCmdK();
    type("budget");
    fireEvent.click(await screen.findByRole("option", { name: "Budget" }));
    await waitFor(() => expect(window.location.pathname).toBe("/budget"));
    // …and it stays there once every deferred traversal has run.
    await new Promise((r) => setTimeout(r, 100));
    expect(window.location.pathname).toBe("/budget");
    expect(screen.getByTestId("where")).toHaveTextContent("/budget");
    window.history.replaceState(null, "", "/");
  });

  it("builds hash-router links under a hash router's base", async () => {
    const hrefFor = (to: string) => `#${to}`;
    renderInRouter({ hrefFor });
    pressCmdK();
    type("budget");
    expect(await screen.findByRole("option", { name: "Budget" })).toHaveAttribute("href", "#/budget");
  });

  it("outside a router, follows hrefs with the `navigate` it is given", async () => {
    const navigate = vi.fn();
    render(<GlobalSearch entries={ENTRIES} navigate={navigate} />);
    pressCmdK();
    type("accounts");
    fireEvent.click(await screen.findByRole("option", { name: "Accounts" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/accounts"));
  });

  it("puts `groupOrder` groups first", async () => {
    renderInRouter({ groupOrder: ["Actions"] });
    pressCmdK();
    type("account");
    await screen.findByRole("option", { name: "Accounts" });
    const groups = within(screen.getByRole("listbox")).getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-labelledby") && document.getElementById(g.getAttribute("aria-labelledby")!)!.textContent)).toEqual(["Actions", "Pages"]);
  });

  it("re-runs the open search when the entries change — no revision needed", async () => {
    function LateData() {
      const [entries, setEntries] = useState<SearchEntry[]>([]);
      return (
        <MemoryRouter>
          <button type="button" onClick={() => setEntries([{ id: "p", title: "Payee Müller", group: "Payees" }])}>
            load
          </button>
          <GlobalSearch entries={entries} />
        </MemoryRouter>
      );
    }
    render(<LateData />);
    pressCmdK();
    type("muller");
    await waitFor(() => expect(screen.getByText("No results")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "load", hidden: true }));
    expect(await screen.findByRole("option", { name: "Payee Müller" })).toBeInTheDocument();
  });

  it("speaks the provider's language", async () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE}>
        <MemoryRouter>
          <GlobalSearch entries={ENTRIES} suggestions={["budget"]} />
        </MemoryRouter>
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Suche" }));
    expect(await screen.findByPlaceholderText("Suchen oder springen zu…")).toBeInTheDocument();
    expect(await screen.findByRole("group", { name: "Vorschläge" })).toBeInTheDocument();
  });
});

describe("GlobalSearch: async sources", () => {
  function deferred<T>() {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it("streams a source into its own group without holding back the static ones", async () => {
    const pending = deferred<SearchEntry[]>();
    const source: GlobalSearchSource = {
      id: "tx",
      group: "Transactions",
      debounceMs: 0,
      search: () => pending.promise,
    };
    renderInRouter({ sources: [source] });
    pressCmdK();
    type("budget");
    // The static hit is there while the source is still out, with its "Searching…" line.
    expect(await screen.findByRole("option", { name: "Budget" })).toBeInTheDocument();
    const tx = await screen.findByRole("group", { name: "Transactions" }).catch(() => null);
    expect(tx === null || within(tx).queryAllByRole("option").length === 0).toBe(true);
    expect(screen.getAllByText("Searching…").length).toBeGreaterThan(0);

    await act(async () => pending.resolve([{ id: "t1", title: "Budget transfer", hint: "€ 12.00" }]));
    expect(await screen.findByRole("option", { name: /Budget transfer/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Budget" })).toBeInTheDocument();
  });

  it("shows a failed source as a line in its own group and keeps every other group", async () => {
    const onError = vi.fn();
    const ok: GlobalSearchSource = {
      id: "ok",
      group: "Accounts (server)",
      debounceMs: 0,
      search: async () => [{ id: "a1", title: "Budget account" }],
    };
    const broken: GlobalSearchSource = {
      id: "broken",
      group: "Transactions",
      debounceMs: 0,
      onError,
      search: async () => {
        throw new Error("offline");
      },
    };
    renderInRouter({ sources: [broken, ok] });
    pressCmdK();
    type("budget");
    expect(await screen.findByRole("option", { name: "Budget account" })).toBeInTheDocument();
    expect(await screen.findByText("Search failed. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Budget" })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("aborts the request of a query that moved on, and waits for `minChars`", async () => {
    const signals: AbortSignal[] = [];
    const search = vi.fn((_q: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<SearchEntry[]>(() => {});
    });
    renderInRouter({ sources: [{ id: "tx", group: "Transactions", debounceMs: 0, minChars: 3, search }] });
    pressCmdK();
    type("bu");
    await screen.findByRole("option", { name: "Budget" });
    expect(search).not.toHaveBeenCalled();
    type("bud");
    await waitFor(() => expect(search).toHaveBeenCalledWith("bud", expect.any(AbortSignal)));
    type("budg");
    await waitFor(() => expect(search).toHaveBeenCalledWith("budg", expect.any(AbortSignal)));
    expect(signals[0].aborted).toBe(true);
  });

  it("masks a redacted source's labels and hints", async () => {
    renderInRouter({
      sources: [
        {
          id: "tx",
          group: "Transactions",
          debounceMs: 0,
          redact: true,
          search: async () => [{ id: "t1", title: "Rent Müller", hint: "€ 950.00" }],
        },
      ],
    });
    pressCmdK();
    type("rent");
    const option = await screen.findByRole("option", { name: /Rent Müller/ });
    expect(within(option).getByText("Rent Müller")).toHaveAttribute("data-private");
    expect(within(option).getByText("€ 950.00")).toHaveAttribute("data-private");
  });
});
