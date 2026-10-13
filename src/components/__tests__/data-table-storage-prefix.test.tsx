import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { translationRows } from "../../lib/translation-review";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { TranslationReviewPanel } from "../translation-review";

/**
 * Round 0.34 C5 (KS U4): one table-storage prefix on the provider.
 *
 * Every app keeps its tables' views under a prefix of its own and lists it on its privacy
 * page. `TranslationReviewPanel` wraps a `DataTable` and took no prefix, so its view
 * landed under the kit's `hbui-table:` whatever the app's was, and Kurvenschmiede listed
 * the kit's prefix as one of its own keys. The prefix now resolves prop > provider >
 * `hbui-table:`, and the stored key is the prefix plus `storageKey` verbatim — which is
 * what lets Keksdose move its `keksdose-table:` from a wrapper onto the provider without
 * a reader losing a saved sort.
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

function table(props: { storageKeyPrefix?: string } = {}, provider?: string) {
  const ui = <DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} storageKey="t" {...props} />;
  const wrap = (children: ReactNode) =>
    provider === undefined ? children : <UiKitProvider tableStorageKeyPrefix={provider}>{children}</UiKitProvider>;
  return render(<MemoryRouter>{wrap(ui)}</MemoryRouter>);
}

/** The names in the order the table shows them. */
const shown = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .filter((r) => r.closest("tbody"))
    .map((r) => r.textContent);

const storedKeys = () => Object.keys(localStorage).sort();

describe("table storage prefix", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the kit's own prefix when nobody names one", () => {
    table();
    expect(storedKeys()).toEqual(["hbui-table:t"]);
  });

  it("writes under the provider's prefix", () => {
    table({}, "app-table:");
    expect(storedKeys()).toEqual(["app-table:t"]);
  });

  it("lets a table's own prop win over the provider", () => {
    table({ storageKeyPrefix: "own:" }, "app-table:");
    expect(storedKeys()).toEqual(["own:t"]);
  });

  it("reads back what a prefix-passing wrapper stored, once the prefix is on the provider", () => {
    // Keksdose's wrapper wrote `keksdose-table:<storageKey>`; the provider must land on
    // the very same key, or every reader's saved sort goes back to the default.
    localStorage.setItem(
      "keksdose-table:t",
      JSON.stringify({ sort: [{ key: "name", dir: "desc" }], filters: {}, pageSize: 25 }),
    );
    table({}, "keksdose-table:");
    expect(shown()).toEqual(["Charlie", "Bravo", "Alpha"]);
    expect(storedKeys()).toEqual(["keksdose-table:t"]);
  });

  it("an inner provider that names no prefix keeps the outer one", () => {
    render(
      <MemoryRouter>
        <UiKitProvider tableStorageKeyPrefix="app-table:">
          <UiKitProvider locale="fr">
            <DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} storageKey="t" />
          </UiKitProvider>
        </UiKitProvider>
      </MemoryRouter>,
    );
    expect(storedKeys()).toEqual(["app-table:t"]);
  });
});

describe("TranslationReviewPanel's storage prefix", () => {
  beforeEach(() => localStorage.clear());

  const rows = translationRows({
    locale: "fr",
    strings: { "common.save": "Enregistrer" },
    reference: { "common.save": "Save" },
    reviews: [],
  });

  const panel = (props: { storageKeyPrefix?: string }, provider?: string) => {
    const ui = (
      <TranslationReviewPanel
        rows={rows}
        localeLabel="Français"
        referenceLabel="English"
        storageKey="translations"
        {...props}
      />
    );
    return render(
      <MemoryRouter>
        {provider === undefined ? ui : <UiKitProvider tableStorageKeyPrefix={provider}>{ui}</UiKitProvider>}
      </MemoryRouter>,
    );
  };

  it("keeps its table under the provider's prefix — the key Kurvenschmiede had to list as the kit's", () => {
    panel({}, "steering-table:");
    expect(storedKeys()).toEqual(["steering-table:translations"]);
  });

  it("takes a prefix of its own, which wins", () => {
    panel({ storageKeyPrefix: "review:" }, "steering-table:");
    expect(storedKeys()).toEqual(["review:translations"]);
  });

  it("falls back to the kit's prefix, as before", () => {
    panel({});
    expect(storedKeys()).toEqual(["hbui-table:translations"]);
  });
});
