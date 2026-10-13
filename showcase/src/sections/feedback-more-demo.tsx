import { useState } from "react";
import { AlertTriangle, BellOff, CheckCircle2, RefreshCw } from "lucide-react";
import { AlertBanner, Button, EmptyState, Input, SectionLabel, LoadingState } from "@eifi1/ui-kit";
import { Example, Note, code, READOUT } from "../lib/section";

/**
 * FEEDBACK — the 0.10.0 shapes: the one-line empty state for inside a frame, the error
 * and good-news tones, and the banner's success tone, small size, strip and raised
 * surface.
 */

function EmptyStateInlineTones() {
  const [failed, setFailed] = useState(true);
  const [retries, setRetries] = useState(0);
  return (
    <Example
      label="EmptyState — inline variant and the danger and success tones"
      hint='variant="inline" is one quiet line for inside a frame; tone colours the icon and the title, never the hint'
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-subtle">
          <p className="border-b border-subtle px-3 py-2 text-sm font-medium text-primary">
            Notifications
          </p>
          <EmptyState variant="inline" icon={<BellOff />} title="No notifications" hint="You are all caught up." />
        </div>
        <div className="rounded-md border border-subtle">
          <p className="border-b border-subtle px-3 py-2 text-sm font-medium text-primary">
            Support thread
          </p>
          <EmptyState
            variant="inline"
            tone="danger"
            icon={<AlertTriangle />}
            title="The messages could not be loaded."
            action={
              <Button variant="link" onClick={() => setRetries((n) => n + 1)}>
                Retry ({retries})
              </Button>
            }
            className="justify-start px-3"
          />
        </div>
        {failed ? (
          <EmptyState
            tone="danger"
            icon={<AlertTriangle />}
            title="This report could not be built"
            hint="The server did not answer in time. Nothing was changed."
            action={
              <Button variant="secondary" onClick={() => setFailed(false)}>
                <RefreshCw className="size-4" /> Try again
              </Button>
            }
          />
        ) : (
          <EmptyState
            tone="success"
            icon={<CheckCircle2 />}
            title="No defects recorded for this room"
            hint="Good news standing where a list would be."
            action={
              <Button variant="ghost" onClick={() => setFailed(true)}>
                Back to the error
              </Button>
            }
          />
        )}
      </div>
      <div className="mt-3">
        <Note>
          The inline variant has no box: the icon shrinks to the text&apos;s size and sits before the title,
          the hint follows on the same line, and the row wraps only when it must — centred like the box,
          or <code className="font-mono">className=&quot;justify-start&quot;</code> for a list that reads from the
          start edge (the second frame). <code className="font-mono">tone=&quot;danger&quot;</code> is an error
          standing where the content should be; <code className="font-mono">tone=&quot;success&quot;</code> an empty
          state that is good news. Press <strong>Try again</strong> to swap the one for the other.
        </Note>
      </div>
    </Example>
  );
}

function AlertBannerMore() {
  const [elevated, setElevated] = useState(true);
  const [strip, setStrip] = useState(true);
  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const [paid, setPaid] = useState(0);
  const [rate, setRate] = useState("");
  return (
    <Example
      label="AlertBanner — success, a box with an action, size sm, strip with an action, elevated"
      hint="the fifth tone; a hint-sized line; a band across the top of a page; an opaque, raised surface"
    >
      <div className="space-y-4">
        <AlertBanner tone="success">The import finished: 214 rows booked, 3 skipped.</AlertBanner>

        {/* A box with an action and a dismiss (kastlan 53): on a phone the action takes
            its own line under the message instead of squeezing it into a narrow column. */}
        {!verifyDismissed && (
          <AlertBanner
            tone="warning"
            action={
              <Button size="sm" variant="secondary">
                Resend verification email
              </Button>
            }
            onDismiss={() => setVerifyDismissed(true)}
          >
            Please confirm your email address to secure your account.
          </AlertBanner>
        )}

        <div className="max-w-sm space-y-1.5">
          <Input label="Exchange rate" value={rate} onChange={(e) => setRate(e.target.value)} />
          {rate === "" && (
            <AlertBanner tone="warning" variant="inline" size="sm">
              No rate for 12 March — the day before is used.
            </AlertBanner>
          )}
          <AlertBanner tone="info" size="sm">
            size=&quot;sm&quot;: 12px type and a 14px glyph, for the note under a field or a total.
          </AlertBanner>
        </div>

        <div className="overflow-hidden rounded-md border border-subtle">
          {strip && (
            <AlertBanner
              tone="warning"
              variant="strip"
              onDismiss={() => setStrip(false)}
              action={
                <Button size="sm" variant="secondary" onClick={() => setPaid((n) => n + 1)}>
                  Update payment method
                </Button>
              }
            >
              Your trial ends in 3 days.
            </AlertBanner>
          )}
          <AlertBanner tone="danger" variant="strip" size="sm">
            Payment past due — a small strip, no action.
          </AlertBanner>
          <div className="p-3 text-sm text-secondary">
            The page under the strips — the trial strip&apos;s action pressed {paid}×.{" "}
            {!strip && (
              <Button variant="link" onClick={() => setStrip(true)}>
                Bring the trial strip back
              </Button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs text-secondary">
            <input type="checkbox" checked={elevated} onChange={(e) => setElevated(e.target.checked)} />
            <code className="font-mono">elevated</code>
          </label>
          <div className="relative h-32 overflow-hidden rounded-md border border-subtle p-3">
            <p className="text-sm leading-6 text-secondary">
              Page text under a floating notice. Page text under a floating notice. Page text under a
              floating notice. Page text under a floating notice. Page text under a floating notice. Page
              text under a floating notice.
            </p>
            <div className="absolute inset-x-3 top-6">
              <AlertBanner tone="info" elevated={elevated}>
                The server is waking up — this can take half a minute.
              </AlertBanner>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">strip</code> is edge to edge, no radius, a bottom border only and one
          centred line; <code className="font-mono">action</code> is a trailing control that never shrinks, and
          it sits BESIDE a whole-row banner&apos;s own button or link (interactive content may not nest).{" "}
          <code className="font-mono">elevated</code> puts the tone&apos;s wash on an opaque surface with a
          shadow — switch it off in the dark theme and the page text shows through the translucent tint,
          which is keksdose #209. The success glyph is the check in a circle.
        </Note>
      </div>
    </Example>
  );
}

export function FeedbackMore() {
  return (
    <>
      <EmptyStateInlineTones />
      <AlertBannerMore />
    </>
  );
}

/* ── since 0.11 ─────────────────────────────────────────────────────────── */

export function AlertBannerBlockDemo() {
  const [live, setLive] = useState(false);
  return (
    <Example
      label="AlertBanner — inline block and live={false}"
      hint="a line of its own with the glyph on the first line; static page content outside the live region"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="max-w-xs space-y-1.5">
          <p className="text-sm text-secondary">
            Total <strong>€ 1,425.50</strong>
          </p>
          <AlertBanner tone="info" variant="inline" size="sm" block live={false}>
            block: two currencies are converted at the rate of each booking day, so this total can differ from the
            statement&apos;s by a few cents.
          </AlertBanner>
          <AlertBanner tone="info" variant="inline" size="sm" live={false}>
            default: the same wrapped hint centres its glyph between the lines.
          </AlertBanner>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            live (role=&quot;alert&quot;)
          </label>
          <AlertBanner tone="danger" variant="inline" block live={live}>
            3 unresolved rows block the import.
          </AlertBanner>
          <p className={READOUT}>role: {live ? "alert" : "none"}</p>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          {code("block")} lays an inline banner out as a full-width row with the glyph on the text&apos;s first
          line, instead of the inline, centred line it is by default (which a toolbar or a run of content
          needs). {code("live={false}")} drops {code('role="alert"')} / {code('role="status"')} for a message that
          is part of the page, like a review step&apos;s standing warning, so a screen reader does not interrupt
          with it on every mount. A {code("role")} you pass still wins.
        </Note>
      </div>
      <Note>Since 0.11.</Note>
    </Example>
  );
}

export function EmptyStateSmallDemo() {
  return (
    <Example
      label="EmptyState — inline size sm"
      hint="12px, start-aligned and tight: the empty line inside a detail panel"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(["sm", "md"] as const).map((size) => (
          <div key={size} className="rounded-md border border-subtle px-3 py-2">
            <SectionLabel as="p" size="xs">
              Holdings (size {size})
            </SectionLabel>
            <ul className="mt-1 space-y-0.5 text-xs text-secondary">
              <li>ACME Corp · 12 shares</li>
            </ul>
            <SectionLabel as="p" size="xs" className="mt-2">
              Dividends
            </SectionLabel>
            <EmptyState variant="inline" size={size} icon={<BellOff />} title="No dividends this year" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Note>
          {code('size="sm"')} fits among {code("text-xs")} rows under a panel heading; the default{" "}
          {code("md")} (right) is a centred 14px line with room above and below, which reads as a section of
          its own there.
        </Note>
      </div>
      <Note>Since 0.11.</Note>
    </Example>
  );
}

/* ── since 0.16 ─────────────────────────────────────────────────────────── */

const CAPTION = "text-xs text-muted";

export function LoadingState016Demo() {
  return (
    <Example label="LoadingState — hidden label and compact padding" hint="role=status still announces">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-subtle">
          <p className={`${CAPTION} px-2 pt-2`}>labelVisibility=&quot;sr-only&quot;</p>
          <LoadingState labelVisibility="sr-only" label="Loading invoices" />
        </div>
        <div className="rounded-md border border-subtle">
          <p className={`${CAPTION} px-2 pt-2`}>label=&#123;null&#125;</p>
          <LoadingState label={null} />
        </div>
        <div className="rounded-md border border-subtle">
          <p className={`${CAPTION} px-2 pt-2`}>compact (md at py-8)</p>
          <LoadingState compact />
        </div>
      </div>
      <Note>
        {code("label={null}")} used to print &ldquo;Loading…&rdquo; anyway; now it hides the words and the status region
        keeps announcing {code("common.loading")}. {code("compact")} is the step between {code("sm")} and {code("md")}.
      </Note>
      <Note>Since 0.16.</Note>
    </Example>
  );
}
