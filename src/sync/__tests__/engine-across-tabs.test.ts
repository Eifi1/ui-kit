import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSyncDb, type SyncDb } from "../db";
import {
  createSyncEngine,
  type SyncEngine,
  type SyncEngineOptions,
  type SyncRoundResult,
  type SyncStepContext,
} from "../engine";
import { drainTasks } from "../../test/tasks";
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

/** The browser's Web Locks for one origin, as far as the engine uses them: exclusive locks
 *  granted first come first served, `ifAvailable` and `signal`. As the spec has it (Web Locks
 *  §2.5 "grantable"), a request is not granted while the lock is held OR another request for
 *  it is queued, `ifAvailable` included; an aborted `signal` takes a request out of the queue
 *  and rejects it (§4.3). 0.52 code review (src/sync/engine.ts): the first fake checked only
 *  `held`. */
function fakeLocks() {
  const held = new Set<string>();
  const queues = new Map<string, (() => void)[]>();
  const queue = (name: string) => queues.get(name) ?? [];
  const release = (name: string) => {
    const [next, ...rest] = queue(name);
    queues.set(name, rest);
    if (next) next();
    else held.delete(name);
  };
  async function request(name: string, ...rest: unknown[]): Promise<unknown> {
    const callback = rest.at(-1) as (lock: Lock | null) => unknown;
    const options = (rest.length > 1 ? rest[0] : {}) as LockOptions;
    if (options.signal?.aborted) throw options.signal.reason;
    if (held.has(name) || queue(name).length > 0) {
      if (options.ifAvailable) return callback(null);
      await new Promise<void>((resolve, reject) => {
        const grant = () => {
          options.signal?.removeEventListener("abort", abort);
          resolve();
        };
        const abort = () => {
          queues.set(
            name,
            queue(name).filter((g) => g !== grant),
          );
          reject(options.signal!.reason);
        };
        options.signal?.addEventListener("abort", abort, { once: true });
        queues.set(name, [...queue(name), grant]);
      });
    } else {
      held.add(name);
    }
    try {
      return await callback({ name, mode: "exclusive" } as Lock);
    } finally {
      release(name);
    }
  }
  const manager = { request } as unknown as LockManager;
  return Object.assign(manager, {
    /** Whether the lock `name` is held, and how many requests wait for it. */
    state: (name: string) => ({ held: held.has(name), queued: queue(name).length }),
  });
}

let locks = fakeLocks();

function installLocks(manager: unknown) {
  Object.defineProperty(navigator, "locks", { value: manager, configurable: true });
}

/** BroadcastChannel in the test's hand: a post is kept, and reaches the channels of its name
 *  still open only on `deliver()` — the moment another tab's message lands, which a browser
 *  does not promise to be at once. */
function heldChannels() {
  const listening = new Set<{ name: string; onmessage: ((event: MessageEvent<unknown>) => void) | null }>();
  const posts: { name: string; data: unknown }[] = [];
  class Held {
    onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
    constructor(readonly name: string) {
      listening.add(this);
    }
    postMessage(data: unknown) {
      posts.push({ name: this.name, data });
    }
    close() {
      listening.delete(this);
    }
  }
  vi.stubGlobal("BroadcastChannel", Held);
  return {
    deliver() {
      for (const { name, data } of posts.splice(0)) {
        for (const channel of [...listening]) {
          if (channel.name === name) channel.onmessage?.({ data } as MessageEvent<unknown>);
        }
      }
    },
  };
}

/** The axios-like error of a refused request. */
const refusedWith = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: {} },
  });

let n = 0;
const open: { db: SyncDb; engine: SyncEngine }[] = [];

beforeEach(() => {
  locks = fakeLocks();
  installLocks(locks);
});

afterEach(async () => {
  vi.useRealTimers();
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
/** The Web Lock a database's rounds take. */
const lockOf = (name: string) => `eifi1-sync:${name}`;

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
  it("syncNow() during another tab's round waits its turn, then sends this tab's changes, never that round's", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name);
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));

    // 0.52 code review (src/sync/engine.ts): B's "Sync now" (kastlan's sign-out dialog)
    // answered `paused` at once, and the dialog closed as if it had synced.
    await b.engine.write("handover", "protocols", "p2", "upsert", { notes: "b" });
    const roundB = b.engine.syncNow();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(1));
    expect(b.transport.requests).toHaveLength(0);

    release();
    expect(await roundA).toMatchObject({ outcome: "synced" });
    expect(await roundB).toMatchObject({ outcome: "synced" });
    expect(b.transport.requests.map((r) => r.changes.map((c) => c.id))).toEqual([["p2"]]);
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
    const roundB = b.engine.syncNow();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(1));
    await b.engine.write("handover", "protocols", "p1", "upsert", { notes: "b's edit" });
    release();
    await roundA;
    expect(await roundB).toMatchObject({ outcome: "offline" });

    expect((await a.db.outbox.toArray()).map((c) => [c.status, c.data])).toEqual([["pending", { notes: "b's edit" }]]);
  });

  it("a started engine's round waits for the other tab's, then sends what was written meanwhile", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name, { soonMs: 0 });
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));

    b.engine.start();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(1));
    await b.engine.write("handover", "protocols", "p2", "upsert", { notes: "b" });
    release();
    await roundA;

    await vi.waitFor(async () => expect(await b.db.outbox.count()).toBe(0));
    expect(b.transport.requests[0].changes.map((c) => c.id)).toEqual(["p2"]);
    expect(a.transport.requests.map((r) => r.changes.map((c) => c.id))).toEqual([["p1"]]);
  });

  it("a started engine stopped while it waits leaves the queue at once, and its round is dropped", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name);
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));
    b.engine.start();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(1));

    b.engine.stop(); // a company switch in tab B
    expect(locks.state(lockOf(name)).queued).toBe(0);
    release();
    await roundA;
    // The decision point: a round of B's own, after the dropped one — the only one sent.
    expect(await b.engine.syncNow()).toMatchObject({ outcome: "synced" });
    expect(b.transport.requests).toHaveLength(1);
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

describe("a round waits its turn for the lock (0.52 code review, src/sync/engine.ts)", () => {
  it("two tabs waiting behind a third's round each run theirs once, in turn", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    // A round asks `paused()` as it begins: one call per round begun.
    const begunB = vi.fn(() => false);
    const begunC = vi.fn(() => false);
    const b = tab(await otherTab(), name, { paused: begunB });
    const c = tab(await otherTab(), name, { paused: begunC });
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));

    b.engine.start();
    c.engine.start();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(2));
    release();
    await roundA;

    await vi.waitFor(() => {
      expect(b.transport.requests).toHaveLength(1);
      expect(c.transport.requests).toHaveLength(1);
      expect(locks.state(lockOf(name))).toEqual({ held: false, queued: 0 });
    });
    expect(await b.engine.syncNow()).toMatchObject({ outcome: "synced" });
    expect(await c.engine.syncNow()).toMatchObject({ outcome: "synced" });
    // Each start's round began once, plus the one syncNow() above: no round bounced off
    // the other's wait.
    expect([begunB.mock.calls.length, begunC.mock.calls.length]).toEqual([2, 2]);
  });

  it("retryBlocked() during another tab's round sends the blocked changes once that round ends", async () => {
    const name = fresh();
    const a = tab(createSyncEngine, name);
    let countsHeld: Promise<void> | null = null;
    const b = tab(await otherTab(), name, {
      steps: [
        {
          name: "photos",
          run: async () => ({}),
          // Holds this tab's flight open after its round, while the test says so.
          counts: async () => {
            await countsHeld;
            return {};
          },
        },
      ],
    });
    await b.engine.write("handover", "defects", "d1", "upsert", { description: "x" });
    b.transport.answer({
      server_knowledge: 1,
      changes: [],
      refused: { code: "demo_read_only", detail: "Demo", change_ids: ["d1"] },
    });
    expect(await b.engine.syncNow()).toMatchObject({ blocked: 1 });
    b.engine.start();
    await b.engine.syncNow();
    const before = b.transport.requests.length;

    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const release = hold(a.transport);
    const roundA = a.engine.syncNow();
    await vi.waitFor(() => expect(a.transport.requests).toHaveLength(1));
    let releaseCounts!: () => void;
    countsHeld = new Promise<void>((resolve) => (releaseCounts = resolve));
    const retried = b.engine.retryBlocked();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(1));
    release();
    await roundA;
    releaseCounts();
    await retried;

    await vi.waitFor(() =>
      expect(b.transport.requests.slice(before).some((r) => r.changes.some((c) => c.id === "d1"))).toBe(true),
    );
  });
});

describe("forget() across tabs, decided by the copy's epoch (0.52 code review, src/sync/engine.ts)", () => {
  it("its own forget() re-arms the engine though another tab's, committed first, is heard while its own runs", async () => {
    // kastlan's sign-out cascade: tab A signs out (its forget() commits and posts), tab B's
    // storage listener runs B's forget() — and A's epoch lands in B while B's clear waits.
    const channels = heldChannels();
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name);
    b.engine.start();
    await b.engine.syncNow();

    await a.engine.forget({ keepQueue: true });
    const forgetB = b.engine.forget({ keepQueue: true });
    channels.deliver();
    await forgetB;

    b.transport.answer(serverRow);
    expect(await b.engine.syncNow()).toMatchObject({ outcome: "synced" });
    expect(await b.db.rows.count()).toBe(1);
  });

  it("a refusal answered after another tab's forget() marks nothing in the kept queue", async () => {
    heldChannels(); // the epoch has not reached tab B yet
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name, { backoffMs: [3_600_000] });
    b.engine.start();
    await b.engine.syncNow();
    await b.engine.write("handover", "protocols", "p1", "upsert", { notes: "b" });
    b.transport.answer(async () => {
      await a.engine.forget({ keepQueue: true });
      throw refusedWith(403);
    });

    expect(await b.engine.syncNow()).toMatchObject({ outcome: "dropped" });
    // Not `rejected` (never sent again) for a session that has ended: it waits for its owner.
    expect((await a.db.outbox.toArray()).map((c) => c.status)).toEqual(["pending"]);
  });

  it("a round sends nothing more once another tab's forget() has landed mid-round", async () => {
    heldChannels(); // the epoch has not reached tab B yet
    const name = fresh();
    const a = tab(createSyncEngine, name);
    let passes = 0;
    const b = tab(await otherTab(), name, {
      steps: [
        {
          name: "photos",
          async run() {
            passes += 1;
            if (passes > 1) return {};
            // An edit in tab B during its round, then tab A's sign-out; the step asks for the
            // second pass (kastlan's, after its photos).
            await b.engine.write("handover", "protocols", "p2", "upsert", { notes: "b" });
            await a.engine.forget({ keepQueue: true });
            return { changed: true };
          },
        },
      ],
    });

    expect(await b.engine.syncNow()).toMatchObject({ outcome: "dropped" });
    // Before the fix the second pass posted the kept queue and pulled the scope from 0.
    expect(b.transport.requests.map((r) => [r.changes.map((c) => c.id), r.last_knowledge])).toEqual([[[], 0]]);
    expect((await a.db.outbox.toArray()).map((c) => [c.id, c.status])).toEqual([["p2", "pending"]]);
  });

  it("an engine another tab's forget() stopped shows no error and no retry of its last round", async () => {
    const channels = heldChannels();
    const name = fresh();
    const a = tab(createSyncEngine, name);
    const b = tab(await otherTab(), name, { backoffMs: [3_600_000] });
    b.engine.start();
    await b.engine.syncNow();
    b.transport.failStatus(500);
    expect(await b.engine.syncNow()).toMatchObject({ outcome: "error" });
    expect(b.engine.getState()).toMatchObject({ phase: "error", nextRetryAt: expect.any(Number) });

    await a.engine.forget({ keepQueue: true });
    channels.deliver();

    expect(b.engine.getState()).toMatchObject({ phase: "idle", nextRetryAt: null, lastSyncedAt: null });
  });

  it("its own forget() ends the session's state too: no error, no retry", async () => {
    const a = tab(createSyncEngine, fresh(), { backoffMs: [3_600_000] });
    a.engine.start();
    await a.engine.syncNow();
    a.transport.failStatus(500);
    expect(await a.engine.syncNow()).toMatchObject({ outcome: "error" });

    await a.engine.forget({ keepQueue: true });

    expect(a.engine.getState()).toMatchObject({ phase: "idle", nextRetryAt: null, lastSyncedAt: null });
  });
});

describe("a round's deadline, from the moment it holds the lock (0.52 code review, finding 3)", () => {
  // Fake timeouts only: fake-indexeddb runs on `setImmediate`, which stays real.
  const fakeClock = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });

  /** The transport's next request never settles, whatever its signal says. */
  function stuck(transport: FakeSyncTransport) {
    let out!: () => void;
    const sent = new Promise<void>((resolve) => (out = resolve));
    let signal: AbortSignal | undefined;
    const send = transport.send;
    transport.send = (body, s) => {
      signal = s;
      return send(body, s);
    };
    transport.answer(() => {
      out();
      return new Promise<SyncResponseBody>(() => undefined);
    });
    return { sent, signal: () => signal };
  }

  it("cuts a round whose request never settles: the lock goes to the next tab's round", async () => {
    fakeClock();
    const name = fresh();
    const a = tab(createSyncEngine, name, { roundTimeoutMs: 60_000, backoffMs: [3_600_000] });
    const b = tab(await otherTab(), name);
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    const request = stuck(a.transport);
    let endA: SyncRoundResult | undefined;
    void a.engine.syncNow().then((r) => (endA = r));
    await request.sent;
    await b.engine.write("handover", "protocols", "p2", "upsert", { notes: "b" });
    const roundB = b.engine.syncNow();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(1));

    await vi.advanceTimersByTimeAsync(60_000);
    await vi.waitFor(() => expect(endA?.outcome).toBe("error"));
    // Not offline: the app can tell the backstop from a lost connection.
    expect((endA!.error as DOMException).name).toBe("TimeoutError");
    expect(request.signal()?.aborted).toBe(true);
    expect(a.engine.getState().phase).toBe("error");

    // B's round ran: it took A's `sending` change back, as a closed tab's, and sent it.
    expect(await roundB).toMatchObject({ outcome: "synced" });
    expect(b.transport.requests.map((r) => r.changes.map((c) => c.id))).toEqual([["p1", "p2"]]);
    expect(await b.db.outbox.count()).toBe(0);
  });

  it("lays nothing back when the cut request fails late: an edit is not merged into the next round's change", async () => {
    fakeClock();
    const name = fresh();
    const a = tab(createSyncEngine, name, { roundTimeoutMs: 60_000, backoffMs: [3_600_000] });
    const b = tab(await otherTab(), name);
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    let fail!: (err: unknown) => void;
    let out!: () => void;
    const sent = new Promise<void>((resolve) => (out = resolve));
    a.transport.answer(() => {
      out();
      return new Promise<SyncResponseBody>((_, reject) => (fail = reject));
    });
    void a.engine.syncNow();
    await sent;
    const releaseB = hold(b.transport);
    const roundB = b.engine.syncNow();
    await vi.waitFor(() => expect(locks.state(lockOf(name)).queued).toBe(1));
    await vi.advanceTimersByTimeAsync(60_000);
    vi.useRealTimers();
    await vi.waitFor(() => expect(b.transport.requests).toHaveLength(1));

    // A's request fails only now, while B's round has p1 out: a client that ignored the abort.
    fail(Object.assign(new Error("Network Error"), { isAxiosError: true }));
    await drainTasks();
    expect((await a.db.outbox.toArray()).map((c) => [c.id, c.status])).toEqual([["p1", "sending"]]);
    // Laid back `pending`, p1 would take this edit, and B's answer would delete both.
    await a.engine.write("handover", "protocols", "p1", "upsert", { notes: "a's edit" });
    releaseB();
    expect(await roundB).toMatchObject({ outcome: "synced" });
    expect((await a.db.outbox.toArray()).map((c) => [c.status, c.data])).toEqual([["pending", { notes: "a's edit" }]]);
  });

  it("cuts a step that never settles; its late write is dropped", async () => {
    fakeClock();
    let runs = 0;
    let ctx: SyncStepContext | undefined;
    let finish!: () => void;
    const held = new Promise<void>((resolve) => (finish = resolve));
    const name = fresh();
    const a = tab(createSyncEngine, name, {
      roundTimeoutMs: 60_000,
      backoffMs: [3_600_000],
      steps: [
        {
          name: "photos",
          async run(stepDb, context) {
            runs += 1;
            if (runs > 1) return {};
            ctx = context;
            await held;
            if (context.isCurrent()) await stepDb.table("photos").put({ id: "uploaded late" });
            return {};
          },
        },
      ],
    });
    let end: SyncRoundResult | undefined;
    void a.engine.syncNow().then((r) => (end = r));
    await vi.waitFor(() => expect(ctx).toBeDefined());

    await vi.advanceTimersByTimeAsync(60_000);
    await vi.waitFor(() => expect(end?.outcome).toBe("error"));
    expect(ctx!.isCurrent()).toBe(false);
    expect(ctx!.signal.aborted).toBe(true);
    expect(locks.state(lockOf(name))).toEqual({ held: false, queued: 0 });

    finish();
    expect(await a.engine.syncNow()).toMatchObject({ outcome: "synced" });
    expect(await a.db.table("photos").count()).toBe(0);
  });

  it("is 10 minutes by default", async () => {
    fakeClock();
    const a = tab(createSyncEngine, fresh(), { backoffMs: [3_600_000] });
    const request = stuck(a.transport);
    let end: SyncRoundResult | undefined;
    void a.engine.syncNow().then((r) => (end = r));
    await request.sent;

    await vi.advanceTimersByTimeAsync(10 * 60_000 - 1);
    expect(end).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => expect(end?.outcome).toBe("error"));
  });

  it.each([0, Infinity])("sets no deadline with roundTimeoutMs %s", async (off) => {
    fakeClock();
    const a = tab(createSyncEngine, fresh(), { roundTimeoutMs: off, backoffMs: [3_600_000] });
    const request = stuck(a.transport);
    let end: SyncRoundResult | undefined;
    void a.engine.syncNow().then((r) => (end = r));
    await request.sent;

    await vi.advanceTimersByTimeAsync(24 * 60 * 60_000);
    expect(end).toBeUndefined();
    expect(request.signal()?.aborted).toBe(false);
  });
});
