import { useState } from "react";
import { Button, SyncStatusIndicator, ToggleGroup } from "@eifi1/ui-kit";
import { isSharedComputer } from "@eifi1/ui-kit/offline";
import {
  createSyncDb,
  createSyncEngine,
  useSyncQuery,
  useSyncStatus,
  useSyncWorker,
  type SyncDb,
  type SyncEngine,
  type SyncRequestBody,
  type SyncResponseBody,
} from "@eifi1/ui-kit/sync";
import { Example, Note, Row, StateLine, code, READOUT_PRE } from "../lib/section";

/**
 * LOCAL-FIRST, PHASE 3 (0.46, docs/local-first-harmonization.md §2.3): the sync engine on a
 * real Dexie copy in this browser, against a pretend server held in memory. Nothing leaves
 * the page. Without IndexedDB (a test's jsdom) the page shows the recipe only.
 */

type Server = "online" | "offline" | "lapsed" | "error";

/** The pretend server: rows in memory, a knowledge counter, and the mode picked above. */
function pretendServer(mode: () => Server) {
  const rows = new Map<string, { entity: string; id: string; data: Record<string, unknown>; pk: number; knowledge: number }>();
  let knowledge = 0;
  let pk = 1;
  return async (body: SyncRequestBody): Promise<SyncResponseBody> => {
    await new Promise((r) => setTimeout(r, 400));
    const now = mode();
    if (now === "offline") throw Object.assign(new Error("Network Error"), { isAxiosError: true, response: undefined });
    if (now === "error") throw Object.assign(new Error("Server error"), { isAxiosError: true, response: { status: 503, data: {} } });
    const refused = now === "lapsed" && body.changes.length > 0;
    if (!refused) {
      for (const change of body.changes) {
        knowledge += 1;
        const key = `${change.entity}:${change.id}`;
        if (change.op === "delete") rows.delete(key);
        else rows.set(key, { entity: change.entity, id: change.id, data: change.data ?? {}, pk: rows.get(key)?.pk ?? pk++, knowledge });
      }
    }
    return {
      server_knowledge: knowledge,
      changes: [...rows.values()]
        .filter((r) => r.knowledge > body.last_knowledge)
        .map((r) => ({ entity: r.entity, id: r.id, op: "upsert" as const, pk: r.pk, data: r.data })),
      refused: refused
        ? { code: "billing_read_only", detail: "Read-only for now: changes need an active plan", change_ids: body.changes.map((c) => c.id) }
        : null,
      rejections: [],
      page_cursor: null,
    };
  };
}

const HAS_INDEXED_DB = typeof indexedDB !== "undefined";

/** What the pretend server does now: one per page, like the server it stands for. */
const pretend = { mode: "online" as Server };

function buildDemo(): { db: SyncDb; engine: SyncEngine } | null {
  if (!HAS_INDEXED_DB) return null;
  const db = createSyncDb("eifi1-showcase-sync-demo");
  const engine = createSyncEngine({
    db,
    scopes: () => ["notes"],
    send: pretendServer(() => pretend.mode),
    sharedComputer: () => false, // the page's own choice below
  });
  return { db, engine };
}

function useDemoEngine(): { db: SyncDb; engine: SyncEngine; setServer: (s: Server) => void; server: Server } | null {
  const [server, setServerState] = useState<Server>(pretend.mode);
  const [built] = useState(buildDemo);
  if (!built) return null;
  const setServer = (next: Server) => {
    pretend.mode = next;
    setServerState(next);
  };
  return { ...built, server, setServer };
}

function EngineDemo() {
  const demo = useDemoEngine();
  const shared = isSharedComputer();
  // kastlan's recipe: no engine on a computer marked shared (D15).
  useSyncWorker(demo && !shared ? demo.engine : null);
  const { status, onSync } = useSyncStatus(demo?.engine ?? null);
  const notes = useSyncQuery(demo?.db ?? null, (db) => db.rows.where("entity").equals("notes").count(), []);
  const queue = useSyncQuery(demo?.db ?? null, (db) => db.outbox.toArray(), []);
  const [count, setCount] = useState(1);

  if (!demo) {
    return (
      <Example label="createSyncEngine — a Dexie copy in this browser, a pretend server in memory" hint="needs IndexedDB">
        <Note>This browser has no IndexedDB: the recipe below shows the wiring.</Note>
      </Example>
    );
  }
  const { engine, server, setServer } = demo;
  const state = engine.getState();
  const statuses = (queue.data ?? []).map((c) => c.status).join(", ") || "empty";

  return (
    <Example
      label="createSyncEngine — a Dexie copy in this browser, a pretend server in memory"
      hint="one request per scope; a refused change is kept per change; errors back off 5 s, 15 s, 60 s, 5 min"
    >
      <Row>
        <ToggleGroup<Server>
          aria-label="What the pretend server does"
          value={server}
          onChange={setServer}
          options={[
            { value: "online", label: "Answers" },
            { value: "offline", label: "No connection" },
            { value: "lapsed", label: "Plan lapsed" },
            { value: "error", label: "Server error" },
          ]}
        />
        <SyncStatusIndicator status={status} onSync={onSync} showLabel />
      </Row>
      <Row className="mt-3">
        <Button
          variant="secondary"
          onClick={() => {
            setCount((n) => n + 1);
            void engine.write("notes", "notes", crypto.randomUUID(), "upsert", { text: `Note ${count}` });
          }}
        >
          Write a note
        </Button>
        <Button variant="ghost" onClick={() => void engine.forget({ keepQueue: true })}>
          Sign out (keep the queue)
        </Button>
        <Button variant="ghost" onClick={() => void engine.forget({ keepQueue: false })}>
          Forget everything
        </Button>
      </Row>
      <StateLine label="phase">{state.phase}</StateLine>
      <StateLine label="counts">{JSON.stringify(state.counts)}</StateLine>
      <StateLine label="next retry">{state.nextRetryAt ? new Date(state.nextRetryAt).toLocaleTimeString() : "—"}</StateLine>
      <StateLine label="notes in the copy">{notes.data ?? "…"}</StateLine>
      <StateLine label="outbox">{statuses}</StateLine>
      {shared && <Note>This tab is marked a shared computer: the engine does not start.</Note>}
      <Note>
        A write lands in the copy at once and syncs 800 ms later. {code("Plan lapsed")} keeps the changes as{" "}
        {code("waiting")} (sent again every round); {code("No connection")} waits for the {code("online")} event or
        the 30 s poll, with no retry timer; {code("Server error")} retries on the backoff.
      </Note>
    </Example>
  );
}

const RECIPE = `import { isSharedComputer } from "@eifi1/ui-kit/offline";
import { createSyncDb, createSyncEngine, useSyncStatus, useSyncWorker } from "@eifi1/ui-kit/sync";

// One database and one engine per account and company (D15).
const db = createSyncDb(\`kastlan-handover-\${user}-\${company}\`, {
  extraStores: { photos: "id, roomId, status" },
  upgrades: [{ version: 2, upgrade: (tx) => tx.table("outbox").toCollection().modify({ scope: "handover" }) }],
});
const engine = createSyncEngine({
  db,
  scopes: () => scopesOf(role),        // handover, meetings, meters, maintenance, contacts
  send: (body, signal) => api.post("/sync", body, { signal }).then((r) => r.data),
  paged: true,
  holdCodes: ["billing_read_only", "plan_limit"],
  steps: [photoUpload],                // checks ctx.isCurrent() before it writes
  paused: deviceSyncPaused,
});

useSyncWorker(isSharedComputer() ? null : engine);   // in the signed-in layout
const { status, onSync } = useSyncStatus(engine);    // → <SyncStatusIndicator status={status} onSync={onSync} />
await engine.write("handover", "handover_rooms", id, "upsert", { notes });
await engine.forget({ keepQueue: true });            // at sign-out`;

export function SyncDemo() {
  return (
    <>
      <EngineDemo />
      <Example label="The wiring — kastlan's handover copy" hint="dexie is an optional peer of @eifi1/ui-kit/sync only">
        <pre className={READOUT_PRE}>{RECIPE}</pre>
        <Note>
          The leaf utilities {code("stampAfter")}, {code("isOfflineError")}, {code("readLocalFirst")} and{" "}
          {code("writeLocalFirst")} come from either {code("@eifi1/ui-kit/offline")} or {code("/sync")}: one module,
          no Dexie and no TanStack behind it.
        </Note>
      </Example>
    </>
  );
}
