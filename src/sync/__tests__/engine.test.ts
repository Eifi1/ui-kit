import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSyncDb, type SyncDb } from "../db";
import { createSyncEngine, releaseSyncEngine, syncEngineFor, type SyncEngine, type SyncEngineOptions, type SyncEngineState } from "../engine";
import { createFakeSyncTransport } from "../testing";
import type { SyncRequestBody, SyncResponseBody } from "../wire";

/*
 * The engine, ported from kastlan's parity suite (features/handover/offline/offline.test.ts)
 * and extended to the scopes, the paging, the generation and the backoff of §2.3.
 */

let n = 0;
const open: { db: SyncDb; engine?: SyncEngine }[] = [];

function setup(options: Partial<SyncEngineOptions> & { extraStores?: Record<string, string> } = {}) {
  n += 1;
  const { extraStores, ...rest } = options;
  const db = createSyncDb(`sync-engine-test-${n}`, { extraStores });
  const transport = createFakeSyncTransport();
  const engine = createSyncEngine({
    db,
    scopes: () => ["handover"],
    send: (body, signal) => transport.send(body, signal),
    sharedComputer: () => false,
    ...rest,
  });
  open.push({ db, engine });
  return { db, engine, transport };
}

afterEach(async () => {
  vi.useRealTimers();
  for (const { db, engine } of open.splice(0)) {
    engine?.stop();
    db.close();
    await Dexie.delete(db.name);
  }
});

/** Resolves once the engine's state satisfies `pred`. */
function until(engine: SyncEngine, pred: (s: SyncEngineState) => boolean): Promise<SyncEngineState> {
  return new Promise((resolve) => {
    if (pred(engine.getState())) return resolve(engine.getState());
    const off = engine.subscribe(() => {
      if (pred(engine.getState())) {
        off();
        resolve(engine.getState());
      }
    });
  });
}

const echoOf = (body: SyncRequestBody, knowledge: number, extra: Partial<SyncResponseBody> = {}): SyncResponseBody => ({
  server_knowledge: knowledge,
  changes: body.changes.map((c, i) => ({ ...c, pk: 100 + i })),
  ...extra,
});

describe("write: into the copy at once and into the queue (ka's repo.write)", () => {
  it("merges several edits before a round into the row's last pending upsert", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "protocols", "p1", "upsert", { notes: "first" });
    await engine.write("handover", "protocols", "p1", "upsert", { signature_tenant: "Anna" });
    const queued = await db.outbox.toArray();
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ scope: "handover", status: "pending", data: { notes: "first", signature_tenant: "Anna" } });
    expect((await db.rows.get(["protocols", "p1"]))?.data).toEqual({ notes: "first", signature_tenant: "Anna" });
    expect(transport.requests).toHaveLength(0);
  });

  it("starts a change of its own while the row's change is in the request, and keeps it over the pull", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "protocols", "p1", "upsert", { notes: "first" });
    transport.answer(async (body) => {
      await engine.write("handover", "protocols", "p1", "upsert", { notes: "during the request" });
      return echoOf(body, 5);
    });
    await engine.syncNow();
    expect((await db.rows.get(["protocols", "p1"]))?.data.notes).toBe("during the request");
    expect((await db.outbox.toArray()).map((c) => c.data)).toEqual([{ notes: "during the request" }]);
  });

  it("stamps each edit strictly after the row's stamp, even from a slow clock", async () => {
    const { db, engine } = setup();
    const ahead = new Date(Date.now() + 120_000).toISOString();
    await db.rows.put({ entity: "protocols", id: "p1", pk: 1, data: { updated_at: ahead } });
    await engine.write("handover", "protocols", "p1", "upsert", { notes: "x" });
    const [change] = await db.outbox.toArray();
    expect(Date.parse(change.updated_at)).toBe(Date.parse(ahead) + 1);
  });

  it("stamps an edit after the server's stamp, which the pull carries BESIDE the row's data (kastlan's wire)", async () => {
    const { db, engine, transport } = setup();
    const ahead = new Date(Date.now() + 1_000).toISOString();
    transport.answer({
      server_knowledge: 1,
      changes: [{ entity: "protocols", id: "p1", op: "upsert", pk: 1, data: { notes: "server" }, updated_at: ahead }],
    });
    await engine.syncNow();
    expect(await db.rows.get(["protocols", "p1"])).toMatchObject({ updated_at: ahead, data: { notes: "server" } });
    await engine.write("handover", "protocols", "p1", "upsert", { notes: "tablet" });
    const [change] = await db.outbox.toArray();
    expect(Date.parse(change.updated_at)).toBe(Date.parse(ahead) + 1);
    // An edit laid back over a later pull keeps the server's newer stamp.
    expect((await db.rows.get(["protocols", "p1"]))?.updated_at).toBe(ahead);
  });

  it("forgets the queue of a row deleted before it ever reached the server, a waiting change included", async () => {
    const { db, engine } = setup();
    await engine.write("handover", "defects", "d1", "upsert", { description: "Kratzer" });
    await db.outbox.toCollection().modify({ status: "waiting" });
    await engine.write("handover", "defects", "d1", "delete");
    expect(await db.outbox.count()).toBe(0);
    expect(await db.rows.count()).toBe(0);
  });

  it("queues the delete of a row the server has", async () => {
    const { db, engine } = setup();
    await db.rows.put({ entity: "defects", id: "d1", pk: 9, data: {} });
    await engine.write("handover", "defects", "d1", "delete");
    expect(await db.outbox.toArray()).toEqual([expect.objectContaining({ op: "delete", id: "d1", status: "pending" })]);
  });
});

describe("a round", () => {
  it("sends the queue, takes the server's rows and remembers the scope's cursor", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    transport.answer((body) => echoOf(body, 42));
    const round = await engine.syncNow();
    expect(round).toMatchObject({ outcome: "synced", waiting: 0, blocked: 0, rejected: 0 });
    expect(transport.requests[0]).toMatchObject({ scope: "handover", last_knowledge: 0, refusals: true });
    expect(transport.requests[0].changes[0]).toMatchObject({ entity: "protocols", id: "p1", op: "upsert", data: { notes: "a" } });
    expect(transport.requests[0].client_now).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(transport.requests[0]).not.toHaveProperty("paged");
    expect(await db.outbox.count()).toBe(0);
    expect((await db.rows.get(["protocols", "p1"]))?.pk).toBe(100);
    expect((await db.meta.get("lastKnowledge:handover"))?.value).toBe(42);
    expect(engine.getState()).toMatchObject({ phase: "idle", counts: { pending: 0 } });
    expect(engine.getState().lastSyncedAt).toMatch(/^\d{4}-/);
  });

  it("keeps a change refused with a hold code as waiting, and sends it again every round", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "defects", "d1", "upsert", { description: "x" });
    transport.answer((body) =>
      echoOf({ ...body, changes: [] }, 7, { refused: { code: "billing_read_only", detail: "Read-only for now", change_ids: ["d1"] } }),
    );
    expect(await engine.syncNow()).toMatchObject({ outcome: "synced", waiting: 1 });
    expect(await db.outbox.toArray()).toEqual([
      expect.objectContaining({ id: "d1", status: "waiting", code: "billing_read_only", reason: "Read-only for now" }),
    ]);
    expect(engine.getState().counts.waiting).toBe(1);
    expect((await db.rows.get(["defects", "d1"]))?.data.description).toBe("x"); // still shown
    await engine.syncNow();
    expect(transport.requests[1].changes.map((c) => c.id)).toEqual(["d1"]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("blocks a change refused with another code; sends it again only on retryBlocked", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "defects", "d1", "upsert", { description: "x" });
    transport.answer((body) => echoOf({ ...body, changes: [] }, 7, { refused: { code: "demo_read_only", detail: "Demo", change_ids: ["d1"] } }));
    expect(await engine.syncNow()).toMatchObject({ blocked: 1 });
    expect((await db.outbox.toArray())[0]).toMatchObject({ status: "blocked", code: "demo_read_only" });
    await engine.syncNow();
    expect(transport.requests[1].changes).toEqual([]);
    await engine.retryBlocked();
    expect(transport.requests[2].changes.map((c) => c.id)).toEqual(["d1"]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("sets a rejected change aside with its detail, never sends it again, and a new edit moves it", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "protocols", "p1", "upsert", { notes: "ok" });
    await engine.write("handover", "defects", "d1", "upsert", { description: "far too long", severity: "minor" });
    transport.answer((body) => ({
      server_knowledge: 4,
      changes: body.changes.filter((c) => c.id !== "d1").map((c) => ({ ...c, pk: 1 })),
      rejections: [{ change_id: "d1", code: "rejected", detail: "description: too long" }],
    }));
    expect(await engine.syncNow()).toMatchObject({ rejected: 1 });
    expect(await engine.rejected()).toEqual([
      expect.objectContaining({ id: "d1", status: "rejected", code: "rejected", reason: "description: too long" }),
    ]);
    expect(engine.getState().counts.rejected).toBe(1);
    await engine.syncNow();
    expect(transport.requests[1].changes).toEqual([]);

    await engine.write("handover", "defects", "d1", "upsert", { description: "short" });
    const queued = await db.outbox.toArray();
    expect(queued).toEqual([expect.objectContaining({ status: "pending", data: { description: "short", severity: "minor" } })]);
  });

  it("discardRejected drops the change and its local row, and pulls the scope afresh", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "defects", "d1", "upsert", { description: "x" });
    transport.answer({ server_knowledge: 4, changes: [], rejections: [{ change_id: "d1", code: "rejected", detail: "no" }] });
    await engine.syncNow();
    await engine.discardRejected("handover");
    expect(await db.outbox.count()).toBe(0);
    expect(await db.rows.get(["defects", "d1"])).toBeUndefined();
    expect((await db.meta.get("lastKnowledge:handover"))?.value).toBe(0);
  });

  it("lays the unsent changes back over a pull", async () => {
    const { db, engine, transport } = setup();
    await db.rows.put({ entity: "protocols", id: "p1", pk: 1, data: { notes: "old", status: "draft" } });
    await engine.write("handover", "protocols", "p1", "upsert", { notes: "mine" });
    await db.outbox.toCollection().modify({ status: "waiting" });
    // The refusal keeps it; the pull brings the server's row with another field changed.
    transport.answer({
      server_knowledge: 9,
      changes: [{ entity: "protocols", id: "p1", op: "upsert", pk: 1, data: { notes: "server", status: "final" } }],
      refused: { code: "billing_read_only", detail: "x", change_ids: ["p1"] },
    });
    await engine.syncNow();
    expect((await db.rows.get(["protocols", "p1"]))?.data).toEqual({ notes: "mine", status: "final" });
  });

  it("removes a row the pull deletes", async () => {
    const { db, engine, transport } = setup();
    await db.rows.put({ entity: "protocols", id: "p1", pk: 1, data: {} });
    transport.answer({ server_knowledge: 3, changes: [{ entity: "protocols", id: "p1", op: "delete" }] });
    await engine.syncNow();
    expect(await db.rows.count()).toBe(0);
  });

  it("sends a change left `sending` by a closed tab", async () => {
    const { db, engine, transport } = setup();
    await db.outbox.add({ scope: "handover", entity: "protocols", id: "p1", op: "upsert", data: { a: 1 }, updated_at: new Date().toISOString(), status: "sending" });
    await engine.syncNow();
    expect(transport.requests[0].changes.map((c) => c.id)).toEqual(["p1"]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("keeps every change waiting when the whole request is refused for the plan (402)", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "protocols", "p1", "upsert", { a: 1 });
    await engine.write("handover", "rooms", "r1", "upsert", { b: 1 });
    transport.failStatus(402, { code: "billing_read_only" });
    expect(await engine.syncNow()).toMatchObject({ outcome: "synced", waiting: 2 });
    expect((await db.outbox.toArray()).map((c) => c.status)).toEqual(["waiting", "waiting"]);
  });

  it("changes nothing when the server cannot be reached, and sets no retry timer", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "protocols", "p1", "upsert", { a: 1 });
    await db.outbox.toCollection().modify({ status: "waiting" });
    transport.failOffline();
    expect(await engine.syncNow()).toMatchObject({ outcome: "offline" });
    expect((await db.outbox.toArray()).map((c) => c.status)).toEqual(["waiting"]); // as it was
    expect(engine.getState()).toMatchObject({ phase: "offline", online: false, nextRetryAt: null });
  });

  it("runs no round while paused (a practice tour)", async () => {
    let paused = true;
    const { engine, transport } = setup({ paused: () => paused });
    expect(await engine.syncNow()).toMatchObject({ outcome: "paused" });
    expect(transport.requests).toHaveLength(0);
    paused = false;
    await engine.syncNow();
    expect(transport.requests).toHaveLength(1);
  });
});

describe("scopes (D11)", () => {
  it("sends one request per scope, in order, each with its own cursor; a write lands in the scope it was given", async () => {
    const { db, engine, transport } = setup({ scopes: () => ["handover", "meters"] });
    await db.meta.put({ key: "lastKnowledge:handover", value: 10 });
    await db.meta.put({ key: "lastKnowledge:meters", value: 20 });
    await engine.write("meters", "meter_readings", "m1", "upsert", { value: "1" });
    await engine.write("handover", "meter_readings", "m2", "upsert", { value: "2" });
    await engine.syncNow();
    expect(transport.requests.map((r) => [r.scope, r.last_knowledge, r.changes.map((c) => c.id)])).toEqual([
      ["handover", 10, ["m2"]],
      ["meters", 20, ["m1"]],
    ]);
  });

  it("reads scopes() every round: a gained scope starts at 0", async () => {
    let scopes = ["handover"];
    const { engine, transport } = setup({ scopes: () => scopes });
    await engine.syncNow();
    scopes = ["handover", "contacts"];
    await engine.syncNow();
    expect(transport.requests.map((r) => [r.scope, r.last_knowledge])).toEqual([
      ["handover", 0],
      ["handover", 1],
      ["contacts", 0],
    ]);
  });

  it("rejects the queue of a scope the role lost (403), and the round goes on", async () => {
    const { db, engine, transport } = setup({ scopes: () => ["meters", "contacts"] });
    await engine.write("meters", "meter_readings", "m1", "upsert", { value: "1" });
    await engine.write("contacts", "contacts", "c1", "upsert", { phone: "1" });
    transport.failStatus(403, { detail: "Forbidden" });
    const round = await engine.syncNow();
    expect(round).toMatchObject({ outcome: "synced", rejected: 1 });
    expect(await db.outbox.toArray()).toEqual([
      expect.objectContaining({ id: "m1", status: "rejected", reason: "Not allowed to sync meters" }),
    ]);
    expect(transport.requests.map((r) => r.scope)).toEqual(["meters", "contacts"]);
  });

  it.each([
    ["flat", { code: "demo_read_only", detail: "A demo cannot change anything." }],
    ["nested", { detail: { code: "demo_read_only", detail: "A demo cannot change anything." } }],
  ])("keeps the server's code and detail of a 403 (%s body)", async (_shape, data) => {
    const { db, engine, transport } = setup({ scopes: () => ["meters"] });
    await engine.write("meters", "meter_readings", "m1", "upsert", { value: "1" });
    transport.failStatus(403, data);
    await engine.syncNow();
    expect(await db.outbox.toArray()).toEqual([
      expect.objectContaining({ status: "rejected", code: "demo_read_only", reason: "A demo cannot change anything." }),
    ]);
  });
});

describe("paging (D12)", () => {
  const cursor = { entity: "rooms", knowledge: 5, id: "r9", window_end: 50 };

  it("pushes with the first page only, and writes the cursor with the last page", async () => {
    const { db, engine, transport } = setup({ paged: true });
    await db.meta.put({ key: "lastKnowledge:handover", value: 3 });
    await engine.write("handover", "protocols", "p1", "upsert", { a: 1 });
    let cursorDuringWalk: unknown;
    transport.answer(
      (body) => echoOf(body, 50, { page_cursor: cursor }),
      async () => {
        cursorDuringWalk = (await db.meta.get("lastKnowledge:handover"))?.value;
        return { server_knowledge: 50, changes: [{ entity: "rooms", id: "r10", op: "upsert", pk: 10, data: {} }], page_cursor: null };
      },
    );
    await engine.syncNow();
    expect(transport.requests.map((r) => [r.paged, r.page_cursor, r.last_knowledge, r.changes.length])).toEqual([
      [true, null, 3, 1],
      [true, cursor, 3, 0],
    ]);
    expect(transport.requests[0].client_now <= transport.requests[1].client_now).toBe(true);
    expect(cursorDuringWalk).toBe(3);
    expect((await db.meta.get("lastKnowledge:handover"))?.value).toBe(50);
    expect(await db.rows.get(["rooms", "r10"])).toBeDefined();
  });

  it("starts an interrupted walk again from the old cursor", async () => {
    const { db, engine, transport } = setup({ paged: true });
    await db.meta.put({ key: "lastKnowledge:handover", value: 3 });
    transport.answer({ server_knowledge: 50, changes: [], page_cursor: cursor }, { fail: 500 });
    expect(await engine.syncNow()).toMatchObject({ outcome: "error" });
    expect((await db.meta.get("lastKnowledge:handover"))?.value).toBe(3);
    await engine.syncNow();
    expect(transport.requests[2]).toMatchObject({ last_knowledge: 3, page_cursor: null });
  });
});

describe("the generation (D15)", () => {
  it("drops the answer of a round in flight at forget(): rows and meta stay empty", async () => {
    const { db, engine, transport } = setup();
    await engine.write("handover", "protocols", "p1", "upsert", { a: 1 });
    transport.answer(async (body) => {
      await engine.forget({ keepQueue: true });
      return echoOf(body, 9);
    });
    expect(await engine.syncNow()).toMatchObject({ outcome: "dropped" });
    expect(await db.rows.count()).toBe(0);
    expect(await db.meta.count()).toBe(0);
    // The queue waits for its owner, back to the status it had.
    expect(await db.outbox.toArray()).toEqual([expect.objectContaining({ id: "p1", status: "pending" })]);
  });

  it("a step in flight sees isCurrent() turn false, and the round ends dropped", async () => {
    const seen: boolean[] = [];
    const { db, engine } = setup({
      extraStores: { photos: "id" },
      steps: [
        {
          name: "photos",
          async run(stepDb, ctx) {
            seen.push(ctx.isCurrent());
            await engine.forget({ keepQueue: true });
            seen.push(ctx.isCurrent());
            if (ctx.isCurrent()) await stepDb.table("photos").put({ id: "uploaded" });
            return { changed: true };
          },
        },
      ],
    });
    expect(await engine.syncNow()).toMatchObject({ outcome: "dropped" });
    expect(seen).toEqual([true, false]);
    expect(await db.table("photos").count()).toBe(0);
  });

  it("keepQueue true keeps the outbox and the app's tables; false clears them", async () => {
    const { db, engine } = setup({ extraStores: { photos: "id" } });
    await engine.write("handover", "protocols", "p1", "upsert", { a: 1 });
    await db.table("photos").put({ id: "ph1" });
    await db.meta.put({ key: "lastKnowledge:handover", value: 5 });
    await engine.forget({ keepQueue: true });
    expect([await db.rows.count(), await db.meta.count(), await db.outbox.count(), await db.table("photos").count()]).toEqual([0, 0, 1, 1]);
    await engine.forget({ keepQueue: false });
    expect([await db.outbox.count(), await db.table("photos").count()]).toEqual([0, 0]);
    expect(engine.getState().counts.pending).toBe(0);
  });
});

describe("steps", () => {
  it("run after the push/pull, add their counts, and a change runs one more pass", async () => {
    const { engine, transport } = setup({
      steps: [{ name: "photos", run: async () => ({ changed: transport.requests.length === 1, counts: { pending: 2 } }) }],
    });
    await engine.syncNow();
    expect(transport.requests).toHaveLength(2);
    expect(engine.getState().counts.pending).toBe(2);
  });

  it("an offline step ends the round offline", async () => {
    const { engine } = setup({ steps: [{ name: "photos", run: async () => ({ offline: true }) }] });
    expect(await engine.syncNow()).toMatchObject({ outcome: "offline" });
  });
});

describe("the worker: start, poll, backoff (D13)", () => {
  it("does not start on a computer marked shared", async () => {
    const { engine, transport } = setup({ sharedComputer: () => true });
    engine.start();
    window.dispatchEvent(new Event("online"));
    await new Promise((r) => setTimeout(r, 20));
    expect(transport.requests).toHaveLength(0);
  });

  it("starting a second engine on the same database stops the first", async () => {
    const first = setup();
    const second = createSyncEngine({ db: first.db, scopes: () => ["handover"], send: vi.fn(async () => ({ server_knowledge: 1, changes: [] })), sharedComputer: () => false });
    open.push({ db: first.db, engine: second });
    first.engine.start();
    await until(first.engine, (s) => s.phase === "idle" && first.transport.requests.length === 1);
    second.start();
    await until(second, (s) => s.lastSyncedAt !== null);
    const heard = vi.fn();
    first.engine.subscribe(heard);
    window.dispatchEvent(new Event("online"));
    await until(second, (s) => s.phase === "idle");
    expect(heard).not.toHaveBeenCalled(); // the first no longer listens
    expect(first.transport.requests).toHaveLength(1);
  });

  it("stop() aborts the round in flight, and a new engine on the same database waits for it (A→B→A)", async () => {
    const first = setup();
    await first.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    let release!: () => void;
    let seen: AbortSignal | undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    first.transport.answer(async (body) => {
      await held;
      return echoOf(body, 1);
    });
    const send = first.transport.send;
    first.transport.send = (body, signal) => {
      seen = signal;
      return send(body, signal);
    };
    first.engine.start();
    await vi.waitFor(() => expect(first.transport.requests).toHaveLength(1));
    first.engine.stop();
    expect(seen?.aborted).toBe(true);
    const sent = vi.fn(async (body: SyncRequestBody) => echoOf(body, 2));
    const second = createSyncEngine({ db: first.db, scopes: () => ["handover"], send: sent, sharedComputer: () => false });
    open.push({ db: first.db, engine: second });
    second.start();
    await new Promise((r) => setTimeout(r, 20));
    expect(sent).not.toHaveBeenCalled(); // the first round still owns the queue
    expect((await first.db.outbox.toArray()).map((c) => c.status)).toEqual(["sending"]);
    release();
    await until(second, (s) => s.lastSyncedAt !== null);
    expect(sent).toHaveBeenCalledTimes(1);
    // The first round's answer was dropped and its change laid back; the second sent it.
    expect(sent.mock.calls[0][0].changes.map((c) => c.id)).toEqual(["p1"]);
    expect(await first.db.outbox.count()).toBe(0);
  });

  it("an engine stopped while it waits for another engine's round runs no round of its own (A2 stopped by a switch to B)", async () => {
    const first = setup();
    await first.engine.write("handover", "protocols", "p1", "upsert", { notes: "a" });
    await first.db.meta.put({ key: "lastKnowledge:handover", value: 7 });
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    first.transport.answer(async (body) => {
      await held;
      return echoOf(body, 1);
    });
    first.engine.start();
    await vi.waitFor(() => expect(first.transport.requests).toHaveLength(1));
    first.engine.stop();
    // A2: the same database name, waiting on the first engine's round.
    const sent = vi.fn(async (body: SyncRequestBody) => ({
      ...echoOf(body, 99),
      changes: [{ entity: "protocols", id: "of-company-b", op: "upsert" as const, pk: 1, data: {} }],
    }));
    const second = createSyncEngine({ db: first.db, scopes: () => ["handover"], send: sent, sharedComputer: () => false });
    open.push({ db: first.db, engine: second });
    second.start();
    await new Promise((r) => setTimeout(r, 20));
    second.stop(); // the switch to company B
    release();
    await until(second, (s) => s.phase === "idle");
    await new Promise((r) => setTimeout(r, 20));
    expect(sent).not.toHaveBeenCalled();
    expect(await first.db.rows.get(["protocols", "of-company-b"])).toBeUndefined();
    expect((await first.db.meta.get("lastKnowledge:handover"))?.value).toBe(7);
    expect((await first.db.outbox.toArray()).map((c) => c.status)).toEqual(["pending"]);
  });

  it("releaseSyncEngine stops the kept engine, closes its database and forgets it", () => {
    const { db } = setup();
    const options = { db, scopes: () => ["handover"], send: vi.fn(), sharedComputer: () => false };
    const a = syncEngineFor(options);
    const stop = vi.spyOn(a, "stop");
    releaseSyncEngine(db.name);
    expect(stop).toHaveBeenCalled();
    expect(db.isOpen()).toBe(false);
    releaseSyncEngine(db.name); // nothing kept: a no-op
    const reopened = createSyncDb(db.name);
    const b = syncEngineFor({ ...options, db: reopened });
    open.push({ db: reopened, engine: b });
    expect(b).not.toBe(a);
  });

  it("syncEngineFor keeps one engine per database name", () => {
    const { db } = setup();
    const options = { db, scopes: () => ["handover"], send: vi.fn(), sharedComputer: () => false };
    const a = syncEngineFor(options);
    expect(syncEngineFor({ ...options, scopes: () => [] })).toBe(a);
    open.push({ db, engine: a });
    const other = createSyncDb(`sync-engine-test-other-${n}`);
    const b = syncEngineFor({ ...options, db: other });
    open.push({ db: other, engine: b });
    expect(b).not.toBe(a);
  });

  it("retries after 5 s, 15 s, 60 s, then every 5 min, with a fresh client_now; a good round resets it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    const { engine, transport } = setup({ pollMs: 3_600_000 });
    for (let i = 0; i < 5; i++) transport.failStatus(500);
    engine.start();
    const waits: number[] = [];
    for (let i = 0; i < 5; i++) {
      const s = await until(engine, (st) => st.phase === "error" && st.nextRetryAt !== null && transport.requests.length === i + 1);
      waits.push(s.nextRetryAt! - Date.now());
      await vi.advanceTimersByTimeAsync(s.nextRetryAt! - Date.now());
    }
    expect(waits).toEqual([5_000, 15_000, 60_000, 300_000, 300_000]);
    await until(engine, (s) => s.phase === "idle");
    expect(engine.getState().nextRetryAt).toBeNull();
    const stamps = transport.requests.map((r) => r.client_now);
    expect(new Set(stamps).size).toBe(stamps.length);
    // Reset: the next error waits 5 s again.
    transport.failStatus(500);
    void engine.syncNow();
    const s = await until(engine, (st) => st.phase === "error");
    expect(s.nextRetryAt! - Date.now()).toBe(5_000);
  });

  it("the online event and syncNow reset the backoff", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    const { engine, transport } = setup({ pollMs: 3_600_000 });
    transport.failStatus(500);
    transport.failStatus(500);
    engine.start();
    await until(engine, (st) => st.phase === "error");
    await vi.advanceTimersByTimeAsync(5_000);
    let s = await until(engine, (st) => st.phase === "error" && transport.requests.length === 2);
    expect(s.nextRetryAt! - Date.now()).toBe(15_000);
    transport.failStatus(500);
    window.dispatchEvent(new Event("online"));
    s = await until(engine, (st) => st.phase === "error" && transport.requests.length === 3);
    expect(s.nextRetryAt! - Date.now()).toBe(5_000);
    transport.failStatus(500);
    await engine.syncNow();
    expect(engine.getState().nextRetryAt! - Date.now()).toBe(5_000);
  });

  it("a write while backing off waits for the retry", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    const { engine, transport } = setup({ pollMs: 3_600_000 });
    transport.failStatus(500);
    engine.start();
    await until(engine, (st) => st.phase === "error");
    await engine.write("handover", "protocols", "p1", "upsert", { a: 1 });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(transport.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(4_000);
    await until(engine, (st) => st.phase === "idle");
    expect(transport.requests).toHaveLength(2);
  });
});

describe("createSyncDb", () => {
  it("moves an existing database onto the engine's schema with an upgrade (kastlan v2)", async () => {
    n += 1;
    const name = `sync-engine-legacy-${n}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({ rows: "[entity+id], entity", outbox: "++seq, [entity+id], status", photos: "id, roomId, status", meta: "key" });
    await legacy.table("outbox").add({ entity: "protocols", id: "p1", op: "upsert", data: {}, status: "pending" });
    legacy.close();

    const db = createSyncDb(name, {
      extraStores: { photos: "id, roomId, status" },
      upgrades: [{ version: 2, upgrade: (tx) => tx.table("outbox").toCollection().modify({ scope: "handover" }).then(() => undefined) }],
    });
    open.push({ db });
    expect(await db.outbox.where("scope").equals("handover").count()).toBe(1);
    expect(db.verno).toBe(2);
  });
});
