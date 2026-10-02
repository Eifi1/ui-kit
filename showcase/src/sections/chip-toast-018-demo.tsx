import { useState } from "react";
import { Chip, refreshChipEdges } from "../../../src/components/chip";
import type { ChipTone } from "../../../src/components/chip";
import { toast } from "../../../src/components/toast";
import { Button } from "../../../src/components/ui";
import { Switch } from "../../../src/components/switch";
import { Example, Note, Row } from "../lib/section";

/**
 * Chip `snapEdges` and Toaster `dismissOnMiddleClick` (0.18): keksdose dev #576 (the
 * FAILED badge whose left border looked thinner on a 125 % display) and dev #583 (a
 * middle click closes a toast, the way it closes a tab).
 */

const STATUSES: Array<{ label: string; tone: ChipTone }> = [
  { label: "Failed", tone: "danger" },
  { label: "Needs review", tone: "warning" },
  { label: "Ready", tone: "success" },
  { label: "Processing", tone: "info" },
];

/** Each row starts its chip half a pixel further on, so all four sub-pixel phases a
 *  chip's left edge can land on at 125 % are on the page. */
const OFFSETS = Array.from({ length: 8 }, (_, i) => i * 0.5);

function Column({ snap }: { snap: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-[var(--text-muted)]">{snap ? "snapEdges" : "default"}</div>
      {OFFSETS.map((o, i) => {
        const s = STATUSES[i % STATUSES.length];
        return (
          <div key={o} className="flex items-center">
            <span aria-hidden className="inline-block h-px shrink-0" style={{ width: `${12 + o}px` }} />
            <Chip
              snapEdges={snap}
              tone={s.tone}
              size="sm"
              shape="square"
              caps
              data-probe={snap ? "on" : "off"}
            >
              {s.label}
            </Chip>
          </div>
        );
      })}
    </div>
  );
}

export function ChipSnapEdges018Demo() {
  const [many, setMany] = useState(false);
  const [took, setTook] = useState<number | null>(null);
  return (
    <Example
      label="Chip — snapEdges"
      hint="even side borders at 125 % — open this page at 125 % zoom or on a 125 % display to see the difference"
    >
      <div className="grid grid-cols-2 gap-6 sm:max-w-md">
        <Column snap={false} />
        <Column snap />
      </div>
      <Row className="mt-4">
        <Switch checked={many} onChange={(e) => setMany(e.target.checked)} label="200 more snapped chips" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const t = performance.now();
            refreshChipEdges();
            setTook(performance.now() - t);
          }}
        >
          Re-snap now
        </Button>
        {took !== null && (
          <span className="text-xs tabular-nums text-[var(--text-muted)]" data-snap-took={took.toFixed(2)}>
            one pass: {took.toFixed(1)} ms
          </span>
        )}
      </Row>
      {many && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: 200 }, (_, i) => {
            const s = STATUSES[i % STATUSES.length];
            return (
              <Chip key={i} snapEdges tone={s.tone} size="sm" shape="square" caps data-probe="many">
                {`${s.label} ${i + 1}`}
              </Chip>
            );
          })}
        </div>
      )}
      <Note>
        At a device-pixel ratio of 1.25 Chrome draws a chip's two 1px side borders on different sub-pixel phases:
        one crisp, one a half-strength two-pixel smear that reads as a thinner line (worst on the 60 %-alpha
        danger border). `snapEdges` widens the chip by under 4px, from where it sits, so both edges rasterise as
        mirror images, and centres the label. Opt-in: it reads the chip's position. At 100 %, 150 % and 200 % it
        writes nothing. After moving snapped chips some other way, call `refreshChipEdges()`.
      </Note>
    </Example>
  );
}

export function ToastMiddleClick018Demo() {
  return (
    <Example
      label="Toaster — dismissOnMiddleClick"
      hint="middle-click a toast to close it; on by default"
    >
      <Row>
        <Button
          variant="secondary"
          onClick={() =>
            toast.success("Statement imported", {
              description: "No close button, so a middle click is the quick way out.",
              closeButton: false,
              duration: Infinity,
            })
          }
        >
          Toast without a close button
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.info("Report ready", {
              description: (
                <a href="#/feedback" className="underline">
                  Open the report
                </a>
              ),
              duration: Infinity,
            })
          }
        >
          Toast with a link
        </Button>
      </Row>
      <Note>
        A middle click anywhere on a toast dismisses it by id, close button or not, and runs its `onDismiss`. A
        middle click on a link inside still opens the link in a new tab; buttons inside the toast and
        `dismissible: false` toasts are left alone. Pass `dismissOnMiddleClick={false}` to the Toaster to turn it
        off.
      </Note>
    </Example>
  );
}
