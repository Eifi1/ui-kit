import { QueryClient } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createQueryPersistence } from "../query-persistence";

/*
 * The persisted query cache across the tabs of a browser (refactor audit 2026-10-30, FLW-1):
 * a sign-out's `clear()` in one tab retires the key in every tab, so another tab still
 * holding the cache in memory writes nothing back under the key that was just deleted.
 * The tabs share one store, as IndexedDB is shared by the origin's tabs.
 */

const DAY = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.unstubAllGlobals();
});

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: vi.fn(async (k: string) => {
      map.delete(k);
    }),
    keys: async () => [...map.keys()],
  };
}

let n = 0;

/** Two tabs' persistences on one key (an app name of this file's own: Node's
 *  BroadcastChannel reaches the other test files' workers too). */
function twoTabs() {
  const storage = memoryStorage();
  const options = {
    app: `tabs-test-${(n += 1)}`,
    user: 7,
    company: 1,
    buster: "1",
    maxAge: DAY,
    storage,
    throttleTime: 0,
  };
  return { storage, a: createQueryPersistence(options), b: createQueryPersistence(options) };
}

const snapshot = (data: unknown): PersistedClient => ({
  timestamp: Date.now(),
  buster: "1",
  clientState: {
    mutations: [],
    queries: [
      {
        queryKey: ["estates"],
        queryHash: '["estates"]',
        dehydratedAt: Date.now(),
        state: {
          data,
          dataUpdateCount: 1,
          dataUpdatedAt: Date.now(),
          error: null,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          fetchFailureReason: null,
          fetchMeta: null,
          isInvalidated: false,
          status: "success",
          fetchStatus: "idle",
        },
      },
    ],
  },
});

describe("createQueryPersistence — clear() reaches every tab (FLW-1)", () => {
  it("retires the key in the other tab too: its next save writes nothing back", async () => {
    const { storage, a, b } = twoTabs();
    storage.map.set(a.key, JSON.stringify(snapshot("the estates")));
    await a.persistOptions.persister.restoreClient();
    await b.persistOptions.persister.restoreClient();

    await a.clear(new QueryClient());
    // The other tab deletes the key once more, after any save of its own already under way.
    await vi.waitFor(() => expect(storage.removeItem).toHaveBeenCalledTimes(2));
    await b.persistOptions.persister.persistClient(snapshot("the estates, still in B's memory"));

    expect(storage.map.has(a.key)).toBe(false);
  });

  it("arms the other tab again when it restores the key (a new sign-in there)", async () => {
    const { storage, a, b } = twoTabs();
    await a.persistOptions.persister.restoreClient();
    await b.persistOptions.persister.restoreClient();
    await a.clear(new QueryClient());
    await vi.waitFor(() => expect(storage.removeItem).toHaveBeenCalledTimes(2));

    await b.persistOptions.persister.restoreClient();
    await b.persistOptions.persister.persistClient(snapshot("after the new sign-in"));

    expect(storage.map.get(b.key)).toContain("after the new sign-in");
  });

  it("still clears this tab's copy where there is no BroadcastChannel", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const { storage, a } = twoTabs();
    storage.map.set(a.key, JSON.stringify(snapshot("the estates")));
    await a.persistOptions.persister.restoreClient();
    await a.clear(new QueryClient());
    await a.persistOptions.persister.persistClient(snapshot("late"));
    expect(storage.map.has(a.key)).toBe(false);
  });
});
