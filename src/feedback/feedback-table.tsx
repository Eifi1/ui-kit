import { useMemo } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "../lib/cn";
import { toLocalIso } from "../lib/dates";
import { EMPTY_FORMATTED_VALUE, formatDate, toDate } from "../lib/format";
import { useKitDateFormatter, useKitLabels, useKitLink, useKitLocale } from "../i18n/kit-labels";
import type { KitLinkProps } from "../i18n/kit-labels";
import { Chip } from "../components/chip";
import { FloatingAction, FloatingActionGroup } from "../components/floating-panel";
import type { FloatingCorner } from "../components/floating-panel";
import { pickLinkRenderer } from "../components/text-link";
import type { DataTableColumn } from "../components/data-table";
import {
  FEEDBACK_CATEGORY_ORDER,
  FEEDBACK_STATUS_META,
  FEEDBACK_STATUS_ORDER,
  FeedbackCategoryBadge,
  FeedbackStatusBadge,
  FeedbackStatusTransitions,
  feedbackCategoryRank,
  visibleFeedbackStatuses,
  type FeedbackStatus,
} from "./feedback-inbox";
import {
  useFeedbackCategoryLabels,
  useFeedbackStatusLabels,
  type FeedbackCategoryLabels,
  type FeedbackStatusLabels,
} from "./feedback-labels";
import { FEEDBACK_AWAITING_STATUSES, reworkCount, type FeedbackContext, type FeedbackRecord } from "./feedback-record";
import type { FeedbackStatusChange } from "./feedback-status-undo";
import { feedbackPageHref, feedbackPagePath } from "./feedback-row-detail";

/**
 * The two feedback pages' TABLE — `/feedback` (the admin inbox) and `/my-feedback` (the
 * user's own) — as the kit's parts: §4.3 of the feedback contract
 * (docs/feedback-harmonization.md), lifted from keksdose
 * `frontend/src/features/feedback/feedback-page.tsx` (columns :711–963, the phone card
 * :1038–1065, the awaiting toggle :689–709 and :1086–1101).
 *
 * Until 0.27 each app wrote this table itself, and the three had drifted exactly where a
 * table drifts: kastlan's showed five statuses and no environment, Kurvenschmiede's one
 * page served both audiences, and keksdose's — the canon, argued over a year of feedback
 * items — had a latent bug of its own: its subject cell carries the environment and
 * rework chips "so a second attempt is marked on every surface at once" (:760), but the
 * phone card is a `mobileCard`, and `DataTable` never renders the `mobilePrimary` cell
 * when `mobileCard` is set (data-table.tsx, `cardInner`). Its phone cards showed neither
 * chip. {@link FeedbackMobileCard} draws both itself, from the same
 * {@link FeedbackSubject} the column uses, so the two surfaces cannot part again.
 *
 * What stays the app's: the rows (its API client), who is an admin, the routes and the
 * `/feedback` → `/my-feedback` redirect, the `?row=` deep link and the row detail. What
 * is here: the nine columns ({@link feedbackColumns} / {@link useFeedbackColumns}), the
 * phone card and its day headers ({@link FeedbackMobileCard},
 * {@link feedbackMobileGroupBy}), the phone's "Only what is waiting for you" toggle
 * ({@link FeedbackAwaitingToggle}), the empty state ({@link FeedbackEmptyState}) and the
 * `feedbackPage` words. The swipes are `feedbackSwipePlan` (feedback-swipe.tsx), passed
 * by the app because whether the page may write is the app's call.
 */

/* ── Labels ─────────────────────────────────────────────────────────────────── */

/**
 * `feedbackPage` — the words of the two feedback pages (§4.3). The English is keksdose's
 * `en.json` (`feedback.*`); the de-CH canon is noted on each key (keksdose `de-CH.json`,
 * ss never ß). Two hints are new with the contract (§7.13) and their German is a
 * proposal for the i18n round.
 */
export interface FeedbackPageLabels {
  /** The admin inbox's page title, `/feedback`. de-CH: "Feedback" */
  title: string;
  /** The user's own list, `/my-feedback`. de-CH: "Mein Feedback" */
  myTitle: string;
  /** Column 1, the id. de-CH: "#" */
  columnId: string;
  /** Column 2, when it was filed. de-CH: "Datum" */
  columnDate: string;
  /** Column 3. de-CH: "Kategorie" */
  columnCategory: string;
  /** Column 4, the title with its chips. de-CH: "Betreff" */
  columnSubject: string;
  /** Column 5, who filed it. de-CH: "Nutzer" */
  columnUser: string;
  /** Column 6. de-CH: "E-Mail" */
  columnEmail: string;
  /** Column 7, the page it was filed from. de-CH: "URL" */
  columnUrl: string;
  /** Column 8. de-CH: "Status" */
  columnStatus: string;
  /** Column 9, when it was settled. de-CH: "Erledigt am" */
  columnResolved: string;
  /** What the URL cell's link does, said before the path to a screen reader.
   *  de-CH: "Seite öffnen" */
  openPage: string;
  /** The table with no reports at all (§7.13 — keksdose's bare "None" goes).
   *  de-CH: "Noch kein Feedback" */
  empty: string;
  /** Beneath it on `/my-feedback`: where reports are sent from (the feedback menu's
   *  speech bubble, §4.1). de-CH (proposal): "Feedback senden Sie über die Sprechblase
   *  in der oberen Leiste." */
  emptyHintMine: string;
  /** Beneath it on the admin inbox. de-CH (proposal): "Bisher wurde nichts gesendet." */
  emptyHintInbox: string;
  /** The submitter of a report whose account was erased (`user_id: null`, keksdose live
   *  #275). de-CH: "<gelöschter Nutzer>" */
  deletedUser: string;
  /** The submitter when neither a name nor an email is known — `id` is `user_id`.
   *  de-CH: "Nutzer #{{id}}" */
  userFallback: (id: number) => string;
  /** The chip for a report filed from a copy of the app that is not production —
   *  `environment` is `context.environment` as filed ("dev", "local", or the app's own
   *  word). Upper-cased like the top bar's environment badge, so the marker the tester saw
   *  is the marker triage sees. de-CH: the same (`environment.toUpperCase()`). */
  environment: (environment: string) => string;
  /** The chip for a report sent back for rework — `count` ≥ 1 is how many times
   *  (`reworkCount`, keksdose live #331). de-CH: "Nacharbeit" / "Nacharbeit ×{{count}}" */
  reworkChip: (count: number) => string;
  /** The phone toggle narrowing the inbox to IN_EVALUATION + NEEDS_LIVE_TEST.
   *  de-CH: "Nur was auf Sie wartet" */
  awaitingFilter: string;
  /** The name of the phone's floating group that holds it. de-CH: "Feedback-Aktionen" */
  phoneActions: string;
}

export const DEFAULT_FEEDBACK_PAGE_LABELS: FeedbackPageLabels = {
  title: "Feedback",
  myTitle: "My feedback",
  columnId: "#",
  columnDate: "Date",
  columnCategory: "Category",
  columnSubject: "Subject",
  columnUser: "User",
  columnEmail: "Email",
  columnUrl: "URL",
  columnStatus: "Status",
  columnResolved: "Resolved",
  openPage: "Open page",
  empty: "No feedback yet",
  emptyHintMine: "Use the speech bubble in the top bar to send some.",
  emptyHintInbox: "Nothing has been sent yet.",
  deletedUser: "<deleted user>",
  userFallback: (id) => `user #${id}`,
  environment: (environment) => environment.toUpperCase(),
  reworkChip: (count) => (count === 1 ? "Rework" : `Rework ×${count}`),
  awaitingFilter: "Only what is waiting for you",
  phoneActions: "Feedback actions",
};

/** `feedbackPage` resolved: English, then `<UiKitProvider labels>`, then `labels`. The
 *  page's title comes from here too: `mine ? labels.myTitle : labels.title`. */
export function useFeedbackPageLabels(labels?: Partial<FeedbackPageLabels>): FeedbackPageLabels {
  return useKitLabels("feedbackPage", DEFAULT_FEEDBACK_PAGE_LABELS, labels);
}

/* ── Reading a row ──────────────────────────────────────────────────────────── */

/** What the table reads off a report — {@link FeedbackRecord}'s fields, so an app's own
 *  row type with more of them passes as it is. */
export type FeedbackTableRow = Pick<
  FeedbackRecord,
  "id" | "user_id" | "user_email" | "title" | "body" | "category" | "status" | "context" | "resolved_at" | "created_at"
>;

/** A context value as a trimmed string, or `""` — every key is optional on read (§3.2)
 *  and an app's own context type may say `unknown`. */
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The environment a report was filed from when it is NOT production, as filed — or
 * `null` (keksdose `environmentLabel`, :142). Production is silent, as the top bar's
 * badge is: the marker earns attention by being rare. A missing value is production too —
 * every row filed before a test copy existed, and crash rows until their payload carries
 * `environment` (§3.2). An unknown value is shown rather than swallowed: an environment
 * nobody recognises is exactly when triage needs to see one.
 */
export function feedbackEnvironment(context: FeedbackContext | null | undefined): string | null {
  const env = text(context?.environment);
  return !env || env.toLowerCase() === "prod" ? null : env;
}

/**
 * Who filed a report, as one string (keksdose `submitterLabel`, :163): the display name,
 * else the email, else `userFallback(user_id)`. An erased account (`user_id: null`) is
 * `deletedUser` FIRST, ahead of the context: the server scrubs the name with the account,
 * but a row that somehow kept one must still not go on naming somebody who asked to be
 * forgotten. The joined `user_email` (admin list) is preferred to the context snapshot.
 */
export function feedbackSubmitter(
  row: Pick<FeedbackRecord, "user_id" | "user_email" | "context">,
  labels: Pick<FeedbackPageLabels, "deletedUser" | "userFallback">,
): string {
  if (row.user_id == null) return labels.deletedUser;
  return (
    text(row.context?.user_display_name) ||
    text(row.user_email) ||
    text(row.context?.user_email) ||
    labels.userFallback(row.user_id)
  );
}

/**
 * The submitter's email (keksdose `submitterEmail`, :175): the joined `user_email` —
 * authoritative, the display name is self-chosen (feedback #108) — else the context
 * snapshot, which is what `/my-feedback` has (`GET /feedback/my` sends no join). `""`
 * for an erased account, for the reason {@link feedbackSubmitter} gives.
 */
export function feedbackSubmitterEmail(row: Pick<FeedbackRecord, "user_id" | "user_email" | "context">): string {
  if (row.user_id == null) return "";
  return text(row.user_email) || text(row.context?.user_email);
}

/** Whether a status is one the phone's awaiting toggle keeps — `FEEDBACK_AWAITING_STATUSES`,
 *  the two that wait on the person triaging. `rows.filter((r) => isFeedbackAwaiting(r.status))`. */
export function isFeedbackAwaiting(status: FeedbackStatus): boolean {
  return FEEDBACK_AWAITING_STATUSES.includes(status);
}

/* ── Dates ──────────────────────────────────────────────────────────────────── */

/**
 * How the pages write a date: an ISO timestamp in, one string out. keksdose passes its
 * `useDateCell()` (the app's date-format preference, weekday and all — dev#546), which
 * fits as it is.
 *
 * ONE function for the date column, the resolved column, the phone card and the phone's
 * day headers, so the four cannot disagree (keksdose dev#546 round 3: the header is a
 * string and must say what the card says).
 */
export type FeedbackRenderDate = (iso: string) => string;

/** The kit's own date, weekday included: "Sun, 4 Oct 2026" / "So., 4. Okt. 2026". A date
 *  in a column carries its weekday (keksdose's rule, date-cell.tsx). */
const FEEDBACK_DATE_STYLE: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};

/**
 * `renderDate` when the app gave one, else the kit's: the `<UiKitProvider formatDate>`
 * when the app set one (called with the LOCAL calendar day and `weekday: true`, as
 * `DateMark` calls it), else `Intl` in the provider's locale with the weekday. An
 * unparseable value is passed through rather than hidden.
 */
export function useFeedbackRenderDate(renderDate?: FeedbackRenderDate, locale?: string): FeedbackRenderDate {
  const kitLocale = useKitLocale(locale);
  const fromProvider = useKitDateFormatter();
  return useMemo<FeedbackRenderDate>(() => {
    if (renderDate) return renderDate;
    return (iso) => {
      const date = toDate(iso);
      if (!date) return iso || EMPTY_FORMATTED_VALUE;
      const own = fromProvider
        ? fromProvider(toLocalIso(date), { unit: "day", source: "dateMark", locale: kitLocale, weekday: true })
        : "";
      return own || formatDate(date, FEEDBACK_DATE_STYLE, { locale: kitLocale });
    };
  }, [renderDate, fromProvider, kitLocale]);
}

/** A date in a cell: `<time>`, nowrap, tabular figures; "—" when there is none. */
function FeedbackDate({ value, renderDate }: { value: string | null | undefined; renderDate: FeedbackRenderDate }) {
  if (!value) return <span className="text-[var(--text-placeholder)]">{EMPTY_FORMATTED_VALUE}</span>;
  return (
    <time dateTime={value} className="whitespace-nowrap tabular-nums text-[var(--text-muted)]">
      {renderDate(value)}
    </time>
  );
}

/** An instant for sorting; a value that does not parse sorts with the empty ones. */
function instant(value: string | null | undefined): number | null {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isNaN(ms) ? null : ms;
}

/* ── The subject: title + environment chip + rework chip ───────────────────── */

export interface FeedbackSubjectProps {
  row: Pick<FeedbackRecord, "title" | "body" | "context">;
  /**
   * `false` (default): one line — the title truncates and the chips stay whole, as a
   * table cell wants. `true`: the title wraps and the chips flow after its last word, as
   * the phone card wants (a phone shows the whole title or nothing useful).
   */
  wrap?: boolean;
  /** Over the `feedbackPage` namespace. */
  labels?: Partial<FeedbackPageLabels>;
  className?: string;
}

/**
 * A report's title with its two chips (§4.3, column 4): the environment when it is not
 * production (keksdose's amber outline, the top bar's environment badge — the marker the
 * tester saw is the marker triage sees) and **Rework** / **Rework ×n** when the author has
 * sent it back (keksdose live #331: *"have a new category for items in rework"*, as a fact
 * derived from the body rather than a seventh status).
 *
 * No tooltip on either chip (keksdose dev#523): each already says what it means.
 */
export function FeedbackSubject({ row, wrap = false, labels: labelsProp, className }: FeedbackSubjectProps) {
  const labels = useFeedbackPageLabels(labelsProp);
  const env = feedbackEnvironment(row.context);
  const rounds = reworkCount(row.body ?? "");
  const chipClass = wrap ? "ms-1.5 align-middle" : "shrink-0";
  const chips = (
    <>
      {env && (
        <Chip size="sm" variant="outline" shape="square" tone="warning" caps className={chipClass} data-feedback-env="">
          {labels.environment(env)}
        </Chip>
      )}
      {rounds > 0 && (
        <Chip size="sm" tone="warning" caps className={chipClass} data-feedback-rework={rounds}>
          {labels.reworkChip(rounds)}
        </Chip>
      )}
    </>
  );
  if (wrap) {
    return (
      <span className={cn("min-w-0 font-medium [overflow-wrap:anywhere]", className)}>
        {row.title}
        {chips}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", className)}>
      <span className="min-w-0 truncate font-medium">{row.title}</span>
      {chips}
    </span>
  );
}

/* ── The URL cell ───────────────────────────────────────────────────────────── */

/**
 * The page a report was filed from, as a link — the cell keksdose's column 7 draws
 * (:850): the path as text, path + query + hash as the `href`, read from `context.url`
 * else `context.route` by the row detail's own readers (`feedbackPagePath` /
 * `feedbackPageHref`, feedback-row-detail.tsx), so the column and the detail link the
 * same page the same way. A real link through the `<UiKitProvider linkComponent>` (the app's router, so it
 * does not reload the app; keksdose's plain `<a>` did), and its click stops at the cell so
 * the row does not open as well.
 *
 * Its name is the path, as on screen, with "Open page" said before it — keksdose's
 * `aria-label="Open page"` replaced the path, so a screen reader heard forty identical
 * links down the column.
 */
function FeedbackPageLinkCell({ context, openPage }: { context: FeedbackContext | null; openPage: string }) {
  const kitLink = useKitLink();
  const href = feedbackPageHref(context);
  const path = feedbackPagePath(context);
  if (!href || !path) return <span className="text-[var(--text-placeholder)]">{EMPTY_FORMATTED_VALUE}</span>;
  const className =
    "inline-flex min-w-0 max-w-full items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline";
  const children = (
    <>
      {/* The space outside the hidden span: a flex container drops it from the layout,
          and the accessible name keeps it ("Open page /accounts"). */}
      <span className="sr-only">{openPage}</span>{" "}
      <code className="min-w-0 truncate text-xs">{path}</code>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </>
  );
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation();
  const render = pickLinkRenderer<KitLinkProps>(undefined, kitLink, href);
  return render ? (
    <RenderedLink render={render} href={href} className={className} onClick={onClick}>
      {children}
    </RenderedLink>
  ) : (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/** The provider's link, drawn by a component declared once (as FloatingAction's). */
function RenderedLink({ render, ...props }: KitLinkProps & { render: (props: KitLinkProps) => ReactElement }) {
  return render(props);
}

/* ── The columns ────────────────────────────────────────────────────────────── */

/** What {@link feedbackColumns} takes — every word already resolved (see
 *  {@link useFeedbackColumns}, which resolves them from the provider). */
export interface FeedbackColumnsOptions {
  /** `/my-feedback`. The same nine columns (one page component, §4.3), but the status
   *  cell is read-only there whatever `canEdit` says — "no status or outcome editing
   *  there (also for an admin)". */
  mine?: boolean;
  /** The admin on `/feedback` — the status cell offers its steps. Otherwise it shows them
   *  read-only. */
  canEdit: boolean;
  /** The undoable status change, `useFeedbackStatusUndo(update.mutate)` (§4.5) — the
   *  same one the row detail and the swipes use. */
  onStatus: FeedbackStatusChange;
  /** See {@link FeedbackRenderDate}. */
  renderDate: FeedbackRenderDate;
  /** The status buttons SAVE when pressed: pass `true` to put them under the page's
   *  `WriteLockProvider` (FeedbackStatusTransitions' `commit`). Off by default — a
   *  feedback inbox is rarely what an app's lock is about. */
  commit?: boolean;
  labels: FeedbackPageLabels;
  statusLabels: FeedbackStatusLabels;
  categoryLabels: FeedbackCategoryLabels;
}

/** A status's place in the chain, unknown ones last (as `feedbackCategoryRank`). */
function statusRank(status: FeedbackStatus): number {
  const at = FEEDBACK_STATUS_ORDER.indexOf(status);
  return at === -1 ? FEEDBACK_STATUS_ORDER.length : at;
}

/**
 * The nine columns of §4.3, in the contract's order, for `DataTable` — keksdose's
 * (:711–963) with the contract's changes:
 *
 * | # | key | cell | filter | phone |
 * |---|---|---|---|---|
 * | 1 | `id` | id, mono | number | hidden |
 * | 2 | `date` | `created_at`, weekday ({@link FeedbackRenderDate}) | date | |
 * | 3 | `category` | `FeedbackCategoryBadge`, sorted CRASH first | select, all five | |
 * | 4 | `title` | {@link FeedbackSubject} | text: title + environment | card heading |
 * | 5 | `user` | {@link feedbackSubmitter} | text: name + email, or "deleted user" | |
 * | 6 | `email` | {@link feedbackSubmitterEmail} | text | hidden |
 * | 7 | `url` | the page, a link (`noRowLink`) | text: path | hidden |
 * | 8 | `status` | `FeedbackStatusTransitions variant="icon"`, `visibleFeedbackStatuses` | select, chain order | |
 * | 9 | `resolved` | `resolved_at` | date | hidden |
 *
 * - Both select filters list the WHOLE vocabulary in its own order, translated —
 *   without `options` the popover lists the bare enum values found in the rows
 *   (keksdose feedback #160), and kastlan's first CRASH row would otherwise appear in a
 *   filter that never offered it.
 * - The status column owns the status filter, and only it (keksdose live #330's revert:
 *   the phone's filter sheet already exposes every column filter).
 * - `/my-feedback` shows the same nine: the Email cell's context fallback exists for it
 *   (the admin list's join is absent there, §3.1), and its phone card drops the submitter
 *   instead ({@link FeedbackMobileCardProps.showSubmitter}).
 *
 * Pure: hand it resolved words, or use {@link useFeedbackColumns}. Keys are stable, so
 * an app may drop or add a column (`columns.filter((c) => c.key !== "email")`).
 */
export function feedbackColumns<T extends FeedbackTableRow>({
  mine = false,
  canEdit,
  onStatus,
  renderDate,
  commit,
  labels,
  statusLabels,
  categoryLabels,
}: FeedbackColumnsOptions): DataTableColumn<T>[] {
  const editable = canEdit && !mine;
  return [
    {
      key: "id",
      header: labels.columnId,
      cell: (row) => <span className="font-mono text-xs text-[var(--text-muted)]">{row.id}</span>,
      sortBy: (row) => row.id,
      filter: { type: "number", getValue: (row) => row.id },
      mobileHidden: true,
    },
    {
      key: "date",
      header: labels.columnDate,
      cell: (row) => <FeedbackDate value={row.created_at} renderDate={renderDate} />,
      sortBy: (row) => instant(row.created_at),
      filter: { type: "date", getValue: (row) => row.created_at },
    },
    {
      key: "category",
      header: labels.columnCategory,
      cell: (row) => <FeedbackCategoryBadge category={row.category} label={categoryLabels[row.category]} />,
      sortBy: (row) => feedbackCategoryRank(row.category),
      filter: {
        type: "select",
        getValue: (row) => row.category,
        options: FEEDBACK_CATEGORY_ORDER.map((value) => ({ value, label: categoryLabels[value] })),
      },
    },
    {
      key: "title",
      header: labels.columnSubject,
      cell: (row) => <FeedbackSubject row={row} labels={labels} />,
      sortBy: (row) => row.title,
      // Searchable by the environment too, so "dev" narrows to the test copy's reports —
      // a chip you can see but not filter by makes you read every row (keksdose :804).
      filterBy: (row) => {
        const env = feedbackEnvironment(row.context);
        return env ? `${row.title} ${labels.environment(env)}` : row.title;
      },
      mobilePrimary: true,
    },
    {
      key: "user",
      header: labels.columnUser,
      cell: (row) => <span className="text-[var(--text-secondary)]">{feedbackSubmitter(row, labels)}</span>,
      sortBy: (row) => feedbackSubmitter(row, labels),
      // Name AND email, so either finds the person; the erased ones by the placeholder
      // (their context holds no name any more).
      filterBy: (row) =>
        row.user_id == null
          ? labels.deletedUser
          : `${feedbackSubmitter(row, labels)} ${feedbackSubmitterEmail(row)}`,
    },
    {
      key: "email",
      header: labels.columnEmail,
      // One line, like the URL beside it: keksdose's `break-all` let the browser squeeze
      // the column to its header and broke every address in two ("user@exam / ple.test"),
      // which made every row taller. Unbroken, a resized (pinned) column ellipsises it.
      className: "whitespace-nowrap",
      cell: (row) => {
        const email = feedbackSubmitterEmail(row);
        return email ? (
          <span className="text-[var(--text-secondary)]">{email}</span>
        ) : (
          <span className="text-[var(--text-placeholder)]">{EMPTY_FORMATTED_VALUE}</span>
        );
      },
      sortBy: feedbackSubmitterEmail,
      filterBy: feedbackSubmitterEmail,
      mobileHidden: true,
    },
    {
      key: "url",
      header: labels.columnUrl,
      // A cell only ellipsises what it is told not to wrap (keksdose live #348: the path
      // clipped mid-character "behind the next column").
      className: "whitespace-nowrap",
      // The cell IS a link, so the row's own permalink must never wrap it (keksdose
      // feedback #451: <a> in <a>, and "open the page" silently did nothing).
      noRowLink: true,
      cell: (row) => <FeedbackPageLinkCell context={row.context} openPage={labels.openPage} />,
      sortBy: (row) => feedbackPagePath(row.context) ?? "",
      filterBy: (row) => feedbackPagePath(row.context) ?? "",
      mobileHidden: true,
    },
    {
      key: "status",
      header: labels.columnStatus,
      // A KNOWN width: at most six 28px icon buttons (from IN_PROGRESS or IN_EVALUATION:
      // one step either way and the three off the chain) — keksdose live #348 sized it
      // for five and the sixth pushed the column wider.
      className: "w-[13.5rem] whitespace-nowrap",
      cell: (row) => (
        <FeedbackStatusTransitions
          status={row.status}
          statuses={visibleFeedbackStatuses(row.status)}
          canEdit={editable}
          commit={commit}
          onPick={(status) => onStatus(row, status)}
          variant="icon"
          label={(status) => statusLabels[status]}
        />
      ),
      sortBy: (row) => statusRank(row.status),
      filter: {
        type: "select",
        getValue: (row) => row.status,
        options: FEEDBACK_STATUS_ORDER.map((value) => ({ value, label: statusLabels[value] })),
      },
    },
    {
      key: "resolved",
      header: labels.columnResolved,
      cell: (row) => <FeedbackDate value={row.resolved_at} renderDate={renderDate} />,
      sortBy: (row) => instant(row.resolved_at),
      filter: { type: "date", getValue: (row) => row.resolved_at },
      mobileHidden: true,
    },
  ];
}

/** What {@link useFeedbackColumns} takes: {@link FeedbackColumnsOptions} with the words
 *  read from the provider, and `renderDate` optional. */
export interface UseFeedbackColumnsOptions
  extends Omit<FeedbackColumnsOptions, "renderDate" | "labels" | "statusLabels" | "categoryLabels"> {
  /** Default: the kit's date with the weekday ({@link useFeedbackRenderDate}). */
  renderDate?: FeedbackRenderDate;
  /** Over the `feedbackPage` namespace. Keep it stable (module scope or memoised): it is
   *  a dependency of the memo. */
  labels?: Partial<FeedbackPageLabels>;
}

/**
 * {@link feedbackColumns} with the `feedbackPage`, `feedbackStatus` and
 * `feedbackCategory` words from the provider, memoised on what it reads — pass
 * `update.mutate` through `useFeedbackStatusUndo` (stable) rather than a fresh function
 * per render, or every row's columns are rebuilt on each render (keksdose :667).
 */
export function useFeedbackColumns<T extends FeedbackTableRow>({
  mine,
  canEdit,
  onStatus,
  renderDate: renderDateProp,
  commit,
  labels: labelsProp,
}: UseFeedbackColumnsOptions): DataTableColumn<T>[] {
  const labels = useFeedbackPageLabels(labelsProp);
  const statusLabels = useFeedbackStatusLabels();
  const categoryLabels = useFeedbackCategoryLabels();
  const renderDate = useFeedbackRenderDate(renderDateProp);
  return useMemo(
    () =>
      feedbackColumns<T>({ mine, canEdit, onStatus, renderDate, commit, labels, statusLabels, categoryLabels }),
    [mine, canEdit, onStatus, renderDate, commit, labels, statusLabels, categoryLabels],
  );
}

/* ── The phone ──────────────────────────────────────────────────────────────── */

/**
 * The phone list's day headers (keksdose feedback #325: the list "grouped by date, like
 * the transactions list"): `DataTable mobileGroupBy={feedbackMobileGroupBy(renderDate)}`.
 *
 * The key IS the header — the same string the card's date says. DataTable groups runs of
 * equal keys, so the rows must come newest first, as `GET /feedback` and
 * `GET /feedback/my` send them (§3.3).
 */
export function feedbackMobileGroupBy(
  renderDate: FeedbackRenderDate,
): (row: Pick<FeedbackRecord, "created_at">) => string {
  return (row) => renderDate(row.created_at);
}

export interface FeedbackMobileCardProps {
  row: FeedbackTableRow;
  /** Add the submitter after the date — the admin inbox (`canEdit`). On `/my-feedback`
   *  every row is the viewer's own and the name would repeat down the list. */
  showSubmitter?: boolean;
  /** See {@link FeedbackRenderDate}; the same function as the columns' and the day
   *  headers'. Default: the kit's ({@link useFeedbackRenderDate}). */
  renderDate?: FeedbackRenderDate;
  /** Over the `feedbackPage` namespace. */
  labels?: Partial<FeedbackPageLabels>;
}

/**
 * One report as a phone card (§4.3; keksdose :1042, feedback #325 rework: *"compact card
 * instead of a wasteful label/value row per field"*): the title with its environment and
 * rework chips and the status badge on one line, then the compact category badge, the
 * date and (admin) the submitter beneath.
 *
 * `DataTable mobileCard={(row) => <FeedbackMobileCard row={row} … />}`. It draws the
 * chips itself: with a `mobileCard`, DataTable never renders the `mobilePrimary` cell,
 * which is how keksdose's cards lost them.
 */
export function FeedbackMobileCard({ row, showSubmitter = false, renderDate: renderDateProp, labels: labelsProp }: FeedbackMobileCardProps) {
  const labels = useFeedbackPageLabels(labelsProp);
  const renderDate = useFeedbackRenderDate(renderDateProp);
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <FeedbackSubject row={row} wrap labels={labels} className="flex-1" />
        {/* The pill the desktop status column draws, so a status is the same colour and
            glyph on both layouts. */}
        <FeedbackStatusBadge status={row.status} className="shrink-0" />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
        <FeedbackCategoryBadge category={row.category} compact />
        <FeedbackDate value={row.created_at} renderDate={renderDate} />
        {showSubmitter && (
          // The short id form: "#7" says enough on a card that has room for little.
          <span className="min-w-0 truncate">
            · {feedbackSubmitter(row, { deletedUser: labels.deletedUser, userFallback: (id) => `#${id}` })}
          </span>
        )}
      </div>
    </div>
  );
}

export interface FeedbackAwaitingToggleProps {
  /** Narrowed to what waits on the triager. Page state, not the URL (keksdose :699): a
   *  thumb gesture on one screen, not a view worth linking to. */
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Further `FloatingAction`s, after the toggle — the group is what makes them free. */
  children?: ReactNode;
  /** Default `bottom-end`, the register's corner. */
  corner?: FloatingCorner;
  /** Over the group's default distance from the bottom. */
  offset?: string;
  /** On the group. It is `md:hidden` already: the desktop has the status column's
   *  filter, the same question asked where there is room for it. */
  className?: string;
  /** Over the `feedbackPage` namespace. */
  labels?: Partial<FeedbackPageLabels>;
}

/**
 * The phone inbox's one filter button — **"Only what is waiting for you"** (§4.3;
 * keksdose live #330 rework: *"a button that toggles the evaluation items (in evaluation,
 * test when live) as toggle button similar to the show/hide upcoming/scheduled for the tx
 * page"*).
 *
 * It narrows TO `FEEDBACK_AWAITING_STATUSES` rather than hiding them: after a loop run
 * those ARE the queue — the rows handed back for a verdict — and everything else is
 * history. A `FloatingActionGroup` with one member anyway, in the register's corner and
 * shape (keksdose feedback #58), so a second action costs nothing; the glyph is
 * IN_EVALUATION's own, so the button reads in the vocabulary of the badges it filters on.
 *
 * Admin inbox only: on `/my-feedback` the author is not waiting on their own verdict.
 * The filtering is the page's — `rows.filter((r) => isFeedbackAwaiting(r.status))` —
 * so the table's own filters, sort and URL stay untouched.
 */
export function FeedbackAwaitingToggle({
  pressed,
  onPressedChange,
  children,
  corner,
  offset,
  className,
  labels: labelsProp,
}: FeedbackAwaitingToggleProps) {
  const labels = useFeedbackPageLabels(labelsProp);
  const Icon = FEEDBACK_STATUS_META.IN_EVALUATION.icon;
  return (
    <FloatingActionGroup
      aria-label={labels.phoneActions}
      corner={corner}
      offset={offset}
      className={cn("md:hidden", className)}
    >
      <FloatingAction
        label={labels.awaitingFilter}
        icon={<Icon aria-hidden />}
        pressed={pressed}
        onClick={() => onPressedChange(!pressed)}
      />
      {children}
    </FloatingActionGroup>
  );
}

/* ── Empty ──────────────────────────────────────────────────────────────────── */

export interface FeedbackEmptyStateProps {
  /** `/my-feedback`: the hint says where reports are sent from. */
  mine?: boolean;
  /** Over the `feedbackPage` namespace. */
  labels?: Partial<FeedbackPageLabels>;
}

/**
 * The table with no reports (§7.13): **No feedback yet**, and beneath it where to send
 * one (`/my-feedback`) or that nobody has (the inbox). keksdose said a bare "None".
 *
 * For `DataTable empty`, which sits in a centred, muted cell — so no box of its own.
 * Pass it only while the SOURCE list is empty: a filter (or the awaiting toggle) that
 * leaves nothing is "No results", the table's own words, not "nothing has been sent":
 * `empty={all.length === 0 ? <FeedbackEmptyState mine={mine} /> : undefined}`.
 */
export function FeedbackEmptyState({ mine = false, labels: labelsProp }: FeedbackEmptyStateProps) {
  const labels = useFeedbackPageLabels(labelsProp);
  return (
    <div className="flex flex-col items-center gap-1" data-feedback-empty="">
      <span className="font-medium text-[var(--text-secondary)]">{labels.empty}</span>
      <span className="text-xs">{mine ? labels.emptyHintMine : labels.emptyHintInbox}</span>
    </div>
  );
}
