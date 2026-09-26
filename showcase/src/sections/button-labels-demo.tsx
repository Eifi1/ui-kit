import { useState } from "react";
import { Bell, Copy, Pencil, Star, Trash2, X } from "lucide-react";
import { Button, IconButton } from "@eifi1/ui-kit";
import type { ButtonTone, TooltipSide } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * BUTTONS — the 0.10.0 props: an icon button that names itself once (`label`, and the
 * tooltip it brings), the quiet tones of a link or ghost button, a text toggle
 * (`pressed`), and a disabled button that can say why (`disabledReason`).
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const SIDES: TooltipSide[] = ["top", "bottom", "start", "end"];

function IconButtonLabel() {
  const [last, setLast] = useState("—");
  return (
    <Example
      label="IconButton — label, tooltip, tooltipSide and tooltipPortal"
      hint="label is the aria-label AND the text of a kit Tooltip — said once, instead of aria-label plus title"
    >
      <div className="space-y-4">
        <Row>
          <IconButton label="Edit the row" onClick={() => setLast("edit")}>
            <Pencil />
          </IconButton>
          <IconButton label="Copy the IBAN" onClick={() => setLast("copy")}>
            <Copy />
          </IconButton>
          <IconButton label="Delete the row" tone="danger" onClick={() => setLast("delete")}>
            <Trash2 />
          </IconButton>
          <IconButton label="Close" tooltip={false} onClick={() => setLast("close (no bubble)")}>
            <X />
          </IconButton>
          <span className={READOUT}>last: {last}</span>
        </Row>
        <Row>
          {SIDES.map((side) => (
            <IconButton key={side} label={`tooltipSide="${side}"`} tooltipSide={side} variant="secondary">
              <Star />
            </IconButton>
          ))}
        </Row>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-end gap-2 overflow-hidden rounded-md border border-dashed border-[var(--border)] p-2">
            <span className="me-auto text-xs text-[var(--text-muted)]">overflow-hidden · tooltipPortal</span>
            <IconButton label="Notifications — the bubble escapes the box" tooltipSide="end" tooltipPortal>
              <Bell />
            </IconButton>
          </div>
          <div className="flex items-center justify-end gap-2 overflow-hidden rounded-md border border-dashed border-[var(--border)] p-2">
            <span className="me-auto text-xs text-[var(--text-muted)]">overflow-hidden · tooltipPortal={"{false}"}</span>
            <IconButton label="Notifications — clipped by the box" tooltipSide="end" tooltipPortal={false}>
              <Bell />
            </IconButton>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          Hover or Tab onto each: the bubble is the kit&apos;s, shown on focus and on touch as well, which the
          browser&apos;s <code className="font-mono">title</code> never is. It is visual only — the name is
          already the <code className="font-mono">aria-label</code>, so a screen reader does not hear it twice.{" "}
          <code className="font-mono">tooltip={"{false}"}</code> keeps the name and drops the bubble, for a glyph
          everyone reads (the ✕). <code className="font-mono">tooltipSide</code> is Tooltip&apos;s{" "}
          <code className="font-mono">side</code>; <code className="font-mono">tooltipPortal</code> is its{" "}
          <code className="font-mono">portal</code> — left out, Tooltip decides (it portals inside a clipping
          box on its own); the two boxes force each answer, and only the portalled bubble gets out.
        </Note>
      </div>
    </Example>
  );
}

const TONES: ButtonTone[] = ["default", "muted", "danger"];

function ButtonTones() {
  const [log, setLog] = useState("—");
  return (
    <Example
      label="Button — tone on link and ghost"
      hint="muted: quiet, body colour on hover · danger: quiet, --danger on hover"
    >
      <div className="space-y-3">
        {(["link", "ghost"] as const).map((variant) => (
          <Row key={variant}>
            <span className="w-12 font-mono text-xs text-[var(--text-muted)]">{variant}</span>
            {TONES.map((tone) => (
              <Button key={tone} variant={variant} tone={tone} onClick={() => setLog(`${variant} ${tone}`)}>
                tone=&quot;{tone}&quot;
              </Button>
            ))}
          </Row>
        ))}
        <Row>
          <span className="w-12 font-mono text-xs text-[var(--text-muted)]">in use</span>
          <span className="text-sm text-[var(--text-secondary)]">Split 2 of 3</span>
          <Button variant="link" onClick={() => setLog("add line")}>
            Add line
          </Button>
          <Button variant="link" tone="muted" onClick={() => setLog("fill total")}>
            Fill total
          </Button>
          <Button variant="link" tone="danger" onClick={() => setLog("remove split")}>
            Remove split
          </Button>
        </Row>
      </div>
      <p className={`mt-3 ${READOUT}`}>last: {log}</p>
      <div className="mt-3">
        <Note>
          A tone rather than a <code className="font-mono">link-muted</code> variant, because it is the axis{" "}
          <code className="font-mono">IconButton</code> already has, and the same two looks are wanted on{" "}
          <code className="font-mono">ghost</code>. The boxed variants carry their meaning in the box, so a tone
          on them does nothing. Hover the last row: the brand link is the action, the muted one is findable
          without competing, and the danger one turns red only under the pointer.
        </Note>
      </div>
    </Example>
  );
}

function ButtonPressed() {
  const [allSpeeds, setAllSpeeds] = useState(false);
  const [bold, setBold] = useState(true);
  return (
    <Example label="Button — pressed" hint="a toggle button: aria-pressed and the “on” look, on a link or a boxed variant">
      <Row>
        <Button variant="link" tone="muted" pressed={allSpeeds} onClick={() => setAllSpeeds((v) => !v)}>
          All speeds
        </Button>
        <Button variant="secondary" pressed={bold} onClick={() => setBold((v) => !v)}>
          Bold
        </Button>
        <Button variant="ghost">no pressed prop — no aria-pressed</Button>
        <span className={READOUT}>
          All speeds: aria-pressed={String(allSpeeds)} · Bold: aria-pressed={String(bold)}
        </span>
      </Row>
      <div className="mt-3">
        <Note>
          On a <code className="font-mono">link</code>, pressed is the brand colour and a medium weight —
          after the tone, so a pressed muted link is brand and an unpressed one quiet grey. On a boxed
          variant it is the quiet brand fill <code className="font-mono">IconButton</code>&apos;s{" "}
          <code className="font-mono">pressed</code> draws. <code className="font-mono">false</code> is{" "}
          <code className="font-mono">aria-pressed=&quot;false&quot;</code> (a toggle that is off); leaving it out
          means the button is not a toggle at all.
        </Note>
      </div>
    </Example>
  );
}

function ButtonDisabledReason() {
  const [signed, setSigned] = useState(true);
  const [saves, setSaves] = useState(0);
  const [submits, setSubmits] = useState(0);
  const reason = signed ? "The handover is signed — it can no longer be edited." : undefined;
  return (
    <Example
      label="Button — disabledReason"
      hint="a disabled button that can say why: still focusable, still hoverable, and it does nothing"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmits((n) => n + 1);
        }}
      >
        <Row>
          <Button type="button" variant="secondary" disabledReason={reason} onClick={() => setSaves((n) => n + 1)}>
            Edit handover
          </Button>
          <Button type="submit" disabledReason={reason}>
            Submit (a form&apos;s submit)
          </Button>
          <Button type="button" variant="secondary" disabled>
            plain disabled — no reason, no focus
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSigned((v) => !v)}>
            {signed ? "Unsign the handover" : "Sign the handover"}
          </Button>
        </Row>
      </form>
      <p className={`mt-3 ${READOUT}`}>
        edit clicks that ran: {saves} · form submits: {submits}
      </p>
      <div className="mt-3">
        <Note>
          Tab to &ldquo;Edit handover&rdquo;: it takes focus (the plain disabled one never does), the reason
          shows in the kit tooltip and is the button&apos;s <code className="font-mono">aria-describedby</code>, so
          a screen reader hears why on focus. Clicking it — or pressing Enter on the submit — does nothing:
          the counters stay put, and the form is not submitted. <code className="font-mono">disabledReason</code>{" "}
          wins over <code className="font-mono">disabled</code>, because a reason nobody can reach is no
          reason. Sign it off and both work.
        </Note>
      </div>
    </Example>
  );
}

export function ButtonLabelsTones() {
  return (
    <>
      <IconButtonLabel />
      <ButtonTones />
      <ButtonPressed />
      <ButtonDisabledReason />
    </>
  );
}
