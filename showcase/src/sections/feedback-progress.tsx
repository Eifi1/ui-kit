import { useEffect, useState } from "react";
import { CloudOff, Inbox, RefreshCw, Sparkles } from "lucide-react";
import {
  AlertBanner,
  Button,
  EmptyState,
  ProgressBar,
  Skeleton,
  Spinner,
  alertFrameClass,
  toneFrameClass,
} from "@eifi1/ui-kit";
import type { AlertTone, ProgressBarSize, ProgressBarTone, SkeletonShape } from "@eifi1/ui-kit";
import { ConstList, Example, Note, Row, Stage } from "../lib/section";

/**
 * FEEDBACK & PROGRESS — what a page says about itself rather than about its data: how
 * far a job has got, that content is on its way, that there is nothing here, and that
 * something needs reading. EmptyState and AlertBanner moved here from "Buttons &
 * surfaces" when 0.8.0 gave them the icon/action slots and the info/neutral tones.
 *
 * Nothing below runs on a timer except the one upload specimen, and that one only once
 * you press its button: the render test mounts every page at once, and a clock would
 * make the page it asserts on a different page each time.
 */

const TONES: ProgressBarTone[] = ["brand", "neutral", "success", "warning", "danger", "info", "income", "expense"];
const SIZES: ProgressBarSize[] = ["sm", "slim", "md", "lg"];

function ProgressDeterminate() {
  const [value, setValue] = useState(35);
  const [running, setRunning] = useState(false);
  // A stand-in for an upload that reports progress: a few ticks, then done. The
  // interval lives in an effect so leaving the page mid-upload clears it.
  useEffect(() => {
    if (!running) return;
    let v = 0;
    const timer = setInterval(() => {
      v = Math.min(100, v + 12);
      setValue(v);
      if (v >= 100) setRunning(false);
    }, 250);
    return () => clearInterval(timer);
  }, [running]);
  const run = () => {
    setValue(0);
    setRunning(true);
  };
  return (
    <Example
      label="ProgressBar — determinate"
      hint='role="progressbar" with aria-valuetext; label names it, showValue prints the same words'
    >
      <Stage>
        <ProgressBar value={value} label="Uploading statement.pdf" showValue />
        <ProgressBar
          value={Math.round((value / 100) * 212)}
          max={212}
          label="Importing rows"
          showValue
          formatValue={(v, max) => `${v} of ${max} rows`}
          tone="success"
        />
      </Stage>
      <Row>
        <Button variant="secondary" onClick={() => setValue((v) => Math.max(0, v - 10))} disabled={running}>
          −10
        </Button>
        <Button variant="secondary" onClick={() => setValue((v) => Math.min(100, v + 10))} disabled={running}>
          +10
        </Button>
        <Button variant="brand" onClick={run} disabled={running}>
          {running ? "Uploading…" : "Simulate an upload"}
        </Button>
        <span className="font-mono text-xs text-[var(--text-muted)]">value={value}</span>
      </Row>
      <div className="mt-3">
        <Note>
          The default value text is the fraction as a percentage in the kit&apos;s locale — switch
          the language in the top bar and &ldquo;35%&rdquo; becomes &ldquo;35 %&rdquo; in French and
          German. The second bar is 0–212 rows, so a bare <code className="font-mono">aria-valuenow</code>{" "}
          would be read as &ldquo;76&rdquo; or &ldquo;76 percent&rdquo;, both wrong;{" "}
          <code className="font-mono">formatValue</code> gives it the words, visible and spoken.
        </Note>
      </div>
    </Example>
  );
}

function ProgressIndeterminate() {
  return (
    <Example
      label="ProgressBar — indeterminate"
      hint="value undefined: work under way, amount unknown; aria-busy, and still under reduced motion"
    >
      <Stage>
        <ProgressBar label="Waiting for the bank" />
        <ProgressBar aria-label="Re-indexing" tone="info" size="sm" />
        <ProgressBar />
      </Stage>
      <Note>
        The third has neither a <code className="font-mono">label</code> nor an{" "}
        <code className="font-mono">aria-label</code>, so it is named{" "}
        <code className="font-mono">common.loading</code> from the provider — in the page&apos;s
        language. Under <code className="font-mono">prefers-reduced-motion</code> the sweep stops
        and the bar becomes a still, half-strength fill across the track.
      </Note>
    </Example>
  );
}

function ProgressMeter() {
  const [spent, setSpent] = useState(640);
  const budget = 800;
  const tone: ProgressBarTone = spent > budget ? "danger" : spent > budget * 0.75 ? "warning" : "success";
  return (
    <Example
      label="ProgressBar — meter"
      hint='variant="meter": a share of a known whole, role="meter" — not a task that is "busy"'
    >
      <Stage>
        <ProgressBar
          variant="meter"
          value={spent}
          max={budget}
          label="Groceries budget"
          showValue
          tone={tone}
          size="lg"
          locale="en-GB"
          formatValue={(v, max) =>
            `${new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)} of ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(max)}`
          }
        />
        <ProgressBar variant="meter" value={71} label="Disk used" showValue tone="neutral" locale="de-DE" />
      </Stage>
      <Row>
        <Button variant="secondary" onClick={() => setSpent((s) => Math.max(0, s - 80))}>
          Spend less
        </Button>
        <Button variant="secondary" onClick={() => setSpent((s) => s + 80)}>
          Spend more
        </Button>
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {spent} / {budget} → tone=&quot;{tone}&quot;
        </span>
      </Row>
      <div className="mt-3">
        <Note>
          A value past <code className="font-mono">max</code> is clamped for the fill and the
          value text, so an overspent budget draws a full red bar rather than one that pokes out of
          its track. The second meter passes <code className="font-mono">locale=&quot;de-DE&quot;</code>{" "}
          and prints &ldquo;71 %&rdquo; whatever the top bar says. A meter is never indeterminate: a
          missing value reads as <code className="font-mono">min</code>.
        </Note>
      </div>
    </Example>
  );
}

function ProgressTonesSizes() {
  return (
    <Example
      label="ProgressBar — tones and sizes"
      hint="six token tones plus the money pair income / expense; sm 4px, slim 6px, md 8px, lg 12px"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {TONES.map((tone, i) => (
          <ProgressBar key={tone} value={30 + i * 12} tone={tone} label={tone} showValue />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {SIZES.map((size) => (
          <div key={size} className="flex items-center gap-3">
            <code className="w-10 shrink-0 font-mono text-[11px] text-[var(--text-muted)]">{size}</code>
            <ProgressBar value={60} size={size} aria-label={`size ${size}`} className="flex-1" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* The report-meter case: a share of what came in / went out, under a line of
            text that already shows the amount in the money colours. */}
        {[
          { name: "Salary", share: 82, amount: "+3,120.00", tone: "income" as const },
          { name: "Groceries", share: 34, amount: "−412.80", tone: "expense" as const },
        ].map((r) => (
          <div key={r.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-[var(--text-primary)]">{r.name}</span>
              <span
                className="tabular-nums"
                style={{ color: r.tone === "income" ? "var(--money-income)" : "var(--money-expense)" }}
              >
                {r.amount}
              </span>
            </div>
            <ProgressBar value={r.share} tone={r.tone} size="slim" aria-label={`${r.name}, share of ${r.tone}`} />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">tone=&quot;income&quot;</code> / <code className="font-mono">&quot;expense&quot;</code>{" "}
          fill with <code className="font-mono">--money-income</code> / <code className="font-mono">--money-expense</code>,
          the pair Chip, StatTile and Sparkline use — a share of money is neither &ldquo;good&rdquo; nor
          &ldquo;careful&rdquo;. <code className="font-mono">size=&quot;slim&quot;</code> is the 6px track (the
          Slider&apos;s) for a bar under a line of text, where <code className="font-mono">md</code>&apos;s 8px
          outweighs it.
        </Note>
      </div>
    </Example>
  );
}

const SHAPES: SkeletonShape[] = ["line", "block", "circle"];

function SkeletonDemo() {
  const [loaded, setLoaded] = useState(false);
  return (
    <Example
      label="Skeleton — shapes and lines"
      hint="always aria-hidden; say “loading” once with aria-busy on the region"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {SHAPES.map((shape) => (
          <div key={shape} className="space-y-2">
            <p className="font-mono text-[11px] text-[var(--text-muted)]">shape=&quot;{shape}&quot;</p>
            <Skeleton shape={shape} />
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-[var(--border)] p-3" aria-busy={!loaded}>
        {loaded ? (
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-inverse)] text-sm font-semibold text-[var(--text-inverse)]">
              AL
            </span>
            <div className="text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">Ada Lovelace</p>
              <p>Notes on the Analytical Engine, with a table of the Bernoulli numbers and the
                first published algorithm meant for a machine.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Skeleton shape="circle" />
            <Skeleton lines={3} className="flex-1" />
          </div>
        )}
      </div>
      <Row className="mt-3">
        <Button variant="secondary" onClick={() => setLoaded((v) => !v)}>
          {loaded ? "Back to the skeleton" : "Load the content"}
        </Button>
      </Row>
      <div className="mt-3">
        <Note>
          <code className="font-mono">lines={"{3}"}</code> draws three bars with the last cut to
          two thirds, so the block reads as a paragraph rather than a table. The pulse stops under
          reduced motion. The same look is the loading state inside{" "}
          <code className="font-mono">StatTile</code>, so a tile wall and a list beside it pulse alike.
        </Note>
      </div>
    </Example>
  );
}

const SAMPLE_ROWS = ["Invoice 2024-114", "Invoice 2024-115", "Invoice 2024-116"];

function EmptyStateDemo() {
  const [rows, setRows] = useState<string[]>([]);
  const [offline, setOffline] = useState(true);
  const [retries, setRetries] = useState(0);
  return (
    <Example label="EmptyState — icon and action" hint="title is required; hint, icon (above) and action (below) are optional">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="No invoices yet"
              hint="Imported invoices will appear here."
              action={
                <Button variant="brand" onClick={() => setRows(SAMPLE_ROWS)}>
                  Import three invoices
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                {rows.map((row) => (
                  <li key={row} className="font-mono">
                    {row}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" onClick={() => setRows([])}>
                Clear the list
              </Button>
            </div>
          )}
        </div>
        <div>
          {offline ? (
            <EmptyState
              icon={<CloudOff />}
              title="You are offline"
              hint={`The last sync failed. Attempts so far: ${retries}.`}
              action={
                <>
                  <Button variant="secondary" onClick={() => setRetries((n) => n + 1)}>
                    <RefreshCw className="size-4" aria-hidden /> Retry
                  </Button>
                  <Button variant="ghost" onClick={() => setOffline(false)}>
                    Work offline
                  </Button>
                </>
              }
            />
          ) : (
            <EmptyState title="Working offline" hint="A plain empty state: no icon, no action." />
          )}
        </div>
      </div>
      <div className="mt-3">
        <Note>
          The icon is sized and muted by the box (<code className="font-mono">[&amp;_svg]:size-8</code>)
          and hidden from assistive tech — the title already says what it shows. The action is
          yours: several buttons in a fragment wrap and centre as one row, as in the offline card.
        </Note>
      </div>
    </Example>
  );
}

function EmptyStateRich() {
  const [resets, setResets] = useState(0);
  return (
    <Example
      label="EmptyState — headingAs and node title / hint"
      hint="the title as a real heading; title and hint take nodes, the box still sets the type"
    >
      <EmptyState
        headingAs="h4"
        title={
          <>
            Something broke: <code className="font-mono">TypeError</code>
          </>
        }
        hint={
          <>
            The page hit an error it could not recover from.{" "}
            <a
              href="#/feedback"
              className="underline hover:text-[var(--text-primary)]"
              onClick={(e) => {
                e.preventDefault();
                setResets((n) => n + 1);
              }}
            >
              Reset this view
            </a>{" "}
            (resets: {resets}).
          </>
        }
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">headingAs=&quot;h4&quot;</code> renders the title as an{" "}
          <code className="font-mono">&lt;h4&gt;</code> — under this page&apos;s h2 section and h3 example —
          so an error boundary that IS the page keeps the line that says what happened in the heading
          outline. Only the element changes: it is still <code className="font-mono">text-sm</code>, the
          box&apos;s look. Left out, the title is a <code className="font-mono">&lt;div&gt;</code>, as in the
          cards above. <code className="font-mono">title</code> carries a{" "}
          <code className="font-mono">&lt;code&gt;</code> here and <code className="font-mono">hint</code> a
          link; an empty hint (<code className="font-mono">&quot;&quot;</code>,{" "}
          <code className="font-mono">false</code>, <code className="font-mono">null</code>) renders no line.
        </Note>
      </div>
    </Example>
  );
}

const BANNER_TONES: AlertTone[] = ["danger", "warning", "info", "neutral"];

function AlertTonesDemo() {
  return (
    <Example label="AlertBanner — four tones" hint="danger (default) and warning draw the triangle; info and neutral the ⓘ">
      <div className="space-y-3">
        <AlertBanner tone="danger">
          This import would overwrite 14 reconciled payments. Nothing has been written yet.
        </AlertBanner>
        <AlertBanner tone="warning">Three rows have no currency and will be skipped.</AlertBanner>
        <AlertBanner tone="info">This is a preview build — new charts may still change.</AlertBanner>
        <AlertBanner tone="neutral">Values are rounded to whole euros.</AlertBanner>
        <AlertBanner>Omitting the tone gives you danger, which is the default.</AlertBanner>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">neutral</code> used to be withheld from the banner: a
          triangle with no colour is a warning that looks like a note. Since 0.8.0 the glyph
          follows the tone — the triangle for the two that mean &ldquo;something is wrong&rdquo;,
          the ⓘ for <code className="font-mono">info</code> and <code className="font-mono">neutral</code>{" "}
          — so a neutral banner is simply a note. The colours are the semantic{" "}
          <code className="font-mono">--danger-*</code>, <code className="font-mono">--warning-*</code>{" "}
          and <code className="font-mono">--info-*</code> families, which a palette preset does not move.
        </Note>
      </div>
    </Example>
  );
}

function AlertInteractiveDemo() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [opened, setOpened] = useState(0);
  const gone = (key: string) => dismissed.includes(key);
  const dismiss = (key: string) => () => setDismissed((d) => [...d, key]);
  return (
    <Example
      label="AlertBanner — onDismiss, a whole-row button or link, an icon"
      hint="the banner never hides itself: the × calls onDismiss and the caller removes it"
    >
      <div className="space-y-3">
        {!gone("beta") && (
          <AlertBanner tone="info" onDismiss={dismiss("beta")} icon={<Sparkles />}>
            The new report engine is on for your account.
          </AlertBanner>
        )}
        <AlertBanner tone="warning" onClick={() => setOpened((n) => n + 1)}>
          You have spent 92 % of this month&apos;s budget — open the budget. (opened {opened}×)
        </AlertBanner>
        {!gone("link") && (
          <AlertBanner tone="neutral" href="#/data-table" onDismiss={dismiss("link")} dismissLabel="Hide this tip">
            Tip: the data table remembers its sort in the address bar.
          </AlertBanner>
        )}
        {dismissed.length > 0 && (
          <Button variant="ghost" onClick={() => setDismissed([])}>
            Bring back {dismissed.length} dismissed banner{dismissed.length === 1 ? "" : "s"}
          </Button>
        )}
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">onClick</code> makes the banner ONE{" "}
          <code className="font-mono">&lt;button&gt;</code> and <code className="font-mono">href</code>{" "}
          one <code className="font-mono">&lt;a&gt;</code>, each with a trailing chevron that says
          so; the two are exclusive in the types. With <code className="font-mono">onDismiss</code>{" "}
          as well the × cannot sit inside the row element, so the frame becomes a wrapper holding
          two siblings — the third banner: Tab reaches the link, then the ×, whose name here is{" "}
          <code className="font-mono">dismissLabel</code> (default{" "}
          <code className="font-mono">common.dismiss</code>). <code className="font-mono">icon</code>{" "}
          replaces the tone&apos;s glyph; it stays decorative.
        </Note>
      </div>
    </Example>
  );
}

function AlertInlineDemo() {
  const [radius, setRadius] = useState(4);
  const [solving, setSolving] = useState(false);
  return (
    <Example
      label="AlertBanner — inline"
      hint='variant="inline": colour, glyph and role only — for a toolbar row; a live region by default'
    >
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          Radius
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-16 rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-primary)]"
          />
        </label>
        <Button variant="secondary" onClick={() => setSolving((v) => !v)}>
          {solving ? "Stop" : "Solve"}
        </Button>
        {radius < 3 && (
          <AlertBanner variant="inline" tone="danger">
            Radius below the minimum (3)
          </AlertBanner>
        )}
        {solving && (
          <AlertBanner variant="inline" tone="neutral" icon={<Spinner label={null} className="size-3.5 border-2" />}>
            Solving…
          </AlertBanner>
        )}
        {!solving && radius >= 3 && (
          <AlertBanner variant="inline" tone="info" icon={null}>
            Ready.
          </AlertBanner>
        )}
      </div>
      <div className="mt-3">
        <Note>
          Set the radius under 3 for the danger line, press Solve for the neutral one with a{" "}
          <code className="font-mono">Spinner</code> as its <code className="font-mono">icon</code>;
          &ldquo;Ready.&rdquo; passes <code className="font-mono">icon={"{null}"}</code> and draws no
          glyph. Inline, a <code className="font-mono">danger</code> banner is{" "}
          <code className="font-mono">role=&quot;alert&quot;</code> and the rest{" "}
          <code className="font-mono">role=&quot;status&quot;</code>, because a message that appears
          in a toolbar in answer to what the user just did is exactly the one a reader otherwise never
          hears. The box stays role-less; a <code className="font-mono">role</code> you pass wins either way.
        </Note>
      </div>
    </Example>
  );
}

function ToneFrames() {
  return (
    <Example
      label="toneFrameClass() / alertFrameClass()"
      hint="the frame without the banner — for a box that already has its own radius and padding"
    >
      <div className="space-y-3">
        {BANNER_TONES.map((tone) => (
          <div key={tone} className={`${alertFrameClass(tone)} text-sm text-[var(--text-primary)]`}>
            <span className="font-mono">alertFrameClass(&quot;{tone}&quot;)</span> — radius and
            padding included.
          </div>
        ))}
        <div
          className={`${toneFrameClass("warning")} rounded-xl px-5 py-4 text-sm text-[var(--text-primary)]`}
        >
          <span className="font-mono">toneFrameClass(&quot;warning&quot;)</span> on a box that
          brought its own <span className="font-mono">rounded-xl px-5 py-4</span>.
        </div>
      </div>
      <div className="mt-4">
        <ConstList
          items={BANNER_TONES.map((tone) => [`alertFrameClass("${tone}")`, alertFrameClass(tone)])}
        />
      </div>
      <div className="mt-3">
        <Note>
          The coloured tones carry a <strong>2px</strong> border and{" "}
          <code className="font-mono">p-[11px]</code>; neutral carries 1px and{" "}
          <code className="font-mono">p-3</code>. That odd 11 is the point: a 1px border is 1.25
          device pixels at the usual 125% Windows scaling, so it renders solid on one edge and
          half-lit on the other depending on where the box lands. 2px always covers two whole
          pixels, and the pixel is taken back out of the padding so switching tones never shifts
          the layout. If you use <code className="font-mono">toneFrameClass</code> you owe that
          compensation yourself.
        </Note>
      </div>
    </Example>
  );
}

export function FeedbackProgress() {
  return (
    <>
      <ProgressDeterminate />
      <ProgressIndeterminate />
      <ProgressMeter />
      <ProgressTonesSizes />
      <SkeletonDemo />
      <EmptyStateDemo />
      <EmptyStateRich />
      <AlertTonesDemo />
      <AlertInteractiveDemo />
      <AlertInlineDemo />
      <ToneFrames />
    </>
  );
}
