import { QueryClient } from "@tanstack/react-query";
import { persistQueryClientRestore, persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SCRUB_FIELDS, createQueryPersistence } from "../query-persistence";
import type { QueryPersistenceOptions } from "../query-persistence";

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

function setup(over: Partial<QueryPersistenceOptions> = {}) {
  const storage = memoryStorage();
  const persistence = createQueryPersistence({
    app: "kastlan",
    user: 7,
    buster: "1.0.0",
    maxAge: DAY,
    storage,
    throttleTime: 0,
    onUnsafe: () => {},
    ...over,
  });
  return { storage, persistence };
}

const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: DAY } } });

/** Save through the real persistQueryClientSave, then wait for the throttled write. */
async function save(persistence: ReturnType<typeof setup>["persistence"], queryClient: QueryClient, storage: ReturnType<typeof memoryStorage>) {
  const { persister, buster, dehydrateOptions } = persistence.persistOptions;
  await persistQueryClientSave({ queryClient, persister, buster, dehydrateOptions });
  await vi.waitFor(() => expect(storage.map.has(persistence.key)).toBe(true));
  return JSON.parse(storage.map.get(persistence.key)!) as {
    buster: string;
    clientState: { queries: Array<{ queryKey: unknown[]; state: { data: unknown } }> };
  };
}

const query = (queryKey: unknown[], data: unknown, status = "success") => ({ queryKey, state: { status, data } });

describe("createQueryPersistence — the key", () => {
  it("is one per account, and per company where there is one", () => {
    expect(setup().persistence.key).toBe("kastlan-query-cache-7");
    expect(setup({ company: 3 }).persistence.key).toBe("kastlan-query-cache-7-3");
    expect(setup({ company: null }).persistence.key).toBe("kastlan-query-cache-7");
    expect(setup({ app: "keksdose", user: "u-1" }).persistence.key).toBe("keksdose-query-cache-u-1");
  });

  it("hands PersistQueryClientProvider the buster and maxAge", () => {
    const { persistOptions } = setup({ buster: "2.3.4", maxAge: 5 }).persistence;
    expect(persistOptions.buster).toBe("2.3.4");
    expect(persistOptions.maxAge).toBe(5);
  });
});

describe("createQueryPersistence — what is written", () => {
  it("keeps denied roots and the app's own rule out; only successes go", () => {
    const shouldPersistKey = (key: readonly unknown[]) => String(key[1]) !== "admin";
    const { persistence } = setup({ denyRoots: ["billing", "admin"], shouldPersistKey });
    const ok = persistence.persistOptions.dehydrateOptions!.shouldDehydrateQuery!;
    const call = (q: ReturnType<typeof query>) => ok(q as never);
    expect(call(query(["estates", 1], { name: "A" }))).toBe(true);
    expect(call(query(["billing", "plan"], { plan: "pro" }))).toBe(false);
    expect(call(query(["admin"], []))).toBe(false);
    expect(call(query(["support", "admin", 3], []))).toBe(false);
    expect(call(query(["support", "mine"], []))).toBe(true);
    expect(call(query(["estates"], undefined, "pending"))).toBe(false);
  });

  it("skips data that is not plain JSON and says so through onUnsafe", () => {
    const onUnsafe = vi.fn();
    const { persistence } = setup({ onUnsafe });
    const ok = persistence.persistOptions.dehydrateOptions!.shouldDehydrateQuery!;
    expect(ok(query(["fx"], new Map()) as never)).toBe(false);
    expect(ok(query(["day"], { at: new Date() }) as never)).toBe(false);
    expect(ok(query(["n"], { v: Number.NaN }) as never)).toBe(false);
    expect(onUnsafe).toHaveBeenCalledTimes(3);
    expect(onUnsafe).toHaveBeenCalledWith(["fx"], expect.any(Map));
    // An undefined PROPERTY survives JSON (the key goes, reading it still gives undefined).
    expect(ok(query(["ok"], { a: 1, b: undefined }) as never)).toBe(true);
    expect(onUnsafe).toHaveBeenCalledTimes(3);
  });

  it("warns on the console by default", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { persistence } = setup({ onUnsafe: undefined });
    persistence.persistOptions.dehydrateOptions!.shouldDehydrateQuery!(query(["fx"], new Set()) as never);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('["fx"]'));
    error.mockRestore();
  });

  it("scrubs IBAN, QR-IBAN and signature_* at any depth, keeps the rest, and leaves memory alone", async () => {
    expect(DEFAULT_SCRUB_FIELDS).toEqual(["iban", "qr_iban", "default_qr_iban", /^signature_/]);
    const { persistence, storage } = setup();
    const queryClient = client();
    const contact = {
      name: "Ada",
      iban: "CH93 0076 2011 6238 5295 7",
      bank_accounts: [{ iban: "CH44 3199 9123 0008 8901 2", bank: "PostFinance" }],
      property: { qr_iban: "CH44 3000 0000 0000 0000 0", default_qr_iban: "CH00", street: "Hauptgasse 1" },
      protocol: { signature_tenant: "data:image/png;base64,AAAA", signature_count: 2, signed: true },
    };
    queryClient.setQueryData(["contacts", 1], contact);
    const saved = await save(persistence, queryClient, storage);
    expect(saved.clientState.queries[0].state.data).toEqual({
      name: "Ada",
      bank_accounts: [{ bank: "PostFinance" }],
      property: { street: "Hauptgasse 1" },
      protocol: { signed: true },
    });
    expect(storage.map.get(persistence.key)).not.toContain("CH93");
    expect(queryClient.getQueryData(["contacts", 1])).toEqual(contact);
  });

  it("takes the app's own scrub list in place of the default", async () => {
    const { persistence, storage } = setup({ scrubFields: [...DEFAULT_SCRUB_FIELDS, "pin"] });
    const queryClient = client();
    queryClient.setQueryData(["me"], { pin: "1234", iban: "CH93", name: "Ada" });
    const saved = await save(persistence, queryClient, storage);
    expect(saved.clientState.queries[0].state.data).toEqual({ name: "Ada" });
  });
});

describe("createQueryPersistence — what is restored", () => {
  const blob = (queries: unknown[], mutations: unknown = [{ mutationKey: ["save"], state: { isPaused: true } }]) =>
    JSON.stringify({ timestamp: Date.now(), buster: "1.0.0", clientState: { queries, mutations } });

  it("drops a query an older build wrote under a key now denied, or with unsafe data; keeps paused mutations", async () => {
    const { persistence, storage } = setup({ denyRoots: ["reports"] });
    storage.map.set(
      persistence.key,
      blob([
        { queryKey: ["reports", "q1"], state: { data: { total: 1 } } },
        { queryKey: ["estates"], state: { data: [{ id: 1 }] } },
        { queryKey: ["gone"], state: {} },
        { queryKey: "not-an-array", state: { data: 1 } },
        null,
      ]),
    );
    const restored = await persistence.persistOptions.persister.restoreClient();
    expect(restored!.clientState.queries.map((q) => q.queryKey)).toEqual([["estates"]]);
    expect(restored!.clientState.mutations).toEqual([{ mutationKey: ["save"], state: { isPaused: true } }]);
  });

  it("scrubs on the way in too, for what an older build wrote", async () => {
    const { persistence, storage } = setup();
    storage.map.set(persistence.key, blob([{ queryKey: ["contacts"], state: { data: { iban: "CH93", name: "Ada" } } }], "x"));
    const restored = await persistence.persistOptions.persister.restoreClient();
    expect(restored!.clientState.queries[0].state.data).toEqual({ name: "Ada" });
    expect(restored!.clientState.mutations).toEqual([]);
  });

  it("turns an unreadable blob into an unusable one (timestamp 0) instead of throwing", async () => {
    for (const raw of ["{not json", "null", JSON.stringify({ timestamp: "x" }), JSON.stringify({ timestamp: 1, buster: "" })]) {
      const { persistence, storage } = setup();
      storage.map.set(persistence.key, raw);
      const restored = await persistence.persistOptions.persister.restoreClient();
      expect(restored!.timestamp).toBe(0);
    }
  });

  it("restores into a QueryClient under the same buster within maxAge", async () => {
    const { persistence, storage } = setup();
    storage.map.set(persistence.key, blob([{ queryKey: ["estates"], queryHash: '["estates"]', state: { data: [1], status: "success", dataUpdatedAt: Date.now() } }]));
    const queryClient = client();
    const { persister, buster, maxAge } = persistence.persistOptions;
    await persistQueryClientRestore({ queryClient, persister, buster, maxAge });
    expect(queryClient.getQueryData(["estates"])).toEqual([1]);
  });

  it("discards the cache when the buster moved, or it is older than maxAge", async () => {
    const stale = [
      JSON.stringify({ timestamp: Date.now(), buster: "0.9.0", clientState: { queries: [], mutations: [] } }),
      JSON.stringify({ timestamp: Date.now() - 2 * DAY, buster: "1.0.0", clientState: { queries: [], mutations: [] } }),
    ];
    for (const raw of stale) {
      const { persistence, storage } = setup();
      storage.map.set(persistence.key, raw);
      const { persister, buster, maxAge } = persistence.persistOptions;
      await persistQueryClientRestore({ queryClient: client(), persister, buster, maxAge });
      expect(storage.map.has(persistence.key)).toBe(false);
    }
  });
});

describe("createQueryPersistence — clear and removeStale", () => {
  it("clear empties the in-memory cache and deletes the persisted copy", async () => {
    const { persistence, storage } = setup();
    const queryClient = client();
    queryClient.setQueryData(["estates"], [1]);
    await save(persistence, queryClient, storage);
    await persistence.clear(queryClient);
    expect(queryClient.getQueryData(["estates"])).toBeUndefined();
    expect(storage.map.has(persistence.key)).toBe(false);
  });

  it("clear never throws", async () => {
    const { persistence } = setup();
    const broken = { clear: () => { throw new Error("boom"); } } as unknown as QueryClient;
    await expect(persistence.clear(broken)).resolves.toBeUndefined();
  });

  it("removeStale drops this app's other caches older than maxAge; fresh ones and other apps' stay", async () => {
    const now = Date.now();
    const at = (timestamp: number) => JSON.stringify({ timestamp, buster: "1.0.0", clientState: { queries: [], mutations: [] } });
    const storage = memoryStorage({
      "kastlan-query-cache-7": at(now - 3 * DAY), // the current key: the persister's own business
      "kastlan-query-cache-8-1": at(now - 2 * DAY), // another account: stale
      "kastlan-query-cache-7-2": at(now - 1000), // another company: fresh
      "kastlan-query-cache-9": "{broken", // unreadable: stale
      "keksdose-query-cache-7": at(now - 9 * DAY), // another app
      "kastlan-handover-7-1": "rows", // not a query cache
    });
    const persistence = createQueryPersistence({ app: "kastlan", user: 7, buster: "1.0.0", maxAge: DAY, storage });
    await persistence.removeStale();
    expect([...storage.map.keys()].sort()).toEqual([
      "kastlan-handover-7-1",
      "kastlan-query-cache-7",
      "kastlan-query-cache-7-2",
      "keksdose-query-cache-7",
    ]);
  });

  it("removeStale never throws when the store cannot list its keys", async () => {
    const storage = { ...memoryStorage(), keys: async () => Promise.reject(new Error("blocked")) };
    const persistence = createQueryPersistence({ app: "kastlan", user: 7, buster: "1", maxAge: DAY, storage });
    await expect(persistence.removeStale()).resolves.toBeUndefined();
  });
});
