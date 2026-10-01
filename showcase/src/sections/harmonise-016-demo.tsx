import { useState } from "react";
import { Check, Paperclip, Star, Tag } from "lucide-react";
import {
  AmountInput,
  AuthedImage,
  Chip,
  FieldHint,
  FileButton,
  FormActions,
  Input,
  LoadingState,
  NumberInput,
  TextLink,
  roundToCurrency,
} from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.16 additions from keksdose's harmonisation sweep (P5, P7, P8, P9): FormActions'
 * start slot, container-sticky row, submit icon and submit props; LoadingState's
 * hidden label and compact padding; AuthedImage's `errorFallback={null}` and
 * `stopPropagation`; AmountInput's `hint`; FileButton's `showFileName`;
 * `roundToCurrency`'s `fallbackDigits`; NumberInput's tighter unit.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const CAPTION = "text-xs text-[var(--text-muted)]";

/* ── FormActions (Forms page) ─────────────────────────────────────────────── */

export function FormActions016Demo() {
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
        <div className="max-w-xl rounded-md border border-[var(--border)] p-3">
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
      </Example>
      <Example label="FormActions — sticky inside a scroll container" hint='stickyWithin="container"'>
        <div className="h-56 max-w-xl overflow-y-auto rounded-md border border-[var(--border)]">
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
      </Example>
    </>
  );
}

/* ── LoadingState (Feedback page) ─────────────────────────────────────────── */

export function LoadingState016Demo() {
  return (
    <Example label="LoadingState — hidden label and compact padding" hint="role=status still announces">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-[var(--border)]">
          <p className={`${CAPTION} px-2 pt-2`}>labelVisibility=&quot;sr-only&quot;</p>
          <LoadingState labelVisibility="sr-only" label="Loading invoices" />
        </div>
        <div className="rounded-md border border-[var(--border)]">
          <p className={`${CAPTION} px-2 pt-2`}>label=&#123;null&#125;</p>
          <LoadingState label={null} />
        </div>
        <div className="rounded-md border border-[var(--border)]">
          <p className={`${CAPTION} px-2 pt-2`}>compact (md at py-8)</p>
          <LoadingState compact />
        </div>
      </div>
      <Note>
        {code("label={null}")} used to print &ldquo;Loading…&rdquo; anyway; now it hides the words and the status region
        keeps announcing {code("common.loading")}. {code("compact")} is the step between {code("sm")} and {code("md")}.
      </Note>
    </Example>
  );
}

/* ── AuthedImage (Media page) ─────────────────────────────────────────────── */

const PICTURE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><rect width="40" height="30" fill="#7aa2c8"/><circle cx="12" cy="10" r="4" fill="#f4d35e"/><path d="M0 30 L14 16 L24 26 L30 20 L40 30Z" fill="#3d6b4f"/></svg>',
  );

export function Media016Demo() {
  const [rowClicks, setRowClicks] = useState(0);
  return (
    <Example label="AuthedImage — errorFallback={null} and stopPropagation">
      <div className="grid max-w-xl grid-cols-2 gap-3">
        <figure className="space-y-1">
          <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-[var(--border)]">
            <AuthedImage src="/missing-photo.png" alt="Receipt" errorFallback={null} wrapperClassName="h-full w-full" />
          </div>
          <figcaption className={READOUT}>404 · errorFallback=&#123;null&#125; renders nothing</figcaption>
        </figure>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a stand-in for a clickable table row */}
        <div className="cursor-pointer space-y-1 rounded-md p-1 hover:bg-[var(--bg-hover)]" onClick={() => setRowClicks((n) => n + 1)}>
          <AuthedImage
            src={PICTURE}
            alt="Meter reading"
            link
            stopPropagation
            wrapperClassName="aspect-[4/3] w-full"
            className="h-full w-full rounded-md object-cover"
          />
          <p className={READOUT}>row clicks: {rowClicks} (the image does not count)</p>
        </div>
      </div>
    </Example>
  );
}

/* ── AmountInput hint, NumberInput unit, roundToCurrency (Numbers page) ───── */

export function Numbers016Demo() {
  const [amount, setAmount] = useState("12.50");
  const [rate, setRate] = useState("3.49");
  return (
    <Example label="AmountInput hint, a tighter unit, roundToCurrency fallbackDigits">
      <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <AmountInput
          label="Deposit"
          currency="EUR"
          value={amount}
          onChange={setAmount}
          hint={<FieldHint label="Held until the lease ends." />}
        />
        <AmountInput label="Monthly rent" currency="EUR" value={amount} onChange={setAmount} hint="Cold rent, without utilities" />
      </div>
      <Row>
        <div className="w-24">
          <NumberInput ariaLabel="VAT rate" value={rate} onChange={setRate} suffix="%" calculator={false} />
        </div>
        <div className="w-28">
          <NumberInput ariaLabel="Speed" value="88" onChange={() => {}} suffix="km/h" calculator={false} />
        </div>
        <span className={CAPTION}>a unit in a narrow cell: ~8px of end padding, not 12</span>
      </Row>
      <ul className={`space-y-0.5 ${READOUT}`}>
        <li>roundToCurrency(0.1 + 0.2, &quot;&quot;) → {String(roundToCurrency(0.1 + 0.2, ""))}</li>
        <li>
          roundToCurrency(0.1 + 0.2, &quot;&quot;, &#123; fallbackDigits: 2 &#125;) →{" "}
          {String(roundToCurrency(0.1 + 0.2, "", { fallbackDigits: 2 }))}
        </li>
        <li>roundToCurrency(1.005, &quot;EUR&quot;, &#123; fallbackDigits: 0 &#125;) → {String(roundToCurrency(1.005, "EUR", { fallbackDigits: 0 }))}</li>
      </ul>
    </Example>
  );
}

/* ── FileButton (Files page) ──────────────────────────────────────────────── */

export function Files016Demo() {
  return (
    <Example label="FileButton — showFileName" hint="the last accepted pick, beside the button">
      <Row>
        <FileButton variant="secondary" showFileName onFiles={() => {}}>
          <Paperclip aria-hidden className="size-4" /> Attach receipt
        </FileButton>
        <FileButton variant="secondary" multiple showFileName onFiles={() => {}}>
          <Paperclip aria-hidden className="size-4" /> Attach several
        </FileButton>
      </Row>
    </Example>
  );
}

/* ── Chip xs icon (Chips page) ────────────────────────────────────────────── */

export function Chips016Demo() {
  return (
    <Example label="Chip — xs with an icon" hint="the icon at the xs text's cap height">
      <Row>
        <Chip size="xs" icon={Tag}>
          Groceries
        </Chip>
        <Chip size="xs" icon={Star} tone="warning">
          Pinned
        </Chip>
        <Chip size="xs" icon={Tag} caps tone="success">
          Paid
        </Chip>
        <Chip size="sm" icon={Tag}>
          sm for scale
        </Chip>
      </Row>
    </Example>
  );
}
