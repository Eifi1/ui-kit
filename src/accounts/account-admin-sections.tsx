import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Ban, Inbox, KeyRound, Languages, MailCheck, RotateCcw, ShieldOff, Trash2, Undo2 } from "lucide-react";

import {
  ADMIN_ACTION_CONFIRM_CODES,
  AdminActionConfirm,
  DEFAULT_ADMIN_ACTION_LABELS,
} from "../admin/admin-action-confirm";
import type { AdminActionConfirmValues, AdminConfirmLevel } from "../admin/admin-action-confirm";
import { AdminActionLog, DEFAULT_ADMIN_ACTION_LOG_LABELS } from "../admin/admin-action-log";
import type {
  AdminActionLogEntry,
  AdminActionLogProps,
  AdminGroupNoun,
  AdminGroupTarget,
} from "../admin/admin-action-log";
import { useAdminAreaLabels } from "../admin/admin-area-labels";
import { AdminOverview } from "../admin/admin-overview";
import type { AdminAttentionTile, AdminExtraTile, AdminOverviewProps } from "../admin/admin-overview";
import { usePersonLabel } from "../admin/admin-parts";
import type { AdminPerson } from "../admin/admin-parts";
import { MailTestCard } from "../admin/mail-test-card";
import type { MailTestCardProps } from "../admin/mail-test-card";
import { ReviewerScopeEditor } from "../admin/reviewer-scope-editor";
import type { ReviewerScopeEditorProps } from "../admin/reviewer-scope-editor";
import {
  USER_ROSTER_PAGE_SIZE,
  USER_ROSTER_SORT_KEYS,
  userRosterSort,
  useUserRosterColumns,
} from "../admin/user-roster";
import type { UserRowActionList } from "../admin/user-roster";
import { AlertBanner } from "../components/alert-banner";
import { Button } from "../components/button";
import type { RoleVocabulary } from "../components/account-chips";
import { CopyButton } from "../components/copy-button";
import { DataTable } from "../components/data-table";
import type { DataTableColumn } from "../components/data-table";
import { DialogFrame } from "../components/dialog-frame";
import { Input } from "../components/input";
import { Caption } from "../components/text";
import { toast } from "../components/toast";
import { useTableUrlState } from "../components/use-table-state";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { SettingsSection } from "../settings/settings-section";
import { DEFAULT_ACCOUNT_FAILURE_LABELS, useDescribeAccountFailure, useFailureBeside } from "./account-failure";
import { DEFAULT_ACCOUNT_ROSTER_LABELS } from "./account-roster-labels";
import { DEFAULT_ACCOUNT_TEAMS_LABELS, teamToll } from "./account-teams-labels";
import type { TeamTollCounts } from "./account-teams-labels";
import type { AccountRosterLabels } from "./account-roster-labels";
import type { AccountAdminActionRow, AccountAdminConfirmation, AccountAdminUser, AccountMe } from "./accounts-api";
import { useAccountsClient } from "./accounts-context";
import {
  useAdminActions,
  useAdminAttention,
  useAdminMail,
  useAdminRoster,
  useAdminUserActions,
  useCurrentUser,
  useMailTest,
} from "./accounts-hooks";

/**
 * The admin area's sections, wired (docs/auth-harmonization.md §12.9 "The admin's sections"):
 * the kit's admin parts on server-kit 0.30–0.31's `user_admin_router` — the overview's tiles,
 * the test mail, the log — as sections an app puts into its admin `SettingsLayout`. Each app
 * wired them to its own `adminApi` once (Kurvenschmiede's `OverviewPanel`, `MailTestPanel`,
 * `ActivityPanel`); here they read the client from `<AccountsProvider>` and keep each answer
 * under `accountQueryKeys.admin`, so a roster action refreshes the tiles and the log with it.
 *
 * The server refuses every route to anyone but an admin; these sections do not check the role
 * themselves; the app's admin route is behind its gate, as its other admin pages are.
 */

/** What {@link AccountAdminOverviewSection} takes: the overview's own props, but its answer. */
export interface AccountAdminOverviewSectionProps extends Pick<
  AdminOverviewProps,
  "tileProps" | "labels" | "className"
> {
  /** Where the shared tiles link (an app without a feedback inbox at `/feedback` says so). */
  hrefs?: Partial<Record<AdminAttentionTile, string>>;
  /** The app's own tiles, from `attention.extra` or elsewhere. */
  extraTiles?: readonly AdminExtraTile[];
}

/** The overview (`GET /admin/attention`): the shared tiles, the server's counts in them, and
 *  a failed answer as the overview's own "Try again". */
export function AccountAdminOverviewSection({ hrefs, extraTiles, ...rest }: AccountAdminOverviewSectionProps) {
  const attention = useAdminAttention();
  return (
    <AdminOverview
      attention={attention.data}
      error={attention.error}
      onRetry={() => void attention.refetch()}
      hrefs={hrefs}
      extraTiles={extraTiles}
      {...rest}
    />
  );
}

/** What {@link AccountMailTestSection} takes: the card's props but the send, the address and
 *  the transport, which are the server's. */
export type AccountMailTestSectionProps = Omit<MailTestCardProps, "send" | "address" | "mailBackend">;

/** "Send a test mail to me" (`POST /admin/mail/test`): to the signed-in admin's own address,
 *  through the server's transport, which the card names before the first send
 *  (`GET /admin/mail`). Nothing until the account has loaded: the card needs the address. */
export function AccountMailTestSection(props: AccountMailTestSectionProps) {
  const me = useCurrentUser<AccountMe>();
  const mail = useAdminMail();
  const test = useMailTest();
  if (!me.data) return null;
  return (
    <MailTestCard
      mailBackend={mail.data?.mail_backend}
      send={() => test.mutateAsync()}
      address={me.data.email}
      {...props}
    />
  );
}

/** What {@link AccountAdminLogSection} takes. */
export interface AccountAdminLogSectionProps {
  /** The section's anchor; default `activity`, the shared section's id. */
  id?: string;
  /** Rows a page; default 20. The footer lets the admin pick another. */
  pageSize?: number;
  /** A line above the log, in the app's words. */
  hint?: ReactNode;
  /** The role in the app's words, for a role row's "Member → Admin"; left out, the role's
   *  code as the server logged it. */
  roleLabel?: (role: string) => string;
  /** A role IN A GROUP in the app's words (0.64: a team's member and manager), for a
   *  membership row's "Member → Manager"; left out, the role's code as logged. */
  groupRoleLabel?: (role: string) => string;
  /** A row's `detail` in the app's words, for the actions only the app has; it outranks the
   *  kit's reading of `role`, `reviewer`, membership and `group_delete` rows (a deleted team's
   *  counts, in `accountTeams`' count words). `undefined` leaves the row to the kit's. */
  describeDetail?: (row: AccountAdminActionRow) => ReactNode;
  groupNoun?: AdminGroupNoun;
  labels?: AdminActionLogProps["labels"];
  className?: string;
}

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * The server wrote ids, roles, flags and counts only (server-kit's guard), so this is all
 * there is to say about the shared actions: a role change as "Member → Admin", a reviewer's
 * languages as their codes, what went with a deleted team in the teams' count words. Anything
 * else says nothing rather than a dump of the JSON.
 */
function sharedDetail(
  row: AccountAdminActionRow,
  roleLabel: (role: string) => string,
  groupRoleLabel: (role: string) => string,
  words: { notSent?: string; reviewerNone?: string },
  toll: (counts: TeamTollCounts) => string | undefined,
): ReactNode {
  const { detail } = row;
  if (detail.sent === false) return words.notSent;
  if (row.action === "role" && typeof detail.from === "string" && typeof detail.to === "string") {
    return `${roleLabel(detail.from)} → ${roleLabel(detail.to)}`;
  }
  // 0.64: a role in a group changed, and who joined or left it as what (Kurvenschmiede's teams).
  if (row.action === "membership_role" && typeof detail.from === "string" && typeof detail.to === "string") {
    return `${groupRoleLabel(detail.from)} → ${groupRoleLabel(detail.to)}`;
  }
  if ((row.action === "membership_add" || row.action === "membership_remove") && typeof detail.role === "string") {
    return groupRoleLabel(detail.role);
  }
  if (row.action === "reviewer" && Array.isArray(detail.locales)) {
    const codes = (detail.locales as unknown[]).filter((code) => typeof code === "string");
    return codes.length > 0 ? codes.join(", ") : words.reviewerNone;
  }
  // 0.64: what went with a deleted team, as its delete dialog counted it — server-kit 0.32
  // logs `{members, grants, invitations}` (Kurvenschmiede wrote its own reading of it).
  if (
    row.action === "group_delete" &&
    (isCount(detail.members) || isCount(detail.grants) || isCount(detail.invitations))
  ) {
    const count = (value: unknown) => (isCount(value) ? value : 0);
    return toll({
      members: count(detail.members),
      grants: count(detail.grants),
      invitations: count(detail.invitations),
    });
  }
  return undefined;
}

/**
 * What the admins did, newest first (`GET /admin/actions`), a page at a time as the server
 * pages it. Any person's name in it narrows the log to that account — by its id, or, for an
 * invitation's address or an erased account, by the address the row kept (`target_email`,
 * server-kit 0.31) — and the chip clears it.
 */
export function AccountAdminLogSection({
  id = "activity",
  pageSize: firstPageSize = 20,
  hint,
  roleLabel = (role) => role,
  groupRoleLabel = (role) => role,
  describeDetail,
  groupNoun,
  labels,
  className,
}: AccountAdminLogSectionProps) {
  const { sections } = useAdminAreaLabels();
  const logWords = useKitLabels("adminActionLog", DEFAULT_ADMIN_ACTION_LOG_LABELS, labels);
  const teamWords = useKitLabels("accountTeams", DEFAULT_ACCOUNT_TEAMS_LABELS);
  const locale = useKitLocale();
  const toll = (counts: TeamTollCounts) => teamToll(counts, teamWords, locale);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(firstPageSize);
  const [target, setTarget] = useState<AdminPerson | null>(null);
  // An account by its id; an address with no account (an invitation, an erasure) by itself.
  const targetId = typeof target?.id === "number" ? target.id : undefined;
  const targetEmail = target && targetId === undefined ? (target.email ?? undefined) : undefined;
  const log = useAdminActions({
    limit: pageSize,
    offset: page * pageSize,
    target: targetId,
    target_email: targetEmail,
  });

  const entries: AdminActionLogEntry[] = (log.data?.actions ?? []).map((row) => {
    // A group the row names (0.64, Kurvenschmiede's activity panel), by the name the server
    // joined; none left reads as the noun's "a deleted team".
    const group: AdminGroupTarget | null =
      row.target_group_id === null || row.target_group_id === undefined
        ? null
        : { kind: "group", id: row.target_group_id, name: row.target_group?.name ?? null };
    // The person as the server joined them; with no account left, the address the row kept.
    const person = row.target ?? (row.target_email ? { email: row.target_email } : null);
    return {
      id: row.id,
      at: row.at,
      action: row.action,
      actor: row.actor,
      // A row about the group itself has it as its target; a membership or an invitation has
      // the person, with the group beside them.
      ...(group && row.action.startsWith("group_") ? { target: group } : { target: person, group }),
      // The app's words first, for its own actions; the kit's reading for the rest
      // (Kurvenschmiede's U9: it replaced the kit's reading whole).
      detail: describeDetail?.(row) ?? sharedDetail(row, roleLabel, groupRoleLabel, logWords, toll),
    };
  });

  return (
    // Alone in the section named after it: the title is for screen readers, the admin
    // area's sidebar already says it.
    <SettingsSection anchor={id} title={sections.activity.title} titleVisible={false} className={className}>
      {hint}
      <AdminActionLog
        entries={entries}
        groupNoun={groupNoun}
        labels={labels}
        loading={log.isPending}
        target={target}
        onTargetFilter={(next) => {
          setTarget(next);
          setPage(0);
        }}
        paging={{
          page,
          pageSize,
          total: log.data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(0);
          },
        }}
      />
    </SettingsSection>
  );
}

/* ── The roster ──────────────────────────────────────────────────────────── */

// Defined in ./account-roster-labels, which holds no component code: the catalogues import the
// type without the section, and the main barrel reaches no react-query through them.
export type { AccountRosterLabels };

/** What {@link AccountUserRosterSection} takes. */
export interface AccountUserRosterSectionProps<
  R extends string = string,
  Row extends AccountAdminUser = AccountAdminUser,
> {
  /** The section's anchor; default `users`, the shared section's id. */
  id?: string;
  /** The app's roles and their words, as the role chip and select read them. */
  roles: RoleVocabulary<R>;
  /** The roles the select may set. Default: every role but `REVIEWER`, which comes with a
   *  scope and is given through the reviewer action. */
  choosable?: readonly R[];
  /** Given, a "Translation review" action and a column of what each reviewer reviews —
   *  for a server whose policy names review languages (the route exists only then). */
  reviewer?: Pick<ReviewerScopeEditorProps, "languages" | "areas" | "intro">;
  /** The operator's "Erase now" for an account that asked to be deleted — for a server in
   *  the `operator` deletion mode (the route exists only then). Default off: an app whose
   *  daily job erases after the waiting days offers only the cancel. */
  erase?: boolean;
  /** "Reset two-factor sign-in" on an account with it on (0.64) — for a server whose account
   *  layer has a second factor (server-kit 0.32: the route exists only then). Default off. */
  twoFactorReset?: boolean;
  /** A line above the roster, in the app's words. */
  hint?: ReactNode;
  /** Rows a page; default server-kit's 25. */
  pageSize?: number;
  /** The app's own columns, after the dates — typed on the app's row (`Row`, its `row_model`'s
   *  fields beside the kit's), as the server answers it. */
  extraColumns?: readonly DataTableColumn<Row>[];
  /** The app's own actions on a row, before the kit's (de)activation. */
  extraActions?: (row: Row) => UserRowActionList;
  /** The app's words for a refusal; asked before the kit's `accountFailure`. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: LabelOverride<AccountRosterLabels>;
  className?: string;
}

/** The roster's columns as the URL state reads them: the state lives in the URL before the
 *  page has the real columns, which need the page's data. */
const URL_COLUMNS: DataTableColumn<AccountAdminUser>[] = USER_ROSTER_SORT_KEYS.map((key) => ({
  key,
  header: key,
  cell: () => null,
  sortBy: () => 0,
}));

/** The overview's tile links to `?state=deletion_requested` (`DEFAULT_ADMIN_ATTENTION_HREFS`);
 *  server-kit's token for the same accounts is `deletion_scheduled`. Both are read. */
const DELETION_STATES = new Set(["deletion_requested", "deletion_scheduled"]);

/** An action waiting for its confirmation, at the level the server stated. */
interface Pending {
  row: AccountAdminUser;
  level: AdminConfirmLevel;
  title: string;
  confirmLabel: string;
  consequence?: string;
  tone: "danger" | "warning" | "neutral";
  run: (body: AccountAdminConfirmation) => Promise<unknown>;
  done: string;
}

type RosterDialog = { kind: "confirm"; pending: Pending } | { kind: "reviewer"; row: AccountAdminUser } | null;

function confirmation(values: AdminActionConfirmValues): AccountAdminConfirmation {
  return { acknowledged: values.acknowledged ?? false, confirm_email: values.confirmEmail };
}

/**
 * The roster (`GET /admin/users`), and what an admin may do to one account on it — the
 * user-admin contract §3 and §4 on the kit's parts, as Kurvenschmiede's `UsersPanel` wired them.
 *
 * **Paged on the server**: the page, the sort and the search live in the URL
 * (`useTableUrlState`, keys under `users.`) and go to the server as its query, so a link
 * to "page 3, by last sign-in" works. `?state=deletion_requested` — the overview tile's
 * link — narrows it to the accounts that asked to be deleted, until "Show everybody".
 *
 * **Every action asks at the level the server states** (`levels` on the roster's answer,
 * §4.2) through `AdminActionConfirm`, and the server re-checks it. A role change asks
 * too; nobody can change their own role or the last active admin's, and the select
 * says why. Each action refreshes the roster, the overview's counts and the log.
 *
 * **Mail on the console**: the server sends nothing and answers a mail action with the
 * link; the section shows it to copy and hand on (auth §12.8 item 10).
 */
export function AccountUserRosterSection<R extends string = string, Row extends AccountAdminUser = AccountAdminUser>({
  id = "users",
  roles,
  choosable,
  reviewer,
  erase = false,
  twoFactorReset = false,
  hint,
  pageSize = USER_ROSTER_PAGE_SIZE,
  extraColumns = [],
  extraActions,
  describeError,
  labels: labelsProp,
  className,
}: AccountUserRosterSectionProps<R, Row>) {
  const labels = useKitLabels("accountRoster", DEFAULT_ACCOUNT_ROSTER_LABELS, labelsProp);
  const guards = useKitLabels("adminAction", DEFAULT_ADMIN_ACTION_LABELS);
  const { sections } = useAdminAreaLabels();
  const describeFailure = useDescribeAccountFailure();
  const failures = useKitLabels("accountFailure", DEFAULT_ACCOUNT_FAILURE_LABELS);
  const say = (error: unknown) => describeError?.(error) ?? describeFailure(error);
  // The confirmation's own refusals (the last admin, oneself, a mistyped address) are the
  // dialog's to word (Kurvenschmiede's U1 on dev.4): `say` answers every code, so it is not
  // what the dialog asks.
  const confirmBeside = useFailureBeside(ADMIN_ACTION_CONFIRM_CODES);
  const sayInDialog = (error: unknown) => describeError?.(error) ?? confirmBeside(error);
  const nameOf = usePersonLabel();
  const me = useAccountsClient<AccountMe>().useSession((state) => state.user?.id);
  const actions = useAdminUserActions();
  const [dialog, setDialog] = useState<RosterDialog>(null);
  const [mailLink, setMailLink] = useState<{ email: string; link: string } | null>(null);

  const table = useTableUrlState({
    columns: URL_COLUMNS,
    urlPrefix: "users.",
    search: true,
    defaultPageSize: pageSize,
  });
  const [params, setParams] = useSearchParams();
  const onlyDeletions = DELETION_STATES.has(params.get("state") ?? "");
  const showEverybody = () =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("state");
        return next;
      },
      { replace: true },
    );
  const roster = useAdminRoster({
    limit: table.pageSize,
    offset: table.page * table.pageSize,
    sort: userRosterSort(table.sorts),
    q: table.search.trim() || undefined,
    state: onlyDeletions ? "deletion_scheduled" : undefined,
  });

  const level = (action: string): AdminConfirmLevel => roster.data?.levels?.[action] ?? "none";
  const activeAdmins = Number(roster.data?.summary?.active_admins ?? 0);
  const lastAdmin = (row: AccountAdminUser) => row.role === "ADMIN" && row.is_active && activeAdmins <= 1;
  const named = (row: AccountAdminUser) => nameOf({ first: row.first_name, last: row.last_name, email: row.email });
  const target = (row: AccountAdminUser) => ({
    id: row.id,
    first: row.first_name,
    last: row.last_name,
    email: row.email,
  });
  const ask = (pending: Pending) => setDialog({ kind: "confirm", pending });

  const sendMail = (row: AccountAdminUser, kind: "verification" | "password_reset") =>
    actions.sendMail.mutate(
      { id: row.id, kind },
      {
        onSuccess: (answer) => {
          if (answer.link) setMailLink({ email: row.email, link: answer.link });
          if (!answer.sent) toast.error(failures.codes.mail_not_sent);
          else
            toast.success(kind === "verification" ? labels.verificationSent(row.email) : labels.resetSent(row.email));
        },
        onError: (error) => toast.error(say(error)),
      },
    );

  const rowActions = (row: AccountAdminUser): UserRowActionList => {
    const self = row.id === me;
    const deletionAsked = Boolean(row.deletion_requested_at);
    return [
      row.is_active &&
        row.email_verified === false && {
          key: "verification",
          label: labels.sendVerification,
          icon: MailCheck,
          onSelect: () => sendMail(row, "verification"),
        },
      row.is_active && {
        key: "reset",
        label: labels.sendReset,
        icon: Inbox,
        onSelect: () => sendMail(row, "password_reset"),
      },
      row.password_change_required_at
        ? {
            key: "withdraw",
            label: labels.withdrawPasswordChange,
            icon: Undo2,
            onSelect: () =>
              actions.withdrawPasswordChange.mutate(
                { id: row.id },
                {
                  onSuccess: () => toast.success(labels.passwordChangeWithdrawn(row.email)),
                  onError: (error) => toast.error(say(error)),
                },
              ),
          }
        : {
            key: "require",
            label: labels.requirePasswordChange,
            icon: KeyRound,
            onSelect: () =>
              ask({
                row,
                level: level("password_change_require"),
                title: labels.requirePasswordChangeTitle(named(row)),
                confirmLabel: labels.requirePasswordChange,
                consequence: labels.requirePasswordChangeBody,
                tone: "warning",
                run: (body) => actions.requirePasswordChange.mutateAsync({ id: row.id, ...body }),
                done: labels.passwordChangeRequired(row.email),
              }),
          },
      // An admin reviews every language already, so the grant is offered to everybody else.
      reviewer !== undefined &&
        row.role !== "ADMIN" && {
          key: "reviewer",
          label: labels.reviewer,
          icon: Languages,
          onSelect: () => setDialog({ kind: "reviewer", row }),
        },
      // 0.64 (server-kit 0.32): a lost phone with no backup code and no passkey. Never one's own.
      twoFactorReset &&
        row.totp_enabled === true &&
        !self && {
          key: "two-factor-reset",
          label: labels.resetTwoFactor,
          icon: ShieldOff,
          onSelect: () =>
            ask({
              row,
              level: level("two_factor_reset"),
              title: labels.resetTwoFactorTitle(named(row)),
              confirmLabel: labels.resetTwoFactor,
              consequence: labels.resetTwoFactorBody,
              tone: "warning",
              run: (body) => actions.resetTwoFactor.mutateAsync({ id: row.id, ...body }),
              done: labels.twoFactorReset(row.email),
            }),
        },
      ...(extraActions?.(row as Row) ?? []),
      erase &&
        !row.is_active &&
        deletionAsked && {
          key: "erase",
          label: labels.erase,
          icon: Trash2,
          tone: "danger" as const,
          // Asked in onSelect at the server's level; the menu's own question would ask twice.
          confirm: false,
          onSelect: () =>
            ask({
              row,
              level: level("erase"),
              title: labels.eraseTitle(named(row)),
              confirmLabel: labels.erase,
              consequence: labels.eraseBody,
              tone: "danger",
              run: (body) =>
                actions.erase.mutateAsync({ id: row.id, ...body, confirm_email: body.confirm_email ?? "" }),
              done: labels.erased(row.email),
            }),
        },
      row.is_active
        ? {
            key: "deactivate",
            label: labels.deactivate,
            icon: Ban,
            tone: "danger" as const,
            confirm: false,
            disabledReason: self ? guards.self : lastAdmin(row) ? guards.lastAdmin : undefined,
            onSelect: () =>
              ask({
                row,
                level: level("deactivate"),
                title: labels.deactivateTitle(named(row)),
                confirmLabel: labels.deactivate,
                consequence: labels.deactivateBody,
                tone: "danger",
                run: (body) => actions.setActive.mutateAsync({ id: row.id, active: false, ...body }),
                done: labels.deactivated(row.email),
              }),
          }
        : {
            key: "reactivate",
            label: deletionAsked ? labels.cancelDeletion : labels.reactivate,
            icon: RotateCcw,
            onSelect: () =>
              ask({
                row,
                level: level(deletionAsked ? "deletion_cancel" : "reactivate"),
                title: deletionAsked ? labels.cancelDeletionTitle(named(row)) : labels.reactivateTitle(named(row)),
                confirmLabel: deletionAsked ? labels.cancelDeletion : labels.reactivate,
                tone: "neutral",
                run: (body) => actions.setActive.mutateAsync({ id: row.id, active: true, ...body }),
                done: deletionAsked ? labels.deletionCancelled(row.email) : labels.reactivated(row.email),
              }),
          },
    ];
  };

  // The app's columns are typed on its row; the table's on the kit's, which its rows extend.
  const ownColumns = extraColumns as unknown as readonly DataTableColumn<AccountAdminUser>[];
  const offered = choosable ?? (Object.keys(roles) as R[]).filter((role) => role !== "REVIEWER");
  const reviewsColumn: DataTableColumn<AccountAdminUser> = {
    key: "reviews",
    header: labels.reviews,
    // The languages, and the areas of a reviewer limited to some (Kurvenschmiede's U3: "legal
    // pages only"), in the words the reviewer action offers them under.
    cell: (row) =>
      row.role === "REVIEWER" && row.translation_review_locales.length > 0 ? (
        <Caption as="span">
          {row.translation_review_locales.join(", ")}
          {row.translation_review_areas !== null && row.translation_review_areas.length > 0 && (
            <>
              {" · "}
              {row.translation_review_areas.map((area, index) => (
                <Fragment key={area}>
                  {index > 0 && ", "}
                  {reviewer?.areas?.find((option) => option.value === area)?.label ?? area}
                </Fragment>
              ))}
            </>
          )}
        </Caption>
      ) : null,
    mobileHidden: true,
    fitPriority: 3,
  };
  const columns = useUserRosterColumns<AccountAdminUser, R>({
    roles,
    actions: rowActions,
    editableRole: (row) => ({
      disabledReason: row.id === me ? "self" : lastAdmin(row) ? "last_admin" : undefined,
      offered,
    }),
    onRoleChange: (row, role) => {
      const word = roles[role]?.label ?? role;
      ask({
        row,
        level: level("role"),
        title: labels.roleTitle(named(row), word),
        confirmLabel: labels.changeRole,
        // Becoming an admin, or no longer one, says what it brings (Kurvenschmiede's U4).
        consequence:
          role === "ADMIN" && row.role !== "ADMIN"
            ? labels.roleToAdminBody
            : row.role === "ADMIN" && role !== "ADMIN"
              ? labels.roleFromAdminBody
              : labels.roleBody,
        tone: "warning",
        run: (body) => actions.setRole.mutateAsync({ id: row.id, role, ...body }),
        done: labels.roleChanged(row.email, word),
      });
    },
    extra: reviewer ? [reviewsColumn, ...ownColumns] : ownColumns,
  });

  return (
    // Alone in the section named after it: the title is for screen readers, the admin
    // area's sidebar already says it.
    <SettingsSection
      anchor={id}
      title={sections.users.title}
      titleVisible={false}
      className={["space-y-3", className].filter(Boolean).join(" ")}
    >
      {hint}
      {roster.data?.mail_backend === "console" && (
        <AlertBanner variant="inline" tone="info">
          {labels.consoleMail}
        </AlertBanner>
      )}
      {mailLink && (
        <AlertBanner variant="inline" tone="info" onDismiss={() => setMailLink(null)}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span>{labels.mailLink(mailLink.email)}</span>
            <code className="min-w-0 break-all text-xs">{mailLink.link}</code>
            <CopyButton text={mailLink.link} />
          </div>
        </AlertBanner>
      )}
      {onlyDeletions && (
        <AlertBanner
          variant="inline"
          tone="warning"
          action={
            <Button size="sm" variant="secondary" onClick={showEverybody}>
              {labels.showEverybody}
            </Button>
          }
        >
          {labels.onlyDeletions}
        </AlertBanner>
      )}
      <Input
        type="search"
        label={labels.search}
        value={table.search}
        onChange={(event) => table.setSearch(event.target.value)}
        className="max-w-sm"
      />
      <DataTable
        edgeFade
        {...table.tableProps(roster.data?.total ?? 0, { isLoading: roster.isFetching })}
        rows={roster.data?.users ?? []}
        columns={columns}
        rowKey={(row) => row.id}
      />

      {dialog?.kind === "confirm" && (
        <AdminActionConfirm
          level={dialog.pending.level}
          target={target(dialog.pending.row)}
          title={dialog.pending.title}
          confirmLabel={dialog.pending.confirmLabel}
          consequence={dialog.pending.consequence}
          tone={dialog.pending.tone}
          describeError={sayInDialog}
          onConfirm={(values) => dialog.pending.run(confirmation(values))}
          onClose={(done) => {
            const message = dialog.pending.done;
            setDialog(null);
            if (done) toast.success(message);
          }}
        />
      )}
      {dialog?.kind === "reviewer" && reviewer && (
        <DialogFrame title={labels.reviewerTitle(named(dialog.row))} onClose={() => setDialog(null)}>
          <ReviewerScopeEditor
            key={dialog.row.id}
            value={{ locales: dialog.row.translation_review_locales, areas: dialog.row.translation_review_areas }}
            languages={reviewer.languages}
            areas={reviewer.areas}
            intro={reviewer.intro}
            describeError={say}
            onCancel={() => setDialog(null)}
            onSave={async (scope) => {
              const answer = await actions.setReviewer.mutateAsync({ id: dialog.row.id, ...scope });
              setDialog(null);
              toast.success(
                answer.role === "REVIEWER"
                  ? labels.reviewerSet(dialog.row.email, answer.locales.join(", "))
                  : labels.reviewerRemoved(dialog.row.email),
              );
            }}
          />
        </DialogFrame>
      )}
    </SettingsSection>
  );
}
