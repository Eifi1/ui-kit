import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { createMemoryStorage } from "../../lib/safe-storage";
import { translationRows } from "../../lib/translation-review";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { TranslationReviewPanel } from "../translation-review";
import { useSharedTableView } from "../use-table-state";

/**
 * 0.62: where a table keeps its view — a `Storage`, `localStorage` unless the table's
 * `storage` or the provider's `tableStorage` names another.
 *
 * keksdose's shared-computer session (a ticked "This is a shared computer") keeps what the
 * person leaves in the page's memory: Chrome brings a closed tab back WITH its
 * sessionStorage (Chromium 156), and localStorage outlives the tab. A table's saved view
 * (its filters hold payee names) went to localStorage whatever the app did, so keksdose
 * mounted its tables without `storageKey` in that mode and lost the view within the page
 * too. It hands the table its page-memory Storage instead.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
  { id: 3, name: "Charlie" },
];
const COLS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name }];

const DESC = JSON.stringify({ sort: [{ key: "name", dir: "desc" }], filters: {}, pageSize: 25 });

function table(props: { storage?: Storage; storageKeyPrefix?: string } = {}, provider?: Storage) {
  const ui = <DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} storageKey="t" {...props} />;
  const wrap = (children: ReactNode) =>
    provider === undefined ? children : <UiKitProvider tableStorage={provider}>{children}</UiKitProvider>;
  return render(<MemoryRouter>{wrap(ui)}</MemoryRouter>);
}

/** The names in the order the table shows them. */
const shown = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .filter((r) => r.closest("tbody"))
    .map((r) => r.textContent);

const sortByName = () =>
  fireEvent.click(within(screen.getByRole("columnheader", { name: /^Name/ })).getByRole("button", { name: /Name/ }));

const keysIn = (store: Storage) => Array.from({ length: store.length }, (_, i) => store.key(i)).sort();

beforeEach(() => localStorage.clear());

describe("DataTable storage (0.62)", () => {
  it("keeps the view in the Storage it is handed, under the same key, and none in localStorage", () => {
    const memory = createMemoryStorage();
    table({ storage: memory });
    sortByName();
    expect(keysIn(memory)).toEqual(["hbui-table:t"]);
    expect(JSON.parse(memory.getItem("hbui-table:t") ?? "{}")).toMatchObject({ sort: [{ key: "name", dir: "asc" }] });
    expect(keysIn(localStorage)).toEqual([]);
  });

  it("reads the view back from it, and not from localStorage", () => {
    const memory = createMemoryStorage();
    memory.setItem("hbui-table:t", DESC);
    table({ storage: memory });
    expect(shown()).toEqual(["Charlie", "Bravo", "Alpha"]);
    localStorage.setItem("hbui-table:t", DESC);
    const other = createMemoryStorage();
    table({ storage: other }).unmount();
    expect(keysIn(other)).toEqual(["hbui-table:t"]);
    expect(JSON.parse(other.getItem("hbui-table:t") ?? "{}").sort).toEqual([]);
  });

  it("takes the provider's tableStorage, with the table's own prefix or the provider's", () => {
    const memory = createMemoryStorage();
    table({ storageKeyPrefix: "own:" }, memory);
    expect(keysIn(memory)).toEqual(["own:t"]);
    expect(keysIn(localStorage)).toEqual([]);
  });

  it("lets a table's own storage win over the provider's", () => {
    const provider = createMemoryStorage();
    const own = createMemoryStorage();
    table({ storage: own }, provider);
    expect(keysIn(own)).toEqual(["hbui-table:t"]);
    expect(keysIn(provider)).toEqual([]);
  });

  it("an inner provider that names none keeps the outer one's", () => {
    const memory = createMemoryStorage();
    render(
      <MemoryRouter>
        <UiKitProvider tableStorage={memory}>
          <UiKitProvider locale="fr">
            <DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} storageKey="t" />
          </UiKitProvider>
        </UiKitProvider>
      </MemoryRouter>,
    );
    expect(keysIn(memory)).toEqual(["hbui-table:t"]);
  });

  it("writes into the new Storage when it changes while the table lives", () => {
    const first = createMemoryStorage();
    const second = createMemoryStorage();
    const view = table({ storage: first });
    view.rerender(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} storageKey="t" storage={second} />
      </MemoryRouter>,
    );
    expect(keysIn(second)).toEqual(["hbui-table:t"]);
    expect(keysIn(localStorage)).toEqual([]);
  });

  it("is localStorage without either, as before", () => {
    table();
    expect(keysIn(localStorage)).toEqual(["hbui-table:t"]);
  });
});

describe("the tables a provider's tableStorage reaches (0.62)", () => {
  it("TranslationReviewPanel's table, which an app passes no prop to", () => {
    const memory = createMemoryStorage();
    const rows = translationRows({
      locale: "fr",
      strings: { "common.save": "Enregistrer" },
      reference: { "common.save": "Save" },
      reviews: [],
    });
    render(
      <MemoryRouter>
        <UiKitProvider tableStorage={memory} tableStorageKeyPrefix="app-table:">
          <TranslationReviewPanel
            rows={rows}
            localeLabel="Français"
            referenceLabel="English"
            storageKey="translations"
          />
        </UiKitProvider>
      </MemoryRouter>,
    );
    expect(keysIn(memory)).toEqual(["app-table:translations"]);
    expect(keysIn(localStorage)).toEqual([]);
  });

  it("useSharedTableView, the panel's groups: read from it and written to it", () => {
    const memory = createMemoryStorage();
    memory.setItem("hbui-table:review", JSON.stringify({ sort: [], filters: {}, pageSize: 50, hidden: ["notes"] }));
    const { result } = renderHook(
      () => useSharedTableView({ active: true, storageKey: "review", defaultPageSize: 25 }),
      {
        wrapper: ({ children }) => <UiKitProvider tableStorage={memory}>{children}</UiKitProvider>,
      },
    );
    expect(result.current.pageSize).toBe(50);
    act(() => result.current.setSorts([{ key: "key", dir: "asc" }]));
    expect(JSON.parse(memory.getItem("hbui-table:review") ?? "{}")).toMatchObject({
      sort: [{ key: "key", dir: "asc" }],
      pageSize: 50,
      hidden: ["notes"],
    });
    expect(keysIn(localStorage)).toEqual([]);
  });

  it("useSharedTableView's own storage wins over the provider's", () => {
    const provider = createMemoryStorage();
    const own = createMemoryStorage();
    const { result } = renderHook(
      () => useSharedTableView({ active: true, storageKey: "review", defaultPageSize: 25, storage: own }),
      { wrapper: ({ children }) => <UiKitProvider tableStorage={provider}>{children}</UiKitProvider> },
    );
    act(() => result.current.setPageSize(100));
    expect(keysIn(own)).toEqual(["hbui-table:review"]);
    expect(keysIn(provider)).toEqual([]);
  });
});
