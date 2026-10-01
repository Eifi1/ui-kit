import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { GlobalSearch } from "../global-search";
import type { GlobalSearchProps, GlobalSearchSource } from "../global-search";
import type { SearchEntry } from "../search-index";

/**
 * A source with `groups` (kastlan 56): ONE request whose answer is split into several
 * headed groups — kastlan's record search returns five entity types at once and had kept
 * a dedupe layer so five one-group sources still made one request.
 */

const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;
beforeAll(() => {
  if (!JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
});
afterAll(() => {
  if (!JSDOM_HAS_IT) delete PROTO.scrollIntoView;
});

const ENTRIES: SearchEntry[] = [{ id: "page-mueller", title: "Müller page", group: "Pages", href: "/m" }];

function renderSearch(props: Partial<GlobalSearchProps>) {
  return render(
    <MemoryRouter>
      <GlobalSearch entries={ENTRIES} {...props} />
    </MemoryRouter>,
  );
}

const open = () =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  });
const type = (text: string) => fireEvent.change(screen.getByRole("combobox"), { target: { value: text } });
const headings = () =>
  screen.getAllByRole("group").map((g) => document.getElementById(g.getAttribute("aria-labelledby")!)?.textContent);
const active = () => {
  const id = screen.getByRole("combobox").getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.textContent : null;
};

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const GROUPS = [
  { key: "estate", label: "Properties" },
  { key: "unit", label: "Units" },
  { key: "contact", label: "Contacts" },
];

describe("GlobalSearch: one source, several groups", () => {
  it("asks once per query and shows the answer under the declared groups, in the declared order", async () => {
    // The answer comes back interleaved and in "wrong" order; the headings must not follow it.
    const search = vi.fn(async (): Promise<SearchEntry[]> => [
      { id: "1", title: "Müller, Anna", group: "contact", href: "/contacts/1" },
      { id: "1", title: "Müllerstraße 4", group: "estate", href: "/estates/1" },
      { id: "2", title: "Müller, Ben", group: "contact", href: "/contacts/2" },
      { id: "7", title: "Unit 3 (Müller)", group: "unit", href: "/units/7" },
      { id: "9", title: "Müller invoice", group: "invoice", href: "/invoices/9" },
    ]);
    const source: GlobalSearchSource = { id: "records", group: "Other records", groups: GROUPS, debounceMs: 0, search };
    renderSearch({ sources: [source] });
    open();
    type("müller");

    await screen.findByRole("option", { name: "Müller, Ben" });
    expect(search).toHaveBeenCalledTimes(1);
    // Static first (it ranked first), then the source's groups in declared order, then
    // the undeclared type under the source's own `group`.
    expect(headings()).toEqual(["Pages", "Properties", "Units", "Contacts", "Other records"]);
    const contacts = screen.getByRole("group", { name: "Contacts" });
    // Within a group the source's ranking stands.
    expect(within(contacts).getAllByRole("option").map((o) => o.textContent)).toEqual(["Müller, Anna", "Müller, Ben"]);
    // Same id "1" in two groups: both rows exist (the group key is part of the row id).
    expect(screen.getByRole("option", { name: "Müllerstraße 4" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Other records" })).toHaveTextContent("Müller invoice");
  });

  it("walks the keyboard through the groups in the order they are shown", async () => {
    renderSearch({
      sources: [
        {
          id: "records",
          group: "Records",
          groups: GROUPS,
          debounceMs: 0,
          search: async () => [
            { id: "c", title: "Müller, Anna", group: "contact" },
            { id: "e", title: "Müllerstraße 4", group: "estate" },
          ],
        },
      ],
    });
    open();
    type("müller");
    await screen.findByRole("option", { name: "Müller, Anna" });
    const seen = [active()];
    for (let i = 0; i < 2; i++) {
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
      seen.push(active());
    }
    expect(seen).toEqual(["Müller page", "Müllerstraße 4", "Müller, Anna"]);
  });

  it("caps each group at `limit`, and takes plain-string groups as key and heading at once", async () => {
    renderSearch({
      sources: [
        {
          id: "records",
          group: "Records",
          groups: ["Units", "Contacts"],
          limit: 2,
          debounceMs: 0,
          search: async () => [
            ...[1, 2, 3].map((n) => ({ id: `u${n}`, title: `Unit ${n}`, group: "Units" })),
            ...[1, 2, 3].map((n) => ({ id: `c${n}`, title: `Contact ${n}`, group: "Contacts" })),
          ],
        },
      ],
    });
    open();
    type("xx");
    await screen.findByRole("option", { name: "Contact 2" });
    expect(within(screen.getByRole("group", { name: "Units" })).getAllByRole("option")).toHaveLength(2);
    expect(within(screen.getByRole("group", { name: "Contacts" })).getAllByRole("option")).toHaveLength(2);
  });

  it("shows one Searching… line (and one error line) for the one request, under its first group", async () => {
    const pending = deferred<SearchEntry[]>();
    const onError = vi.fn();
    renderSearch({
      sources: [{ id: "records", group: "Records", groups: GROUPS, debounceMs: 0, onError, search: () => pending.promise }],
    });
    open();
    type("müller");
    await screen.findByRole("option", { name: "Müller page" });
    expect(screen.getAllByText("Searching…")).toHaveLength(1);
    // The static group never waits on the source.
    expect(screen.queryByRole("group", { name: "Units" })).toBeNull();

    await act(async () => pending.reject(new Error("offline")));
    expect(await screen.findByText("Search failed. Try again.")).toBeInTheDocument();
    expect(screen.getAllByText("Search failed. Try again.")).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("aborts the one request when the query moves on and never shows the stale answer", async () => {
    const answers: Record<string, ReturnType<typeof deferred<SearchEntry[]>>> = {};
    const signals: AbortSignal[] = [];
    const search = vi.fn((q: string, signal: AbortSignal) => {
      signals.push(signal);
      answers[q] = deferred<SearchEntry[]>();
      return answers[q].promise;
    });
    renderSearch({ sources: [{ id: "records", group: "Records", groups: GROUPS, debounceMs: 0, search }] });
    open();
    type("mü");
    await waitFor(() => expect(search).toHaveBeenCalledWith("mü", expect.any(AbortSignal)));
    type("mül");
    await waitFor(() => expect(search).toHaveBeenCalledWith("mül", expect.any(AbortSignal)));
    expect(signals[0].aborted).toBe(true);
    await act(async () => answers["mü"].resolve([{ id: "s", title: "Stale unit", group: "unit" }]));
    await act(async () => answers["mül"].resolve([{ id: "f", title: "Fresh unit", group: "unit" }]));
    expect(await screen.findByRole("option", { name: "Fresh unit" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Stale unit" })).toBeNull();
  });

  it("leaves a source without `groups` as it was: one group, entries' own `group` ignored", async () => {
    renderSearch({
      sources: [
        { id: "tx", group: "Transactions", debounceMs: 0, search: async () => [{ id: "t", title: "Müller rent", group: "unit" }] },
      ],
    });
    open();
    type("müller");
    const tx = await screen.findByRole("group", { name: "Transactions" });
    expect(within(tx).getByRole("option", { name: "Müller rent" })).toBeInTheDocument();
  });
});
