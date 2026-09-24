import { useState } from "react";
import {
  DangerConfirm,
  MiniCalendar,
  NumberField,
  NumberInput,
  SignatureView,
  UiKitProvider,
} from "@eifi1/ui-kit";
import type { WeekDay } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * The 0.6.0 additions on the numbers side, and the small items beside them:
 * NumberField's live mode and step keys, DangerConfirm, SignatureView and the
 * provider's `weekStartsOn`. Each specimen prints what it emits, because the
 * contract — when a number arrives, and which one — is the point.
 */

/** The raw value under a specimen. */
function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{children}</p>;
}

/** A tiny signature PNG drawn on the spot, so the read-only view has something real
 *  to show without a binary fixture. Browser-only, like the rest of the showcase. */
function sampleSignature(): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 120;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(30, 80);
  ctx.bezierCurveTo(60, 10, 90, 110, 120, 60);
  ctx.bezierCurveTo(140, 30, 160, 90, 190, 55);
  ctx.bezierCurveTo(215, 30, 240, 85, 290, 50);
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

function LiveCalculator() {
  const [rooms, setRooms] = useState<number | null>(3);
  const [liveRooms, setLiveRooms] = useState<number | null>(3);
  const [rate, setRate] = useState<number | null>(2.5);
  const [liveRate, setLiveRate] = useState<number | null>(2.5);
  const perRoom = 450;
  const total = (liveRooms ?? 0) * perRoom * (1 + (liveRate ?? 0) / 100);
  return (
    <Example label="NumberField — live mode and step keys" hint="type, or use ↑ ↓ and PageUp/PageDown">
      <Stage>
        <div>
          <NumberField
            label="Rooms"
            value={rooms}
            min={0.5}
            max={20}
            digits={1}
            step={0.5}
            onValueChange={setLiveRooms}
            onCommit={setRooms}
          />
          <StateLine>{`live = ${String(liveRooms)} · committed = ${String(rooms)}`}</StateLine>
        </div>
        <div>
          <NumberField
            label="Reference rate"
            unit="%"
            value={rate}
            min={0}
            max={10}
            digits={2}
            step={0.25}
            onValueChange={setLiveRate}
            onCommit={setRate}
          />
          <StateLine>{`live = ${String(liveRate)} · committed = ${String(rate)}`}</StateLine>
        </div>
        <p data-stage="wide" className="text-center text-sm text-[var(--text-primary)]">
          Rent estimate, recomputed per keystroke:{" "}
          <strong className="tabular-nums">{total.toFixed(2)}</strong>
        </p>
      </Stage>
      <Note>
        <code>onValueChange</code> fires per keystroke with the number the text reads as —{" "}
        <em>not</em> rounded or clamped yet, so typing 25 rooms shows 25 until the field is left,
        then 20. A half-typed draft (<code>-</code>, <code>12+</code>) fires nothing. On blur it
        fires once more with the committed number, so live and committed always end equal.
        Steps are decimal-exact and land on the <code>min + k × step</code> grid.
      </Note>
    </Example>
  );
}

function StepInput() {
  const [text, setText] = useState("0.1");
  return (
    <Example label="NumberInput — step keys" hint="step={0.1}, min={0}, max={1}">
      <Stage>
        <div>
          <NumberInput label="Ratio" value={text} onChange={setText} step={0.1} min={0} max={1} />
          <StateLine>{`value = "${text}"`}</StateLine>
        </div>
      </Stage>
      <Note>
        NumberInput stays a string field: <code>min</code>/<code>max</code> bound the step keys
        only. ArrowUp from 0.2 is 0.3, not 0.30000000000000004.
      </Note>
    </Example>
  );
}

function DangerSpecimens() {
  const [log, setLog] = useState("—");
  return (
    <Example label="DangerConfirm" hint="arm → guards → confirm">
      <Stage>
        <DangerConfirm
          armLabel="Wipe all data…"
          confirmLabel="Wipe everything"
          prompt="Deletes every budget and transaction. This cannot be undone."
          phrase="wipe"
          requirePassword
          onConfirm={(password) =>
            new Promise<void>((resolve) =>
              setTimeout(() => {
                setLog(`confirmed with a ${password?.length ?? 0}-character password`);
                resolve();
              }, 800),
            )
          }
        />
        <DangerConfirm
          tone="warning"
          armLabel="Load demo data…"
          confirmLabel="Replace with demo data"
          prompt="Your own entries are replaced by the demo's."
          onConfirm={() => setLog("demo data loaded")}
        />
        <DangerConfirm
          armLabel="Delete account…"
          confirmLabel="Delete my account"
          prompt="Your account and every budget in it are removed for good."
          phrase="DELETE"
          phraseMatch="exact"
          // A finished label from the app's own catalogue, and a placeholder: the label
          // then sits above the field, which the placeholder has to itself.
          labels={{ phrase: "Type DELETE, in capitals, to confirm", phrasePlaceholder: (p) => p }}
          onConfirm={() => setLog("account deleted (exact match, spaces count)")}
        />
        <DangerConfirm
          armLabel="Reset budget…"
          lockedReason="The demo is read-only — nothing here can be deleted."
          onConfirm={() => {}}
        />
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        A promise from <code>onConfirm</code> keeps the tile busy, collapses it when it resolves and
        leaves it armed (fields kept) when it rejects. <code>lockedReason</code> replaces an
        app&rsquo;s write-lock hook: the arm button stays focusable and says why it is off.
        The phrase ignores surrounding spaces unless <code>phraseMatch=&quot;exact&quot;</code>;{" "}
        <code>labels.phrase</code> takes a function of the phrase or a finished string, and{" "}
        <code>labels.phrasePlaceholder</code> moves the label above the field.
      </Note>
    </Example>
  );
}

function SignatureViews() {
  const [png] = useState(sampleSignature);
  return (
    <Example label="SignatureView — a saved signature, read-only" hint="switch the theme: the ink inverts">
      <Stage>
        <SignatureView label="Tenant" value={png} />
        <SignatureView label="Inspector" typedName="Jane Doe" />
        <SignatureView label="Witness" value={null} />
      </Stage>
    </Example>
  );
}

function WeekStart() {
  const [start, setStart] = useState<WeekDay>(1);
  const [day, setDay] = useState("2026-09-24");
  return (
    <Example label="UiKitProvider weekStartsOn" hint={`locale="en" (Sunday-first) pinned to ${start === 1 ? "Monday" : "Sunday"}`}>
      <Stage>
        <div>
          <label className="mb-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={start === 1}
              onChange={(e) => setStart(e.target.checked ? 1 : 0)}
            />
            Pin Monday
          </label>
          <UiKitProvider locale="en" weekStartsOn={start}>
            <MiniCalendar mode="single" from={day} to={day} onSelect={(iso) => setDay(iso)} />
          </UiKitProvider>
        </div>
      </Stage>
      <Note>
        Resolved as: the calendar&rsquo;s own <code>weekStartsOn</code>, else the provider&rsquo;s,
        else the locale&rsquo;s week info, else Monday. DatePicker and DateRangePicker render
        MiniCalendar, so they follow; <code>useKitWeekStart()</code> reads it for a grid of your own.
      </Note>
    </Example>
  );
}

/* Placed by the page each specimen belongs to, not by the release it shipped in. */

/** Numbers & money: live mode and step keys. */
export function NumberStepsDemo() {
  return (
    <>
      <LiveCalculator />
      <StepInput />
    </>
  );
}

/** Signature, password & confirmation: the arm-then-confirm tile. */
export function DangerConfirmDemo() {
  return <DangerSpecimens />;
}

/** Signature, password & confirmation: a saved signature shown read-only. */
export function SignatureViewDemo() {
  return <SignatureViews />;
}

/** Dates & time: the week start pinned on the provider. */
export function WeekStartDemo() {
  return <WeekStart />;
}
