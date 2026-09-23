import { useEffect, useState } from "react";
import {
  Button,
  DEFAULT_FIELD_SYNC_LABELS,
  FIELD_SYNC_SAVED_MS,
  FieldSyncIndicator,
  FieldSyncRow,
  Input,
  ToggleGroup,
  useFieldSync,
} from "@eifi1/ui-kit";
import type { FieldSyncState, UseFieldSyncReturn } from "@eifi1/ui-kit";
import { ConstList, Example, Note, Row, Swatch, Stage } from "../lib/section";
import { useT } from "../i18n";

/** How a fake server behaves for the specimens below. */
type Behaviour = "ok" | "slow" | "fail";

const BEHAVIOURS: Array<{ value: Behaviour; label: string }> = [
  { value: "ok", label: "Succeeds" },
  { value: "slow", label: "Slow (2s)" },
  { value: "fail", label: "Fails" },
];

/** A stand-in for a PATCH. Nothing here talks to a network — the whole showcase is
 *  frontend fixtures, so "the server" is a promise on a timer. */
function fakeSave(behaviour: Behaviour) {
  return (next: string) =>
    new Promise<void>((resolve, reject) => {
      const delay = behaviour === "slow" ? 2000 : 450;
      setTimeout(() => {
        if (behaviour === "fail") {
          reject(new Error(`Row is locked by another session — could not write "${next}"`));
        } else {
          resolve();
        }
      }, delay);
    });
}

export function FieldSync() {
  return (
    <>
      <Note>
        Nothing on this page reaches a network. &ldquo;The server&rdquo; below is a promise on a
        timer, which is the whole point of a design-system showcase: the kit is domain-free, so
        there is no API to mock — a component takes its data as props and hands events back as
        callbacks.
      </Note>

      <StatesExample />
      <LiveFieldExample />
      <RaceExample />
      <CompactIndicatorExample />
      <TokensExample />
    </>
  );
}

/* ── The four states, side by side ───────────────────────────────────────── */

const ALL_STATES: FieldSyncState[] = ["synced", "pending", "edited", "error"];

function StatesExample() {
  // Threaded exactly as a consuming app must: the kit ships no catalogue.
  const t = useT();
  return (
    <Example
      label="The four states"
      hint="frame colour plus an icon at the end of the field — hover the red mark for the reason"
    >
      <Stage>
        <div data-stage="wide" className="grid gap-4 sm:grid-cols-2">
          <CyclingSaved label="synced — shown for a moment after a save" />
          {(["edited", "pending", "error"] as const).map((state) => (
            <FieldSyncRow key={state} sync={frozenSync(state)} labels={t.kit.fieldSync}>
              <Input label={state} defaultValue="Amelia Fournier" />
            </FieldSyncRow>
          ))}
        </div>
      </Stage>
      <Note>
        <strong>The field never changes size.</strong> The state is the frame&apos;s colour and an
        icon inside the field&apos;s end — a pencil while edited, a spinning circle for as long as
        the save is in flight, a green check that fades after {FIELD_SYNC_SAVED_MS / 1000}s, and a
        red mark whose tooltip is the reason (click it to retry). Colour is never the only signal:
        each state has its own icon, and the state text is announced through a live region.
      </Note>
    </Example>
  );
}

/** The saved state only exists for a moment after a save lands, so this specimen
 *  lands one every few seconds: pending, then synced — check, green frame, fade. */
function CyclingSaved({ label }: { label: string }) {
  const t = useT();
  const [state, setState] = useState<FieldSyncState>("pending");
  useEffect(() => {
    const id = setInterval(
      () => setState((s) => (s === "pending" ? "synced" : "pending")),
      state === "pending" ? 1200 : 3000,
    );
    return () => clearInterval(id);
  }, [state]);
  return (
    <FieldSyncRow sync={frozenSync(state)} labels={t.kit.fieldSync}>
      <Input label={label} defaultValue="Amelia Fournier" />
    </FieldSyncRow>
  );
}

/** A `useFieldSync` result pinned to one state, for the side-by-side specimen. */
function frozenSync(state: FieldSyncState): UseFieldSyncReturn<string> {
  return {
    value: "",
    setValue: () => {},
    state,
    error: state === "error" ? new Error("Row is locked by another session") : null,
    dirty: state !== "synced",
    save: () => {},
    retry: () => {},
    reset: () => {},
  };
}

function CompactIndicatorExample() {
  const t = useT();
  return (
    <Example
      label="Compact indicator"
      hint="for a table cell or a toolbar, where there is no room for a helper line"
    >
      <Stage>
        <Row>
          {ALL_STATES.map((state) => (
            <FieldSyncIndicator
              key={state}
              labels={t.kit.fieldSync}
              state={state}
              showLabel
              error={state === "error" ? new Error("Row is locked by another session") : null}
              onRetry={state === "error" ? () => {} : undefined}
            />
          ))}
        </Row>
      </Stage>
    </Example>
  );
}

/* ── A real field, wired end to end ──────────────────────────────────────── */

function LiveFieldExample() {
  // Threaded exactly as a consuming app must: the kit ships no catalogue.
  const t = useT();
  const [behaviour, setBehaviour] = useState<Behaviour>("ok");
  const [serverValue, setServerValue] = useState("Amelia Fournier");

  const sync = useFieldSync<string>({
    value: serverValue,
    onSave: async (next) => {
      await fakeSave(behaviour)(next);
      setServerValue(next);
    },
  });

  return (
    <Example
      label="A database-backed field"
      hint="type, then click away or press Enter — it saves on blur, never mid-typing"
    >
      <Row className="mb-4">
        <ToggleGroup
          options={BEHAVIOURS.map((b) => ({ value: b.value, label: b.label }))}
          value={behaviour}
          onChange={(v) => setBehaviour(v as Behaviour)}
        />
      </Row>

      <Stage>
        <FieldSyncRow sync={sync} labels={t.kit.fieldSync}>
          <Input
            label="Account holder"
            value={sync.value}
            onChange={(e) => sync.setValue(e.target.value)}
            // Blur is FieldSyncRow's own (`saveOnBlur`); Enter is the caller's, because
            // only a single-line field means "done" by it.
            onKeyDown={(e) => {
              if (e.key === "Enter") sync.save();
            }}
          />
        </FieldSyncRow>
      </Stage>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={sync.save} disabled={!sync.dirty}>
          Save now
        </Button>
        <Button variant="ghost" onClick={sync.reset} disabled={!sync.dirty}>
          Discard
        </Button>
        <Button
          variant="ghost"
          onClick={() => setServerValue("Changed by someone else")}
          title="Simulate another session writing this row"
        >
          External update
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-4">
        {(
          [
            ["state", sync.state],
            ["dirty", String(sync.dirty)],
            ["draft", sync.value],
            ["server", serverValue],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[var(--text-muted)]">{k}</dt>
            <dd className="truncate text-[var(--text-primary)]">{v}</dd>
          </div>
        ))}
      </dl>

      <Note>
        <strong>External update</strong> writes the row from &ldquo;another session&rdquo;. While
        the field is clean the new value is adopted; while you have unsaved edits it is{" "}
        <em>ignored</em>, because taking it would delete what you are typing. The draft keeps
        winning until it is saved or discarded.
      </Note>
    </Example>
  );
}

/* ── The transition that is easy to get wrong ────────────────────────────── */

function RaceExample() {
  // Threaded exactly as a consuming app must: the kit ships no catalogue.
  const t = useT();
  const [log, setLog] = useState<string[]>([]);
  const [serverValue, setServerValue] = useState("start");

  const sync = useFieldSync<string>({
    value: serverValue,
    onSave: async (next) => {
      setLog((l) => [...l, `→ PATCH "${next}"`]);
      await new Promise((r) => setTimeout(r, 1500));
      setServerValue(next);
      setLog((l) => [...l, `✓ committed "${next}"`]);
    },
  });

  return (
    <Example
      label="An edit made mid-flight is not lost"
      hint="saves are slow here (1.5s) — type, press Enter, keep typing while it spins, then click away"
    >
      <Stage>
        <FieldSyncRow sync={sync} labels={t.kit.fieldSync}>
          <Input
            label="Slow field"
            value={sync.value}
            onChange={(e) => sync.setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sync.save();
            }}
          />
        </FieldSyncRow>
      </Stage>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)]">Save log</span>
        <Button variant="ghost" onClick={() => setLog([])} disabled={!log.length}>
          Clear
        </Button>
      </div>
      <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-[11px] text-[var(--text-secondary)]">
        {log.length ? log.join("\n") : "— nothing sent yet —"}
      </pre>

      <Note>
        A save in flight is neither cancelled nor raced. Cancelling would drop the keystroke that
        arrived mid-flight; firing immediately would let two writes land out of order. The hook
        waits for the first to settle, compares the draft again, and sends the difference exactly
        once — so the log always ends committed to what is on screen.
      </Note>
    </Example>
  );
}

/* ── The tokens underneath ───────────────────────────────────────────────── */

function TokensExample() {
  return (
    <Example label="Tokens & labels" hint="theme-aware, and deliberately not per-palette">
      <Stage>
        <div data-stage="wide" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Swatch name="--status-synced" value="var(--status-synced)" />
          <Swatch name="--status-pending" value="var(--status-pending)" />
          <Swatch name="--status-edited" value="var(--status-edited)" />
          <Swatch name="--status-error" value="var(--status-error)" />
        </div>
      </Stage>
      <div className="mt-4">
        <ConstList
          items={Object.entries(DEFAULT_FIELD_SYNC_LABELS).map(([k, v]) => [
            `DEFAULT_FIELD_SYNC_LABELS.${k}`,
            v,
          ])}
        />
      </div>
      <Note>
        These four are the only colours in the kit that are <em>not</em> part of{" "}
        <code className="font-mono">TokenSet</code> and do not change with the palette preset. They
        are functional signals, like a traffic light: a field that means &ldquo;saved&rdquo; must
        not change meaning because somebody picked a different appearance. They do flip with
        light/dark, because contrast is not optional — all four clear WCAG AA for normal text
        against the worst of the three surfaces in both themes.
      </Note>
    </Example>
  );
}
