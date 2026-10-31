import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSyncDb, type SyncDb } from "../db";
import { createSyncEngine, type SyncEngine, type SyncEngineOptions, type SyncStepContext } from "../engine";
import { createFakeSyncTransport, type FakeSyncTransport } from "../testing";
import type { SyncRequestBody, SyncResponseBody } from "../wire";

/*
 * One engine per database across the tabs of a browser (docs/local-first-harmonization.md §2.3,
 * D15; refactor audit 2026-10-30, FLW-1). Each tab runs its own engine on the one IndexedDB
 * copy: a round runs under a Web Lock named after the database, so two tabs never take the
 * same queue, and `forget()` moves an epoch persisted with the clear, so a round of another
 * tab writes nothing into the wiped copy and that tab's engine runs no more.
 *
 * A second tab is the engine module loaded afresh (its own maps of the started engines and the
 * rounds in flight, which a tab does not share) on a connection of its own to the same database.
 */

/** The browser's Web Locks for one origin, as far as the engine uses them: exclusive locks,
 *  `ifAvailable`, and a queue that hands a released lock to the next request. */
function fakeLocks(): LockManager {
  const held = new Set<string>();
  const waiting = new Map<string, (() => void)[]>();
  const release = (name: string) => {
    const next = waiting.get(name)?.shift();
    if (next) next();
    else held.delete(name);
  };
  async function request(name: string, ...rest: unknown[]): Promise<unknown> {
    const callback = rest.at(-1) as (lock: Lock | null) => unknown;
    const options = (rest.length > 1 ? rest[0] : {}) as LockOptions;
    if (held.has(name)) {
      if (options.ifAvailable) return callback(null);
      await new Promise<void>((resolve) => waiting.set(name, [...(waiting.get(name) ?? []), resolve]));
    } else {
      held.add(name);
    }
    try {
      return await callback({ name, mode: "exclusive" } as Lock);
    } finally {
      release(name);
    }
  }
  return { request } as unknown as LockManager;
}

function installLocks(locks: unknown) {
  Object.defineProperty(navigator, "locks", { value: locks, configurable: true });
}

let n = 0;
const open: { db: SyncDb; engine: SyncEngine }[] = [];

beforeEach(() => installLocks(fakeLocks()));

afterEach(async () => {
  vi.unstubAllGlobals();
  delete (navigator as { locks?: unknown }).locks;
  const names = new Set<string>();
  for (const { db, engine } of open.splice(0)) {
    engine.stop();
    db.close();
    names.add(db.name);
  }
  for (const name of names) await Dexie.delete(name);
});

type Create = (options: SyncEngineOptions) => SyncEngine;

/** One tab's engine on the database `name`, over a connection of its own. */
function tab(create: Create, name: string, options: Partial<SyncEngineOptions> = {}) {
  const db = createSyncDb(name, { extraStores: { photos: "id" } });
  const transport = createFakeSyncTransport();
  const engine = create({
    db,
    scopes: () => ["handover"],
    send: (body, signal) => transport.send(body, signal),
    sharedComputer: () => false,
    pollMs: 3_600_000,
    ...options,
  });
  open.push({ db, engine });
  return { db, engine, transport };
}

/** The engine module as another tab loads it. */
async function otherTab(): Promise<Create> {
  vi.resetModules();
  return (await import("../engine")).createSyncEngine as Create;
}

const fresh = () => `sync-tabs-test-${(n += 1)}`;

/** The transport's next answer waits for `release()`. */
function hold(transport: FakeSyncTransport, answer?: (body: SyncRequestBody) => SyncResponseBody) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  transport.answer(async (body) => {
    await held;
    return answer ? answer(body) : { server_knowledge: 9, changes: body.changes.map((c) => ({ ...c, pk: 1 })) };
  });
  return release;
}

const serverRow: SyncResponseBody = {
  server_knowledge: 9,
  changes: [{ entity: "protocols", id: "of-the-server", op: "upsert", pk: 5, data: { notes: "server" } }],
};

describe("a round runs under a Web Lock per database (FLW-1)", () => {
  it("while another tab's round holds the queue, this tab's round is paused and never sends it again", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name);
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));

    expect(await b.engine.syncNow()).toMatchObject({ outcome: "paused" });
    expect(b.transport.requests).toHaveLength(0);

    release();
    expect(await roundA).toMatchObject({ outcome: "synced" });
    expect(await b.engine.syncNow()).toMatchObject({ outcome: "synced" });
    expect(b.transport.requests.map((r) => r.changes.map((c) => c.id))).toEqual([[]]);
    expect(await a.db.outbox.count()).toBe(0);
  });

  it("keeps an edit made in one tab while the other tab sends the row's change", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name);
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));

    // Before 0.52 tab B took A's change too, met no connection and laid it back as `pending`,
    // so the edit below merged into it — and A's answer then deleted it with A's change.
    b.transport.failOffline();
    await b.engine.syncNow();
    await b.engine.write("handover", "protocols", "p1", "upsert", { notes: "b's edit" });
    release();
    await roundA;

    expect((await a.db.outbox.toArray()).map((c) => [c.status, c.data])).toEqual([["pending", { notes: "b's edit" }]]);
  });

  it("runs a request made during the other tab's round once after it", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name, { soonMs: 0 });
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));

    b.engine.start();
    await b.engine.write("handover", "protocols", "p2", "upsert", { notes: "b" });
    release();
    await roundA;

    await vi.waitFor(() => expect(b.transport.requests.map((r) => r.changes.map((c) => c.id))).toEqual([["p2"]]), {
      timeout: 5000,
    });
    expect(a.transport.requests.map((r) => r.changes.map((c) => c.id))).toEqual([["p1"]]);
  });

  it("runs the round as before 0.52 when the lock manager refuses (an opaque origin)", async () => {
    installLocks({ request: () => Promise.reject(new DOMException("denied", "SecurityError")) });
    const a = tab(createSyncEngine, fresh());
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    expect(await a.engine.syncNow()).toMatchObject({ outcome: "synced" });
    expect(await a.db.outbox.count()).toBe(0);
  });
});

describe("forget() reaches every tab through the copy's epoch (FLW-1)", () => {
  it("drops the answer of another tab's round in flight: nothing is written into the wiped copy", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name);
    const release = hold(b.transport, () => serverRow);
    const roundB = b.engine.syncNow();
    await vi.waitFor(() => expect(b.transport.requests).toHaveLength(1));

    await a.engine.forget({ keepQueue: true });
    release();

    expect(await roundB).toMatchObject({ outcome: "dropped" });
    expect(await a.db.rows.count()).toBe(0);
    expect(await a.db.meta.get("lastKnowledge:handover")).toBeUndefined();
  });

  it("the other tab's engine pulls nothing back afterwards: its rounds are dropped", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name);
    b.transport.answer(serverRow);
    expect(await b.engine.syncNow()).toMatchObject({ outcome: "synced" });

    await a.engine.forget({ keepQueue: true });
    // Before 0.52 this round pulled the whole scope again from 0 into the wiped copy.
    b.transport.answer(serverRow);
    expect(await b.engine.syncNow()).toMatchObject({ outcome: "dropped" });

    expect(b.transport.requests).toHaveLength(1);
    expect(await a.db.rows.count()).toBe(0);
  });

  it("a started engine in the other tab hears it: its step in flight sees isCurrent() turn false", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    let ctx: SyncStepContext | undefined;
    let releaseStep!: () => void;
    const stepHeld = new Promise<void>((resolve) => (releaseStep = resolve));
    const b = tab(await otherTab(), name, {
      steps: [
        {
          name: "photos",
          async run(_db, context) {
            ctx = context;
            await stepHeld;
            return {};
          },
        },
      ],
    });
    b.engine.start();
    await vi.waitFor(() => expect(ctx).toBeDefined());
    expect(ctx!.isCurrent()).toBe(true);

    await a.engine.forget({ keepQueue: true });
    await vi.waitFor(() => expect(ctx!.isCurrent()).toBe(false));
    releaseStep();

    expect(await b.engine.syncNow()).toMatchObject({ outcome: "dropped" });
    expect(b.transport.requests).toHaveLength(1);
  });

  it("its own forget() keeps an engine running: the next round syncs", async () => {
    const a = tab(createSyncEngine, fresh());
    a.engine.start();
    await a.engine.syncNow();
    await a.engine.forget({ keepQueue: true });
    a.transport.answer(serverRow);
    expect(await a.engine.syncNow()).toMatchObject({ outcome: "synced" });
    expect(await a.db.rows.count()).toBe(1);
  });

  it("its own forget(), heard on its own channel too, keeps a started engine running", async () => {
    // The epoch goes out on a channel of its own (0.52 code review: one `postOnce` for the
    // engine and the query copy), so the engine's listening channel hears it as well.
    const Native = BroadcastChannel;
    const opened: BroadcastChannel[] = [];
    vi.stubGlobal(
      "BroadcastChannel",
      class extends Native {
        constructor(name: string) {
          super(name);
          opened.push(this);
        }
      },
    );
    const a = tab(createSyncEngine, fresh());
    a.engine.start();
    await a.engine.syncNow();
    const [own] = opened;
    // Added after the engine's `onmessage`, so it runs after it.
    const heard = new Promise<void>((resolve) => own.addEventListener("message", () => resolve(), { once: true }));

    await a.engine.forget({ keepQueue: true });
    await heard;

    a.transport.answer(serverRow);
    expect(await a.engine.syncNow()).toMatchObject({ outcome: "synced" });
  });

  it("is a new epoch in `meta` with every forget(), written with the clear", async () => {
    const a = tab(createSyncEngine, fresh());
    await a.db.meta.put({ key: "lastKnowledge:handover", value: 4 });
    await a.engine.forget({ keepQueue: true });
    const first = await a.db.meta.toArray();
    expect(first).toEqual([{ key: "epoch", value: expect.any(String) }]);
    await a.engine.forget({ keepQueue: false });
    const second = await a.db.meta.toArray();
    expect(second).toEqual([{ key: "epoch", value: expect.any(String) }]);
    expect(second[0].value).not.toBe(first[0].value);
  });
});
