import { describe, expect, it } from "vitest";
import { createQueryPersistence, removeStaleQueryCopies } from "../query-persistence";

/** 0.46 (kastlan K1, K2): paused mutations kept off the disk; the stale sweep without a persistence. */

const DAY = 24 * 60 * 60 * 1000;

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
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

const paused = (variables: unknown) => ({ state: { isPaused: true, variables } });

describe("createQueryPersistence — persistMutations (K1)", () => {
  it("default true: a paused mutation is written (keksdose)", () => {
    const p = createQueryPersistence({ app: "kk", user: 1, buster: "1", maxAge: DAY, storage: memoryStorage() });
    expect(p.persistOptions.dehydrateOptions!.shouldDehydrateMutation!(paused({ name: "Ada" }) as never)).toBe(true);
  });

  it("false: no mutation is written, and none an older build wrote is restored (kastlan)", async () => {
    const storage = memoryStorage();
    const p = createQueryPersistence({
      app: "kastlan",
      user: 7,
      buster: "1",
      maxAge: DAY,
      storage,
      persistMutations: false,
    });
    expect(p.persistOptions.dehydrateOptions!.shouldDehydrateMutation!(paused({ name: "Ada" }) as never)).toBe(false);
    // The query side is unchanged.
    const query = { queryKey: ["estates"], state: { status: "success", data: [1] } };
    expect(p.persistOptions.dehydrateOptions!.shouldDehydrateQuery!(query as never)).toBe(true);
    storage.map.set(
      p.key,
      JSON.stringify({
        timestamp: Date.now(),
        buster: "1",
        clientState: { queries: [], mutations: [{ mutationKey: ["save"], state: { isPaused: true, variables: {} } }] },
      }),
    );
    const restored = await p.persistOptions.persister.restoreClient();
    expect(restored!.clientState.mutations).toEqual([]);
  });
});

describe("removeStaleQueryCopies (K2)", () => {
  const at = (timestamp: number) => JSON.stringify({ timestamp, buster: "1", clientState: { queries: [], mutations: [] } });

  it("with no persistence (the sign-in page): drops every copy of this app older than maxAge", async () => {
    const now = Date.now();
    const storage = memoryStorage({
      "kastlan-query-cache-7": at(now - 3 * DAY), // the account whose session ended unknown: stale
      "kastlan-query-cache-8-1": at(now - 1000), // fresh
      "kastlan-query-cache-9": "{broken", // unreadable: stale
      "keksdose-query-cache-7": at(now - 9 * DAY), // another app
      "kastlan-handover-7-1": "rows", // not a query cache
    });
    await removeStaleQueryCopies("kastlan", DAY, { storage });
    expect([...storage.map.keys()].sort()).toEqual([
      "kastlan-handover-7-1",
      "kastlan-query-cache-8-1",
      "keksdose-query-cache-7",
    ]);
  });

  it("keep spares one key whatever its age; never throws", async () => {
    const storage = memoryStorage({ "kastlan-query-cache-7": at(0), "kastlan-query-cache-8": at(0) });
    await removeStaleQueryCopies("kastlan", DAY, { storage, keep: "kastlan-query-cache-7" });
    expect([...storage.map.keys()]).toEqual(["kastlan-query-cache-7"]);
    const broken = { ...memoryStorage(), keys: async () => Promise.reject(new Error("blocked")) };
    await expect(removeStaleQueryCopies("kastlan", DAY, { storage: broken })).resolves.toBeUndefined();
  });
});
