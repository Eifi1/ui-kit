import { useRef, useState } from "react";
import { ArrowLeftRight, Info } from "lucide-react";
import { IconButton, Tooltip } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * TOOLTIP — `lazy` (keksdose F6): the in-place bubble, mounted only while it is up. Shown
 * as the button-with-an-icon shape F6 names, beside the same button with the default
 * always-mounted bubble, with each button's live `textContent` read out underneath.
 */

function Readout({ lazy }: { lazy?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState<string | null>(null);
  const read = () => setText(ref.current?.textContent ?? "");
  return (
    <div className="min-w-0 space-y-2">
      <p className="font-mono text-xs text-[var(--text-secondary)]">{lazy ? "lazy" : "no lazy (the default)"}</p>
      <button
        ref={ref}
        type="button"
        onClick={read}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      >
        Undo booking
        <Tooltip label="Reverts the last booking on this account" lazy={lazy}>
          <Info className="size-4" aria-hidden />
        </Tooltip>
      </button>
      <p className="break-words font-mono text-xs text-[var(--text-secondary)]">
        textContent: {text === null ? "(click the button)" : JSON.stringify(text)}
      </p>
    </div>
  );
}

export function TooltipLazyDemo() {
  return (
    <Example
      label="Tooltip — lazy: in place, mounted only while up"
      hint="keeps the bubble next to its trigger, and out of the DOM until hover or focus"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Readout lazy />
        <Readout />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Tooltip label="Switch between incoming and outgoing" lazy>
          <IconButton size="sm" aria-label="Direction">
            <ArrowLeftRight />
          </IconButton>
        </Tooltip>
        <span className="text-sm text-[var(--text-secondary)]">
          Tab to it: focus mounts the bubble and describes the button; Escape unmounts it.
        </span>
      </div>
      <div className="mt-3">
        <Note>
          Both buttons look and behave the same under the pointer. Click each to read its{" "}
          <code className="font-mono">textContent</code> while the bubble is closed: the default one carries
          the bubble&apos;s sentence (it is always mounted, so it is in the button&apos;s accessible name and in
          every <code className="font-mono">getAllByRole(&quot;tooltip&quot;)</code> too); the{" "}
          <code className="font-mono">lazy</code> one reads only its own label. keksdose pinned{" "}
          <code className="font-mono">portal</code> on header tooltips, a direction toggle, an fx-estimate row,
          a FlagBadge and a toast for that alone — <code className="font-mono">lazy</code> is the fix that
          keeps the cheaper in-place bubble. It is opt-in because existing tests find the default bubble
          without a hover.
        </Note>
      </div>
    </Example>
  );
}
