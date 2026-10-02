import { useState } from "react";
import {
  Button,
  ChatComposer,
  DataTable,
  FeedbackAttachmentField,
  FormActions,
  Input,
  LineItems,
  Textarea,
  ToggleGroup,
  useTour,
} from "@eifi1/ui-kit";
import type { DataTableColumn, FeedbackAttachmentRef, LineItemsColumn, TourStep } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.22.0, from keksdose's inputs and tours audits (2026-10-02): the DataTable's phone
 * sort row (K10), FormActions' Ctrl/⌘+Enter (K14), upload-on-pick attachments (K16),
 * the composer's root attributes and its `ChatComposer` name (K17), LineItems'
 * `rowProps` (K20), and the tour's stale-spotlight fix (tours audit §1.0 A).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── DataTable mobileSort (page: data-table) ─────────────────────────────── */

interface Payee {
  id: number;
  name: string;
  total: number;
  count: number;
}

const PAYEES: Payee[] = [
  { id: 1, name: "Migros", total: 1240.5, count: 38 },
  { id: 2, name: "SBB", total: 860, count: 12 },
  { id: 3, name: "Coop", total: 990.2, count: 41 },
  { id: 4, name: "Swisscom", total: 420, count: 6 },
];

const PAYEE_COLUMNS: DataTableColumn<Payee>[] = [
  { key: "name", header: "Payee", cell: (p) => p.name, sortBy: (p) => p.name, mobilePrimary: true },
  {
    key: "total",
    header: <span>Paid (CHF)</span>,
    headerText: "Paid",
    cell: (p) => p.total.toFixed(2),
    sortBy: (p) => p.total,
    firstSort: "desc",
    className: "text-end tabular-nums",
    headClassName: "text-end",
  },
  {
    key: "count",
    header: "Payments",
    cell: (p) => p.count,
    sortBy: (p) => p.count,
    firstSort: "desc",
    className: "text-end tabular-nums",
    headClassName: "text-end",
  },
];

export function DataTableMobileSort022Demo() {
  return (
    <Example
      label="DataTable — a Sort by row on the phone"
      hint="`mobileSort`: the card list has no header row, so the sort gets its own control"
    >
      <DataTable
        rows={PAYEES}
        columns={PAYEE_COLUMNS}
        rowKey={(p) => p.id}
        mobileSort
        sortCycle="toggle"
        chrome="minimal"
        paginated={false}
        labels={{ table: "Payees" }}
      />
      <Note>
        Narrow the window below 768px: the cards get a &ldquo;Sort by&rdquo; select and a direction button above
        them. They drive the table&apos;s own sort, so the header shows what the phone chose and the other way round,
        a picked column starts in its {code("firstSort")} like a header click, and under {code('sortCycle="toggle"')}
        &ldquo;Default order&rdquo; is offered only until the table is ranked. A column whose header is not text names
        its option with {code("headerText")}. keksdose K10 (its aggregated report tables, #258). Off by default.
      </Note>
    </Example>
  );
}

/* ── FormActions submitShortcut (page: forms) ────────────────────────────── */

export function FormActionsShortcut022Demo() {
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
      <p className="mt-2 text-xs text-[var(--text-muted)]">Saved: {saved.length ? saved.join(" · ") : "nothing yet"}</p>
      <Note>
        Press Ctrl+Enter (⌘+Enter on a Mac) in the memo: it is a press of Save — the form submits with its validation —
        and it does nothing while Save could not be pressed: {code("pending")}, {code("submitDisabled")}, or a{" "}
        {code("commit")} under a locked {code("WriteLockProvider")}. It listens on the document after every React
        handler, so a field that takes the chord for itself ({code("preventDefault")} / {code("stopPropagation")}) keeps
        it. {code("submitShortcutHint")} shows the dimmed hint; {code("aria-keyshortcuts")} is always set. keksdose K14.
      </Note>
    </Example>
  );
}

/* ── LineItems rowProps (page: forms) ────────────────────────────────────── */

interface Condition {
  id: number;
  field: string;
  value: string;
}

let nextCondition = 3;

export function LineItemsRowProps022Demo() {
  const [rows, setRows] = useState<Condition[]>([
    { id: 1, field: "Payee", value: "Migros" },
    { id: 2, field: "Amount", value: "> 100" },
  ]);
  const { start } = useTour();
  const update = (index: number, patch: Partial<Condition>) =>
    setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const columns: LineItemsColumn<Condition>[] = [
    {
      key: "field",
      header: "Field",
      render: ({ item, index, label }) => (
        <Input aria-label={label} value={item.field} onChange={(e) => update(index, { field: e.target.value })} />
      ),
    },
    {
      key: "value",
      header: "Matches",
      render: ({ item, index, label }) => (
        <Input aria-label={label} value={item.value} onChange={(e) => update(index, { value: e.target.value })} />
      ),
    },
  ];
  return (
    <Example label="LineItems — attributes on each row" hint="`rowProps(item, index)`: a tour anchor, a test id">
      <div className="space-y-3">
        <LineItems
          items={rows}
          columns={columns}
          rowLabel={(i) => `Condition ${i + 1}`}
          onAdd={() => setRows((list) => [...list, { id: nextCondition++, field: "", value: "" }])}
          onRemove={(i) => setRows((list) => list.filter((_, j) => j !== i))}
          rowProps={(item, index) => ({
            "data-tour": index === 0 ? "showcase-rule-condition" : undefined,
            "data-testid": `condition-${item.id}`,
          })}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            start([
              {
                target: '[data-tour="showcase-rule-condition"]',
                title: "A condition",
                body: "The whole first row is the anchor — not one field inside it.",
              },
            ])
          }
        >
          Spotlight the first row
        </Button>
      </div>
      <Note>
        The row&apos;s {code("role")}, its {code("aria-label")} ({code("rowLabel")}) and {code("data-line-items-row")} stay
        the list&apos;s; a {code("className")} is added after the row&apos;s own, and an {code("onKeyDown")} runs before
        the row&apos;s Ctrl/⌘+Enter &ldquo;add a row&rdquo; ({code("preventDefault()")} keeps it from adding). keksdose K20:
        its rule editor&apos;s tour step anchored on a span around one field (dev#495).
      </Note>
    </Example>
  );
}

/* ── FeedbackAttachmentField refs (page: feedback-compose) ───────────────── */

let nextUpload = 1;

export function FeedbackAttachmentRefs022Demo() {
  const [refs, setRefs] = useState<FeedbackAttachmentRef[]>([]);
  const [outcome, setOutcome] = useState<"succeed" | "fail">("succeed");
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const say = (line: string) => setLog((list) => [line, ...list].slice(0, 4));
  const upload = (file: File) =>
    new Promise<FeedbackAttachmentRef>((resolve, reject) => {
      window.setTimeout(() => {
        if (outcome === "fail") reject(new Error("413 Payload Too Large"));
        else resolve({ key: `upload-${nextUpload++}`, name: file.name, size: file.size, type: file.type });
      }, 1200);
    });
  return (
    <Example label="FeedbackAttachmentField — uploaded on pick" hint="`refs`: the value is the refs the uploads answered">
      <div className="space-y-3">
        <ToggleGroup
          aria-label="Upload outcome"
          value={outcome}
          onChange={(v) => setOutcome(v as "succeed" | "fail")}
          options={[
            { value: "succeed", label: "Uploads succeed" },
            { value: "fail", label: "Uploads fail" },
          ]}
        />
        <FeedbackAttachmentField
          refs
          value={refs}
          onChange={setRefs}
          onUpload={upload}
          onRemove={(key) => say(`removed ${key} — delete it on the server`)}
          onUploadingChange={setUploading}
          onError={(kind, error) => say(kind === "upload" ? `upload failed: ${String(error)}` : `refused: ${kind}`)}
          accept={["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"]}
        />
        <p className="text-xs text-[var(--text-muted)]">
          {uploading ? "Uploading — Send waits." : `Ready to send: ${refs.map((r) => r.key).join(", ") || "nothing"}`}
        </p>
        {log.length > 0 && <p className="text-xs text-[var(--text-muted)]">{log.join(" · ")}</p>}
      </div>
      <Note>
        Every way in — pick, paste, capture — is validated as in the File modes, then handed to {code("onUpload")}; a
        chip with a spinner stands in until it answers, and the ref joins {code("value")}. A rejection drops the chip and
        reports {code('onError("upload", error)')}. Removal goes by key ({code("onRemove")}). Uploads in flight count
        against {code("max")}. keksdose K16 (the support chat&apos;s AttachmentPicker).
      </Note>
    </Example>
  );
}

/* ── ChatComposer + root attributes (page: feedback-inbox) ───────────────── */

export function ChatComposer022Demo() {
  const [sent, setSent] = useState<string[]>([]);
  return (
    <Example label="ChatComposer — the composer under a neutral name" hint="`id` and `data-*` reach its root">
      <div className="space-y-3">
        {sent.length > 0 && (
          <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
            {sent.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
        <ChatComposer
          sendOn="enter"
          rows={2}
          placeholder="Ask the assistant…"
          data-tour="showcase-assistant-ask"
          onSend={(body) => setSent((list) => [...list, body])}
        />
      </div>
      <Note>
        {code("ChatComposer")} is {code("FeedbackComposer")} — the same function, so the two cannot drift — for a chat
        that is not a report. Both put {code("id")} and any {code("data-*")} on their root (the box, or the{" "}
        {code("disabledReason")} line in its place): keksdose&apos;s assistant tour points at{" "}
        {code('[data-tour="assistant-ask"]')}. keksdose K17.
      </Note>
    </Example>
  );
}

/* ── Tour: no stale spotlight (page: tour) ───────────────────────────────── */

const STALE_STEPS: TourStep[] = [
  {
    target: '[data-tour="showcase-stale-a"]',
    title: "A spotlighted step",
    body: "Next goes to a step with no target.",
  },
  { title: "A centred step", body: "Centred, with no hole left over from the step before." },
  {
    target: '[data-tour="showcase-stale-missing"]',
    title: "A missing anchor",
    body: "Its target is not on the page: it reads as untargeted, not as the last thing that was lit.",
  },
  { target: '[data-tour="showcase-stale-a"]', title: "Lit again", body: "Back and Next keep each step its own." },
];

export function TourStaleSpotlight022Demo() {
  const { start } = useTour();
  return (
    <Example
      label="Tour — the step after a spotlighted one"
      hint="keksdose tours audit §1.0 A: the old hole stayed, and the card sat beside it"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" data-tour="showcase-stale-a" onClick={() => start(STALE_STEPS)}>
          Run: spotlit → centred → missing → spotlit
        </Button>
      </div>
      <Note>
        Before 0.22 a step with no target (or a missing one) right after a spotlighted step kept that step&apos;s hole and
        parked its card beside it — in 15 steps of keksdose&apos;s 16 tours — and Back→Next kept it indefinitely. React 19
        dropped the overlay&apos;s render-phase reset while the follow interval had an update queued; the located rect now
        carries the step it was found for, and a rect from another step is never drawn. Walk it with the arrows too.
      </Note>
    </Example>
  );
}
