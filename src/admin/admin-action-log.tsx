import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import type { DateInput } from "../lib/format";
import { useKitLabels } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { DateMark } from "../components/account-chips";
import { Chip } from "../components/chip";
import { Pagination } from "../components/data-table-pagination";
import { Caption } from "../components/text";
import { Button } from "../components/button";
import { Spinner } from "../components/spinner";
import { usePersonLabel } from "./admin-parts";
import type { AdminPerson } from "./admin-parts";
import { DEFAULT_ADMIN_ACTION_LOG_LABELS } from "./admin-action-log-labels";

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
 * GROUPS (round 0.34, §11): Kurvenschmiede's teams, kastlan's companies and keksdose's
 * budgets are groups of accounts, and the vocabulary has words for what is done to one
 * (`group_create`, `group_rename`, `group_delete`) and to who is in it (`membership_add`,
 * `membership_role`, `membership_remove`). A row about the group itself has the group as
 * its `target`; a row about a person in it has the person as its target and the group as
 * its `group`, drawn after the person by its name alone, muted — no preposition, so no
 * language has to inflect the name. The kinds and codes say "group"; the labels say the
 * app's own noun, picked with `groupNoun` — whole phrases per noun, since a noun dropped
 * into one phrase breaks the participle's agreement in fr and it and the suffix in hu
 * (decision 4). A group with no name left reads as the noun's "a deleted team"; only a
 * missing PERSON is "an erased account".
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
  | "plan"
  // 0.34 (§11.3): what is done to a group of accounts, and to who is in it — beside
  // `membership_remove`. server-kit 0.8's `AdminAction` has the same five.
  | "group_create"
  | "group_rename"
  | "group_delete"
  | "membership_add"
  | "membership_role"
  // 0.45 (admin §9.1.3): a group switched off or on again — kastlan's company PATCH
  // (`is_active`). server-kit 0.15's `AdminAction.GROUP_DEACTIVATE` / `GROUP_REACTIVATE`.
  | "group_deactivate"
  | "group_reactivate";

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
  "group_create",
  "group_rename",
  "group_delete",
  "membership_add",
  "membership_role",
  "group_deactivate",
  "group_reactivate",
];

/** The app's word for its groups (§11.5): Kurvenschmiede's teams, kastlan's companies,
 *  keksdose's budgets; `group` is the neutral word. Picks the set of phrases the group
 *  actions are said in. */
export type AdminGroupNoun = "group" | "team" | "company" | "budget";

/** The kinds said in the noun's words: the five of 0.34, `membership_remove`, and 0.45's
 *  `group_deactivate` / `group_reactivate`. */
type AdminGroupActionKind =
  | "group_create"
  | "group_rename"
  | "group_delete"
  | "group_deactivate"
  | "group_reactivate"
  | "membership_add"
  | "membership_role"
  | "membership_remove";

const GROUP_ACTION_KINDS: ReadonlySet<string> = new Set<AdminGroupActionKind>([
  "group_create",
  "group_rename",
  "group_delete",
  "group_deactivate",
  "group_reactivate",
  "membership_add",
  "membership_role",
  "membership_remove",
]);

/**
 * A group as a log target (§11.4): a row about the group itself (`group_*`, kastlan's
 * `plan`), or the `group` a person was added to, moved in or taken out of. The app joins
 * its `name` when the log is read — from the live group, else from its `group_delete`
 * row's stamp (`target_group_name`, decision 6) — as it joins a person's. With no name
 * left it reads as the noun's "a deleted team".
 */
export interface AdminGroupTarget {
  kind: "group";
  id?: string | number | null;
  name?: string | null;
}

/** A target that is neither a person nor a group (§11.4): an app's own action on a demo
 *  dataset or a setting, said by its `label`. */
export interface AdminOtherTarget {
  kind: "other";
  /** What it was done to, in the app's words, as it is drawn. */
  label: string;
  /** The app's id for it, when it has one. Beyond §11.4's shape so that code reading
   *  `entry.target.id` on any target — keksdose's filter, the showcase's — still
   *  type-checks against the wider union. */
  id?: string | number | null;
}

/** Whether a target is a group. A person has no `kind`; an object whose `kind` is
 *  anything else is read as a person too. */
export function isGroupTarget(target: unknown): target is AdminGroupTarget {
  return typeof target === "object" && target !== null && (target as { kind?: unknown }).kind === "group";
}

function isOtherTarget(target: unknown): target is AdminOtherTarget {
  return typeof target === "object" && target !== null && (target as { kind?: unknown }).kind === "other";
}

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
  /**
   * What it was done to (§11.4): a person (no `kind`) — `null`, or a person with nothing
   * left in it, is "an erased account", and an invitation's person is its address
   * (`target_email`); a group (`kind: "group"`), for a row about the group itself; or
   * something else (`kind: "other"`), said by its label. Left out: nothing is drawn
   * (until 0.34 it read as erased).
   */
  target?: AdminPerson | AdminGroupTarget | AdminOtherTarget | null;
  /** The group a `membership_*` or invitation row happened in, drawn after the person
   *  by its name (§11.4). */
  group?: AdminGroupTarget | null;
  /** The `detail` in the app's words — "Member → Admin", "12 items to Ben Example". */
  detail?: ReactNode;
  /**
   * 0.45 (admin §9.4, Marcel 2026-10-19): a `group_rename` row's `detail.{from, to}` —
   * kastlan's company rename logs both names. With both, the row reads "Company renamed
   * from A to B" (`renamedFromTo`) in place of the target. A rename that logs `{}` (KS's
   * team rename: never a name) leaves it out and reads "Team renamed" and the group.
   */
  renamed?: { from?: string | null; to?: string | null } | null;
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
  /** 0.45: after "Company renamed" when the row carries both names — "from A to B". */
  renamedFromTo: (from: string, to: string) => string;
  /** What each action is called, past tense, keyed by the vocabulary. An app adds its
   *  own here (`labels={{ actions: { plan: "Plan changed" } }}`). A word given here
   *  outranks the noun's in `groupActions` — so no catalogue holds the group kinds
   *  here, `membership_remove` included (0.34). */
  actions: { [K in AdminActionKind]?: string } & { [action: string]: string | undefined };
  /** The group actions in each noun's words (§11.5), picked with `groupNoun`. */
  groupActions: Record<AdminGroupNoun, AdminGroupActionLabels>;
}

/** One noun's phrases (§11.5): whole phrases, never a noun dropped into one. */
interface AdminGroupActionLabels {
  /** "Team created". */
  group_create: string;
  /** "Team renamed". */
  group_rename: string;
  /** "Team deleted". */
  group_delete: string;
  /** "Company deactivated" (0.45, admin §9.1.3): the group switched off — its people
   *  locked out — not a person's `deactivate`. */
  group_deactivate: string;
  /** "Company reactivated" (0.45). */
  group_reactivate: string;
  /** "Added to the team" — said of the person, so it agrees with the account where a
   *  language agrees (es "Añadida", fr "Ajouté"). */
  membership_add: string;
  /** "Role in the team changed" — the role in the group, not the account's (`role`). */
  membership_role: string;
  /** "Removed from the team". The `company` set's is the string `actions` held until
   *  0.34, in every language. */
  membership_remove: string;
  /** A group target with no name left: "a deleted team". */
  deleted: string;
}

// Defined in ./admin-action-log-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_ADMIN_ACTION_LOG_LABELS };

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
  /** Filter by an account — or clear it with `null`. Given, every person target's name
   *  is a button that narrows the list to it; a group or other target never is (0.34:
   *  `?target=` stays a person's). Left out, the list is not filterable here. */
  onTargetFilter?: (target: AdminPerson | null) => void;
  /** The app's word for its groups (§11.5): picks the phrases the group actions and "a
   *  deleted …" are said in. Default `group`; `labels.actions[kind]` still wins. */
  groupNoun?: AdminGroupNoun;
  className?: string;
  /** Any part, at any depth: `{ groupActions: { team: { group_create: "…" } } }`. */
  labels?: LabelOverride<AdminActionLogLabels>;
}

/** Whether a person has nothing left that names them — an erased target. */
function scrubbed(person: AdminPerson | null | undefined): boolean {
  return !person || ![person.first, person.last, person.name, person.email].some((part) => (part ?? "").trim());
}

/** Whether two people are the same account. A group or other target is never a person
 *  (§11.4), so it never reads "by the user themselves". */
function samePerson(a: AdminPerson, b: AdminActionLogEntry["target"]): boolean {
  if (!b || isGroupTarget(b) || isOtherTarget(b)) return false;
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
  groupNoun = "group",
  className,
  labels: labelsProp,
}: AdminActionLogProps) {
  // Merged key by key at every depth, so a deep override is what `useKitLabels` takes.
  const labels = useKitLabels("adminActionLog", DEFAULT_ADMIN_ACTION_LOG_LABELS, labelsProp);
  const nameOf = usePersonLabel();
  const filtered = target !== undefined && target !== null && !scrubbed(target);
  // A noun the type doesn't know (an app in plain JS) says the neutral word.
  const groupWords = labels.groupActions[groupNoun] ?? labels.groupActions.group;

  /** An app's own word first, then the noun's phrase for a group kind, else the key. */
  const actionText = (action: string): string =>
    labels.actions[action] ??
    (GROUP_ACTION_KINDS.has(action) ? groupWords[action as AdminGroupActionKind] : undefined) ??
    action;

  /** A group by its name, or — muted, as an erased person is — the noun's "a deleted
   *  team" when none is left. */
  const groupText = (group: AdminGroupTarget, className?: string): ReactNode => {
    const name = (group.name ?? "").trim();
    return name ? (
      <span data-private className={className}>
        {name}
      </span>
    ) : (
      <span className="italic text-muted">{groupWords.deleted}</span>
    );
  };

  const actorText = (entry: AdminActionLogEntry): string => {
    const { actor } = entry;
    if (actor === null) return labels.automatic;
    if (actor === "self" || samePerson(actor, entry.target)) return labels.bySelf;
    return labels.by(nameOf(actor) || labels.erased);
  };

  const targetNode = (entry: AdminActionLogEntry): ReactNode => {
    const subject = entry.target;
    // Left out: nothing (§11.4). `null` is a person the erasure took.
    if (subject === undefined) return null;
    if (isGroupTarget(subject)) return groupText(subject, "font-medium text-primary");
    if (isOtherTarget(subject)) return <span className="font-medium text-primary">{subject.label}</span>;
    if (scrubbed(subject)) return <span className="italic text-muted">{labels.erased}</span>;
    const person = subject!;
    const name = nameOf(person);
    const address = (person.email ?? "").trim();
    const text = (
      <>
        <span data-private className="font-medium text-primary">
          {name}
        </span>
        {address && address !== name && (
          <span data-private className="ms-1 text-xs text-muted">
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
          className={cn("divide-y divide-subtle", loading && "opacity-60")}
        >
          {entries.map((entry) => {
            const from = (entry.renamed?.from ?? "").trim();
            const to = (entry.renamed?.to ?? "").trim();
            const renamed = entry.action === "group_rename" && from !== "" && to !== "";
            return (
            <li key={entry.id} data-action={entry.action} className="space-y-0.5 py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium text-primary">{actionText(entry.action)}</span>
                  {renamed ? (
                    <span data-private data-renamed className="min-w-0 break-words text-primary">
                      {labels.renamedFromTo(from, to)}
                    </span>
                  ) : (
                    entry.target !== undefined && <span className="min-w-0 break-words">{targetNode(entry)}</span>
                  )}
                  {entry.group && (
                    <span data-group className="min-w-0 break-words text-xs text-muted">
                      {groupText(entry.group)}
                    </span>
                  )}
                </div>
                <DateMark value={entry.at} display="relative" className="text-xs text-muted" />
              </div>
              <div className="text-xs text-muted">
                <span data-private={entry.actor !== null && entry.actor !== "self" ? true : undefined}>
                  {actorText(entry)}
                </span>
                {entry.detail !== undefined && entry.detail !== null && entry.detail !== "" && (
                  <>
                    {" · "}
                    <span className="text-secondary">{entry.detail}</span>
                  </>
                )}
              </div>
            </li>
            );
          })}
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
