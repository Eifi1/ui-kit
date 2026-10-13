import { useState } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { Button, DialogFrame, FormActions, Input, TextLink, Textarea, Checkbox, Switch } from "@eifi1/ui-kit";
import { Example, code, READOUT_PRE, Note, Stage, StateLine } from "../lib/section";

/**
 * FormActions — the row a form ends in — in one module, rendered as one section of the
 * Forms page. Its specimens were filed by the release that added them (forms-012,
 * harmonise-016, signals-017, misc-022, confirm-023) and sat between other components on
 * the page. Each keeps its label, so its anchor and its search entry hold, and says since
 * which release in a Note (refactor audit 2026-10, DOC-8).
 */

/* ── since 0.12 ─────────────────────────────────────────────────────────── */

function FormActionsPlacements() {
  const [log, setLog] = useState("—");
  const [pending, setPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const save = (where: string) => {
    setPending(true);
    setLog(`${where}: saving…`);
    window.setTimeout(() => {
      setPending(false);
      setLog(`${where}: saved`);
    }, 1200);
  };
  return (
    <Example
      label="FormActions — inline, sticky, dialog, destructive and pending"
      hint="the Save / Cancel row every form ends in; labels from the provider"
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-medium text-secondary">
            placement=&quot;inline&quot; (default) — submits the enclosing form, pending on click
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save("inline");
            }}
            className="rounded-md border border-subtle p-3"
          >
            <Input label="Account name" defaultValue="Household" />
            <FormActions onCancel={() => setLog("inline: cancelled")} pending={pending} pendingLabel="Saving…" />
          </form>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-secondary">
            placement=&quot;sticky&quot; — scroll the box: the row stays on its bottom edge
          </p>
          <div className="h-48 overflow-y-auto rounded-md border border-subtle px-3 pt-3">
            <div className="space-y-3">
              {["Street", "Postcode", "City", "Country", "Floor", "Door code"].map((f) => (
                <Input key={f} label={f} />
              ))}
            </div>
            <FormActions
              placement="sticky"
              onCancel={() => setLog("sticky: cancelled")}
              onSubmit={() => save("sticky")}
              pending={pending}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-secondary">
            placement=&quot;dialog&quot; in DialogFrame&apos;s footer, a destructive action, and a disabled reason
          </p>
          <Button type="button" variant="secondary" onClick={() => setDialogOpen(true)}>
            Edit budget…
          </Button>
          <DialogFrame
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Edit budget"
            actions={
              <FormActions
                placement="dialog"
                onCancel={() => {
                  setDialogOpen(false);
                  setLog("dialog: cancelled");
                }}
                onSubmit={() => save("dialog")}
                submitDisabled
                submitDisabledReason="The lines do not add up to the budget"
                destructive={{
                  label: "Delete budget",
                  onClick: () => {
                    setDialogOpen(false);
                    setLog("dialog: delete pressed");
                  },
                }}
              />
            }
          >
            <p className="text-sm text-secondary">
              Save is disabled with a reason — hover or Tab to it. Delete sits at the start, so the row
              aligns <code className="font-mono">between</code>.
            </p>
          </DialogFrame>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-secondary">
            align=&quot;start&quot;, extra children, submitVariant=&quot;danger&quot;, no Cancel
          </p>
          <FormActions
            align="start"
            submitLabel="Close the year"
            submitVariant="danger"
            onSubmit={() => setLog("start: close the year")}
          >
            <Button type="button" variant="ghost" onClick={() => setLog("start: preview")}>
              Preview
            </Button>
          </FormActions>
        </div>
      </div>
      <p className={`mt-3 ${READOUT_PRE}`}>last: {log}</p>
      <Note>Since 0.12.</Note>
    </Example>
  );
}

/* ── since 0.16 ─────────────────────────────────────────────────────────── */

const CAPTION = "text-xs text-muted";

function FormActions016Demo() {
  const [pending, setPending] = useState(false);
  const save = () => {
    setPending(true);
    window.setTimeout(() => setPending(false), 1500);
  };
  return (
    <>
      <Example
        label="FormActions — start slot, submitIcon and submitProps"
        hint="the spinner takes the icon's place while pending"
      >
        <div className="max-w-xl rounded-md border border-subtle p-3">
          <FormActions
            start={<span className={CAPTION}>Drag the corners to crop</span>}
            submitIcon={Check}
            submitLabel="Apply"
            submitProps={{ id: "crop-apply", "data-testid": "crop-apply" }}
            onSubmit={save}
            pending={pending}
            onCancel={() => {}}
          />
          <FormActions
            start={
              <TextLink href="#/forms" tone="muted" className="text-sm">
                View activity
              </TextLink>
            }
            destructive={{ label: "Delete", onClick: () => {} }}
            onSubmit={() => {}}
            onCancel={() => {}}
          />
        </div>
        <Note>
          {code("start")} is a neutral slot at the row's start — a caption or a link — after a{" "}
          {code("destructive")} action when both are given. {code("submitIcon")} draws a Lucide icon before the label, and
          while {code("pending")} the spinner replaces it, so no {code("pendingLabel")} copy is needed just to drop the
          glyph. {code("submitProps")} reaches the save button: {code("id")}, {code("data-*")}, {code("aria-*")}.
        </Note>
        <Note>Since 0.16.</Note>
      </Example>
      <Example label="FormActions — sticky inside a scroll container" hint='stickyWithin="container"'>
        <div className="h-56 max-w-xl overflow-y-auto rounded-md border border-subtle">
          <div className="space-y-3 p-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Input key={i} label={`Field ${i + 1}`} value="" onChange={() => {}} />
            ))}
          </div>
          <FormActions
            placement="sticky"
            stickyWithin="container"
            className="px-3"
            start={<span className={CAPTION}>Pinned to this pane</span>}
            onSubmit={() => {}}
            onCancel={() => {}}
          />
        </div>
        <Note>
          Sticky always sticks to the NEAREST scroll container, so the default row already holds in a pane — but it
          lifts itself by the document's {code("--app-nav-h")}, which on a phone left it a nav's height above a dialog
          body's bottom. {code('stickyWithin="container"')} sits at {code("bottom: 0")} of the container instead.
        </Note>
        <Note>Since 0.16.</Note>
      </Example>
    </>
  );
}

/* ── since 0.17 ─────────────────────────────────────────────────────────── */

function FormActions017Demo() {
  return (
    <Example
      label="FormActions — sticky on a phone, inline from md up, bled to the pane's edges"
      hint={'`placement={{ base: "sticky", md: "inline" }}` · `bleed="0.75rem"`'}
    >
      <div className="h-64 max-w-xl overflow-y-auto rounded-md border border-subtle px-3">
        <div className="space-y-3 py-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Input key={i} label={`Field ${i + 1}`} value="" onChange={() => {}} />
          ))}
        </div>
        <FormActions
          placement={{ base: "sticky", md: "inline" }}
          stickyWithin="container"
          bleed="0.75rem"
          className="pb-3"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      </div>
      <Note>
        Narrower than 768px the row sticks to the pane&apos;s bottom and its rule and surface run under the pane&apos;s{" "}
        {code("px-3")} to both edges, the buttons still on the fields&apos; line. From md up it is the inline row under
        the last field, and {code("bleed")} does nothing. The breakpoints are BulkActionBar&apos;s.
      </Note>
      <Note>Since 0.17.</Note>
    </Example>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

function FormActionsShortcut022Demo() {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <Example label="FormActions — Ctrl/⌘+Enter saves" hint='`submitShortcut="mod-enter"`, scoped to the form'>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPending(true);
          window.setTimeout(() => {
            setSaved((list) => [note || "(empty)", ...list].slice(0, 3));
            setPending(false);
          }, 900);
        }}
      >
        <Textarea label="Memo" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <FormActions submitShortcut="mod-enter" submitShortcutHint pending={pending} pendingLabel="Saving…" />
      </form>
      <p className="mt-2 text-xs text-muted">Saved: {saved.length ? saved.join(" · ") : "nothing yet"}</p>
      <Note>
        Press Ctrl+Enter (⌘+Enter on a Mac) in the memo: it is a press of Save — the form submits with its validation —
        and it does nothing while Save could not be pressed: {code("pending")}, {code("submitDisabled")}, or a{" "}
        {code("commit")} under a locked {code("WriteLockProvider")}. It listens on the document after every React
        handler, so a field that takes the chord for itself ({code("preventDefault")} / {code("stopPropagation")}) keeps
        it. {code("submitShortcutHint")} shows the dimmed hint; {code("aria-keyshortcuts")} is always set. keksdose K14.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/* ── since 0.23 ─────────────────────────────────────────────────────────── */

/** A dense inline confirm under a table row, as keksdose's admin plan row draws it. */
function FormActions023Demo() {
  const [small, setSmall] = useState(true);
  const [ticked, setTicked] = useState(false);
  const [log, setLog] = useState("—");
  return (
    <Example
      label="FormActions — size and cancelVariant"
      hint="a dense row: small buttons, a ghost Cancel, under a table row"
    >
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <Switch checked={small} onCheckedChange={setSmall} label={'size="sm" and cancelVariant="ghost"'} />
          <div className="w-full max-w-md space-y-2 rounded-lg bg-surface-2 p-2">
            <div className="flex gap-2 text-xs font-medium text-secondary">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Move user@example.com onto the PRO plan</span>
            </div>
            <Checkbox
              label="I have read what this does and want to continue."
              checked={ticked}
              onCheckedChange={setTicked}
            />
            <FormActions
              className="pt-0"
              align="start"
              size={small ? "sm" : undefined}
              cancelVariant={small ? "ghost" : undefined}
              onCancel={() => {
                setTicked(false);
                setLog("cancelled");
              }}
              onSubmit={() => setLog("plan set to PRO")}
              submitLabel="Set plan"
              submitVariant="primary"
              submitDisabled={!ticked}
              submitDisabledReason={ticked ? undefined : "Tick the box first"}
            />
          </div>
        </div>
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        {code('size="sm"')} sizes every button the row draws — Save, Cancel and a {code("{ label, onClick }")}{" "}
        {code("destructive")} — with the spinner and {code("submitIcon")} shrinking along. {code("children")} and an
        element you pass are yours to size. {code("cancelVariant")} defaults to {code("secondary")}, the outline it
        always had; {code("ghost")} steps Cancel back in a row that should read as one quiet line. Both default to
        what they were, so no row changes on the bump.
      </Note>
      <Note>Since 0.23.</Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** Every FormActions specimen, in the order the releases added them. */
export function FormActionsDemo() {
  return (
    <>
      <FormActionsPlacements />
      <FormActions016Demo />
      <FormActions017Demo />
      <FormActionsShortcut022Demo />
      <FormActions023Demo />
    </>
  );
}
