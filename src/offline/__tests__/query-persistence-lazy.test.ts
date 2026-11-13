import { QueryClient } from "@tanstack/react-query";
import { persistQueryClientRestore, persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { describe, expect, it, vi } from "vitest";

/**
 * 0.63: `@eifi1/ui-kit/offline` without `idb-keyval` and `@tanstack/query-async-storage-persister`.
 *
 * The entry imported both at module load (query-persistence.ts), and the package's exports
 * allow no deep import, so an app that took only `SharedComputerChoice` or
 * `useFeedbackCommentsQuery` from it had to install both. The persistence now imports them
 * when it first persists, restores or sweeps — the public API unchanged.
 *
 * Each mock counts its own evaluation: Vitest runs a `vi.mock` factory when the module is
 * first imported, so a count of 0 after importing the entry means the entry never asked.
 */
const loaded = vi.hoisted(() => ({ idb: 0, persister: 0 }));
const disk = vi.hoisted(() => new Map<string, unknown>());

vi.mock("idb-keyval", () => {
  loaded.idb += 1;
  return {
    get: async (key: string) => disk.get(key),
    set: async (key: string, value: unknown) => void disk.set(key, value),
    del: async (key: string) => void disk.delete(key),
    keys: async () => [...disk.keys()],
  };
});

vi.mock("@tanstack/query-async-storage-persister", async (importOriginal) => {
  loaded.persister += 1;
  return importOriginal();
});

const DAY = 24 * 60 * 60 * 1000;

describe("the offline entry's persistence peers load on first use (0.63)", () => {
  it("importing the entry, and creating a persistence, loads neither", async () => {
    const offline = await import("../../offline");
    expect(typeof offline.SharedComputerChoice).toBe("function");
    expect(typeof offline.useFeedbackCommentsQuery).toBe("function");
    offline.createQueryPersistence({ app: "lazy", user: 1, buster: "1", maxAge: DAY });
    expect(loaded).toEqual({ idb: 0, persister: 0 });
  });

  it("a save and a restore load them, and keep the cache in IndexedDB as before", async () => {
    const { createQueryPersistence } = await import("../../offline");
    const persistence = createQueryPersistence({ app: "lazy", user: 2, buster: "1", maxAge: DAY, throttleTime: 0 });
    const { persister, buster, dehydrateOptions } = persistence.persistOptions;
    const before = new QueryClient({ defaultOptions: { queries: { gcTime: DAY } } });
    before.setQueryData(["units"], [{ id: 1 }]);
    await persistQueryClientSave({ queryClient: before, persister, buster, dehydrateOptions });
    await vi.waitFor(() => expect(disk.has("lazy-query-cache-2")).toBe(true));
    expect(loaded).toEqual({ idb: 1, persister: 1 });

    const after = new QueryClient({ defaultOptions: { queries: { gcTime: DAY } } });
    await persistQueryClientRestore({ queryClient: after, persister, buster, maxAge: DAY });
    expect(after.getQueryData(["units"])).toEqual([{ id: 1 }]);

    await persistence.clear(after);
    expect(disk.has("lazy-query-cache-2")).toBe(false);
    // One import each, however often they are used.
    expect(loaded).toEqual({ idb: 1, persister: 1 });
  });

  it("the sweep reads IndexedDB through the same lazy store", async () => {
    const { removeStaleQueryCopies } = await import("../../offline");
    disk.set("lazy-query-cache-9", JSON.stringify({ timestamp: Date.now() - 2 * DAY, buster: "1", clientState: {} }));
    disk.set("lazy-query-cache-10", JSON.stringify({ timestamp: Date.now(), buster: "1", clientState: {} }));
    await removeStaleQueryCopies("lazy", DAY);
    expect(disk.has("lazy-query-cache-9")).toBe(false);
    expect(disk.has("lazy-query-cache-10")).toBe(true);
  });
});
