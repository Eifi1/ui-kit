import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import type { DateInput } from "../lib/format";
import { useKitLabels } from "../i18n/kit-labels";
import { DateMark } from "../components/account-chips";
import { Chip } from "../components/chip";
import { Pagination } from "../components/data-table-pagination";
import { Caption } from "../components/text";
import { Button, Spinner } from "../components/ui";
import { usePersonLabel } from "./admin-parts";
import type { AdminPerson } from "./admin-parts";

/**
 * The admin actions, as the audit table records them (docs/user-admin-harmonization.md
 * §2.3, §4.3): `GET /admin/actions?limit=&offset=&target=`, newest first, on the admin
 * page and filtered to one account from its row.
 *
 * Every app writes the same small `admin_actions` row in the transaction of the action
 * (keksdose and Kurvenschmiede had log lines; kastlan has an HTTP log with no named
 * action), so the vocabulary is shared — {@link AdminActionKind} — and an app's own
 * actions join it through `labels.actions`.
 *
 * What a row says, and what it never does: who, what, to whom, when, and a summary of the
 * `detail` the APP writes (ids, roles, counts — never content, §4.3). Three kinds of
 * actor: an admin; **the user themselves** (`deletion_request`: the actor is the target);
 * and **nobody** (the scheduled erasure, the hand-over at erasure, §2.7), said as
 * "automatically". After an erasure the target's name and address are scrubbed and the
 * row stays: it reads "an erased account".
 *
 * It never fetches: the page of rows and the paging are the app's.
 */

/** The shared vocabulary of `admin_actions.action` (§4.3). */
export type AdminActionKind =
  | "deactivate"
  | "reactivate"
  | "role"
  | "membership_remove"
  | "password_change_require"
  | "password_change_withdraw"
  | "mail_verification"
  | "mail_reset"
  | "reviewer"
  | "invite"
  | "invite_resend"
  | "invite_revoke"
  | "transfer"
  | "deletion_request"
  | "deletion_cancel"
  | "erase"
  // 0.32.1 (keksdose's 0.32 report): server-kit 0.6's `AdminAction.PLAN`, an operator's
  // plan change or grant (docs/billing-harmonization.md §6).
  | "plan";

/** Every {@link AdminActionKind}, in the contract's order. */
export const ADMIN_ACTION_KINDS: readonly AdminActionKind[] = [
  "deactivate",
  "reactivate",
  "role",
  "membership_remove",
  "password_change_require",
  "password_change_withdraw",
  "mail_verification",
  "mail_reset",
  "reviewer",
  "invite",
  "invite_resend",
  "invite_revoke",
  "transfer",
  "deletion_request",
  "deletion_cancel",
  "erase",
  "plan",
];

/** One logged action — the app's `admin_actions` row with the people joined in. */
export interface AdminActionLogEntry {
  id: string | number;
  /** When, as the row's `at`. */
  at: DateInput;
  /**
   * Who did it: a person; `"self"` — the user themselves (a deletion request); or `null`
   * — nobody, the scheduled job. A person whose `id` (or address) is the target's is
   * read as `"self"` too.
   */
  actor: AdminPerson | "self" | null;
  /** A {@link AdminActionKind}, or one of the app's own (named in `labels.actions`). */
  action: AdminActionKind | (string & {});
  /** Whom it was done to. `null`, or a person with nothing left in it: an erased
   *  account. An invitation's target is its address (`target_email`). */
  target?: AdminPerson | null;
  /** The `detail` in the app's words — "Member → Admin", "12 items to Ben Example". */
  detail?: ReactNode;
}

/** The `adminActionLog` namespace. */
export interface AdminActionLogLabels {
  /** The list's accessible name. */
  title: string;
  empty: string;
  loading: string;
  /** "by Ada Example". */
  by: (actor: string) => string;
  /** The user acted on their own account. */
  bySelf: string;
  /** No actor: a scheduled job. */
  automatic: string;
  /** A target scrubbed by an erasure. */
  erased: string;
  /** The filter chip: only one account's actions are shown. */
  filteredTo: (target: string) => string;
  /** The chip's ×. */
  showAll: string;
  /** A target name as a filter button — "Show only the actions on Ada Example". */
  filterBy: (target: string) => string;
  /** What each action is called, past tense, keyed by the vocabulary. An app adds its
   *  own here (`labels={{ actions: { plan: "Plan changed" } }}`). */
  actions: { [K in AdminActionKind]?: string } & { [action: string]: string | undefined };
}

export const DEFAULT_ADMIN_ACTION_LOG_LABELS: AdminActionLogLabels = {
  title: "Admin actions",
  empty: "No admin actions yet.",
  loading: "Loading…",
  by: (actor) => `by ${actor}`,
  bySelf: "by the user themselves",
  automatic: "automatically",
  erased: "an erased account",
  filteredTo: (target) => `Only ${target}`,
  showAll: "Show all actions",
  filterBy: (target) => `Show only the actions on ${target}`,
  actions: {
    deactivate: "Deactivated",
    reactivate: "Reactivated",
    role: "Role changed",
    membership_remove: "Removed from the company",
    password_change_require: "New password required",
    password_change_withdraw: "Password requirement withdrawn",
    mail_verification: "Verification mail sent",
    mail_reset: "Password reset mail sent",
    reviewer: "Reviewer scope changed",
    invite: "Invited",
    invite_resend: "Invitation resent",
    invite_revoke: "Invitation revoked",
    transfer: "Work transferred",
    deletion_request: "Deletion requested",
    deletion_cancel: "Deletion cancelled",
    erase: "Account erased",
    plan: "Plan changed",
  },
};

/** The paging of `GET /admin/actions` — DataTable's `ServerPagination`, which the
 *  footer is. */
export interface AdminActionLogPaging {
  /** 0-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface AdminActionLogProps {
  /** One page, newest first, as the server sends it. */
  entries: readonly AdminActionLogEntry[];
  /** Left out: no footer (a short list on a row). */
  paging?: AdminActionLogPaging;
  /** The page is being fetched. */
  loading?: boolean;
  /** The filter in force: only this account's actions are shown (`?target=`). With
   *  `onTargetFilter`, a chip says so and its × clears it. */
  target?: AdminPerson | null;
  /** Filter by an account — or clear it with `null`. Given, every target's name is a
   *  button that narrows the list to it. Left out, the list is not filterable here. */
  onTargetFilter?: (target: AdminPerson | null) => void;
  className?: string;
  labels?: Partial<AdminActionLogLabels>;
}

/** Whether a person has nothing left that names them — an erased target. */
function scrubbed(person: AdminPerson | null | undefined): boolean {
  return !person || ![person.first, person.last, person.name, person.email].some((part) => (part ?? "").trim());
}

function samePerson(a: AdminPerson, b: AdminPerson | null | undefined): boolean {
  if (!b) return false;
  if (a.id !== undefined && a.id !== null && b.id !== undefined && b.id !== null) return a.id === b.id;
  const ea = (a.email ?? "").trim().toLowerCase();
  return ea !== "" && ea === (b.email ?? "").trim().toLowerCase();
}

export function AdminActionLog({
  entries,
  paging,
  loading = false,
  target,
  onTargetFilter,
  className,
  labels: labelsProp,
}: AdminActionLogProps) {
  const labels = useKitLabels("adminActionLog", DEFAULT_ADMIN_ACTION_LOG_LABELS, labelsProp);
  const nameOf = usePersonLabel();
  const filtered = target !== undefined && target !== null && !scrubbed(target);

  const actorText = (entry: AdminActionLogEntry): string => {
    const { actor } = entry;
    if (actor === null) return labels.automatic;
    if (actor === "self" || samePerson(actor, entry.target)) return labels.bySelf;
    return labels.by(nameOf(actor) || labels.erased);
  };

  const targetNode = (entry: AdminActionLogEntry): ReactNode => {
    if (scrubbed(entry.target)) return <span className="italic text-[var(--text-muted)]">{labels.erased}</span>;
    const person = entry.target!;
    const name = nameOf(person);
    const address = (person.email ?? "").trim();
    const text = (
      <>
        <span data-private className="font-medium text-[var(--text-primary)]">
          {name}
        </span>
        {address && address !== name && (
          <span data-private className="ms-1 text-xs text-[var(--text-muted)]">
            {address}
          </span>
        )}
      </>
    );
    if (!onTargetFilter || (filtered && samePerson(person, target))) return text;
    return (
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto min-h-0 p-0 text-start"
        aria-label={labels.filterBy(name)}
        onClick={() => onTargetFilter(person)}
      >
        {text}
      </Button>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {filtered && onTargetFilter && (
        <Chip size="sm" tone="brand" onRemove={() => onTargetFilter(null)} removeLabel={labels.showAll}>
          <span data-private>{labels.filteredTo(nameOf(target))}</span>
        </Chip>
      )}
      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-4">
          <Spinner label={labels.loading} />
        </div>
      ) : entries.length === 0 ? (
        <Caption>{labels.empty}</Caption>
      ) : (
        <ol
          aria-label={labels.title}
          aria-busy={loading || undefined}
          className={cn("divide-y divide-[var(--border)]", loading && "opacity-60")}
        >
          {entries.map((entry) => (
            <li key={entry.id} data-action={entry.action} className="space-y-0.5 py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">
                    {labels.actions[entry.action] ?? entry.action}
                  </span>
                  <span className="min-w-0 break-words">{targetNode(entry)}</span>
                </div>
                <DateMark value={entry.at} display="relative" className="text-xs text-[var(--text-muted)]" />
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                <span data-private={entry.actor !== null && entry.actor !== "self" ? true : undefined}>
                  {actorText(entry)}
                </span>
                {entry.detail !== undefined && entry.detail !== null && entry.detail !== "" && (
                  <>
                    {" · "}
                    <span className="text-[var(--text-secondary)]">{entry.detail}</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {paging && paging.total > 0 && (
        <Pagination
          page={paging.page}
          pageSize={paging.pageSize}
          total={paging.total}
          totalPages={Math.max(1, Math.ceil(paging.total / Math.max(1, paging.pageSize)))}
          onPage={paging.onPageChange}
          onPageSize={paging.onPageSizeChange}
        />
      )}
    </div>
  );
}
