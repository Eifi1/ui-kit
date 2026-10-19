import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createQueryPersistence } from "../query-persistence";
import type { QueryPersistence } from "../query-persistence";

const DAY = 24 * 60 * 60 * 1000;

afterEach(cleanup);

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: async (k: string) => {
      map.delete(k);
    },
    keys: async () => [...map.keys()],
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A restore and a throttled save under a loaded full run can pass waitFor's 1 s default. */
const WAIT = { timeout: 5000 };

/** kastlan's company switch (B2): one QueryClient, one persistence per (user, company). */
function setup() {
  const storage = memoryStorage();
  const forCompany = (company: number) =>
    createQueryPersistence({ app: "kastlan", user: 7, company, buster: "1", maxAge: DAY, storage, throttleTime: 30 });
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: DAY } } });
  const mount = (persistence: QueryPersistence) => (
    // The documented mount: a remount per key, so the provider restores and subscribes anew.
    <PersistQueryClientProvider key={persistence.key} client={queryClient} persistOptions={persistence.persistOptions}>
      <span />
    </PersistQueryClientProvider>
  );
  return { storage, forCompany, queryClient, mount };
}

describe("createQueryPersistence — a remount per key (the company switch)", () => {
  it("writes B's queries under B's key and leaves A's copy as it was", async () => {
    const { storage, forCompany, queryClient, mount } = setup();
    const a = forCompany(1);
    const view = render(mount(a));
    await sleep(10); // the restore (nothing stored yet)
    queryClient.setQueryData(["estates"], "A's estates");
    await vi.waitFor(() => expect(storage.map.get(a.key)).toContain("A's estates"), WAIT);

    // The switch: leave A (memory emptied, A's key frozen), then mount B.
    await a.leave(queryClient);
    const b = forCompany(2);
    view.rerender(mount(b));
    await sleep(10);
    queryClient.setQueryData(["estates"], "B's estates");
    await vi.waitFor(() => expect(storage.map.get(b.key)).toContain("B's estates"), WAIT);
    await sleep(80); // past every throttled write A's subscription had pending

    expect(storage.map.get(a.key)).toContain("A's estates");
    expect(storage.map.get(a.key)).not.toContain("B's estates");
    expect(storage.map.get(b.key)).not.toContain("A's estates");
  });

  it("restores A's copy when the person switches back", async () => {
    const { storage, forCompany, queryClient, mount } = setup();
    const a = forCompany(1);
    const view = render(mount(a));
    await sleep(10);
    queryClient.setQueryData(["estates"], "A's estates");
    await vi.waitFor(() => expect(storage.map.get(a.key)).toContain("A's estates"), WAIT);
    await a.leave(queryClient);
    const b = forCompany(2);
    view.rerender(mount(b));
    await sleep(10);
    await b.leave(queryClient);
    view.rerender(mount(a)); // the same object again: its restore re-arms it
    await vi.waitFor(() => expect(queryClient.getQueryData(["estates"])).toBe("A's estates"), WAIT);
    queryClient.setQueryData(["estates"], "A's edit");
    await vi.waitFor(() => expect(storage.map.get(a.key)).toContain("A's edit"), WAIT);
  });

  it("clear leaves no late write behind: the key stays deleted", async () => {
    const { storage, forCompany, queryClient, mount } = setup();
    const a = forCompany(1);
    render(mount(a));
    await sleep(10);
    queryClient.setQueryData(["estates"], "A's estates");
    await vi.waitFor(() => expect(storage.map.has(a.key)).toBe(true), WAIT);
    await a.clear(queryClient);
    await sleep(80);
    expect(storage.map.has(a.key)).toBe(false);
  });
});
