import { useState, type ReactNode } from "react";
import {
  Button,
  FEEDBACK_CATEGORY_META,
  FEEDBACK_CATEGORY_ORDER,
  FEEDBACK_STATUS_META,
  FEEDBACK_STATUS_ORDER,
  FeedbackCategoryBadge,
  FeedbackDetail,
  FeedbackDetailSection,
  FeedbackNoteEditor,
  FeedbackProse,
  FeedbackStatusBadge,
  FeedbackStatusTransitions,
  feedbackCategoryRank,
  nextFeedbackStatus,
  selectableFeedbackStatuses,
  visibleFeedbackStatuses,
} from "@eifi1/ui-kit";
import type { FeedbackCategory, FeedbackNoteAttachment, FeedbackStatus } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * FEEDBACK — INBOX.
 *
 * The module's own header says what the split is, and it is the thing to hold on to
 * while reading this section: the kit owns the VOCABULARY (seven statuses, five
 * categories, shared value for value across both consuming apps), the POLICY about
 * what a row may move to from where it stands, and the LOOK of a status control, a
 * category badge and an opened report. The app owns the data, the API, the columns,
 * the permissions and every string.
 *
 * So there is no `Feedback` type to import and nothing below takes one. Every
 * component here takes the values it draws — which is why this page can fabricate a
 * report out of a plain object and get a real detail panel out of it.
 *
 * Two consequences worth expecting before you scroll:
 *   • Every label on this page is the SHOWCASE'S. The kit ships no strings, not even
 *     English ones, because both apps translate.
 *   • The colours here do NOT follow the palette switch in the top bar. That is
 *     deliberate for the status and category treatments and accidental for a few
 *     greys — see the note at the foot of the section.
 */

/**
 * What each status is called. Typed as a total `Record` for the same reason
 * `FEEDBACK_STATUS_META` is: an eighth status then fails to compile here too,
 * rather than shipping a pill captioned `undefined`.
 */
const STATUS_LABEL: Record<FeedbackStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  IN_EVALUATION: "In evaluation",
  NEEDS_LIVE_TEST: "Needs live test",
  POSTPONED: "Postponed",
  DONE: "Done",
  WONT_DO: "Won't do",
};

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  CRASH: "Crash",
  BUG: "Bug",
  IDEA: "Idea",
  QUESTION: "Question",
  OTHER: "Other",
};

/** `FeedbackStatusTransitions` asks for the naming function rather than a map, so
 *  an app that translates can hand it `t("feedback.status." + s)` directly. */
const statusLabel = (status: FeedbackStatus) => STATUS_LABEL[status];

/**
 * A category this build has never heard of — an older client talking to a newer API,
 * which is the case `FeedbackCategoryBadge` and `feedbackCategoryRank` both document
 * a fallback for.
 *
 * It takes a double cast to produce one, because `FeedbackCategory` forbids exactly
 * the value those two guards exist for. That mismatch is the kit's, not this page's;
 * it is written up in the closing note.
 */
const UNKNOWN_CATEGORY = "ESCALATION" as unknown as FeedbackCategory;

/**
 * The forward chain, walked out of the exported policy helper.
 *
 * `FORWARD_CHAIN` and `OFF_CHAIN` are module-private in the kit, and restating them
 * here would produce precisely the stale copy the kit avoided by deriving
 * `FEEDBACK_STATUS_ORDER` from the meta table. Walking `nextFeedbackStatus` from
 * `OPEN` is exact and cannot loop: the helper only ever steps forward through an
 * array and answers `null` at the end.
 */
const CHAIN: FeedbackStatus[] = (() => {
  const walk: FeedbackStatus[] = ["OPEN"];
  for (let at = nextFeedbackStatus("OPEN"); at; at = nextFeedbackStatus(at)) walk.push(at);
  return walk;
})();

/** Long enough to read the `pending` state, short enough not to feel broken. A save
 *  that resolves in the same tick renders "saving" for zero frames. */
const BEAT_MS = 700;
const beat = () => new Promise<void>((resolve) => setTimeout(resolve, BEAT_MS));

/** A report as one of the consuming apps happens to shape it. Deliberately a plain
 *  object: nothing in the kit knows this type, which is the whole point of the
 *  detail panel being a shell. */
const REPORT = {
  id: "FB-2291",
  status: "IN_EVALUATION",
  category: "BUG",
  page: "/settings/profile",
  filed: "18 Sep 2026, 09:41",
  resolved: "19 Sep 2026",
  body:
    "The phone field will not take my number. I type it, I press Tab to get to the next field, and when I come back the box is empty again.\n\nAdded later: it also does this on the tablet, and there I cannot even see the error.",
  outcome:
    "The picker only committed on Enter, so moving focus away threw the draft. It now commits on blur as well. Fixed in 0.4.1 — please have another go once the update is out.",
} as const;

/** Two paragraphs and a note appended underneath, which is the shape
 *  `FeedbackProse` exists for: the blank line carries the whole "this arrived after
 *  the answer" reading, and `whitespace-pre-wrap` is what keeps it. */
const PROSE = REPORT.body;

export function FeedbackInbox() {
  return (
    <>
      <Example
        label="The status vocabulary"
        hint="All seven, from FEEDBACK_STATUS_ORDER — which is derived from the meta table, not restated"
      >
        <div className="text-sm">
          {FEEDBACK_STATUS_ORDER.map((status) => (
            <div
              key={status}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] py-2 last:border-b-0"
            >
              <span className="w-36 shrink-0">
                <FeedbackStatusBadge status={status} label={STATUS_LABEL[status]} />
              </span>
              <code className="w-36 shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
                {status}
              </code>
              <span className="text-[11px] text-[var(--text-secondary)]">
                {CHAIN.includes(status)
                  ? `chain ${CHAIN.indexOf(status) + 1}/${CHAIN.length}`
                  : "off the chain"}
              </span>
              {/* The treatment the kit hardcodes, printed so the closing note about
                  the palette is checkable rather than asserted. */}
              <code className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">
                {FEEDBACK_STATUS_META[status].activeBg}
              </code>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Four are a chain and three sit off it. Every one carries its own glyph as well as
          its own tone, because two of these are a violet and an indigo apart and colour
          alone is not a label.
        </p>
      </Example>

      <Example
        label="The category vocabulary"
        hint="Declaration order is triage order — CRASH first, which the raw enum sorted between BUG and IDEA"
      >
        <div className="text-sm">
          {FEEDBACK_CATEGORY_ORDER.map((category) => (
            <div
              key={category}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] py-2 last:border-b-0"
            >
              <span className="w-28 shrink-0">
                <FeedbackCategoryBadge category={category} label={CATEGORY_LABEL[category]} />
              </span>
              {/* `compact` is the table-cell size: same pill, one step down. */}
              <FeedbackCategoryBadge category={category} label={CATEGORY_LABEL[category]} compact />
              <code className="font-mono text-[11px] text-[var(--text-muted)]">{category}</code>
              <span className="text-[11px] text-[var(--text-secondary)]">
                rank {feedbackCategoryRank(category)}
              </span>
              <code className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">
                {FEEDBACK_CATEGORY_META[category].badgeBg}
              </code>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-dashed border-[var(--border)] px-3 py-2">
          {/* The degradation path, rendered rather than described: an unknown value
              falls back to OTHER's treatment instead of throwing on `meta.icon`. The
              LABEL is the caller's and needs the same guard — a crash report must not
              be able to cause one. */}
          <FeedbackCategoryBadge category={UNKNOWN_CATEGORY} label={CATEGORY_LABEL.OTHER} />
          <span className="text-xs text-[var(--text-secondary)]">
            <code className="font-mono">category=&quot;ESCALATION&quot;</code> — a value this
            build has never heard of, drawn with OTHER&apos;s pill and OTHER&apos;s name, and
            ranked {feedbackCategoryRank(UNKNOWN_CATEGORY)} so it sorts last rather than above
            CRASH.
          </span>
        </div>
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          CRASH is filed by an error boundary and never chosen, which is why it is loud here
          and absent from every picker. The hand-filed four stay quiet so that the loud one
          means something.
        </p>
      </Example>

      <Example
        label="FeedbackStatusTransitions"
        hint="One component, two variants — the caller supplies WHICH statuses, and that is the policy"
      >
        <StatusControls />
      </Example>

      <Example
        label="FeedbackNoteEditor — an outcome"
        hint="A draft that is not committed until it is saved; Ctrl/⌘+Enter saves too"
      >
        <OutcomeEditor />
      </Example>

      <Example
        label="FeedbackNoteEditor — a reply, with a picture"
        hint="The optional `attachment` prop; paste a PNG into the box and it lands in the field below it"
      >
        <ReplyEditor />
      </Example>

      <Example
        label="FeedbackDetail / FeedbackDetailSection"
        hint="A shell, not a schema — the app decides which sections exist and what goes in them"
      >
        <DetailPanel />
      </Example>

      <Example
        label="FeedbackProse"
        hint="whitespace-pre-wrap is the whole component, plus an empty state"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">
              Two paragraphs separated by a blank line:
            </p>
            <FeedbackProse>{PROSE}</FeedbackProse>
          </div>
          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">
              No text and no <code className="font-mono">empty</code>:
            </p>
            <FeedbackProse />
          </div>
          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">
              No text, with <code className="font-mono">empty</code>:
            </p>
            <FeedbackProse empty="No outcome has been written yet." />
          </div>
        </div>
      </Example>

      <Example
        label="nextFeedbackStatus(status)"
        hint="What a swipe-to-advance gesture commits — null at the end of the chain, and off it"
      >
        <OutTable
          rows={FEEDBACK_STATUS_ORDER.map((status): [string, ReactNode] => [
            `nextFeedbackStatus("${status}")`,
            nextFeedbackStatus(status) ?? "null",
          ])}
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          The three off-chain states answer <code className="font-mono">null</code> because they
          are not in the chain at all. Putting them in it would mean an &ldquo;advance&rdquo;
          gesture could park an item, and every row would have to pass through them to reach
          DONE.
        </p>
      </Example>

      <Example
        label="visibleFeedbackStatuses(current)"
        hint="What a COMPACT control offers: one step forward, one back, and the three verdicts"
      >
        <OutTable
          rows={FEEDBACK_STATUS_ORDER.map((status): [string, ReactNode] => [
            `visibleFeedbackStatuses("${status}")`,
            visibleFeedbackStatuses(status).join(", "),
          ])}
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Read the two parking rows against each other: NEEDS_LIVE_TEST and POSTPONED each offer
          the step that resumes work and the two that close it, but deliberately{" "}
          <em>not each other</em> — moving between them directly is a re-triage, which starts by
          picking the work back up. WONT_DO offers only itself: it is terminal, and is reopened
          by a note from its author rather than by a status pill.
        </p>
      </Example>

      <Example
        label="selectableFeedbackStatuses(current)"
        hint="What an EXPANDED row offers: everything, in chain order"
      >
        <OutTable
          rows={[
            ["selectableFeedbackStatuses(…).length", String(selectableFeedbackStatuses("OPEN").length)],
            ['visibleFeedbackStatuses("WONT_DO")', visibleFeedbackStatuses("WONT_DO").join(", ")],
            [
              'selectableFeedbackStatuses("WONT_DO")',
              selectableFeedbackStatuses("WONT_DO").join(", "),
            ],
          ]}
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          The narrowing that is right for a table cell is wrong once the row is open in front of
          you: OPEN to DONE meant three round trips, and WONT_DO could not be left at all. The
          argument is ignored today and taken anyway, so the two policies read as one pair at the
          call sites and a future rule has somewhere to live.
        </p>
      </Example>

      <Example
        label="feedbackCategoryRank(category)"
        hint="A category column's sort key — unknown values sort LAST, not to indexOf's −1"
      >
        <OutTable
          rows={[
            ...FEEDBACK_CATEGORY_ORDER.map((category): [string, ReactNode] => [
              `feedbackCategoryRank("${category}")`,
              String(feedbackCategoryRank(category)),
            ]),
            [
              'feedbackCategoryRank("ESCALATION")',
              String(feedbackCategoryRank(UNKNOWN_CATEGORY)),
            ],
          ]}
        />
      </Example>

      <Note>
        <strong>The status control&apos;s labels vanish when its buttons are disabled.</strong>{" "}
        Both variants disable the button for the <em>current</em> status, and all of them when{" "}
        <code className="font-mono">canEdit</code> is false. The icon variant has no visible
        label — its name lives in a <code className="font-mono">Tooltip</code> wrapped around
        that button — and browsers do not dispatch mouse events from a disabled control, so the
        hover bubble never opens for it. Tick <code className="font-mono">canEdit</code> off
        above and hover the row: nothing names anything. <code className="font-mono">aria-label
        </code> is still on every button, so it is the pointer user who loses the vocabulary,
        not the screen-reader user.
      </Note>

      <Note>
        <strong>Nothing in this section follows the palette.</strong> Switch the palette in the
        top bar: the cards around these specimens move, the pills do not. For the status and
        category treatments that is right — a status colour that drifted with the theme preset
        would stop being a code people can learn, and the class strings printed in the two grids
        above are Tailwind&apos;s own palette for exactly that reason. The greys are the
        accident: <code className="font-mono">FeedbackProse</code>&apos;s body text,{" "}
        <code className="font-mono">FeedbackDetailSection</code>&apos;s titles, the note
        editor&apos;s hint line and the icon variant&apos;s inactive glyphs are all{" "}
        <code className="font-mono">slate-*</code> where the rest of the kit would use{" "}
        <code className="font-mono">var(--text-secondary)</code>.
      </Note>
    </>
  );
}

/**
 * Both variants over ONE status, which is the point: the state is the app's, the
 * component only reports it and asks. The two `statuses` lists are what differ, and
 * they are the policy — passing the list keeps it readable at the call site instead
 * of hiding it behind a `variant` prop that secretly also picks the rules.
 */
function StatusControls() {
  const [status, setStatus] = useState<FeedbackStatus>("IN_PROGRESS");
  const [canEdit, setCanEdit] = useState(true);
  const advance = nextFeedbackStatus(status);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-[var(--text-secondary)]">
          <code className="font-mono">variant=&quot;icon&quot;</code> — a table cell, over{" "}
          <code className="font-mono">visibleFeedbackStatuses(status)</code>. Hover an icon for
          its name; the bubble is portalled and sits <em>above</em>, because in a queue you
          triage by running down it and a bubble below covers the row you are about to reach.
        </p>
        <FeedbackStatusTransitions
          status={status}
          statuses={visibleFeedbackStatuses(status)}
          canEdit={canEdit}
          onPick={setStatus}
          variant="icon"
          label={statusLabel}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-[var(--text-secondary)]">
          <code className="font-mono">variant=&quot;pill&quot;</code> — an expanded row, over{" "}
          <code className="font-mono">selectableFeedbackStatuses(status)</code>. Same component,
          same state, every status reachable in one move.
        </p>
        <FeedbackStatusTransitions
          status={status}
          statuses={selectableFeedbackStatuses(status)}
          canEdit={canEdit}
          onPick={setStatus}
          variant="pill"
          label={statusLabel}
        />
      </div>

      <Row className="border-t border-[var(--border)] pt-3">
        <span className="text-xs text-[var(--text-secondary)]">Where the row stands:</span>
        <FeedbackStatusBadge status={status} label={STATUS_LABEL[status]} />
        <Button
          variant="secondary"
          disabled={!canEdit || !advance}
          onClick={() => advance && setStatus(advance)}
        >
          {advance ? `Advance to ${STATUS_LABEL[advance]}` : "Nothing to advance to"}
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={canEdit}
            onChange={(event) => setCanEdit(event.target.checked)}
          />
          <code className="font-mono">canEdit</code>
        </label>
      </Row>
      <p className="text-xs text-[var(--text-secondary)]">
        Two kinds of unclickable, and only one of them is dimmed: the whole row fades when{" "}
        <code className="font-mono">canEdit</code> is off, but the <em>current</em> status keeps
        its full contrast, because among seven pills a faded active one reads as
        &ldquo;unavailable&rdquo; rather than as &ldquo;this is where the row stands&rdquo;.
      </p>
    </div>
  );
}

/**
 * The outcome editor: a draft, a save that takes a moment, and a cancel that throws
 * the draft away.
 *
 * `pending` is the app's, not the editor's — the editor has no idea whether a save
 * is in flight and cannot, since it is the app that holds the API. It disables its
 * own save button from it, so a double-click cannot send twice.
 */
function OutcomeEditor() {
  const [saved, setSaved] = useState(REPORT.outcome as string);
  const [editing, setEditing] = useState(true);
  const [pending, setPending] = useState(false);

  if (!editing) {
    return (
      <div className="space-y-3">
        <FeedbackProse>{saved}</FeedbackProse>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit outcome
        </Button>
      </div>
    );
  }

  return (
    <FeedbackNoteEditor
      // Re-seeded by an effect whenever this changes, which is what lets the editor
      // be reopened on a value that was edited elsewhere in the meantime. The flip
      // side is that a parent which changes `initial` mid-typing discards the draft.
      initial={saved}
      pending={pending}
      onSave={(value) => {
        setPending(true);
        // `.then` rather than an async handler: `onSave` returns void, and a promise
        // handed to a void callback is a promise nobody is watching for a rejection.
        void beat().then(() => {
          setSaved(value);
          setPending(false);
          setEditing(false);
        });
      }}
      onCancel={() => setEditing(false)}
      saveLabel={pending ? "Saving…" : "Save outcome"}
      cancelLabel="Cancel"
      // A line ABOVE the field rather than an in-field placeholder: a hint that
      // disappears the moment somebody starts typing is gone exactly when it is
      // being followed.
      placeholder="What was done about this report. Ctrl/⌘+Enter saves."
      rows={4}
    />
  );
}

/**
 * The same editor with a picture attached — the reply half of the feature.
 *
 * A report is a conversation: it is filed, it is answered, and the reporter sends it
 * back saying that is not what they meant. The screenshot showing what they mean is
 * taken at whichever of those points they looked, and only the first of them used to
 * have a way to attach one.
 */
function ReplyEditor() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);

  const attachment: FeedbackNoteAttachment = {
    labels: {
      // `attachment` (the heading over the field) is deliberately omitted: the note
      // editor puts the buttons straight under its textarea, where a second heading
      // is noise. The compose dialog next door does pass one.
      attachmentAdd: "Add a picture",
      attachmentRemove: "Remove the picture",
      attachmentPaste: "…or paste a screenshot straight into the box above.",
    },
    // Tighter than the kit's defaults on purpose, to show that the reply path is held
    // to the app's own limits rather than to whatever the field ships with.
    accept: ["image/png", "image/jpeg"],
    maxBytes: 2 * 1024 * 1024,
    onError: (kind) =>
      setRejected(
        kind === "type"
          ? "That file is not a PNG or a JPEG."
          : "That file is over the 2 MB limit.",
      ),
  };

  return (
    <div className="space-y-3">
      <FeedbackNoteEditor
        initial=""
        pending={pending}
        onSave={(value, file) => {
          setPending(true);
          setRejected(null);
          void beat().then(() => {
            setSent(file ? `${value}  [+ ${file.name}]` : value);
            setPending(false);
          });
        }}
        onCancel={() => {
          setSent(null);
          setRejected(null);
        }}
        saveLabel={pending ? "Sending…" : "Send reply"}
        cancelLabel="Discard"
        placeholder="A note back to whoever filed this. A picture is optional."
        attachment={attachment}
      />
      {rejected && <p className="text-xs text-[var(--text-secondary)]">{rejected}</p>}
      <p className="text-xs text-[var(--text-muted)]">
        Last sent:{" "}
        <span className="font-mono text-[var(--text-secondary)]">{sent ?? "— nothing yet —"}</span>
      </p>
      <Note>
        The draft stays in the box after a send, because <code className="font-mono">initial</code>{" "}
        is still <code className="font-mono">&quot;&quot;</code> and the editor only re-seeds when
        that value changes. A real inbox unmounts the editor on success, or hands it a new{" "}
        <code className="font-mono">initial</code>. Pasting an image while the caret is in the
        textarea works because the field is told to listen on{" "}
        <code className="font-mono">pasteFrom</code> — the editor&apos;s own root — rather than on
        its own subtree: the box is the field&apos;s sibling, so a paste made in it never passes
        through the field at all.
      </Note>
    </div>
  );
}

/**
 * A detail panel over the fabricated report at the top of this file.
 *
 * It is a STACK of sections rather than a component with fixed fields because the two
 * consuming apps genuinely keep a report's context and its screenshot in different
 * places — one in a JSON column and an object store, the other in a `page_path` and
 * the row itself — and a shell that insisted on both would force one of them to
 * invent a shape it does not have. What is shared is what a section looks like, and
 * that is all that made the two panels read as different products.
 */
function DetailPanel() {
  return (
    <FeedbackDetail>
      <FeedbackDetailSection
        title="Report"
        // `action` is the title's own line: an edit button, a resolved-at date, an id.
        action={
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {REPORT.id} · {REPORT.filed}
          </span>
        }
      >
        <Row className="gap-2">
          {/* The badges, in the job they exist for: reporting where a row stands
              somewhere that does not offer to change it. */}
          <FeedbackStatusBadge status={REPORT.status} label={STATUS_LABEL[REPORT.status]} />
          <FeedbackCategoryBadge
            category={REPORT.category}
            label={CATEGORY_LABEL[REPORT.category]}
            compact
          />
          <code className="font-mono text-xs text-[var(--text-muted)]">{REPORT.page}</code>
        </Row>
      </FeedbackDetailSection>

      <FeedbackDetailSection title="What was reported">
        <FeedbackProse>{REPORT.body}</FeedbackProse>
      </FeedbackDetailSection>

      <FeedbackDetailSection
        title="Outcome"
        action={<span className="text-xs text-[var(--text-muted)]">resolved {REPORT.resolved}</span>}
      >
        <FeedbackProse>{REPORT.outcome}</FeedbackProse>
      </FeedbackDetailSection>

      <FeedbackDetailSection title="Reply from the reporter">
        <FeedbackProse empty="Nothing back yet — the row is waiting on them, which is what IN_EVALUATION means." />
      </FeedbackDetailSection>
    </FeedbackDetail>
  );
}
