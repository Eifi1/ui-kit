import { useRef, useState } from "react";
import {
  Button,
  ColumnRoleTable,
  FeedbackDialog,
  FeedbackNoteEditor,
  Textarea,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { ButtonSize, ButtonVariant, ColumnMapping, ColumnRole } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.25 polish the apps reported on 0.24. Synthetic data only. Four parts, four pages:
 *
 * - {@link TextareaEdge025Demo} — the label strip's lower edge (Kurvenschmiede). Fields
 *   page (slug `fields`), after Textarea024Demo.
 * - {@link ColumnRoleRequired025Demo} — the short required mark and the column floor
 *   (keksdose, on a phone). Measured grid page (slug `measured-grid`), after
 *   ColumnMapper024Demo.
 * - {@link FeedbackDialogButtons025Demo} — `attachmentButtonVariant` / `…Size` on the
 *   FeedbackDialog. Feedback — compose (slug `feedback-compose`).
 * - {@link FeedbackNoteButtons025Demo} — `buttonVariant` / `buttonSize` in the note
 *   editor's `attachment` config. Feedback — inbox (slug `feedback-inbox`).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── Textarea: the strip's lower edge ───────────────────────────────────── */

// A recorder export with decimal commas — every row has the commas whose tails the
// report was about.
const TABLE = [
  "zeit;soll;ist",
  ...Array.from({ length: 40 }, (_, i) => {
    const t = (i * 0.5).toFixed(1).replace(".", ",");
    const set = (i < 8 ? 20 : 22).toFixed(1).replace(".", ",");
    const act = (i < 8 ? 19.8 : 22 - 2.2 * Math.exp(-(i - 8) / 5)).toFixed(2).replace(".", ",");
    return `${t};${set};${act}`;
  }),
].join("\n");

const NOTES = Array.from(
  { length: 12 },
  (_, i) => `Run ${i + 1}: gently quiet, typography by jumping glyphs; quality kept, yields okay.`,
).join("\n");

/** Where to put the fields: so many pixels of the line on its way out left below the
 *  strip. The field's lines are 20px (text-sm), and three lines are scrolled past. */
const POSITIONS = {
  tails: 4,
  half: 10,
  more: 13,
  boundary: 0,
  top: -1,
} as const;
type Position = keyof typeof POSITIONS;

const scrollFor = (position: Position) => {
  const left = POSITIONS[position];
  if (left < 0) return 0;
  return left === 0 ? 60 : 60 + (20 - left);
};

/** Open in the state the report was about — a line scrolled all but its tails away.
 *  Module-level, so it is one stable ref and runs on mount only, never under typing. */
const opened = (el: HTMLTextAreaElement | null) => {
  if (el) el.scrollTop = scrollFor("tails");
};

export function TextareaEdge025Demo() {
  const [table, setTable] = useState(TABLE);
  const [notes, setNotes] = useState(NOTES);
  const [position, setPosition] = useState<Position>("tails");
  const box = useRef<HTMLDivElement>(null);
  const place = (next: Position) => {
    setPosition(next);
    for (const field of box.current?.querySelectorAll("textarea") ?? []) field.scrollTop = scrollFor(next);
  };
  return (
    <Example
      label="Textarea — the label strip's lower edge"
      hint="both fields open with a line scrolled all but its tails under the label; pick another position"
    >
      <div className="flex flex-col gap-4">
        <ToggleGroup
          aria-label="Scroll position"
          size="sm"
          value={position}
          onChange={(v) => place(v as Position)}
          options={[
            { value: "tails", label: "4px left" },
            { value: "half", label: "Half a line" },
            { value: "more", label: "13px left" },
            { value: "boundary", label: "On a line" },
            { value: "top", label: "At rest" },
          ]}
        />
        <div ref={box} className="grid gap-4 md:grid-cols-2">
          <Textarea
            ref={opened}
            label="Paste a table"
            rows={5}
            wrap="off"
            spellCheck={false}
            className="font-mono"
            value={table}
            onChange={(e) => setTable(e.target.value)}
          />
          <Textarea
            ref={opened}
            label="Notes on the runs"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Note>
          Kurvenschmiede, on 0.24: under the label strip, a line scrolled most of the way out
          left a row of comma tails above the first whole line. The strip&apos;s edge now follows
          the scroll. Half a line or less left: covered, solid, to exactly where that line ends —
          the strip snaps to the line box, and the next line is untouched. More than half: a 3px
          soft edge instead of a cut. On a line boundary, and at rest, nothing at all — an
          unscrolled first line is never covered. It is a pseudo-element of the strip, so it
          inherits the strip&apos;s surface ({code("--bg-surface")}, {code("--bg-surface-2")} when
          disabled or read-only, both themes), its scrollbar inset and its RTL side.
        </Note>
      </div>
    </Example>
  );
}

/* ── ColumnRoleTable: the required mark on a phone ──────────────────────── */

type BankRole = "booking_date" | "amount" | "debit" | "credit" | "payee" | "memo";

const ROLE_SETS: Record<"en" | "de" | "fr", ColumnRole<BankRole>[]> = {
  en: [
    { value: "booking_date", label: "Booking date", required: true },
    { value: "amount", label: "Amount (signed)", required: "money" },
    { value: "debit", label: "Debit column", required: "money" },
    { value: "credit", label: "Credit column", required: "money" },
    { value: "payee", label: "Payee" },
    { value: "memo", label: "Purpose / memo" },
  ],
  de: [
    { value: "booking_date", label: "Buchungstag", required: true },
    { value: "amount", label: "Betrag (mit Vorzeichen)", required: "money" },
    { value: "debit", label: "Soll-Spalte", required: "money" },
    { value: "credit", label: "Haben-Spalte", required: "money" },
    { value: "payee", label: "Zahlungsempfänger" },
    { value: "memo", label: "Verwendungszweck" },
  ],
  fr: [
    { value: "booking_date", label: "Date de comptabilisation", required: true },
    { value: "amount", label: "Montant (signé)", required: "money" },
    { value: "debit", label: "Colonne débit", required: "money" },
    { value: "credit", label: "Colonne crédit", required: "money" },
    { value: "payee", label: "Bénéficiaire" },
    { value: "memo", label: "Motif / note" },
  ],
};

const SNIFF = {
  columns: ["Datum", "Empfänger", "Zweck", "Soll", "Haben"],
  rows: [
    ["01.02.2026", "Example Ltd", "Invoice 0001", "12,50", ""],
    ["02.02.2026", "Sample Shop", "", "3,20", ""],
    ["03.02.2026", "Example Payroll", "Salary", "", "2.000,00"],
  ],
};

export function ColumnRoleRequired025Demo() {
  const [language, setLanguage] = useState<"en" | "de" | "fr">("en");
  const [width, setWidth] = useState<"phone" | "full">("phone");
  const [mapping, setMapping] = useState<ColumnMapping<BankRole>>({
    booking_date: 0,
    payee: 1,
    memo: 2,
    debit: 3,
    credit: 4,
  });
  return (
    <Example
      label="ColumnRoleTable — the required mark on a phone"
      hint="one required role among optional ones, in a phone-wide box; the role names are the app's own"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Role names"
            size="sm"
            value={language}
            onChange={(v) => setLanguage(v as "en" | "de" | "fr")}
            options={[
              { value: "en", label: "English" },
              { value: "de", label: "Deutsch" },
              { value: "fr", label: "Français" },
            ]}
          />
          <ToggleGroup
            aria-label="Width"
            size="sm"
            value={width}
            onChange={(v) => setWidth(v as "phone" | "full")}
            options={[
              { value: "phone", label: "Phone (358px)" },
              { value: "full", label: "Full width" },
            ]}
          />
        </div>
        <div className={width === "phone" ? "max-w-[358px]" : undefined}>
          <ColumnRoleTable
            header={SNIFF.columns}
            rows={SNIFF.rows}
            roles={ROLE_SETS[language]}
            mapping={mapping}
            onMappingChange={setMapping}
          />
        </div>
        <Note>
          keksdose, on a phone: the closed select said {code("Booking date (re…")} — the mark took
          the room the role&apos;s name needed. It is short now, {code("Booking date *")}, and the
          option is still NAMED {code("Booking date (required)")} ({code("aria-label")}), so a
          screen reader hears the word, not &ldquo;star&rdquo;; {code("requiredRoleShort")} and{" "}
          {code("requiredRole")} are the two labels. And no role name is cut at all: each column
          is at least as wide as its select&apos;s longest option, up to 14rem, so a long
          translation widens the columns and the edge fade says there are more to scroll to.
          Short roles keep the 9rem column they had.
        </Note>
      </div>
    </Example>
  );
}

/* ── FeedbackDialog / FeedbackNoteEditor: the attachment buttons' look ─── */

type Look = "default" | "ghost-sm";

const LOOKS: Record<Look, { variant?: ButtonVariant; size?: ButtonSize }> = {
  default: {},
  "ghost-sm": { variant: "ghost", size: "sm" },
};

function LookToggle({ value, onChange }: { value: Look; onChange: (next: Look) => void }) {
  return (
    <ToggleGroup
      aria-label="Attachment buttons"
      size="sm"
      value={value}
      onChange={(v) => onChange(v as Look)}
      options={[
        { value: "default", label: "Default (secondary / md)" },
        { value: "ghost-sm", label: "ghost / sm" },
      ]}
    />
  );
}

/** A stand-in for an app's screenshot hook, so the capture button shows. */
async function capture(): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const css = getComputedStyle(document.documentElement);
  ctx.fillStyle = css.getPropertyValue("--bg-page").trim() || "#eee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = css.getPropertyValue("--text-primary").trim() || "#111";
  ctx.font = "14px sans-serif";
  ctx.fillText("App view — stand-in capture", 16, 40);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? new File([blob], "screenshot.png", { type: "image/png" }) : null;
}

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
];

export function FeedbackDialogButtons025Demo() {
  const [look, setLook] = useState<Look>("ghost-sm");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  return (
    <Example
      label="FeedbackDialog — the attachment buttons' look"
      hint="attachmentButtonVariant / attachmentButtonSize, handed to the field inside"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <LookToggle value={look} onChange={setLook} />
          <Button onClick={() => setOpen(true)}>Report an issue</Button>
        </div>
        <FeedbackDialog
          open={open}
          onClose={() => setOpen(false)}
          categories={CATEGORIES}
          category={category}
          onCategoryChange={setCategory}
          onSubmit={() => setOpen(false)}
          onCaptureScreenshot={capture}
          attachmentButtonVariant={LOOKS[look].variant}
          attachmentButtonSize={LOOKS[look].size}
        />
        <Note>
          FeedbackAttachmentField took {code("buttonVariant")} / {code("buttonSize")} in 0.24
          (keksdose&apos;s support chat), but the dialog builds its field itself and passed neither.
          It now takes {code("attachmentButtonVariant")} / {code("attachmentButtonSize")}, named like
          its other attachment options ({code("attachmentAccept")}, {code("onAttachmentError")}),
          in both {code("attachments")} modes. Left out, the buttons are secondary / md as before.
        </Note>
      </div>
    </Example>
  );
}

export function FeedbackNoteButtons025Demo() {
  const [look, setLook] = useState<Look>("ghost-sm");
  const [sent, setSent] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  return (
    <Example
      label="FeedbackNoteEditor — the attachment buttons' look"
      hint="buttonVariant / buttonSize in the attachment config"
    >
      <div className="flex flex-col gap-3">
        <LookToggle value={look} onChange={setLook} />
        <FeedbackNoteEditor
          initial=""
          pending={false}
          resetKey={count}
          onSave={(value, file) => {
            setSent(file ? `${value}  [+ ${file.name}]` : value);
            setCount((n) => n + 1);
          }}
          onCancel={() => setSent(null)}
          saveLabel="Send reply"
          cancelLabel="Discard"
          attachment={{
            labels: { attachmentAdd: "Attach image", attachmentRemove: "Remove" },
            onCaptureScreenshot: capture,
            buttonVariant: LOOKS[look].variant,
            buttonSize: LOOKS[look].size,
          }}
        />
        <p className="text-xs text-[var(--text-muted)]">
          Last sent: <span className="font-mono text-[var(--text-secondary)]">{sent ?? "— nothing yet —"}</span>
        </p>
        <Note>
          The note editor sits inline in a triage panel and ends in a ghost Discard and a brand
          Send; two bordered full-size attachment buttons above them read as a second form. The
          {" "}{code("attachment")} config ({code("FeedbackNoteAttachment")}) now carries the
          field&apos;s {code("buttonVariant")} / {code("buttonSize")}. Left out, nothing changes.
        </Note>
      </div>
    </Example>
  );
}
