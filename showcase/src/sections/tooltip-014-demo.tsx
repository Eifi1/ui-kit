import { Terminal } from "lucide-react";
import { IconButton, Tooltip } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * TOOLTIP — the in-place bubble's viewport clamp (keksdose G7). A long label on a trigger
 * at a row's start edge, as in keksdose's jobs panel: on a phone the centred bubble used
 * to hang off the screen; now it measures itself on open and slides back in.
 */

const COMMAND = "gcloud run jobs execute nightly-import --region europe-west3 --wait --format=json";

export function TooltipClampDemo() {
  return (
    <Example
      label="Tooltip — in-place bubble clamped to the viewport"
      hint="a long label at the start edge slides back onto the screen instead of hanging off it"
    >
      <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] px-2 py-1.5">
        <Tooltip label={COMMAND} lazy>
          <IconButton size="sm" aria-label="Show command">
            <Terminal />
          </IconButton>
        </Tooltip>
        <span className="min-w-0 truncate text-sm text-[var(--text-secondary)]">nightly-import</span>
        <Tooltip label={COMMAND}>
          <IconButton size="sm" aria-label="Show command (default)">
            <Terminal />
          </IconButton>
        </Tooltip>
      </div>
      <div className="mt-3">
        <Note>
          Narrow the window and hover either button: the bubble is still in place (no{" "}
          <code className="font-mono">portal</code>), still capped at 20rem or the viewport less a margin so
          the command wraps, and slid along its cross axis only as far as it takes to stay on the screen. A
          bubble that already fits is not touched. Works the same in RTL.
        </Note>
      </div>
    </Example>
  );
}
