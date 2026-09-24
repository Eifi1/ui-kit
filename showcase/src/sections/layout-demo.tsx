import { useId, useState } from "react";
import { Button, Collapse, DialogFrame, Disclosure, Input, cn } from "@eifi1/ui-kit";
import { Example, Note, Row, Stage } from "../lib/section";

/**
 * LAYOUT: the two containers both apps had been writing by hand — a section that opens
 * in place, and the frame inside a dialog.
 *
 * Every disclosure here has a body that would notice being mounted: the mount stamp
 * below is the unmount-on-close contract made visible, because it is the one behaviour
 * a screenshot cannot show and the one an animated copy is most likely to lose.
 */

/** Stamps the moment it mounted, standing in for a body that fetches: close the card,
 *  open it again, and the time moves — the body really went away. */
function MountStamp() {
  const [at] = useState(() => new Date().toLocaleTimeString());
  return <p className="text-xs text-[var(--text-muted)]">Body mounted at {at} — a fetch here would run again on every open.</p>;
}

const COMPARE = ["Hysteresis", "Kinematics", "Transmission"];

export function LayoutDemo() {
  return (
    <>
      <Example
        label="Disclosure — card"
        hint="Uncontrolled; the body unmounts once the fold has closed"
      >
        <Stage>
          <CardSpecimens />
        </Stage>
        <Note>
          The fold is a <code className="font-mono">grid-template-rows</code> transition from{" "}
          <code className="font-mono">0fr</code> to <code className="font-mono">1fr</code>, so it
          needs no measuring. Under reduced motion it snaps, and the body goes at once.
        </Note>
      </Example>

      <Example label="Disclosure — one open at a time" hint="Controlled; the set is the caller's state">
        <Stage>
          <ControlledSet />
        </Stage>
      </Example>

      <Example label="Disclosure — bare" hint="For inside a surface that already has one">
        <Stage>
          <BareSpecimen />
        </Stage>
      </Example>

      <Example label="Collapse" hint="The fold alone, for a trigger of your own">
        <Stage>
          <CollapseSpecimen />
        </Stage>
      </Example>

      <Example label="DialogFrame" hint="Portals to document.body; covers the page, not this card">
        <DialogSpecimens />
        <Note>
          The heading&apos;s id is generated and wired to <code className="font-mono">aria-labelledby</code>,
          the description to <code className="font-mono">aria-describedby</code>. Only the body
          scrolls, so the heading and the actions stay on screen in a tall dialog.
        </Note>
      </Example>
    </>
  );
}

function CardSpecimens() {
  return (
    <>
      <Disclosure title="Export" hint="CSV of the current selection" headingAs="h4">
        <MountStamp />
        <Row>
          <Button variant="secondary">Download CSV</Button>
        </Row>
      </Disclosure>
      <Disclosure title="Corner guide" hint="Open by default: this card is the page" defaultOpen headingAs="h4">
        <p className="text-sm text-[var(--text-secondary)]">
          Closed is right for detail beside the thing itself; open is right where the card IS the
          thing.
        </p>
      </Disclosure>
    </>
  );
}

function ControlledSet() {
  const [open, setOpen] = useState<string | null>(COMPARE[0]!);
  return (
    <div data-stage="wide" className="mx-auto w-full max-w-xl space-y-3">
      {COMPARE.map((name) => (
        <Disclosure
          key={name}
          title={name}
          hint={`Compare ${name.toLowerCase()} across profiles`}
          headingAs="h4"
          open={open === name}
          onOpenChange={(next) => setOpen(next ? name : null)}
        >
          <div className="h-24 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-surface-2)]" />
        </Disclosure>
      ))}
      <p className="font-mono text-xs text-[var(--text-muted)]">open = {open ?? "null"}</p>
    </div>
  );
}

function BareSpecimen() {
  const hidden = ["Old savings", "Closed card", "Travel wallet"];
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="text-sm text-[var(--text-primary)]">Checking · Savings · Cash</p>
      <Disclosure variant="bare" title={`Show ${hidden.length} hidden accounts`} className="mt-2">
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          {hidden.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

function CollapseSpecimen() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="space-y-2">
      <Button variant="secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} the advanced fields
      </Button>
      {/* keepMounted: a half-typed field survives the close. */}
      <Collapse id={id} open={open} keepMounted>
        <div className="space-y-2 pt-2">
          <Input aria-label="Tolerance" placeholder="Tolerance" />
          <Input aria-label="Sample rate" placeholder="Sample rate" />
        </div>
      </Collapse>
    </div>
  );
}

type DialogKind = "form" | "commit" | "tall" | "sheet";

function DialogSpecimens() {
  const [kind, setKind] = useState<DialogKind | null>(null);
  const [name, setName] = useState("");
  const close = () => setKind(null);
  return (
    <>
      <Row>
        <Button variant="secondary" onClick={() => setKind("form")}>
          Form dialog
        </Button>
        <Button variant="secondary" onClick={() => setKind("commit")}>
          Commit-on-change (X only)
        </Button>
        <Button variant="secondary" onClick={() => setKind("tall")}>
          Tall body
        </Button>
        <Button variant="secondary" onClick={() => setKind("sheet")}>
          Full-screen on a phone
        </Button>
      </Row>

      {kind === "form" && (
        <DialogFrame
          onClose={close}
          title="New session"
          description="A name you will recognise in the list."
          headingAs="h4"
          actions={(animatedClose) => (
            <>
              {/* The function form hands over the panel's animated close — this Cancel
                  lowers the sheet the way Escape does. */}
              <Button variant="secondary" onClick={animatedClose}>
                Cancel
              </Button>
              <Button variant="brand" disabled={!name.trim()} onClick={close}>
                Save
              </Button>
            </>
          )}
        >
          <Input aria-label="Session name" value={name} onChange={(e) => setName(e.target.value)} />
        </DialogFrame>
      )}

      {kind === "commit" && (
        <DialogFrame onClose={close} title="Group settings" headingAs="h4" closeButton>
          <p className="text-sm text-[var(--text-secondary)]">
            Every change here saves as it is made, so there is no actions row — the X is the way
            out.
          </p>
        </DialogFrame>
      )}

      {(kind === "tall" || kind === "sheet") && (
        <DialogFrame
          onClose={close}
          title={kind === "tall" ? "Load command" : "Edit row"}
          description="Scroll the body: the heading and the actions stay put."
          headingAs="h4"
          size="lg"
          closeButton={kind === "sheet"}
          fullBleed={kind === "sheet"}
          className={cn(kind === "sheet" && "h-[100dvh] max-w-full rounded-none md:h-auto md:max-w-lg md:rounded-lg")}
          actions={(animatedClose) => (
            <>
              <Button variant="secondary" onClick={animatedClose}>
                Cancel
              </Button>
              <Button variant="brand" onClick={close}>
                Apply
              </Button>
            </>
          )}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <p key={i} className="text-sm text-[var(--text-secondary)]">
              Line {i + 1} of a body taller than the screen.
            </p>
          ))}
        </DialogFrame>
      )}
    </>
  );
}
