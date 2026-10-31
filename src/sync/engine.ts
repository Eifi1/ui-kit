import { postOnce } from "../lib/broadcast";
import { httpStatusOf } from "../lib/http-status";
import { isOfflineError, stampAfter } from "../offline/local-first";
import { isSharedComputer } from "../offline/shared-computer";
import type { OutboxChange, OutboxStatus, SyncDb, SyncedRow } from "./db";
import type { SyncRequestBody, SyncResponseBody, SyncWireChange } from "./wire";

/*
 * The sync engine (docs/local-first-harmonization.md §2.3): kastlan's handover client,
 * generalised (D10). Keksdose's SERVER rules and wire shapes; the client policies are ka's —
 * a new edit merges into the row's last `pending` upsert, a refused change is held per change
 * (`waiting` / `blocked` / `rejected`), a capped backoff on errors, the queue kept at sign-out.
 *
 * A round, per scope in `scopes()` order (read every round, D11): take the scope's queue and
 * mark it `sending`; post `{scope, last_knowledge, changes, refusals, client_now, paged?}`
 * with `client_now` read fresh (D2 amendment); apply the answer in ONE transaction, only if
 * the generation is unchanged (D15); follow `page_cursor` with pull-only requests, the cursor
 * written with the last page only (D12). Then the app's `steps`, then one more pass if a step
 * changed something. One round at a time; a request during a round runs once more after it.
 *
 * Across tabs (0.52; refactor audit 2026-10-30, FLW-1): every tab runs its own engine on the one
 * IndexedDB copy, and before 0.52 nothing stood between them — a second tab took the first's
 * `sending` changes as a closed tab's and sent them again, its failure laid them back so an edit
 * merged into a change already out and was deleted with it, and a sign-out in one tab was pulled
 * straight back from 0 by the other's poll. Now a round runs under a Web Lock named after the
 * database, so the rounds of all tabs take turns; and `forget()` writes a new epoch into `meta`
 * with the clear, which every round reads, so another tab's round drops its answer and that
 * tab's engine stops.
 */

export interface SyncCounts {
  pending: number;
  waiting: number;
  blocked: number;
  rejected: number;
}

export interface SyncStepContext {
  signal: AbortSignal;
  /** False once `forget()` bumped the generation — in this tab, or (0.52) in another tab on
   *  the same database, heard over a BroadcastChannel: the step writes nothing more (D15). */
  isCurrent(): boolean;
}

export interface SyncStepResult {
  /** The step met no connection: the round ends offline. */
  offline?: boolean;
  /** One more push/pull in the same round (kastlan's second pass after its photos). */
  changed?: boolean;
  /** What the step keeps on the device, added to the engine's counts. */
  counts?: Partial<SyncCounts>;
}

/** Work after the push/pull, such as kastlan's photo upload. `D` is the app's database type
 *  (`createSyncDb<HandoverDb>`), so a step reaches the app's own tables without a cast. */
export interface SyncStep<D extends SyncDb = SyncDb> {
  name: string;
  run(db: D, ctx: SyncStepContext): Promise<SyncStepResult>;
  /** Its counts read from the device between rounds (a photo taken offline shows at once). */
  counts?(db: D): Promise<Partial<SyncCounts>>;
}

export interface SyncEngineState {
  phase: "idle" | "syncing" | "offline" | "error";
  online: boolean;
  counts: SyncCounts;
  /** When a scope's walk last completed (ISO), kept in `meta` (D9). */
  lastSyncedAt: string | null;
  /** When the next attempt after an error runs (epoch ms), or `null`. */
  nextRetryAt: number | null;
}

export interface SyncRoundResult {
  /** `paused`: `paused()` held the round, or (0.52) another tab's round on the same database
   *  did — a started engine then runs it once after that round. `dropped`: `forget()` ran
   *  during it, here or in another tab, its answer unused. */
  outcome: "synced" | "offline" | "error" | "paused" | "dropped";
  /** Changes this round set `waiting`, `blocked` or `rejected`. */
  waiting: number;
  blocked: number;
  rejected: number;
  error?: unknown;
}

export interface SyncEngineOptions<D extends SyncDb = SyncDb> {
  /** The database; its type `D` is the one the `steps` get. */
  db: D;
  /** The scopes this session's role holds, in round order (kastlan: handover, meetings, meters,
   *  maintenance, contacts). Read at the start of every round: roles are per company. */
  scopes: () => readonly string[];
  /** Posts one request (`POST /sync`) and answers its body; throws as the app's client does. */
  send: (body: SyncRequestBody, signal: AbortSignal) => Promise<SyncResponseBody>;
  /** Default {@link isOfflineError}: no answer, or the session refresh's passing 401. */
  isOffline?: (err: unknown) => boolean;
  /** A whole request refused for the plan → every sent change `waiting` with this code.
   *  Default: a 402 whose body names a `code` (or `detail.code`). */
  planCode?: (err: unknown) => string | null;
  /** `refused.code`s kept as `waiting` and sent again every round; any other code is
   *  `blocked`, sent again only on `retryBlocked()`. Default `["billing_read_only"]`. */
  holdCodes?: readonly string[];
  /** Ask for a paged pull and follow its cursor (D12). */
  paged?: boolean;
  steps?: readonly SyncStep<D>[];
  /** No round while this holds (kastlan: a practice tour fakes the server's answers). */
  paused?: () => boolean;
  /** The poll (30 s) and the debounce after a write (800 ms). */
  pollMs?: number;
  soonMs?: number;
  /** The waits after consecutive errors; the last repeats (D13). */
  backoffMs?: readonly number[];
  /** Default `isSharedComputer`: on a computer marked shared the engine does not start (D15). */
  sharedComputer?: () => boolean;
}

export interface SyncEngine {
  /** Into the copy at once and into the queue, in the scope the caller names (D11). An edit
   *  merges into the row's last `pending` upsert; deleting a row that never reached the
   *  server forgets its queue; stamped with `stampAfter`. */
  write(
    scope: string,
    entity: string,
    id: string,
    op: "upsert" | "delete",
    data?: Record<string, unknown>,
  ): Promise<void>;
  start(): void;
  /** Stops the poll and the timers, aborts the round in flight and drops its answer (the
   *  queue is laid back). A new engine's round on the same database waits for it. */
  stop(): void;
  /** Sync soon (debounced): after a write. */
  requestSync(): void;
  /** "Sync now": resets the backoff, runs a round (after the one under way). */
  syncNow(): Promise<SyncRoundResult>;
  /** A round that sends the `blocked` changes too. */
  retryBlocked(): Promise<void>;
  /** Drop the rejected changes (of one scope) and pull that scope afresh. */
  discardRejected(scope?: string): Promise<void>;
  /** The rejected changes with their reasons, for the app's banner. */
  rejected(): Promise<OutboxChange[]>;
  /** Sign-out: bump the generation (a round in flight writes nothing more), then clear the
   *  rows and `meta` — and the outbox and the app's tables unless `keepQueue` (D15). In every
   *  tab (0.52): the clear writes a new epoch into `meta`, so a round of another tab's engine on
   *  this database drops its answer, and that engine stops — the session it ran for has ended. */
  forget(opts: { keepQueue: boolean }): Promise<void>;
  getState(): SyncEngineState;
  subscribe(listener: () => void): () => void;
}

export const DEFAULT_SYNC_BACKOFF_MS: readonly number[] = [5_000, 15_000, 60_000, 300_000];
export const DEFAULT_HOLD_CODES: readonly string[] = ["billing_read_only"];

const LAST_SYNCED_AT = "lastSyncedAt";
/** The copy's epoch in `meta` (0.52): a new one with every `forget()`, in its clear. */
const EPOCH = "epoch";
const lastKnowledgeKey = (scope: string) => `lastKnowledge:${scope}`;
const UNSENT: readonly OutboxStatus[] = ["pending", "sending", "waiting", "blocked"];
const ZERO: SyncCounts = { pending: 0, waiting: 0, blocked: 0, rejected: 0 };

/** The started engine of each database: one engine per database (D15). */
const running = new Map<string, SyncEngine>();

/** The round in flight on each database, of whichever engine: a new engine's round waits
 *  for it, so two never take the same queue (a company switch A→B→A within one round). */
const flights = new Map<string, Promise<unknown>>();

/** The engines {@link syncEngineFor} keeps, by database name. */
const kept = new Map<string, { db: SyncDb; engine: SyncEngine }>();

/** The generation changed under a round: its answer is dropped. */
class Dropped extends Error {}

/** The copy's epoch moved since this engine started: `forget()` ran in another tab. */
class ForgottenElsewhere extends Error {}

/** The browser's Web Locks: a secure context (https, localhost), Safari 15.4+. */
function webLocks(): LockManager | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as { locks?: LockManager }).locks;
}

/** A `forget()`'s epoch: unique enough to tell two apart, and on plain http too, where
 *  `crypto.randomUUID` is missing (refactor audit 2026-10-30, DUP-7). */
function freshEpoch(): string {
  const uuid = (globalThis.crypto as Partial<Crypto> | undefined)?.randomUUID;
  return uuid ? uuid.call(globalThis.crypto) : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** A row created on this device and never echoed by the server carries `local: true`. */
type CopyRow = SyncedRow & { local?: boolean };

function browserOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function defaultPlanCode(err: unknown): string | null {
  if (httpStatusOf(err) !== 402) return null;
  const body = (err as { response?: { data?: { code?: unknown; detail?: { code?: unknown } } } }).response?.data;
  const code = typeof body?.code === "string" ? body.code : body?.detail?.code;
  return typeof code === "string" ? code : null;
}

/** A refusal's `code` and `detail` from an error's body: `{code, detail}` or FastAPI's
 *  `{detail: {code, detail}}`. */
function refusalOf(err: unknown): { code?: string; detail?: string } {
  const body = (err as { response?: { data?: unknown } }).response?.data as
    { code?: unknown; detail?: unknown } | undefined;
  const inner =
    body?.detail && typeof body.detail === "object" ? (body.detail as { code?: unknown; detail?: unknown }) : body;
  const text = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return { code: text(inner?.code), detail: text(inner?.detail) };
}

function latest(stamps: unknown[]): string | undefined {
  let best: string | undefined;
  for (const s of stamps) {
    if (typeof s !== "string" || !Number.isFinite(Date.parse(s))) continue;
    if (best === undefined || Date.parse(s) > Date.parse(best)) best = s;
  }
  return best;
}

const toWire = ({ entity, id, op, data, updated_at }: OutboxChange): SyncWireChange =>
  op === "delete" ? { entity, id, op, updated_at } : { entity, id, op, data, updated_at };

/**
 * The engine on one database (D15: one engine per database; a company switch builds a new
 * engine on the new database and stops the old one). Nothing runs until `start()`
 * (`useSyncWorker`), and `start()` does nothing on a computer marked shared.
 */
export function createSyncEngine<D extends SyncDb = SyncDb>(options: SyncEngineOptions<D>): SyncEngine {
  const { db } = options;
  const isOffline = options.isOffline ?? isOfflineError;
  const planCode = options.planCode ?? defaultPlanCode;
  const holdCodes = new Set(options.holdCodes ?? DEFAULT_HOLD_CODES);
  const steps = options.steps ?? [];
  const pollMs = options.pollMs ?? 30_000;
  const soonMs = options.soonMs ?? 800;
  const backoffMs = options.backoffMs?.length ? options.backoffMs : DEFAULT_SYNC_BACKOFF_MS;
  const sharedComputer = options.sharedComputer ?? isSharedComputer;

  let generation = 0;
  let state: SyncEngineState = {
    phase: "idle",
    online: browserOnline(),
    counts: ZERO,
    lastSyncedAt: null,
    nextRetryAt: null,
  };
  const listeners = new Set<() => void>();
  let started = false;
  let poll: ReturnType<typeof setInterval> | null = null;
  let soon: ReturnType<typeof setTimeout> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let current: Promise<SyncRoundResult> | null = null;
  let again = false;
  let controller: AbortController | null = null;
  let stepCounts: Record<string, Partial<SyncCounts>> = {};

  // ── Across tabs (0.52, FLW-1) ───────────────────────────────────────────────
  /** The name of this database's Web Lock and BroadcastChannel (one origin's tabs share both,
   *  as they share the IndexedDB). */
  const across = `eifi1-sync:${db.name}`;
  /** The copy's epochs this engine runs under: the one read when it started (or at its first
   *  round), and each its own `forget()` wrote. Any other one means `forget()` ran elsewhere. */
  const epochs = new Set<string | null>();
  let epochRead: Promise<void> | null = null;
  /** `forget()` ran in another tab: this engine runs no round until its own `forget()`. */
  let forgotten = false;
  let channel: BroadcastChannel | null = null;
  /** A wait for another tab's round is queued for the lock; with `blocked` if one asked. */
  let afterOther: { blocked: boolean } | null = null;

  function set(next: Partial<SyncEngineState>) {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  }

  /** The counts and `lastSyncedAt` read again from the device. Never throws: a closed or
   *  deleted database leaves the last counts standing. */
  function refreshCounts(): Promise<void> {
    return readCounts().catch(() => undefined);
  }

  async function readCounts(): Promise<void> {
    const gen = generation;
    const count = (status: OutboxStatus) => db.outbox.where("status").equals(status).count();
    const [pending, sending, waiting, blocked, rejected] = await Promise.all(
      (["pending", "sending", "waiting", "blocked", "rejected"] as const).map(count),
    );
    const fromSteps = { ...stepCounts };
    for (const step of steps) if (step.counts) fromSteps[step.name] = await step.counts(db);
    const last = (await db.meta.get(LAST_SYNCED_AT))?.value;
    if (gen !== generation) return;
    if (Object.keys(fromSteps).length) stepCounts = fromSteps;
    const counts = { pending: pending + sending, waiting, blocked, rejected };
    for (const extra of Object.values(stepCounts)) {
      for (const key of Object.keys(counts) as (keyof SyncCounts)[]) counts[key] += extra[key] ?? 0;
    }
    set({ counts, lastSyncedAt: typeof last === "string" ? last : null });
  }

  function readEpoch(): Promise<string | null> {
    return db.meta.get(EPOCH).then((entry) => (typeof entry?.value === "string" ? entry.value : null));
  }

  /** Read once per engine — at `start()`, before its first round can wait on another tab's —
   *  so a `forget()` that lands while it waits is seen as another tab's. A failed read is
   *  tried again by the next round. */
  function captureEpoch(): Promise<void> {
    if (epochRead) return epochRead;
    const read = readEpoch().then((epoch) => void epochs.add(epoch));
    epochRead = read;
    read.catch(() => {
      if (epochRead === read) epochRead = null;
    });
    return read;
  }

  /** While started, hear `forget()` in another tab at once: a step in flight sees
   *  `isCurrent()` turn false, the request in flight is aborted, and the poll stops. Without
   *  BroadcastChannel the next round's read of the epoch stops it instead. */
  function listen() {
    if (channel || typeof BroadcastChannel === "undefined") return;
    try {
      channel = new BroadcastChannel(across);
    } catch {
      return;
    }
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      const epoch = (data as { epoch?: unknown } | null)?.epoch;
      if (typeof epoch === "string" && !epochs.has(epoch)) forgetHere();
    };
  }

  /** `forget()` ran in another tab: the session this engine ran for has ended there. Its
   *  round in flight writes nothing more, and it runs none of its own any more. */
  function forgetHere() {
    if (forgotten) return;
    forgotten = true;
    if (started) halt();
    else {
      generation += 1;
      controller?.abort();
    }
    stepCounts = {};
    set({ lastSyncedAt: null });
    void refreshCounts();
  }

  // ── The queue ──────────────────────────────────────────────────────────────

  /** Mark the scope's queue as in the request (a `sending` left by a closed tab goes back
   *  first); answers it with the statuses it had. Under the Web Lock (0.52) a `sending` here
   *  is a closed tab's, as this assumes: no other tab's round is out. Without Web Locks
   *  (plain http) it may be another open tab's, as before 0.52. */
  function takeQueue(scope: string, withBlocked: boolean): Promise<OutboxChange[]> {
    return db.transaction("rw", db.outbox, async () => {
      await db.outbox
        .where("scope")
        .equals(scope)
        .and((c) => c.status === "sending")
        .modify({ status: "pending" });
      const take: OutboxStatus[] = withBlocked ? ["pending", "waiting", "blocked"] : ["pending", "waiting"];
      const queue = (await db.outbox.where("scope").equals(scope).toArray())
        .filter((c) => take.includes(c.status))
        .sort((a, b) => a.seq! - b.seq!);
      await db.outbox.bulkUpdate(queue.map((c) => ({ key: c.seq!, changes: { status: "sending" as const } })));
      return queue;
    });
  }

  /** The request failed: each change back to the status it had. */
  function restore(sent: OutboxChange[]) {
    return db.outbox.bulkUpdate(sent.map((c) => ({ key: c.seq!, changes: { status: c.status } })));
  }

  function mark(changes: OutboxChange[], fields: Partial<OutboxChange>) {
    return db.outbox.bulkUpdate(changes.map((c) => ({ key: c.seq!, changes: fields })));
  }

  /** Put one page's rows in the copy, settle the sent changes, lay the unsent ones back. The
   *  epoch is read in the same transaction: a `forget()` of another tab either commits before
   *  it (this answer is dropped) or after it (and clears what it wrote). */
  async function apply(
    scope: string,
    answer: SyncResponseBody,
    sent: OutboxChange[],
    gen: number,
    epoch: string | null,
    lastPage: boolean,
  ) {
    return db.transaction("rw", db.rows, db.outbox, db.meta, async () => {
      if (gen !== generation || (await readEpoch()) !== epoch) throw new Dropped();
      const refused = answer.refused ?? null;
      const refusedIds = new Set(refused?.change_ids ?? []);
      const rejections = new Map((answer.rejections ?? []).map((r) => [r.change_id, r]));
      const kept = sent.filter((c) => refusedIds.has(c.id));
      const rejected = sent.filter((c) => !refusedIds.has(c.id) && rejections.has(c.id));
      await db.outbox.bulkDelete(sent.filter((c) => !refusedIds.has(c.id) && !rejections.has(c.id)).map((c) => c.seq!));
      const hold = refused != null && holdCodes.has(refused.code);
      if (refused)
        await mark(kept, { status: hold ? "waiting" : "blocked", code: refused.code, reason: refused.detail });
      for (const change of rejected) {
        const why = rejections.get(change.id)!;
        await db.outbox.update(change.seq!, { status: "rejected", code: why.code, reason: why.detail });
      }
      const pulled = new Set<string>();
      for (const change of answer.changes) {
        pulled.add(`${change.entity}\u0000${change.id}`);
        if (change.op === "delete") await db.rows.delete([change.entity, change.id]);
        else {
          const row: CopyRow = {
            entity: change.entity,
            id: change.id,
            pk: change.pk ?? null,
            local: false,
            data: change.data ?? {},
            // The server's stamp rides beside `data`: kept, so the next edit is stamped after it.
            updated_at: change.updated_at ?? null,
          };
          await db.rows.put(row);
        }
      }
      // A pull never undoes what was typed while the request was out.
      const unsent = (await db.outbox.where("status").anyOf(UNSENT).toArray())
        .filter((c) => pulled.has(`${c.entity}\u0000${c.id}`))
        .sort((a, b) => a.seq! - b.seq!);
      for (const change of unsent) {
        if (change.op === "delete") {
          await db.rows.delete([change.entity, change.id]);
          continue;
        }
        const row = (await db.rows.get([change.entity, change.id])) as CopyRow | undefined;
        await db.rows.put({
          ...row,
          entity: change.entity,
          id: change.id,
          pk: row?.pk ?? null,
          data: { ...row?.data, ...change.data },
        });
      }
      if (lastPage) {
        await db.meta.put({ key: lastKnowledgeKey(scope), value: answer.server_knowledge });
        await db.meta.put({ key: LAST_SYNCED_AT, value: new Date().toISOString() });
      }
      return {
        waiting: hold ? kept.length : 0,
        blocked: refused && !hold ? kept.length : 0,
        rejected: rejected.length,
      };
    });
  }

  /** A scope the role no longer holds (403): its queue is rejected and it leaves the round.
   *  The server's `code` and `detail` are kept (a demo's `demo_read_only`); without them,
   *  `forbidden` and "Not allowed to sync <scope>". */
  async function loseScope(scope: string, err: unknown): Promise<number> {
    const why = refusalOf(err);
    return db.transaction("rw", db.outbox, async () => {
      const queue = (await db.outbox.where("scope").equals(scope).toArray()).filter((c) => UNSENT.includes(c.status));
      await mark(queue, {
        status: "rejected",
        code: why.code ?? "forbidden",
        reason: why.code && why.detail ? why.detail : `Not allowed to sync ${scope}`,
      });
      return queue.length;
    });
  }

  type ScopeResult = { offline: true } | { offline: false; waiting: number; blocked: number; rejected: number };

  async function syncScope(
    scope: string,
    gen: number,
    epoch: string | null,
    signal: AbortSignal,
    withBlocked: boolean,
  ): Promise<ScopeResult> {
    const sent = await takeQueue(scope, withBlocked);
    const last = Number((await db.meta.get(lastKnowledgeKey(scope)))?.value ?? 0) || 0;
    const body = (changes: SyncWireChange[], page_cursor: SyncRequestBody["page_cursor"]): SyncRequestBody => ({
      scope,
      last_knowledge: last,
      changes,
      refusals: true,
      client_now: new Date().toISOString(),
      ...(options.paged ? { paged: true, page_cursor } : {}),
    });
    let answer: SyncResponseBody;
    try {
      answer = await options.send(body(sent.map(toWire), null), signal);
    } catch (err) {
      await restore(sent);
      if (gen !== generation) throw new Dropped();
      if (isOffline(err)) return { offline: true };
      const plan = planCode(err);
      if (plan) {
        // The whole request refused for the plan: every change waits for it.
        await mark(sent, { status: "waiting", code: plan, reason: plan });
        return { offline: false, waiting: sent.length, blocked: 0, rejected: 0 };
      }
      if (httpStatusOf(err) === 403)
        return { offline: false, waiting: 0, blocked: 0, rejected: await loseScope(scope, err) };
      throw err;
    }
    let cursor = options.paged ? (answer.page_cursor ?? null) : null;
    let tally: ScopeResult;
    try {
      tally = { offline: false, ...(await apply(scope, answer, sent, gen, epoch, cursor == null)) };
    } catch (err) {
      if (err instanceof Dropped) await restore(sent);
      throw err;
    }
    // The rest of a paged pull: pull-only; the cursor is written with the last page alone,
    // so an interrupted walk starts again from the old one (D12).
    while (cursor) {
      let page: SyncResponseBody;
      try {
        page = await options.send(body([], cursor), signal);
      } catch (err) {
        if (gen !== generation) throw new Dropped();
        if (isOffline(err)) return { offline: true };
        throw err;
      }
      cursor = page.page_cursor ?? null;
      await apply(scope, page, [], gen, epoch, cursor == null);
    }
    return tally;
  }

  // ── The round ──────────────────────────────────────────────────────────────

  async function round(withBlocked: boolean, gen: number): Promise<SyncRoundResult> {
    const result: SyncRoundResult = { outcome: "synced", waiting: 0, blocked: 0, rejected: 0 };
    if (gen !== generation || forgotten) return { ...result, outcome: "dropped" };
    if (options.paused?.()) return { ...result, outcome: "paused" };
    if (!browserOnline()) return { ...result, outcome: "offline" };
    const locks = webLocks();
    if (!locks) return locked(result, withBlocked, gen);
    let granted = false;
    try {
      // `ifAvailable`: a tab never queues a round behind another's — it is paused, and a
      // started engine runs it once after that round (`waitForOtherTab`). A closed tab's lock
      // is released with it.
      return await locks.request(across, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          waitForOtherTab(locks, withBlocked);
          return { ...result, outcome: "paused" };
        }
        granted = true;
        return locked(result, withBlocked, gen);
      });
    } catch (err) {
      // A lock manager that refuses (an opaque origin, a document no longer active): the
      // round runs as before 0.52. `locked` itself never throws.
      return granted ? { ...result, outcome: "error", error: err } : locked(result, withBlocked, gen);
    }
  }

  /** Another tab's round holds this database: a request made meanwhile runs once after it,
   *  as one made during this tab's own round does (ka's rule), not only at the next poll. One
   *  wait at a time: it takes the lock in turn and lets go of it at once. */
  function waitForOtherTab(locks: LockManager, withBlocked: boolean) {
    if (afterOther) {
      afterOther.blocked ||= withBlocked;
      return;
    }
    const wait = { blocked: withBlocked };
    afterOther = wait;
    const then = () => {
      afterOther = null;
      if (started && !inBackoff()) void run(wait.blocked);
    };
    locks.request(across, () => undefined).then(then, then);
  }

  /** The round itself: under the database's Web Lock where the browser has them. */
  async function locked(result: SyncRoundResult, withBlocked: boolean, gen: number): Promise<SyncRoundResult> {
    const own = new AbortController();
    controller = own;
    try {
      await captureEpoch();
      const epoch = await readEpoch();
      if (!epochs.has(epoch)) throw new ForgottenElsewhere();
      set({ phase: "syncing" });
      for (let pass = 0; ; pass++) {
        for (const scope of options.scopes()) {
          if (gen !== generation) throw new Dropped();
          const r = await syncScope(scope, gen, epoch, own.signal, withBlocked);
          if (r.offline) return { ...result, outcome: "offline" };
          result.waiting += r.waiting;
          result.blocked += r.blocked;
          result.rejected += r.rejected;
        }
        if (pass > 0) break;
        let changed = false;
        for (const step of steps) {
          if (gen !== generation) throw new Dropped();
          const ran = await step.run(db, { signal: own.signal, isCurrent: () => gen === generation });
          if (gen !== generation) throw new Dropped();
          if (ran.counts) stepCounts = { ...stepCounts, [step.name]: ran.counts };
          if (ran.offline) return { ...result, outcome: "offline" };
          if (ran.changed) changed = true;
        }
        if (!changed) break;
      }
      return result;
    } catch (err) {
      if (err instanceof ForgottenElsewhere) forgetHere();
      if (err instanceof Dropped || err instanceof ForgottenElsewhere || gen !== generation)
        return { ...result, outcome: "dropped" };
      return { ...result, outcome: "error", error: err };
    } finally {
      if (controller === own) controller = null;
    }
  }

  function clearRetry() {
    if (retry) clearTimeout(retry);
    retry = null;
  }

  function resetBackoff() {
    failures = 0;
    clearRetry();
    if (state.nextRetryAt !== null) set({ nextRetryAt: null });
  }

  const inBackoff = () => state.nextRetryAt !== null && Date.now() < state.nextRetryAt;

  function settle(result: SyncRoundResult) {
    switch (result.outcome) {
      case "synced":
        failures = 0;
        clearRetry();
        set({ phase: "idle", online: true, nextRetryAt: null });
        break;
      case "offline":
        // No retry timer offline: the `online` event or the poll brings the next round (D13).
        clearRetry();
        set({ phase: "offline", online: false, nextRetryAt: null });
        break;
      case "error": {
        const wait = backoffMs[Math.min(failures, backoffMs.length - 1)];
        failures += 1;
        clearRetry();
        if (started) {
          retry = setTimeout(() => {
            retry = null;
            void run(false);
          }, wait);
        }
        set({ phase: "error", nextRetryAt: started ? Date.now() + wait : null });
        break;
      }
      case "dropped":
        set({ phase: "idle" });
        break;
      case "paused":
        break;
    }
  }

  function run(withBlocked: boolean): Promise<SyncRoundResult> {
    if (current) {
      again = true;
      return current;
    }
    const before = flights.get(db.name);
    // The generation is read before any wait: a stop() while this waits drops the round, so
    // it never sends this copy's queue with another account's client nor pulls into it.
    const gen = generation;
    const flight = (async () => {
      // Another engine's round on this database (stopped, still settling) ends first.
      if (before) await before.catch(() => undefined);
      try {
        const result = await round(withBlocked, gen);
        settle(result);
        await refreshCounts();
        return result;
      } finally {
        current = null;
        if (again) {
          again = false;
          tick();
        }
      }
    })();
    current = flight;
    flights.set(db.name, flight);
    const done = () => {
      if (flights.get(db.name) === flight) flights.delete(db.name);
    };
    void flight.then(done, done);
    return flight;
  }

  /** A round from the poll, a write or a request during a round: not while backing off. */
  function tick() {
    if (started && !inBackoff()) void run(false);
  }

  async function runFresh(withBlocked: boolean): Promise<SyncRoundResult> {
    resetBackoff();
    if (current) {
      again = false;
      await current.catch(() => undefined);
    }
    return run(withBlocked);
  }

  const onOnline = () => {
    set({ online: true });
    resetBackoff();
    void run(false);
  };
  const onOffline = () => set({ online: false });

  /** `stop()`, and the end `forgetHere` puts to a started engine. */
  function halt() {
    if (!started) return;
    started = false;
    // The round in flight writes nothing more: its request is aborted and its answer
    // dropped, the queue laid back; the next engine's round waits for it to settle.
    generation += 1;
    controller?.abort();
    if (running.get(db.name) === engine) running.delete(db.name);
    if (poll) clearInterval(poll);
    poll = null;
    if (soon) clearTimeout(soon);
    soon = null;
    clearRetry();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    }
    channel?.close();
    channel = null;
  }

  const engine: SyncEngine = {
    async write(scope, entity, id, op, data = {}) {
      await db.transaction("rw", db.rows, db.outbox, async () => {
        const row = (await db.rows.get([entity, id])) as CopyRow | undefined;
        const ofRow = await db.outbox.where("[entity+id]").equals([entity, id]).toArray();
        ofRow.sort((a, b) => a.seq! - b.seq!);
        const updated_at = stampAfter(
          latest([row?.updated_at, row?.data.updated_at, ...ofRow.map((c) => c.updated_at)]),
        );
        // A new edit to the row moves a rejected change out of the way (D13).
        const rejected = ofRow.filter((c) => c.scope === scope && c.status === "rejected");
        if (op === "delete") {
          await db.rows.delete([entity, id]);
          const neverSynced = row != null && (row.local ?? row.pk == null);
          if (neverSynced && !ofRow.some((c) => c.status === "sending")) {
            // Never reached the server: forgetting its queue is enough — a waiting change
            // included, or it would create the row once the plan is back.
            await db.outbox.bulkDelete(ofRow.map((c) => c.seq!));
            return;
          }
          await db.outbox.bulkDelete(rejected.map((c) => c.seq!));
          await db.outbox.add({ scope, entity, id, op, data: {}, updated_at, status: "pending" });
          return;
        }
        const next: CopyRow = { ...row, entity, id, pk: row?.pk ?? null, data: { ...row?.data, ...data } };
        if (!row) next.local = true;
        await db.rows.put(next);
        const carried = Object.assign({}, ...rejected.filter((c) => c.op === "upsert").map((c) => c.data)) as Record<
          string,
          unknown
        >;
        await db.outbox.bulkDelete(rejected.map((c) => c.seq!));
        const last = ofRow.filter((c) => c.scope === scope && c.status === "pending").at(-1);
        if (last && last.op === "upsert") {
          // Several edits before a round go up as one change, with the last one's time.
          await db.outbox.update(last.seq!, { data: { ...carried, ...last.data, ...data }, updated_at });
        } else {
          await db.outbox.add({ scope, entity, id, op, data: { ...carried, ...data }, updated_at, status: "pending" });
        }
      });
      engine.requestSync();
    },

    start() {
      if (started || forgotten || sharedComputer()) return;
      const other = running.get(db.name);
      if (other && other !== engine) other.stop();
      running.set(db.name, engine);
      started = true;
      captureEpoch().catch(() => undefined);
      listen();
      if (typeof window !== "undefined") {
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
      }
      poll = setInterval(tick, pollMs);
      void refreshCounts();
      void run(false);
    },

    stop: halt,

    requestSync() {
      void refreshCounts();
      if (!started) return;
      if (soon) clearTimeout(soon);
      soon = setTimeout(() => {
        soon = null;
        tick();
      }, soonMs);
    },

    syncNow: () => runFresh(false),

    async retryBlocked() {
      await runFresh(true);
    },

    async discardRejected(scope) {
      const gone = (await db.outbox.where("status").equals("rejected").toArray()).filter(
        (c) => !scope || c.scope === scope,
      );
      if (gone.length === 0) return;
      await db.transaction("rw", db.rows, db.outbox, db.meta, async () => {
        await db.outbox.bulkDelete(gone.map((c) => c.seq!));
        for (const change of gone) {
          const others = await db.outbox.where("[entity+id]").equals([change.entity, change.id]).count();
          if (others === 0) await db.rows.delete([change.entity, change.id]);
        }
        // The scope pulls afresh, so the copy shows what the server holds.
        for (const s of new Set(gone.map((c) => c.scope))) await db.meta.put({ key: lastKnowledgeKey(s), value: 0 });
      });
      await refreshCounts();
      engine.requestSync();
    },

    async rejected() {
      return db.outbox.where("status").equals("rejected").sortBy("seq");
    },

    async forget({ keepQueue }) {
      generation += 1;
      controller?.abort();
      // Its own forget() starts this engine's next session: it runs again where another
      // tab's forget() had ended it.
      forgotten = false;
      const epoch = freshEpoch();
      epochs.add(epoch);
      const tables = keepQueue ? [db.rows, db.meta] : db.tables;
      await db.transaction("rw", tables, async () => {
        for (const table of tables) await table.clear();
        await db.meta.put({ key: EPOCH, value: epoch });
      });
      // Best-effort: the epoch in `meta` still stops another tab's next round. This engine's
      // own channel hears it too, and keeps running: the epoch is already one of its own.
      postOnce(across, { epoch });
      stepCounts = {};
      set({ lastSyncedAt: null });
      await refreshCounts();
    },

    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return engine;
}

/**
 * The engine kept for `options.db` (by its name), built on first use: one engine per
 * database for the session (D15), so a company switch A→B→A finds A's engine again instead
 * of building a second one beside a round in flight. The first call's options stand: read
 * changing values (scopes, the client) through functions. A database object opened afresh
 * under the same name replaces the kept engine (the old one is stopped).
 */
export function syncEngineFor<D extends SyncDb = SyncDb>(options: SyncEngineOptions<D>): SyncEngine {
  const name = options.db.name;
  const found = kept.get(name);
  if (found && found.db === options.db) return found.engine;
  found?.engine.stop();
  const engine = createSyncEngine(options);
  kept.set(name, { db: options.db, engine });
  return engine;
}

/**
 * Let go of the engine {@link syncEngineFor} keeps for the database `name` (0.46): it is
 * stopped, its database closed and forgotten, so a later `syncEngineFor` builds afresh. Call it
 * on sign-out (and for a company left for good): every database visited in a tab otherwise
 * keeps its engine and an open IndexedDB connection until a reload. Nothing kept: a no-op.
 */
export function releaseSyncEngine(name: string): void {
  const found = kept.get(name);
  if (!found) return;
  kept.delete(name);
  found.engine.stop();
  found.db.close();
}
