import { useState } from "react";
import { AlertTriangle, BellOff, CheckCircle2, RefreshCw } from "lucide-react";
import { AlertBanner, Button, EmptyState, Input } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

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
        <div className="rounded-md border border-[var(--border)]">
          <p className="border-b border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
            Notifications
          </p>
          <EmptyState variant="inline" icon={<BellOff />} title="No notifications" hint="You are all caught up." />
        </div>
        <div className="rounded-md border border-[var(--border)]">
          <p className="border-b border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
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
  const [paid, setPaid] = useState(0);
  const [rate, setRate] = useState("");
  return (
    <Example
      label="AlertBanner — success, size sm, strip with an action, elevated"
      hint="the fifth tone; a hint-sized line; a band across the top of a page; an opaque, raised surface"
    >
      <div className="space-y-4">
        <AlertBanner tone="success">The import finished: 214 rows booked, 3 skipped.</AlertBanner>

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

        <div className="overflow-hidden rounded-md border border-[var(--border)]">
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
          <div className="p-3 text-sm text-[var(--text-secondary)]">
            The page under the strips — the trial strip&apos;s action pressed {paid}×.{" "}
            {!strip && (
              <Button variant="link" onClick={() => setStrip(true)}>
                Bring the trial strip back
              </Button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input type="checkbox" checked={elevated} onChange={(e) => setElevated(e.target.checked)} />
            <code className="font-mono">elevated</code>
          </label>
          <div className="relative h-32 overflow-hidden rounded-md border border-[var(--border)] p-3">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
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
