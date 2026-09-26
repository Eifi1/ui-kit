import { useCallback, useEffect, useId, useState } from "react";
import { Button, DialogFrame, FullBleedDialog, Input, Modal } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * DIALOGS — 0.10.0's `open` on Modal and DialogFrame: the dialog stays mounted, and a
 * close the CALLER decides on (a save that succeeded) plays the same exit a dismissal
 * does. And FullBleedDialog's `title`, a real heading that names the dialog.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

/** A save that takes a moment and then closes the dialog from outside. */
function useFakeSave(onDone: () => void) {
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => {
      setSaving(false);
      onDone();
    }, 700);
    return () => clearTimeout(timer);
  }, [saving, onDone]);
  return { saving, save: () => setSaving(true) };
}

function ModalOpen() {
  const [open, setOpen] = useState(false);
  const [gated, setGated] = useState(false);
  const [saved, setSaved] = useState(0);
  const headingId = useId();
  const gatedId = useId();
  const done = useCallback(() => {
    setOpen(false);
    setGated(false);
    setSaved((n) => n + 1);
  }, []);
  const { saving, save } = useFakeSave(done);
  return (
    <Example
      label="Modal — open, and the exit on a caller's close"
      hint="kept mounted with open={…}: a setOpen(false) after a save lowers the panel instead of cutting it"
    >
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open with open={"{open}"}
        </Button>
        <Button variant="secondary" onClick={() => setGated(true)}>
          Open the old way — {"{open && <Modal/>}"}
        </Button>
        <span className={READOUT}>
          open={String(open)} · saves: {saved}
        </span>
      </Row>
      <Modal open={open} labelledBy={headingId} className="space-y-3" onClose={() => setOpen(false)}>
        <h4 id={headingId} className="text-sm font-semibold text-[var(--text-primary)]">
          Rename the account (open prop)
        </h4>
        <Input label="Name" defaultValue="Household" />
        <Row className="justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="brand" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Row>
      </Modal>
      {gated && (
        <Modal labelledBy={gatedId} className="space-y-3" onClose={() => setGated(false)}>
          <h4 id={gatedId} className="text-sm font-semibold text-[var(--text-primary)]">
            Rename the account (mounted only while open)
          </h4>
          <Input label="Name" defaultValue="Household" />
          <Row className="justify-end">
            <Button variant="brand" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Row>
        </Modal>
      )}
      <div className="mt-3">
        <Note>
          Press <strong>Save</strong> in each: the first dialog is told <code className="font-mono">open={"{false}"}</code>{" "}
          when the save succeeds and lowers itself with the same exit Escape and the backdrop use; the second is
          unmounted by its gate and simply vanishes. With <code className="font-mono">open</code> the focus trap, the
          scroll lock and the Back entry are released the moment it turns false — focus is back on the trigger
          while the panel is still on its way out — and the body is unmounted once the exit ends, so the field
          starts fresh on the next open. A dismissal animates first and then calls{" "}
          <code className="font-mono">onClose</code>; the <code className="font-mono">false</code> that comes back is
          not animated twice.
        </Note>
      </div>
    </Example>
  );
}

function DialogFrameOpen() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(0);
  const done = useCallback(() => {
    setOpen(false);
    setSaved((n) => n + 1);
  }, []);
  const { saving, save } = useFakeSave(done);
  return (
    <Example label="DialogFrame — open" hint="the frame passes open to its Modal, replacing the {open && …} gate">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          New category
        </Button>
        <span className={READOUT}>
          open={String(open)} · created: {saved}
        </span>
      </Row>
      <DialogFrame
        open={open}
        onClose={() => setOpen(false)}
        title="New category"
        description="It appears in every budget from next month."
        headingAs="h4"
        closeButton
        actions={(close) => (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="brand" onClick={save} disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </>
        )}
      >
        <Input label="Name" defaultValue="Pets" />
      </DialogFrame>
    </Example>
  );
}

function FullBleedTitle() {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<"h2" | "h3">("h2");
  return (
    <Example
      label="FullBleedDialog — title and headingAs"
      hint="a real heading in the header strip, wired to aria-labelledby — the dialog is announced by name"
    >
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open the phone editor
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={level === "h3"} onChange={(e) => setLevel(e.target.checked ? "h3" : "h2")} />
          <code className="font-mono">headingAs=&quot;h3&quot;</code>
        </label>
      </Row>
      <FullBleedDialog
        open={open}
        onClose={() => setOpen(false)}
        closeLabel="Close the editor"
        title="Edit budget line"
        headingAs={level}
        header={<span className="truncate text-xs text-[var(--text-muted)]">Groceries · September</span>}
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            The heading &ldquo;Edit budget line&rdquo; is an <code className="font-mono">{level}</code> and names this
            dialog; <code className="font-mono">header</code> is still the free slot beside it (the row&apos;s own
            context, in grey). Before 0.10.0 this strip was a styled div, and a named full-screen editor had to
            leave this component for <code className="font-mono">DialogFrame fullBleed</code>.
          </p>
          <Input label="Planned" defaultValue="450.00" inputMode="decimal" />
        </div>
      </FullBleedDialog>
    </Example>
  );
}

export function DialogOpenDemo() {
  return (
    <>
      <ModalOpen />
      <DialogFrameOpen />
      <FullBleedTitle />
    </>
  );
}
