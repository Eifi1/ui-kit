import { useEffect, useState } from "react";
import {
  Button,
  DEFAULT_FIELD_SYNC_LABELS,
  FIELD_SYNC_SAVED_MS,
  FieldSyncIndicator,
  FieldSyncRow,
  Input,
  Select,
  Textarea,
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
      <AutoSaveExample />
      <ExplicitSaveExample />
      <CompactIndicatorExample />
      <RtlExample />
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
  const [retries, setRetries] = useState(0);
  return (
    <Example
      label="Compact indicator"
      hint="for a table cell or a toolbar, where there is no room for a helper line"
    >
      <Stage>
        <div data-stage="wide" className="space-y-4">
          <Row className="justify-center">
            {ALL_STATES.map((state) => (
              <FieldSyncIndicator
                key={state}
                labels={t.kit.fieldSync}
                state={state}
                showLabel
                error={state === "error" ? new Error("Row is locked by another session") : null}
                onRetry={state === "error" ? () => setRetries((n) => n + 1) : undefined}
              />
            ))}
          </Row>
          {/* Icon only: the words move into the tooltip (and stay in the DOM for the
              live region). No `onRetry`, so the error state has no retry button, and
              an error with no message falls back to the translated `error` label. */}
          <Row className="justify-center">
            {ALL_STATES.map((state) => (
              <FieldSyncIndicator
                key={state}
                labels={t.kit.fieldSync}
                state={state}
                error={state === "error" ? new Error("") : null}
              />
            ))}
          </Row>
        </div>
      </Stage>
      <p className="text-xs text-[var(--text-muted)]">
        Top row: <code className="font-mono">showLabel</code> and{" "}
        <code className="font-mono">onRetry</code> (retries pressed: {retries}). Bottom row: the
        defaults — icon only, hover for the words, no retry.
      </p>
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

/* ── Auto-save after a pause, on any native control ──────────────────────── */

function AutoSaveExample() {
  const t = useT();
  const [serverNote, setServerNote] = useState("Keys are with the caretaker.");
  const [serverKind, setServerKind] = useState("flat");
  const note = useFieldSync<string>({
    value: serverNote,
    // Opt-in auto-save: 800ms after the last keystroke. The default (0) never saves
    // mid-typing; this is for a notes field where that is genuinely wanted.
    debounceMs: 800,
    onSave: async (next) => {
      await fakeSave("ok")(next);
      setServerNote(next);
    },
  });
  const kind = useFieldSync<string>({
    value: serverKind,
    onSave: async (next) => {
      await fakeSave("ok")(next);
      setServerKind(next);
    },
  });
  return (
    <Example
      label="Auto-save after a pause, on a textarea and a select"
      hint="debounceMs={800} · savedMs={4000} · the frame reaches any input, select or textarea inside the row"
    >
      <Stage>
        <FieldSyncRow sync={note} labels={t.kit.fieldSync} savedMs={4000}>
          <Textarea
            label="Handover note"
            rows={3}
            value={note.value}
            onChange={(e) => note.setValue(e.target.value)}
          />
        </FieldSyncRow>
        {/* A select commits on change: there is no half-typed value to wait for, so
            the caller saves straight away rather than on blur. */}
        <FieldSyncRow sync={kind} labels={t.kit.fieldSync}>
          <Select
            label="Unit type"
            value={kind.value}
            onChange={(e) => {
              kind.setValue(e.target.value);
              // The draft is held in a ref as well as in state, so it can be saved
              // in the same handler.
              kind.save();
            }}
          >
            <option value="flat">Flat</option>
            <option value="house">House</option>
            <option value="garage">Garage</option>
          </Select>
        </FieldSyncRow>
      </Stage>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-4">
        {(
          [
            ["note state", note.state],
            ["note on server", serverNote],
            ["unit state", kind.state],
            ["unit on server", serverKind],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[var(--text-muted)]">{k}</dt>
            <dd className="truncate text-[var(--text-primary)]">{v}</dd>
          </div>
        ))}
      </dl>
      <Note>
        Stop typing in the note for a moment and it saves without leaving the field; the green
        confirmation then stays for four seconds (<code className="font-mono">savedMs</code>) instead
        of {FIELD_SYNC_SAVED_MS / 1000}.
      </Note>
    </Example>
  );
}

/* ── Save only on request: saveOnBlur off, equals, onError, onRetry ─────── */

function ExplicitSaveExample() {
  const t = useT();
  const [serverValue, setServerValue] = useState("DE89 3704 0044 0532 0130 00");
  const [attempts, setAttempts] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((l) => [...l.slice(-5), line]);

  const sync = useFieldSync<string>({
    value: serverValue,
    // Spaces are presentation, not data: "DE89 3704…" and "DE8937 04…" are the
    // same IBAN, so re-spacing it leaves the field clean.
    equals: (a, b) => a.replace(/\s/g, "") === b.replace(/\s/g, ""),
    onSave: async (next) => {
      const attempt = attempts + 1;
      setAttempts(attempt);
      // Every first attempt fails, so the error state and its retry are reachable.
      if (attempt % 2 === 1) {
        await new Promise((r) => setTimeout(r, 450));
        throw new Error("Gateway timeout — the bank did not answer");
      }
      await fakeSave("ok")(next);
      setServerValue(next);
      add(`✓ saved ${next}`);
    },
    onError: (error) => add(`onError: ${error.message}`),
  });

  return (
    <Example
      label="Save on request only, with a custom comparison"
      hint="saveOnBlur={false} · equals ignores spaces · onError · onRetry — every other save fails here"
    >
      <Stage>
        <div className="space-y-3">
          <FieldSyncRow
            sync={sync}
            labels={t.kit.fieldSync}
            saveOnBlur={false}
            onRetry={() => {
              add("onRetry → sync.retry()");
              sync.retry();
            }}
          >
            <Input
              label="IBAN"
              value={sync.value}
              onChange={(e) => sync.setValue(e.target.value)}
            />
          </FieldSyncRow>
          <Row>
            <Button variant="secondary" onClick={sync.save} disabled={!sync.dirty}>
              Save
            </Button>
            <Button variant="ghost" onClick={sync.reset} disabled={!sync.dirty}>
              Discard
            </Button>
          </Row>
        </div>
      </Stage>
      <p className="font-mono text-xs text-[var(--text-muted)]">
        state {sync.state} · dirty {String(sync.dirty)}
      </p>
      <pre className="mt-1 max-h-32 overflow-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-[11px] text-[var(--text-secondary)]">
        {log.length ? log.join("\n") : "— nothing yet —"}
      </pre>
      <Note>
        Click away from the field: nothing is sent — with{" "}
        <code className="font-mono">saveOnBlur</code> off only the button saves. Add or remove a
        space and the field stays clean, because <code className="font-mono">equals</code> says the
        value did not change. The first save fails: <code className="font-mono">onError</code> logs
        it once, and the red mark in the field calls the caller&apos;s{" "}
        <code className="font-mono">onRetry</code> instead of the hook&apos;s own.
      </Note>
    </Example>
  );
}

/* ── Right-to-left ───────────────────────────────────────────────────────── */

function RtlExample() {
  const t = useT();
  return (
    <Example label="Right-to-left" hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}>
      <Stage>
        {(["edited", "error"] as const).map((state) => (
          <div key={state} dir="rtl">
            <FieldSyncRow sync={frozenSync(state)} labels={t.kit.fieldSync}>
              <Input aria-label={`حقل (${state})`} defaultValue="أميليا فورنييه" />
            </FieldSyncRow>
          </div>
        ))}
      </Stage>
      <p className="text-xs text-[var(--text-muted)]">
        The icon sits at the field&apos;s END and the input reserves end padding for it — logical
        sides, so in a right-to-left page both move to the left edge.
      </p>
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
