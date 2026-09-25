import { useEffect, useMemo, useRef, useState } from "react";
import { Button, CopyButton, Input, copyToClipboard, useCopyToClipboard, useDebounce, useDebouncedCallback } from "@eifi1/ui-kit";
import type { CopyState } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, Stage } from "../lib/section";

/**
 * CLIPBOARD & TIMING — two small non-visual families 0.8.0 added: copying that reports
 * whether it worked, and debouncing with the cleanup every hand-rolled copy forgot.
 *
 * The failure specimens SIMULATE a browser without a clipboard: for the length of one
 * click they shadow `navigator.clipboard` and `document.execCommand` with versions that
 * refuse, then put the real ones back. That is the plain-http LAN build keksdose
 * reported, reproduced on demand — the kit code that runs is the real one.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

/** Shadow both copy paths with refusing stand-ins until the next macrotask — long
 *  enough for the click's copy (a rejected promise, then the legacy fallback) to run. */
function breakClipboardForOneClick() {
  const nav = navigator as Navigator & { clipboard?: Clipboard };
  Object.defineProperty(nav, "clipboard", {
    configurable: true,
    value: { writeText: () => Promise.reject(new Error("simulated: no Clipboard API")) },
  });
  Object.defineProperty(document, "execCommand", { configurable: true, value: () => false });
  setTimeout(() => {
    // Deleting the own properties uncovers the prototype's real ones again.
    delete (nav as { clipboard?: unknown }).clipboard;
    delete (document as { execCommand?: unknown }).execCommand;
  }, 50);
}

const IBAN = "DE89 3704 0044 0532 0130 00";

function CopyButtons() {
  const [results, setResults] = useState<string[]>([]);
  const log = (what: string) => (ok: boolean) => setResults((r) => [`${what}: ${ok}`, ...r].slice(0, 5));
  const [rows, setRows] = useState(3);
  return (
    <Example
      label="CopyButton — icon and label, and a copy that fails"
      hint="the state comes from the result; a failure looks and sounds different from success"
    >
      <Stage>
        <div data-stage="wide" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="font-mono">{IBAN}</span>
            <CopyButton text={IBAN} label="Copy IBAN" onCopied={log("icon")} />
            <CopyButton text={IBAN} label="Copy IBAN" size="md" buttonVariant="secondary" tooltipSide="bottom" onCopied={log("icon md")} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton
              variant="label"
              text={() => ["date;text;amount", ...Array.from({ length: rows }, (_, i) => `2026-09-0${i + 1};row ${i + 1};${(i + 1) * 10}`)].join("\n")}
              label={`Copy ${rows} rows as CSV`}
              resetAfter={4000}
              onCopied={log("csv")}
            />
            <Button variant="ghost" onClick={() => setRows((n) => (n % 9) + 1)}>
              Change the row count
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2" onClickCapture={breakClipboardForOneClick}>
            <CopyButton variant="label" buttonVariant="ghost" text="this will not arrive" label="Copy (simulated failure)" onCopied={log("failing label")} />
            <CopyButton text="this will not arrive" label="Copy (simulated failure)" tooltipPortal onCopied={log("failing icon")} />
            <CopyButton
              variant="label"
              text="this will not arrive"
              label="Kopieren"
              labels={{ copied: "Kopiert", failed: "Nicht kopiert", failedAnnouncement: "Kopieren fehlgeschlagen" }}
              onCopied={log("own labels")}
            />
          </div>
        </div>
      </Stage>
      <p className={READOUT}>onCopied: {results.length ? results.join(" · ") : "—"}</p>
      <div className="mt-3">
        <Note>
          The icon variant is a square <code className="font-mono">IconButton</code> (
          <code className="font-mono">size</code>, default <code className="font-mono">sm</code>)
          whose tooltip states the result on <code className="font-mono">tooltipSide</code>; its
          accessible name stays <code className="font-mono">label</code> in every state, and the
          result is spoken through a live region — polite for success, assertive for failure. The
          label variant&apos;s words change instead. <code className="font-mono">text</code> as a
          function is read at click time, so the CSV button copies the current row count.{" "}
          <code className="font-mono">resetAfter</code> is how long the result stays (4 s on the CSV
          button, 2 s elsewhere). The third row is wired to a browser with no clipboard at all: it
          says &ldquo;Couldn&rsquo;t copy&rdquo;, in the page&apos;s language — or, on the last button,
          in its own <code className="font-mono">labels</code>.
        </Note>
      </div>
    </Example>
  );
}

const STATE_TONE: Record<CopyState, string> = {
  idle: "text-[var(--text-muted)]",
  copied: "text-[var(--success)]",
  failed: "text-[var(--danger)]",
};

function CopyHook() {
  const { state, copy, reset } = useCopyToClipboard({ resetAfter: 0 });
  const [helper, setHelper] = useState<string>("—");
  const [value, setValue] = useState("https://example.com/invite/7Q2-KD9");
  return (
    <Example
      label="useCopyToClipboard / copyToClipboard"
      hint="the headless half: state, copy(text) → Promise<boolean>, reset(); and the bare function"
    >
      <Stage>
        <Input aria-label="Text to copy" value={value} onChange={(e) => setValue(e.target.value)} />
      </Stage>
      <Row>
        <Button variant="secondary" onClick={() => void copy(value)}>
          copy(value)
        </Button>
        <span onClickCapture={breakClipboardForOneClick}>
          <Button variant="secondary" onClick={() => void copy(value)}>
            copy(value) — simulated failure
          </Button>
        </span>
        <Button variant="ghost" onClick={reset}>
          reset()
        </Button>
        <Button variant="ghost" onClick={() => void copyToClipboard(value).then((ok) => setHelper(String(ok)))}>
          copyToClipboard(value)
        </Button>
      </Row>
      <OutTable
        rows={[
          ["state", <span key="s" className={STATE_TONE[state]}>{state}</span>],
          ["await copyToClipboard(value)", helper],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">resetAfter: 0</code> here, so the state stays until{" "}
          <code className="font-mono">reset()</code> — the default is 2000 ms. The Clipboard API
          exists only in a secure context; without it, or when it refuses, the hook falls back to{" "}
          <code className="font-mono">execCommand(&quot;copy&quot;)</code> on a throwaway textarea
          and puts focus and the selection back afterwards. It never throws.
        </Note>
      </div>
    </Example>
  );
}

const FRUIT = ["Apple", "Apricot", "Banana", "Blackberry", "Blueberry", "Cherry", "Grape", "Lemon", "Lime", "Mango", "Melon", "Orange", "Peach", "Pear", "Plum"];

function DebouncedValue() {
  const [query, setQuery] = useState("");
  const [ms, setMs] = useState(400);
  const debounced = useDebounce(query, ms);
  const [runs, setRuns] = useState(0);
  const results = useMemo(() => FRUIT.filter((f) => f.toLowerCase().includes(debounced.trim().toLowerCase())), [debounced]);
  // Counts how often the "search" would have run — once per settled value, not per key.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRuns((n) => n + 1);
  }, [debounced]);
  return (
    <Example label="useDebounce(value, ms)" hint="a value that follows, once it has stopped changing for ms">
      <Stage>
        <Input aria-label="Search fruit" placeholder="Type quickly…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </Stage>
      <Row>
        {[150, 400, 1000].map((n) => (
          <Button key={n} variant={ms === n ? "brand" : "secondary"} onClick={() => setMs(n)}>
            {n} ms
          </Button>
        ))}
      </Row>
      <OutTable
        rows={[
          ["query (every key)", JSON.stringify(query)],
          [`useDebounce(query, ${ms})`, JSON.stringify(debounced)],
          ["searches run", String(runs)],
          ["results", results.join(", ") || "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          The first render returns the value itself, not <code className="font-mono">undefined</code>,
          so the list is filled immediately. Every change restarts the wait and the effect&apos;s
          cleanup clears the old timer — the line two of kastlan&apos;s hand-rolled copies forgot, so
          a stale query landed after the fresh one.
        </Note>
      </div>
    </Example>
  );
}

function DebouncedCallback() {
  const [text, setText] = useState("");
  const [saves, setSaves] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [withMaxWait, setWithMaxWait] = useState(true);
  const save = useDebouncedCallback(
    (draft: string) => {
      setSaves((s) => [`${new Date().toLocaleTimeString("en-GB")} “${draft}”`, ...s].slice(0, 5));
      setPending(false);
    },
    800,
    withMaxWait ? { maxWait: 2500 } : {},
  );
  return (
    <Example
      label="useDebouncedCallback(fn, ms, { maxWait })"
      hint="an autosave: runs 800 ms after the last key — and, with maxWait, at least every 2.5 s while typing goes on"
    >
      <Stage>
        <textarea
          aria-label="Draft"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            save(e.target.value);
            setPending(save.pending());
          }}
          onBlur={() => save.flush()}
          placeholder="Type without stopping for a few seconds…"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      </Stage>
      <Row>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={withMaxWait} onChange={(e) => setWithMaxWait(e.target.checked)} />
          <code className="font-mono">maxWait: 2500</code>
        </label>
        <Button
          variant="secondary"
          onClick={() => {
            save.flush();
            setPending(save.pending());
          }}
        >
          flush()
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            save.cancel();
            setPending(save.pending());
          }}
        >
          cancel()
        </Button>
      </Row>
      <OutTable
        rows={[
          ["pending()", String(pending)],
          ["saves (newest first)", saves.length ? saves.join(" · ") : "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          The returned function keeps its identity across renders and always calls the LATEST{" "}
          <code className="font-mono">fn</code>, with the arguments of the last call.{" "}
          <code className="font-mono">flush()</code> runs the pending call now — the textarea
          flushes on blur, so the last keystrokes are never lost — and{" "}
          <code className="font-mono">cancel()</code> drops it. A pending call is cancelled on unmount:
          leave this page mid-sentence and nothing saves into a page that is gone.
        </Note>
      </div>
    </Example>
  );
}

export function ClipboardTiming() {
  return (
    <>
      <CopyButtons />
      <CopyHook />
      <DebouncedValue />
      <DebouncedCallback />
    </>
  );
}
