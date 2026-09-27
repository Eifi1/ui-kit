import { useState } from "react";
import {
  Button,
  Checkbox,
  ErrorBoundary,
  Input,
  LoadingState,
  ProgressBar,
  Skeleton,
  formatMoney,
  useHotkey,
} from "@eifi1/ui-kit";
import type { ProgressBarSegment } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * The 0.12 states on the Feedback page — LoadingState, Skeleton `label`, the kit's
 * ErrorBoundary and the ProgressBar extras (`max={null}`, `hint`, `overage`,
 * `legendValue`, `legendOnly`) — and `useHotkey` for the Hooks page.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const CAPTION = "text-xs text-[var(--text-muted)]";

/* ── LoadingState ─────────────────────────────────────────────────────────── */

function LoadingStateDemo() {
  return (
    <Example label="LoadingState — sizes, inline and a label of its own" hint='role="status" on the wrapper; the spinner is decorative'>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-[var(--border)]">
          <p className={`${CAPTION} px-2 pt-2`}>size=&quot;sm&quot;</p>
          <LoadingState size="sm" />
        </div>
        <div className="rounded-md border border-[var(--border)]">
          <p className={`${CAPTION} px-2 pt-2`}>size=&quot;md&quot; (default)</p>
          <LoadingState label="Loading transactions…" />
        </div>
        <div className="rounded-md border border-[var(--border)]">
          <p className={`${CAPTION} px-2 pt-2`}>size=&quot;lg&quot;</p>
          <LoadingState size="lg" label="Preparing the report…" />
        </div>
      </div>
      <div className="mt-3 rounded-md border border-[var(--border)] px-2">
        <LoadingState size="sm" inline label="inline — spinner beside the words" />
      </div>
      <div className="mt-3">
        <Note>
          The default words are {code("common.loading")} from the provider, so they follow the language menu. The
          words are visible text inside the status region and the spinner has {code("label={null}")}, so a reader
          hears &ldquo;Loading…&rdquo; once, not twice.
        </Note>
      </div>
    </Example>
  );
}

/* ── Skeleton label ──────────────────────────────────────────────────────── */

function SkeletonLabelDemo() {
  const [loaded, setLoaded] = useState(false);
  return (
    <Example label="Skeleton — label announces the load once" hint="the grey bars stay aria-hidden">
      <Row className="mb-3">
        <Button variant="secondary" size="sm" onClick={() => setLoaded((v) => !v)}>
          {loaded ? "Load again" : "Finish loading"}
        </Button>
        <span className={READOUT}>{loaded ? "loaded" : 'label="Loading activity…"'}</span>
      </Row>
      {loaded ? (
        <ul className="space-y-1 text-sm text-[var(--text-primary)]">
          <li>Anna paid the March rent</li>
          <li>Ben uploaded statement.pdf</li>
          <li>Carla changed the budget for Groceries</li>
        </ul>
      ) : (
        <Skeleton label="Loading activity…" lines={3} />
      )}
      <div className="mt-3">
        <Note>
          With {code("label")} the placeholder is wrapped in a {code('role="status"')} region whose only text is the
          label (visually hidden); without it a skeleton announces nothing, as before.
        </Note>
      </div>
    </Example>
  );
}

/* ── ErrorBoundary ───────────────────────────────────────────────────────── */

function Fragile({ broken, what }: { broken: boolean; what: string }) {
  if (broken) throw new TypeError(`Cannot read properties of undefined (reading '${what}')`);
  return <p className="text-sm text-[var(--text-primary)]">The balance chart would be here — all fine.</p>;
}

function ErrorBoundaryDemo() {
  const [broken, setBroken] = useState(false);
  const [brokenCustom, setBrokenCustom] = useState(false);
  // A key of its own, bumped only by the outside fix. Tying resetKeys to the flag that
  // breaks the child would reset in the very update that threw (see the report).
  const [fixKey, setFixKey] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const note = (s: string) => setLog((l) => [...l.slice(-3), s]);
  return (
    <Example
      label="ErrorBoundary — Retry, details and a fallback of your own"
      hint="the button makes the child throw during render"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <p className={CAPTION}>default fallback, showDetails, headingAs=&quot;h4&quot;</p>
          <Button variant="secondary" size="sm" tone="danger" onClick={() => setBroken(true)} disabled={broken}>
            Break the child
          </Button>
          <div className="rounded-md border border-[var(--border)] p-2">
            <ErrorBoundary
              showDetails
              headingAs="h4"
              onError={(e) => note(`onError: ${e instanceof Error ? e.message : String(e)}`)}
              onReset={() => {
                note("onReset → child renders again");
                setBroken(false);
              }}
            >
              <Fragile broken={broken} what="balance" />
            </ErrorBoundary>
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <p className={CAPTION}>fallback as a render function, and resetKeys</p>
          <Row>
            <Button variant="secondary" size="sm" tone="danger" onClick={() => setBrokenCustom(true)} disabled={brokenCustom}>
              Break this one
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBrokenCustom(false);
                setFixKey((k) => k + 1);
              }}
              disabled={!brokenCustom}
            >
              Fix from outside (resetKeys)
            </Button>
          </Row>
          <div className="rounded-md border border-[var(--border)] p-2">
            <ErrorBoundary
              resetKeys={[fixKey]}
              onReset={() => setBrokenCustom(false)}
              fallback={({ details, reset }) => (
                <div role="alert" className="space-y-2 text-sm">
                  <p className="font-medium text-[var(--danger)]">{details.name}</p>
                  <p className="break-words text-[var(--text-secondary)]">{details.message}</p>
                  <Button size="sm" variant="secondary" onClick={reset}>
                    reset()
                  </Button>
                </div>
              )}
            >
              <Fragile broken={brokenCustom} what="rows" />
            </ErrorBoundary>
          </div>
        </div>
      </div>
      <p className={`${READOUT} mt-3 whitespace-pre-wrap`}>{log.length ? log.join("\n") : "callbacks: —"}</p>
      <div className="mt-3">
        <Note>
          The default fallback is {code('EmptyState tone="danger"')} with {code('role="alert"')}, its words from{" "}
          {code("errorBoundary.*")}. {code("showDetails")} is the disclosure with the full report (on by default since 0.13 — see
          the crash-screen examples below). A change in {code("resetKeys")} clears a shown error
          (pass the route path so a broken page does not carry its fallback to the next). The browser console logs
          the throw too — that is React, not a second failure.
        </Note>
      </div>
    </Example>
  );
}

/* ── ProgressBar extras ──────────────────────────────────────────────────── */

const BUCKETS: ProgressBarSegment[] = [
  { key: "essential", label: "Essential", value: 48, tone: "income" },
  { key: "flexible", label: "Flexible", value: 27, tone: "info" },
  { key: "discretionary", label: "Discretionary", value: 15, tone: "expense" },
  // Empty buckets: named in the legend, left out of the bar and the sum.
  { key: "luxury", label: "Luxury", value: 0, tone: "warning", legendOnly: true },
  { key: "gifts", label: "Gifts", value: 0, tone: "danger", legendOnly: true },
];
const OUTFLOW: Record<string, number> = { essential: 2400, flexible: 1350, discretionary: 750, luxury: 0, gifts: 0 };

function ProgressBarExtrasDemo() {
  const [used, setUsed] = useState(7);
  return (
    <Example
      label="ProgressBar — unlimited, hint, overage and legend values"
      hint="max={null}, hint, overage, legendValue, legendOnly"
    >
      <div className="space-y-5">
        <ProgressBar
          label="Projects (unlimited plan)"
          value={42}
          max={null}
          hint="max={null}: no bar is drawn — the value and “Unlimited” are the content"
        />
        <div className="space-y-2">
          <Row>
            <Button variant="secondary" size="sm" onClick={() => setUsed((u) => Math.max(0, u - 1))}>
              − seat
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setUsed((u) => u + 1)}>
              + seat
            </Button>
            <span className={READOUT}>value={used} max=5</span>
          </Row>
          <ProgressBar
            label="Seats"
            value={used}
            max={5}
            showValue
            formatValue={(v, max) => `${v} of ${max}`}
            tone={used > 5 ? "danger" : "brand"}
            hint="Resets on 1 August"
            overage
          />
          <ProgressBar
            label="Storage"
            value={used * 2}
            max={10}
            showValue
            formatValue={(v, max) => `${v} of ${max} GB`}
            tone={used * 2 > 10 ? "danger" : "brand"}
            overage={(over) => `${over} GB over — ${formatMoney(over * 0.5, "EUR")} extra this month`}
          />
        </div>
        <ProgressBar
          label="Outflow by bucket"
          segments={BUCKETS}
          legend
          legendValue={(seg, share) => (
            <span className="tabular-nums">
              {share} · {formatMoney(OUTFLOW[seg.key ?? ""] ?? 0, "EUR")}
            </span>
          )}
          hint="Luxury and Gifts are legendOnly: named under the bar, not drawn in it"
        />
      </div>
      <div className="mt-3">
        <Note>
          {code("overage")}: {code("true")} prints {code("progressBar.overLimit")} with the excess; a function renders the
          line itself. The bar stays full at {code("max")} either way — the tone above switches to danger by hand.{" "}
          {code("hint")} is a muted line the bar is described by. {code("legendValue")} replaces each legend
          row&rsquo;s figure (here the share AND an amount); a {code("legendOnly")} segment is listed but leaves the bar,
          the sum and the {code("aria-valuetext")}.
        </Note>
      </div>
    </Example>
  );
}

export function StatesDemo() {
  return (
    <>
      <LoadingStateDemo />
      <SkeletonLabelDemo />
      <ErrorBoundaryDemo />
      <ProgressBarExtrasDemo />
    </>
  );
}

/* ── useHotkey (Hooks page) ──────────────────────────────────────────────── */

function describe(e: KeyboardEvent): string {
  const mods = [e.ctrlKey && "Ctrl", e.metaKey && "Meta", e.altKey && "Alt", e.shiftKey && "Shift"].filter(Boolean);
  return [...mods, e.key === " " ? "Space" : e.key].join("+");
}

export function HotkeyDemo() {
  const [enabled, setEnabled] = useState(true);
  const [allowInInputs, setAllowInInputs] = useState(false);
  const [last, setLast] = useState("—");
  const [count, setCount] = useState(0);
  const fire = (name: string) => (e: KeyboardEvent) => {
    setLast(`${name}  (event: ${describe(e)})`);
    setCount((c) => c + 1);
  };
  useHotkey("Mod+Shift+L", fire("Mod+Shift+L"), { enabled, allowInInputs });
  useHotkey(["Alt+ArrowUp", "Alt+ArrowDown"], fire("Alt+ArrowUp | Alt+ArrowDown"), { enabled, allowInInputs });
  useHotkey("g", fire("g"), { enabled, allowInInputs });
  useHotkey("?", fire("?"), { enabled, allowInInputs });
  return (
    <Example
      label="useHotkey(combo, handler, options)"
      hint="Mod is ⌘ on Apple platforms and Ctrl elsewhere"
    >
      <Row className="mb-3">
        <Checkbox label="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <Checkbox
          label="allowInInputs"
          checked={allowInInputs}
          onChange={(e) => setAllowInInputs(e.target.checked)}
        />
      </Row>
      <p className="mb-2 text-sm text-[var(--text-secondary)]">
        Press <kbd className="font-mono">Mod+Shift+L</kbd>, <kbd className="font-mono">Alt+↑</kbd> /{" "}
        <kbd className="font-mono">Alt+↓</kbd>, <kbd className="font-mono">g</kbd> or{" "}
        <kbd className="font-mono">?</kbd> anywhere on the page — then again while typing in the field.
      </p>
      <div className="mb-3 max-w-xs">
        <Input label="Type here" placeholder="g and ? are ignored while typing" />
      </div>
      <p className={READOUT} aria-live="polite">
        last: {last} · fired {count}×
      </p>
      <div className="mt-3">
        <Note>
          Modifiers match exactly — {code("Mod+Shift+L")} does not fire on Mod+L. In a text field a plain key
          ({code("g")}, {code("?")}) is left alone so it does not steal letters, while a combo with Ctrl / Meta / Alt
          still fires; tick {code("allowInInputs")} to take the plain keys too. A held key fires once, and the
          handler can change without re-attaching the listener. The ⌘K palette keeps {code("useCommandKey")}.
        </Note>
      </div>
    </Example>
  );
}
