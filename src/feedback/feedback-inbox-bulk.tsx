import { useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleDot, Eye, EyeOff, Tag } from "lucide-react";
import { BulkActionBar, type ResponsiveBulkActionBarVariant } from "../components/bulk-action-bar";
import { Button } from "../components/button";
import type { DataTableProps } from "../components/data-table";
import { Popover } from "../components/popover";
import { toast } from "../components/toast";
import type { CommitScope } from "../components/write-lock";
import type { LabelOverride } from "../i18n/kit-labels";
import { useFeedbackCategoryLabels, useFeedbackStatusLabels, useFeedbackToastLabels } from "./feedback-labels";
import type { FeedbackRecord } from "./feedback-record";
import type { FeedbackDetailPatch, FeedbackDetailUpdateAsync } from "./feedback-row-detail";
// A type, declared beside the inbox's other public types (the README lists it there); the
// page imports this module's runtime, so only the type goes this way.
import type { FeedbackInboxBulk } from "./feedback-inbox-page";
import { FEEDBACK_UNDO_DURATION } from "./feedback-status-undo";
import { useFeedbackPageLabels, type FeedbackPageLabels } from "./feedback-table";
import {
  FEEDBACK_CATEGORY_META,
  FEEDBACK_CATEGORY_ORDER,
  FEEDBACK_STATUS_META,
  FEEDBACK_STATUS_ORDER,
  type FeedbackCategory,
  type FeedbackStatus,
} from "./feedback-vocabulary";

/**
 * The inbox's multi-select and bulk edit (0.57, keksdose dev #663 — Marcel: *"I want to
 * have multiselect and bulk edit (back) for the feedback table"*; docs/feedback-harmonization.md
 * §13.6). The inbox the kit assembles (0.55, §13) had no selection at all, so an admin
 * changed a dozen stale reports one row at a time.
 *
 * **No bulk endpoint, on purpose.** keksdose has none, and none of the three needs one:
 * each report's change has to pass the server's own rules for that report (§3.4) and send
 * its author the notification a single change sends (§9.11), so the bar loops the page's
 * ONE `update` mutation — `PATCH /feedback/{id}` per report — exactly as a tap on the
 * status cell does. An app gets the bulk edit with no wiring of its own.
 *
 * What it changes: the **status**, the **category** (never to CRASH — §3.4 answers 422;
 * CRASH → BUG is an ordinary admin edit) and, with the inbox's `publicSwitch`, **Visible to
 * others** (§9.3; a CRASH is private whatever its flag, and a row without `public` comes
 * from a server without public parts — both are left alone, as the detail's switch is not
 * drawn on them). A row already at the value is not sent.
 *
 * **One Undo for the batch**: the toast the single change has (§4.5, 8 s), naming how many
 * changed; Undo puts EACH changed report back to what IT was — the selection may mix
 * statuses — and only the reports that changed. A report whose PATCH failed (the
 * mutation's `onError` toasts the server's sentence, as for a single change) is not in the
 * Undo, and STAYS SELECTED, so the next press retries exactly those; the bar's count says
 * how many.
 */

/** Which bulk change: the {@link FeedbackDetailPatch} key it sends. */
type BulkField = NonNullable<FeedbackInboxBulk<FeedbackRecord>["pending"]>;

/** How many PATCHes a bulk change keeps in flight. Each one is a full update on the
 *  server — its rules, its author notification (§9.11) — so a trickle rather than a burst
 *  of 20, and still about a second for the 20 rather than the 20 round trips back to back
 *  a plain loop would take.
 *
 * @internal Not part of `/feedback` or the barrel. */
export const FEEDBACK_BULK_CONCURRENCY = 3;

/** The categories a report can be MOVED to — the vocabulary less CRASH, which is filed by
 *  the crash reporter only (§3.4: re-labelling to CRASH is a 422). */
const MOVABLE_CATEGORIES = FEEDBACK_CATEGORY_ORDER.filter((category) => category !== "CRASH");

/** A report that can carry Visible to others: the detail's switch's rule (§9.3). */
const canBePublic = (row: FeedbackRecord) => row.category !== "CRASH" && row.public != null;

/**
 * The selected rows a bulk change would actually SEND — those not at the value already
 * (and, for the flag, those that can carry it). The bar disables a choice that would send
 * nothing; the change sends exactly these.
 *
 * @internal Not part of `/feedback` or the barrel.
 */
export function feedbackBulkTargets<T extends FeedbackRecord>(
  rows: readonly T[],
  field: BulkField,
  value: FeedbackStatus | FeedbackCategory | boolean,
): T[] {
  switch (field) {
    case "status":
      return rows.filter((row) => row.status !== value);
    case "category":
      return rows.filter((row) => row.category !== value);
    case "public":
      return rows.filter((row) => canBePublic(row) && row.public !== value);
  }
}

/**
 * Each patch through `call`, {@link FEEDBACK_BULK_CONCURRENCY} at a time, every one
 * answered before it resolves — and which of them landed, by index. A rejection is the
 * mutation's own to report (its `onError`), so it is only counted here.
 */
async function eachPatch(call: FeedbackDetailUpdateAsync, patches: readonly FeedbackDetailPatch[]) {
  const landed = patches.map(() => false);
  let next = 0;
  const worker = async () => {
    while (next < patches.length) {
      const at = next++;
      try {
        await call(patches[at]);
        landed[at] = true;
      } catch {
        // Counted, not reported: the mutation's `onError` has said why.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(FEEDBACK_BULK_CONCURRENCY, patches.length) }, worker));
  return landed;
}

const without = (set: ReadonlySet<number>, ids: Iterable<number>): ReadonlySet<number> => {
  const next = new Set(set);
  let changed = false;
  for (const id of ids) changed = next.delete(id) || changed;
  return changed ? next : set;
};

/**
 * The selection and the bulk changes, for {@link useFeedbackInbox}: the table's `selection`
 * and `inbox.bulk`, both `undefined` while `on` is false (not the admin inbox, or the app's
 * `selectable={false}`).
 *
 * @internal Not part of `/feedback` or the barrel.
 */
export function useFeedbackInboxBulk<T extends FeedbackRecord>({
  on,
  rows: shown,
  update,
  publicSwitch,
  labels,
}: {
  on: boolean;
  /** The rows the inbox hands its table (newest first, behind the awaiting toggle). */
  rows: readonly T[];
  update: FeedbackDetailUpdateAsync;
  publicSwitch: boolean;
  labels?: LabelOverride<FeedbackPageLabels>;
}): { bulk?: FeedbackInboxBulk<T>; selection?: DataTableProps<T>["selection"] } {
  const words = useFeedbackPageLabels(labels);
  const toastWords = useFeedbackToastLabels();
  const statusNames = useFeedbackStatusLabels();
  const categoryNames = useFeedbackCategoryLabels();
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  // The table's filtered set, as it reports it — `null` until its first report, when
  // nothing the table shows is filtered yet.
  const [filteredIds, setFilteredIds] = useState<ReadonlySet<number> | null>(null);
  const [pending, setPending] = useState<BulkField | null>(null);
  // Read at the press, not from the render: two presses in one frame start one change.
  const running = useRef(false);

  const visible = useMemo(
    () => (filteredIds ? shown.filter((row) => filteredIds.has(row.id)) : shown),
    [shown, filteredIds],
  );
  const rows = useMemo(() => visible.filter((row) => picked.has(row.id)), [visible, picked]);

  if (!on) return {};

  const toggle = (many: readonly T[], checked: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const row of many) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });

  const run = async (
    field: BulkField,
    name: string,
    targets: readonly T[],
    to: (row: T) => FeedbackDetailPatch,
    back: (row: T) => FeedbackDetailPatch,
  ) => {
    if (running.current || targets.length === 0) return;
    running.current = true;
    setPending(field);
    try {
      const landed = await eachPatch(update, targets.map(to));
      const changed = targets.filter((_, at) => landed[at]);
      const failed = targets.length - changed.length;
      // What changed leaves the selection; what failed stays in it, ready to retry — and
      // a row ticked while the batch was out stays too.
      setPicked((prev) =>
        without(
          prev,
          changed.map((row) => row.id),
        ),
      );
      if (changed.length > 0) {
        toast.undo(words.bulkChanged(changed.length, name), {
          label: toastWords.statusUndo,
          duration: FEEDBACK_UNDO_DURATION,
          // Each report back to what IT was, at the press: `back` reads the row as the
          // batch found it. Only the ones that changed.
          onUndo: () => void restore(changed.map(back)),
        });
      }
      if (failed > 0) toast.error(words.bulkFailed(failed));
    } finally {
      running.current = false;
      setPending(null);
    }
  };

  const restore = async (patches: readonly FeedbackDetailPatch[]) => {
    const landed = await eachPatch(update, patches);
    const restored = landed.filter(Boolean).length;
    if (restored > 0) toast.success(words.bulkRestored(restored));
    if (restored < patches.length) toast.error(words.bulkRestoreFailed(patches.length - restored));
  };

  const bulk: FeedbackInboxBulk<T> = {
    rows,
    clear: () => setPicked(new Set()),
    setStatus: (status) =>
      run(
        "status",
        statusNames[status] ?? status,
        feedbackBulkTargets(rows, "status", status),
        (row) => ({ id: row.id, status }),
        (row) => ({ id: row.id, status: row.status }),
      ),
    setCategory: (category) =>
      category === "CRASH"
        ? Promise.resolve()
        : run(
            "category",
            categoryNames[category] ?? category,
            feedbackBulkTargets(rows, "category", category),
            (row) => ({ id: row.id, category }),
            (row) => ({ id: row.id, category: row.category }),
          ),
    setPublic: publicSwitch
      ? (next) =>
          run(
            "public",
            next ? words.bulkPublicOn : words.bulkPublicOff,
            feedbackBulkTargets(rows, "public", next),
            (row) => ({ id: row.id, public: next }),
            (row) => ({ id: row.id, public: row.public === true }),
          )
      : undefined,
    pending,
  };

  const selection: NonNullable<DataTableProps<T>["selection"]> = {
    isSelected: (row) => picked.has(row.id),
    onToggle: (row, checked) => toggle([row], checked),
    onToggleMany: (many, checked) => toggle(many, checked),
    // "All" is what the admin can see: the table's filters and the awaiting toggle
    // applied, every page — never a row a filter hides.
    allSelected: visible.length > 0 && rows.length === visible.length,
    someSelected: rows.length > 0 && rows.length < visible.length,
    onToggleAll: (checked) => (checked ? toggle(visible, true) : setPicked(new Set())),
    onFilteredRowsChange: (filtered) => {
      const ids = new Set(filtered.map((row) => row.id));
      setFilteredIds(ids);
      // A selection a new filter hides would be acted on unseen — the rule
      // TranslationReviewPanel keeps — so it leaves the selection.
      setPicked((prev) =>
        without(
          prev,
          [...prev].filter((id) => !ids.has(id)),
        ),
      );
    },
  };

  return { bulk, selection };
}

/** The phone's floating card above the bottom nav, the desktop's tinted strip over the
 *  table — `BulkActionBar`'s responsive pair (keksdose's payees bar). */
const BAR_VARIANT: ResponsiveBulkActionBarVariant = { base: "floating", md: "sticky" };

interface BulkChoice {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Some selected row would change: otherwise the choice is disabled. */
  sends: boolean;
  pick: () => Promise<void>;
}

/** One of the bar's buttons and the list it opens — RowActions' "⋯" menu, the kit's one
 *  popover of actions: a dialog-shaped panel of ghost buttons, closed by the pick. */
function BulkChoiceMenu({
  label,
  icon: Icon,
  choices,
  busy,
  running,
  commit,
}: {
  label: string;
  icon: LucideIcon;
  choices: readonly BulkChoice[];
  /** Some bulk change is out: no second one starts. */
  busy: boolean;
  /** This one is. */
  running: boolean;
  commit?: CommitScope;
}) {
  return (
    <Popover
      aria-label={label}
      width="16rem"
      className="p-1"
      trigger={({ open, toggle, ref }) => (
        <Button
          ref={ref}
          variant="secondary"
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={open}
          pending={running}
          disabled={busy && !running}
          commit={commit}
          onClick={toggle}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Button>
      )}
    >
      {(close) => (
        <ul className="space-y-0.5">
          {choices.map(({ key, label: choice, icon: ChoiceIcon, sends, pick }) => (
            <li key={key}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-start"
                disabled={!sends}
                commit={commit}
                onClick={() => {
                  close();
                  void pick();
                }}
              >
                <ChoiceIcon className="size-4" aria-hidden />
                {choice}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}

/**
 * The inbox's bulk bar: the count, Clear, and Set status / Set category / Visibility, each
 * a list of the values — the statuses in chain order with their glyphs, the categories
 * less CRASH, on and off. Rendered unconditionally, as `BulkActionBar` asks: it shows with
 * the first selected row.
 *
 * @internal Drawn by {@link FeedbackInbox}; not part of `/feedback` or the barrel.
 */
export function FeedbackInboxBulkBar<T extends FeedbackRecord>({
  bulk,
  commit,
  labels,
}: {
  bulk: FeedbackInboxBulk<T>;
  /** The table's status writes' lock (`commit`): a bulk change is the same write. */
  commit?: CommitScope;
  labels?: LabelOverride<FeedbackPageLabels>;
}) {
  const words = useFeedbackPageLabels(labels);
  const statusNames = useFeedbackStatusLabels();
  const categoryNames = useFeedbackCategoryLabels();
  const { rows, pending, setPublic } = bulk;
  const busy = pending !== null;
  const sends = (field: BulkField, value: FeedbackStatus | FeedbackCategory | boolean) =>
    feedbackBulkTargets(rows, field, value).length > 0;
  return (
    <BulkActionBar count={rows.length} onClear={bulk.clear} variant={BAR_VARIANT} className="md:shrink-0">
      <BulkChoiceMenu
        label={words.bulkStatus}
        icon={CircleDot}
        busy={busy}
        running={pending === "status"}
        commit={commit}
        choices={FEEDBACK_STATUS_ORDER.map((status) => ({
          key: status,
          label: statusNames[status],
          icon: FEEDBACK_STATUS_META[status].icon,
          sends: sends("status", status),
          pick: () => bulk.setStatus(status),
        }))}
      />
      <BulkChoiceMenu
        label={words.bulkCategory}
        icon={Tag}
        busy={busy}
        running={pending === "category"}
        commit={commit}
        choices={MOVABLE_CATEGORIES.map((category) => ({
          key: category,
          label: categoryNames[category],
          icon: FEEDBACK_CATEGORY_META[category].icon,
          sends: sends("category", category),
          pick: () => bulk.setCategory(category),
        }))}
      />
      {setPublic && (
        <BulkChoiceMenu
          label={words.bulkVisibility}
          icon={Eye}
          busy={busy}
          running={pending === "public"}
          commit={commit}
          choices={[
            {
              key: "on",
              label: words.bulkPublicOn,
              icon: Eye,
              sends: sends("public", true),
              pick: () => setPublic(true),
            },
            {
              key: "off",
              label: words.bulkPublicOff,
              icon: EyeOff,
              sends: sends("public", false),
              pick: () => setPublic(false),
            },
          ]}
        />
      )}
    </BulkActionBar>
  );
}
