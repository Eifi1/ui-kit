import { useRef, useState } from "react";
import { Bot, MessageSquarePlus, Plus } from "lucide-react";
import { Button, FloatingActionButton, FloatingPanel, ToggleGroup, useConfirm } from "@eifi1/ui-kit";
import type { ConfirmTone, FloatingCorner } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * CONFIRM DIALOG & FLOATING PANEL — the two overlays 0.8.0 added.
 *
 * `useConfirm()` needs a `ConfirmProvider` above it; the showcase mounts ONE in
 * showcase.tsx, inside the UiKitProvider, exactly as an app does — so every specimen
 * here shares it, and a second call while one dialog is open queues behind it.
 *
 * The floating panel is fixed to the viewport, so it is opt-in: nothing floats over the
 * showcase until you tick a box, and leaving the page unmounts it.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

function useLog() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((l) => [line, ...l].slice(0, 6));
  return [log, add] as const;
}

function ConfirmTones() {
  const confirm = useConfirm();
  const [log, add] = useLog();
  const ask = async (tone: ConfirmTone) => {
    const ok = await confirm(
      tone === "danger"
        ? {
            tone,
            title: "Delete the budget “Groceries 2026”?",
            body: "Its 214 assigned transactions keep their category. This cannot be undone.",
            confirmLabel: "Delete budget",
          }
        : tone === "warning"
          ? {
              tone,
              title: "Leave with unsaved changes?",
              body: "Three edited rows have not been saved yet.",
              confirmLabel: "Leave anyway",
              cancelLabel: "Stay on the page",
            }
          : { title: "Mark all 12 notifications as read?" },
    );
    add(`${tone} → ${ok}`);
  };
  return (
    <Example
      label="useConfirm — danger, warning, neutral"
      hint="a promise instead of window.confirm; only the confirm button answers true"
    >
      <Row>
        <Button variant="danger" onClick={() => void ask("danger")}>
          Delete budget…
        </Button>
        <Button variant="secondary" onClick={() => void ask("warning")}>
          Leave page…
        </Button>
        <Button variant="secondary" onClick={() => void ask("neutral")}>
          Mark all read…
        </Button>
      </Row>
      <p className={`mt-3 ${READOUT}`}>{log.length ? log.join(" · ") : "answers appear here"}</p>
      <div className="mt-3">
        <Note>
          <code className="font-mono">tone: &quot;danger&quot;</code> paints the confirm as the
          destructive button and starts focus on <strong>Cancel</strong>, because a confirm is often
          answered by a reflexive Enter; <code className="font-mono">warning</code> and{" "}
          <code className="font-mono">neutral</code> (the default — the third call passes no tone)
          start on the confirm. The first two pass their own <code className="font-mono">confirmLabel</code>{" "}
          / <code className="font-mono">cancelLabel</code>; the third falls back to{" "}
          <code className="font-mono">confirmDialog.confirm</code> and{" "}
          <code className="font-mono">.cancel</code> from the provider — switch the language and it
          says &ldquo;Bestätigen&rdquo;. Escape, the backdrop, Back and Cancel all answer{" "}
          <code className="font-mono">false</code>. The panel is{" "}
          <code className="font-mono">role=&quot;alertdialog&quot;</code>, named by the title and
          described by the body.
        </Note>
      </div>
    </Example>
  );
}

function ConfirmQueue() {
  const confirm = useConfirm();
  const [log, add] = useLog();
  const askTwice = () => {
    // Two calls in the same tick: the second QUEUES behind the first, and each gets its
    // own answer — answering the first never answers the second.
    void confirm({ title: "Archive the 2025 statements?", body: "First of two questions." }).then((ok) =>
      add(`first → ${ok}`),
    );
    void confirm({
      tone: "danger",
      title: "Also delete the 2024 statements?",
      body: "Second question, queued behind the first.",
      confirmLabel: "Delete 2024",
    }).then((ok) => add(`second → ${ok}`));
  };
  const askLater = () => {
    // A background prompt arriving while the user is reading another dialog.
    setTimeout(() => {
      void confirm({ title: "Your session expires in 2 minutes. Stay signed in?", confirmLabel: "Stay signed in" }).then(
        (ok) => add(`session → ${ok}`),
      );
    }, 1500);
    void confirm({ title: "Rename the account to “Household”?" }).then((ok) => add(`rename → ${ok}`));
  };
  return (
    <Example label="useConfirm — a second call queues" hint="shown when the first is answered; each call keeps its own answer">
      <Row>
        <Button variant="secondary" onClick={askTwice}>
          Ask two questions at once
        </Button>
        <Button variant="secondary" onClick={askLater}>
          Ask one, and another 1.5 s later
        </Button>
      </Row>
      <p className={`mt-3 ${READOUT}`}>{log.length ? log.join(" · ") : "answers appear here"}</p>
      <div className="mt-3">
        <Note>
          The alternative — answering the open dialog <code className="font-mono">false</code> to
          make room — would answer a question the user never answered: the session prompt would
          cancel the rename they were reading. With the second button, leave the rename open: the
          session question waits behind it, then appears. Unmounting the provider answers
          everything still pending <code className="font-mono">false</code>, so no{" "}
          <code className="font-mono">await</code> hangs.
        </Note>
      </div>
    </Example>
  );
}

const CORNERS: { value: FloatingCorner; label: string }[] = [
  { value: "bottom-end", label: "bottom-end" },
  { value: "bottom-start", label: "bottom-start" },
];

function FloatingPanels() {
  const [enabled, setEnabled] = useState(false);
  const [corner, setCorner] = useState<FloatingCorner>("bottom-end");
  const [controlledOpen, setControlledOpen] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [fabPresses, setFabPresses] = useState(0);
  const [startOpen, setStartOpen] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const other: FloatingCorner = corner === "bottom-end" ? "bottom-start" : "bottom-end";
  return (
    <Example
      label="FloatingPanel + FloatingActionButton"
      hint="fixed to the viewport, so opt-in: tick the box and the buttons appear in the screen's bottom corners"
    >
      <Row>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Show the floating buttons on this page
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={startOpen} onChange={(e) => setStartOpen(e.target.checked)} />
          assistant <code className="font-mono">defaultOpen</code>
        </label>
      </Row>
      <Row className="mt-3">
        <span className="text-xs text-[var(--text-muted)]">assistant corner</span>
        <ToggleGroup<FloatingCorner> aria-label="Corner" value={corner} onChange={setCorner} options={CORNERS} />
        <Button variant="secondary" disabled={!enabled} onClick={() => setControlledOpen((v) => !v)}>
          {controlledOpen ? "Close feedback from the page" : "Open feedback from the page"}
        </Button>
      </Row>
      <OutTable
        rows={[
          ["feedback open (controlled)", String(controlledOpen)],
          ["onOpenChange", changes.length ? changes.join(", ") : "—"],
          ["standalone FAB presses", String(fabPresses)],
        ]}
      />
      {enabled && (
        <>
          {/* Uncontrolled: the panel owns its open state. */}
          <FloatingPanel
            // Re-keyed so toggling `defaultOpen` remounts it: an initial state is read once.
            key={String(startOpen)}
            defaultOpen={startOpen}
            title="Assistant"
            fabLabel="Open the assistant"
            fabIcon={<Bot />}
            corner={corner}
            // Raised to clear the standalone button below it — keksdose's assistant clears
            // the transactions page's own action group the same way.
            offset="calc(1rem + 4rem)"
            initialFocus={() => fieldRef.current}
            bodyClassName="space-y-3"
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Non-modal: the page stays usable, Tab walks out into it, and a click on the page does
              not close this. Escape does, while focus is in here.
            </p>
            <textarea
              ref={fieldRef}
              aria-label="Ask the assistant"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="initialFocus put the caret here"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </FloatingPanel>
          {/* Controlled, in the other corner: the page's button above opens it too. */}
          <FloatingPanel
            title="Send feedback"
            fabLabel="Send feedback"
            fabIcon={<MessageSquarePlus />}
            corner={other}
            open={controlledOpen}
            onOpenChange={(next) => {
              setControlledOpen(next);
              setChanges((c) => [...c, String(next)].slice(-6));
            }}
            closeLabel="Close feedback"
            className="md:w-[20rem]"
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Controlled: <code className="font-mono">open</code> is the page&apos;s state, and the
              FAB, the × (named by <code className="font-mono">closeLabel</code>) and Escape each ask
              through <code className="font-mono">onOpenChange</code>.
            </p>
          </FloatingPanel>
          {/* A standalone FAB at the default offset, under the assistant's raised one. */}
          <FloatingActionButton
            label="New transaction"
            icon={<Plus />}
            corner={corner}
            onClick={() => setFabPresses((n) => n + 1)}
          />
        </>
      )}
      <div className="mt-3">
        <Note>
          Three things float once the box is ticked: a standalone{" "}
          <code className="font-mono">FloatingActionButton</code> at the default offset and, stacked
          above it with <code className="font-mono">offset=&quot;calc(1rem + 4rem)&quot;</code>, the
          assistant (uncontrolled) in one corner — its card rises with it — and
          the controlled feedback panel in the other. A panel mounted open through{" "}
          <code className="font-mono">defaultOpen</code> does not take the page&apos;s focus by existing;
          only an open or close transition moves it. <code className="font-mono">corner</code> is
          logical — <code className="font-mono">bottom-end</code> is bottom-right here and
          bottom-left in RTL — and the bottom distance starts from the phone nav
          (<code className="font-mono">--app-nav-h</code>) and the home indicator, so on a phone the
          buttons sit above the bottom bar and the panel docks on it as a sheet. From{" "}
          <code className="font-mono">md</code> up the panel is a card above its FAB;{" "}
          <code className="font-mono">className=&quot;md:w-[20rem]&quot;</code> narrows the feedback one.
        </Note>
      </div>
    </Example>
  );
}

export function ConfirmFloating() {
  return (
    <>
      <ConfirmTones />
      <ConfirmQueue />
      <FloatingPanels />
    </>
  );
}
