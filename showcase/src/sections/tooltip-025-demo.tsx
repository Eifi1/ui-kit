import { CircleHelp, RefreshCw, Search, Settings } from "lucide-react";
import { Button, IconButton, Tooltip } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * TOOLTIP — taps and the page edge (keksdose run 72, live #379 / #381). A top-bar row as
 * keksdose has it: three IconButtons at the end edge, the sync chip with a sentence-long
 * label opening `bottom`. On a phone a tap used to leave each label up until the next tap
 * elsewhere, and the sync bubble, centred under an icon near the edge, widened the page.
 * Below it, the taps that DO show a bubble: on a control that does nothing when tapped.
 */

const SYNC_LABEL = "Synced at 03:05 PM — Tap to sync now and refresh this page";

export function TooltipTapDemo() {
  return (
    <Example
      label="Tooltip — a tap leaves no bubble behind; the page edge holds"
      hint="tap on a phone: the action, no label; Tab: the label; hover: as ever"
    >
      <div className="flex h-12 items-center justify-end gap-1 rounded-md border border-[var(--border)] px-2">
        <span className="me-auto truncate text-sm font-medium text-[var(--text-primary)]">Example Ltd</span>
        <IconButton label={SYNC_LABEL} tooltipSide="bottom" size="sm" shape="round" onClick={() => {}}>
          <RefreshCw />
        </IconButton>
        <IconButton label="Search" tooltipSide="bottom" size="sm" onClick={() => {}}>
          <Search />
        </IconButton>
        <IconButton label="Settings" tooltipSide="bottom" size="sm" onClick={() => {}}>
          <Settings />
        </IconButton>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button disabledReason="Read-only demo — saving is disabled." size="sm">
          Save
        </Button>
        <Tooltip label="Example Ltd, 000 Sample Street, Sampletown" lazy>
          <span className="max-w-[9rem] truncate text-sm text-[var(--text-secondary)]">
            Example Ltd, 000 Sample Street, Sampletown
          </span>
        </Tooltip>
        <Tooltip label="Booked on the day the money left the account, not the day it was entered." tap="toggle" lazy>
          <button type="button" aria-label="What is the booking date?" className="flex text-[var(--text-placeholder)]">
            <CircleHelp className="size-4" />
          </button>
        </Tooltip>
      </div>

      <div className="mt-3 space-y-2">
        <Note>
          On a phone, tap the three icons: each does its job and leaves no label behind (it used to stay up
          over whatever the tap opened). With a keyboard, Tab onto them: the label shows, as it does on a
          desktop hover. A desktop click lets the label go once the pointer leaves.
        </Note>
        <Note>
          The sync label is a sentence under an icon near the end edge: it slides back onto the screen, and
          the page never gets wider than the screen — measured against the screen itself now, not against a
          window that had already grown with it.
        </Note>
        <Note>
          A tap that activates nothing shows the bubble as its answer, until the next tap anywhere: the locked
          Save gives its reason, the truncated address its full text. The &quot;?&quot; explains only, so it
          says <code className="font-mono">tap=&quot;toggle&quot;</code>.
        </Note>
      </div>
    </Example>
  );
}
