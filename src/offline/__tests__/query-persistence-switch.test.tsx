import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { act, cleanup, render } from "@testing-library/react";
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
  // The provider subscribes in an effect after its restore is done, so a test awaits the
  // restore inside act (which also runs that effect), not a fixed sleep: under a loaded full
  // run a restore can outlast any sleep, and a write made before the subscription is never saved.
  let restored = () => {};
  const restore = () => new Promise<void>((resolve) => (restored = resolve));
  const mount = (persistence: QueryPersistence) => (
    // The documented mount: a remount per key, so the provider restores and subscribes anew.
    <PersistQueryClientProvider
      key={persistence.key}
      client={queryClient}
      persistOptions={persistence.persistOptions}
      onSuccess={() => restored()}
    >
      <span />
    </PersistQueryClientProvider>
  );
  return { storage, forCompany, queryClient, mount, restore };
}

describe("createQueryPersistence — a remount per key (the company switch)", () => {
  it("writes B's queries under B's key and leaves A's copy as it was", async () => {
    const { storage, forCompany, queryClient, mount, restore } = setup();
    const a = forCompany(1);
    const done0 = restore();
    const view = render(mount(a));
    await act(() => done0); // the restore, then the effect that subscribes
    queryClient.setQueryData(["estates"], "A's estates");
    await vi.waitFor(() => expect(storage.map.get(a.key)).toContain("A's estates"), WAIT);

    // The switch: leave A (memory emptied, A's key frozen), then mount B.
    await a.leave(queryClient);
    const b = forCompany(2);
    const done1 = restore();
    view.rerender(mount(b));
    await act(() => done1); // the restore, then the effect that subscribes
    queryClient.setQueryData(["estates"], "B's estates");
    await vi.waitFor(() => expect(storage.map.get(b.key)).toContain("B's estates"), WAIT);
    await sleep(80); // past every throttled write A's subscription had pending

    expect(storage.map.get(a.key)).toContain("A's estates");
    expect(storage.map.get(a.key)).not.toContain("B's estates");
    expect(storage.map.get(b.key)).not.toContain("A's estates");
  });

  it("restores A's copy when the person switches back", async () => {
    const { storage, forCompany, queryClient, mount, restore } = setup();
    const a = forCompany(1);
    const done2 = restore();
    const view = render(mount(a));
    await act(() => done2); // the restore, then the effect that subscribes
    queryClient.setQueryData(["estates"], "A's estates");
    await vi.waitFor(() => expect(storage.map.get(a.key)).toContain("A's estates"), WAIT);
    await a.leave(queryClient);
    const b = forCompany(2);
    const done3 = restore();
    view.rerender(mount(b));
    await act(() => done3); // the restore, then the effect that subscribes
    await b.leave(queryClient);
    view.rerender(mount(a)); // the same object again: its restore re-arms it
    await vi.waitFor(() => expect(queryClient.getQueryData(["estates"])).toBe("A's estates"), WAIT);
    queryClient.setQueryData(["estates"], "A's edit");
    await vi.waitFor(() => expect(storage.map.get(a.key)).toContain("A's edit"), WAIT);
  });

  it("clear leaves no late write behind: the key stays deleted", async () => {
    const { storage, forCompany, queryClient, mount, restore } = setup();
    const a = forCompany(1);
    const done4 = restore();
    render(mount(a));
    await act(() => done4); // the restore, then the effect that subscribes
    queryClient.setQueryData(["estates"], "A's estates");
    await vi.waitFor(() => expect(storage.map.has(a.key)).toBe(true), WAIT);
    await a.clear(queryClient);
    await sleep(80);
    expect(storage.map.has(a.key)).toBe(false);
  });
});
