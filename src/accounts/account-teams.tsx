import { useState } from "react";
import type { ReactNode } from "react";
import { Pencil, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";

import { ADMIN_ACTION_CONFIRM_CODES, AdminActionConfirm } from "../admin/admin-action-confirm";
import type { AdminConfirmLevel } from "../admin/admin-action-confirm";
import { DEFAULT_INVITATIONS_LABELS } from "../admin/invitations-panel-labels";
import { AccountStateChip } from "../components/account-chips";
import { AlertBanner } from "../components/alert-banner";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { Chip } from "../components/chip";
import { CopyButton } from "../components/copy-button";
import { DataTable } from "../components/data-table";
import type { DataTableColumn } from "../components/data-table";
import { DialogFrame } from "../components/dialog-frame";
import { FormActions } from "../components/form-actions";
import { Input } from "../components/input";
import { LanguageSelect } from "../components/language-select";
import { LoadingState } from "../components/loading-state";
import { PageHeader } from "../components/page-header";
import { RowActions, rowActionsColumn } from "../components/row-actions";
import { Caption, SectionLabel } from "../components/text";
import { toast } from "../components/toast";
import { ToggleGroup } from "../components/toggle-group";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { KIT_LANGUAGES, resolveLanguage } from "../i18n/languages";
import type { KitLanguageCode } from "../i18n/languages";
import { SettingsSection } from "../settings/settings-section";
import { DEFAULT_ACCOUNT_FAILURE_LABELS, describeAccountFailure, useFailureBeside } from "./account-failure";
import type { DescribeAccountFailureOptions } from "./account-failure";
import type {
  AccountAdminTeam,
  AccountTeam,
  AccountTeamInvitation,
  AccountTeamInvited,
  AccountTeamMember,
  AccountTeamRole,
} from "./account-teams-api";
import { useAdminTeamActions, useAdminTeams, useMyTeams, useTeamActions } from "./account-teams-hooks";
import { DEFAULT_ACCOUNT_TEAMS_LABELS, teamToll } from "./account-teams-labels";
import type { AccountTeamRefusalLabels, AccountTeamsLabels } from "./account-teams-labels";

/**
 * The teams' parts, wired (0.64, server-kit 0.32's opt-in teams): Kurvenschmiede's
 * `TeamsPanel`, `TeamsPage`, `TeamCard`, `team-toll` and `announce-invited`, lifted.
 *
 * - {@link AccountTeamsSection} — the admin's: every team in a table, a row opening the
 *   team (its members, their roles, its waiting invitations and an add), create, rename and
 *   delete, the delete asked at the level the server states with what goes with the team;
 * - {@link AccountTeamsPage} — a member's: the teams they are in, each with its members; a
 *   manager adds and removes members and handles the team's waiting invitations.
 *
 * **Opt-in**: nothing is read or drawn unless the app mounts one of them. Every door is
 * refused by the server when it should be (a manager's add to a team they do not manage is a
 * 404 there), so what these hide is a courtesy, not the rule.
 */

/** A team the server's refusal names by `name` or `email`, else the team in hand's. */
function teamRefusal(
  codes: AccountTeamRefusalLabels,
  code: string,
  body: Record<string, unknown>,
  name?: string,
): string | undefined {
  const said = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);
  const named = said(body.name) ?? name;
  switch (code) {
    case "team_not_found":
    case "manager_named_by_admin":
    case "manager_removed_by_admin":
      return codes[code];
    case "team_name_taken":
    case "team_changed":
      return named === undefined ? undefined : codes[code](named);
    case "manager_kept_by_admin": {
      const email = said(body.email);
      return email === undefined ? undefined : codes.manager_kept_by_admin(email);
    }
    default:
      return undefined;
  }
}

/** The words for a failed team request: the app's `describeError` first, then a team's coded
 *  refusal (naming `name` when the answer names none), the app's `appCode`, the account's. */
function useSayTeamFailure(
  codes: AccountTeamRefusalLabels,
  describeError?: (error: unknown) => ReactNode | undefined,
  appCode?: DescribeAccountFailureOptions["appCode"],
): (error: unknown, name?: string) => ReactNode {
  const failures = useKitLabels("accountFailure", DEFAULT_ACCOUNT_FAILURE_LABELS);
  return (error, name) =>
    describeError?.(error) ??
    describeAccountFailure(error, failures, {
      appCode: (code, body) => teamRefusal(codes, code, body, name) ?? appCode?.(code, body),
    });
}

/** What the cascade takes when a team is deleted, counted from the team in hand
 *  ({@link teamToll}), or `undefined` when nothing goes with it. */
function useTeamToll(labels: AccountTeamsLabels): (team: AccountAdminTeam) => string | undefined {
  const locale = useKitLocale();
  return (team) =>
    teamToll(
      { members: team.members.length, grants: team.grant_count, invitations: team.invitations.length },
      labels,
      locale,
    );
}

/** A console mail's link, shown once to copy and hand on. */
interface HandOn {
  email: string;
  link: string;
}

/**
 * An add or a re-send that INVITED an address with no account rather than adding one: the
 * mail did not go, the link is ready (console mail, where the log is the only inbox), or the
 * invitation is on its way. Kurvenschmiede's `announceInvited`; the link is put where it can be
 * copied (`handOn`), where Kurvenschmiede's toast only said to copy it. Answers whether it
 * said anything.
 */
function announceInvited(
  invited: AccountTeamInvited | null | undefined,
  team: string,
  labels: AccountTeamsLabels,
  handOn: (link: HandOn) => void,
): boolean {
  if (!invited) return false;
  if (invited.link) handOn({ email: invited.email, link: invited.link });
  if (!invited.sent) toast.warning(labels.invitedNotSent(invited.email));
  else if (!invited.link) toast.success(labels.invited(invited.email, team));
  return true;
}

/** The link banner, above the teams. */
function HandOnBanner({ handOn, onDismiss }: { handOn: HandOn | null; onDismiss: () => void }) {
  const invitations = useKitLabels("invitations", DEFAULT_INVITATIONS_LABELS);
  if (!handOn) return null;
  return (
    <AlertBanner variant="inline" tone="info" onDismiss={onDismiss}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span>{invitations.linkReady(handOn.email)}</span>
        <code className="min-w-0 break-all text-xs">{handOn.link}</code>
        <CopyButton text={handOn.link} />
      </div>
    </AlertBanner>
  );
}

/* ── One team's people ───────────────────────────────────────────────────── */

/** The doors a viewer has on one team; each left out is a door not drawn. */
interface TeamDoors {
  busy: boolean;
  /** `locale` is the invitation's, for an address with no account. Resolves once added. */
  onAdd?: (email: string, role: AccountTeamRole, locale: string) => Promise<unknown>;
  onRemove?: (member: AccountTeamMember) => void;
  /** The admin's alone: names or un-names a manager. */
  onSetRole?: (member: AccountTeamMember, role: AccountTeamRole) => void;
  onResend?: (invitation: AccountTeamInvitation) => void;
  onWithdraw?: (invitation: AccountTeamInvitation) => void;
}

interface TeamPeopleProps {
  team: AccountTeam;
  /** `admin`: any door on anybody; `manager`: members only, never a manager; `member`: read. */
  mode: "admin" | "manager" | "member";
  doors?: TeamDoors;
  languages: readonly KitLanguageCode[];
  defaultLocale?: string;
  labels: AccountTeamsLabels;
}

/**
 * Who is in one team, and the doors the viewer has on it — three audiences and one part,
 * because the three are the same list with different doors on it (Kurvenschmiede's
 * `TeamCard`). Adding and re-sending are `commit`s, held while a write lock is on (the app's
 * billing standing, around a manager's page); removing and withdrawing are removals and take
 * `COMMIT_EXCEPT_BILLING`.
 */
function TeamPeople({ team, mode, doors, languages, defaultLocale, labels }: TeamPeopleProps) {
  const invitationWords = useKitLabels("invitations", DEFAULT_INVITATIONS_LABELS);
  const kitLocale = useKitLocale();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountTeamRole>("member");
  const [locale, setLocale] = useState<KitLanguageCode>(() => resolveLanguage([defaultLocale, kitLocale], languages));
  const roles = [
    { value: "member" as const, label: labels.roles.member },
    { value: "manager" as const, label: labels.roles.manager },
  ];
  const busy = doors?.busy ?? false;
  const add = () => {
    const address = email.trim();
    if (!address || !doors?.onAdd) return;
    // The address stays in the field until the add went through, so a refusal can be fixed.
    void doors
      .onAdd(address, mode === "admin" ? role : "member", locale)
      .then(() => setEmail(""))
      .catch(() => undefined);
  };

  return (
    <div className="space-y-3" data-team={team.id}>
      <SectionLabel as="h4">{labels.members}</SectionLabel>
      {team.members.length === 0 && <Caption>{labels.nobody}</Caption>}
      <ul className="space-y-2">
        {team.members.map((member) => {
          // A manager's door is on members only: managers are the admin's.
          const removable =
            doors?.onRemove !== undefined && (mode === "admin" || (mode === "manager" && member.role === "member"));
          return (
            <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-primary">{member.display_name}</span>
                  {!member.is_active && <AccountStateChip state="inactive" size="xs" />}
                </div>
                <div className="truncate text-xs text-muted">{member.email}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {mode === "admin" && doors?.onSetRole ? (
                  <ToggleGroup<AccountTeamRole>
                    size="sm"
                    aria-label={labels.roleOf(member.display_name)}
                    options={roles}
                    value={member.role}
                    disabled={busy}
                    onChange={(next) => doors.onSetRole?.(member, next)}
                  />
                ) : (
                  <Chip size="xs" shape="square" tone={member.role === "manager" ? "info" : "neutral"}>
                    {labels.roles[member.role]}
                  </Chip>
                )}
                {removable && (
                  <RowActions
                    size="sm"
                    name={member.display_name}
                    dangerPlacement="inline"
                    actions={[
                      {
                        key: "remove",
                        label: labels.remove(member.display_name),
                        icon: Trash2,
                        tone: "danger",
                        // A removal: a lapsed plan allows it.
                        commit: COMMIT_EXCEPT_BILLING,
                        disabled: busy,
                        confirm: {
                          title: labels.removeTitle(member.display_name, team.name),
                          body: labels.removeBody,
                          confirmLabel: labels.removeShort,
                        },
                        onSelect: () => doors.onRemove?.(member),
                      },
                    ]}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {team.invitations.length > 0 && (
        <>
          <SectionLabel as="h4">{labels.invitedTitle}</SectionLabel>
          <ul className="space-y-2">
            {team.invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-secondary">{invitation.email}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <Chip size="xs" shape="square" tone={invitation.status === "expired" ? "warning" : "neutral"}>
                    {invitationWords.status[invitation.status]}
                  </Chip>
                  {(doors?.onResend || doors?.onWithdraw) && (
                    <RowActions
                      size="sm"
                      name={invitation.email}
                      dangerPlacement="inline"
                      actions={[
                        doors.onResend && {
                          key: "resend",
                          label: invitationWords.resend(invitation.email),
                          icon: RefreshCw,
                          // A new link is an invitation, which a lapsed plan does not send.
                          commit: true,
                          disabled: busy,
                          onSelect: () => doors.onResend?.(invitation),
                        },
                        doors.onWithdraw && {
                          key: "withdraw",
                          label: labels.withdraw(invitation.email),
                          icon: Trash2,
                          tone: "danger",
                          commit: COMMIT_EXCEPT_BILLING,
                          disabled: busy,
                          confirm: {
                            title: labels.withdrawTitle(invitation.email),
                            body: labels.withdrawBody,
                            confirmLabel: labels.withdrawShort,
                          },
                          onSelect: () => doors.onWithdraw?.(invitation),
                        },
                      ]}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {doors?.onAdd && mode !== "member" && (
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <Input
            label={labels.addEmail}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {mode === "admin" ? (
            <ToggleGroup<AccountTeamRole>
              aria-label={labels.roleLabel}
              options={roles}
              value={role}
              onChange={setRole}
            />
          ) : (
            <span />
          )}
          {/* Enter in the field is this button's click, so its lock refuses the submit too. */}
          <Button type="submit" variant="secondary" commit disabled={busy || !email.trim()}>
            <UserPlus className="size-4" aria-hidden /> {labels.add}
          </Button>
          {/* Only used for an address with no account, which is invited in the invitee's
              language: so it is asked for. */}
          {languages.length > 1 && (
            <LanguageSelect
              label={invitationWords.language}
              size="sm"
              codes={languages}
              value={locale}
              onChange={(next) => setLocale(next as KitLanguageCode)}
            />
          )}
        </form>
      )}
    </div>
  );
}

const ALL_LANGUAGES: readonly KitLanguageCode[] = KIT_LANGUAGES.map((language) => language.code);

/* ── The admin's ─────────────────────────────────────────────────────────── */

/** What {@link AccountTeamsSection} takes. */
export interface AccountTeamsSectionProps {
  /** The section's anchor; default `teams`. */
  id?: string;
  /** The line above the list; default the kit's (`accountTeams.adminHint`), `null` for none. */
  hint?: ReactNode;
  /** The invitation's languages, for an address with no account. Default: the kit's seven. */
  languages?: readonly KitLanguageCode[];
  /** The language the add starts with. Default: the page's, resolved to `languages`. */
  defaultLocale?: string;
  /** The app's words for a refusal; asked before the team's and the account's. */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** The app's own coded refusals (its `billing_gate`'s, its `refuse_address`'), as
   *  `useDescribeAccountFailure` takes them. */
  appCode?: DescribeAccountFailureOptions["appCode"];
  labels?: LabelOverride<AccountTeamsLabels>;
  className?: string;
}

/** The level a team's action is asked at, narrowed to what a group can be asked: anything but
 *  a stated `none` asks for the tick — before the list has answered too — because the server
 *  refuses a deletion without it (Kurvenschmiede's `groupLevel`). */
function groupLevel(level: AdminConfirmLevel | undefined): "none" | "acknowledge" {
  return level === "none" ? "none" : "acknowledge";
}

/**
 * Every team on the instance, and every door on each (`/admin/teams`): create, rename,
 * delete, put anybody in, name and un-name managers, take anybody out, and the team's waiting
 * invitations re-sent or withdrawn through the account layer's `/admin/invitations`.
 *
 * The teams are a table, a row opening the team's people under it. **Deleting a team asks at
 * the level the server states** (`group_delete`, `acknowledge`) on `AdminActionConfirm` with
 * the team as its target: the tick is under what the cascade takes — its members, the app's
 * grants to it, the invitations nobody took up — counted from the team in hand, the half of
 * the click nobody sees afterwards. The answer travels in the DELETE's body.
 *
 * Each change reads the teams again, the caller's own `/teams` and the admin's log with them.
 * An add that invited says so (the console's link to copy, a mail that did not go); a role, a
 * removal is on screen already and says nothing.
 */
export function AccountTeamsSection({
  id = "teams",
  hint,
  languages = ALL_LANGUAGES,
  defaultLocale,
  describeError,
  appCode,
  labels: labelsProp,
  className,
}: AccountTeamsSectionProps) {
  const labels = useKitLabels("accountTeams", DEFAULT_ACCOUNT_TEAMS_LABELS, labelsProp);
  const say = useSayTeamFailure(labels.codes, describeError, appCode);
  // The confirmation's own refusals are the dialog's to word; the team's are said here.
  const confirmBeside = useFailureBeside(
    ADMIN_ACTION_CONFIRM_CODES,
    (code, body) => teamRefusal(labels.codes, code, body) ?? appCode?.(code, body),
  );
  const toll = useTeamToll(labels);
  const teams = useAdminTeams();
  const actions = useAdminTeamActions();
  const [name, setName] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<{ team: AccountAdminTeam; name: string; error?: unknown } | null>(null);
  const [deleting, setDeleting] = useState<AccountAdminTeam | null>(null);
  const [handOn, setHandOn] = useState<HandOn | null>(null);
  const failed = (team?: string) => (error: unknown) => toast.error(say(error, team));
  const busy =
    actions.addMember.isPending ||
    actions.setRole.isPending ||
    actions.removeMember.isPending ||
    actions.resendInvitation.isPending ||
    actions.withdrawInvitation.isPending;

  const create = () => {
    const wanted = name.trim();
    if (!wanted) return;
    actions.create.mutate(wanted, {
      onSuccess: (team) => {
        setName("");
        toast.success(labels.created(team.name));
      },
      onError: failed(wanted),
    });
  };

  const doorsFor = (team: AccountAdminTeam): TeamDoors => ({
    busy,
    onAdd: (email, role, locale) =>
      actions.addMember
        .mutateAsync({ team, email, role, locale })
        .then((next) => announceInvited(next.invited, next.name, labels, setHandOn))
        .catch((error: unknown) => {
          failed(team.name)(error);
          throw error;
        }),
    onSetRole: (member, role) =>
      actions.setRole.mutate({ team, userId: member.user_id, role }, { onError: failed(team.name) }),
    onRemove: (member) => actions.removeMember.mutate({ team, userId: member.user_id }, { onError: failed(team.name) }),
    onResend: (invitation) =>
      actions.resendInvitation.mutate(invitation.id, {
        onSuccess: (issued) =>
          announceInvited(
            { email: issued.email, sent: issued.sent, link: issued.link ?? null },
            team.name,
            labels,
            setHandOn,
          ),
        onError: failed(team.name),
      }),
    onWithdraw: (invitation) => actions.withdrawInvitation.mutate(invitation.id, { onError: failed(team.name) }),
  });

  const managersOf = (team: AccountTeam) =>
    team.members
      .filter((member) => member.role === "manager")
      .map((member) => member.display_name)
      .join(", ");
  const columns: DataTableColumn<AccountAdminTeam>[] = [
    {
      key: "name",
      header: labels.name,
      cell: (team) => <span className="font-medium text-primary">{team.name}</span>,
      sortBy: (team) => team.name.toLocaleLowerCase(),
      grow: true,
      mobile: "primary",
    },
    {
      key: "members",
      header: labels.members,
      cell: (team) => team.members.length,
      sortBy: (team) => team.members.length,
      className: "text-end tabular-nums",
      headClassName: "text-end",
      mobile: "secondary",
    },
    {
      key: "managers",
      header: labels.managers,
      cell: (team) => <Caption as="span">{managersOf(team)}</Caption>,
      mobile: "secondary",
      fitPriority: 2,
    },
    {
      key: "invited",
      header: labels.invitedTitle,
      cell: (team) => (team.invitations.length > 0 ? team.invitations.length : null),
      sortBy: (team) => team.invitations.length,
      className: "text-end tabular-nums",
      headClassName: "text-end",
      mobileHidden: true,
      fitPriority: 1,
    },
    rowActionsColumn<AccountAdminTeam>({
      name: (team) => team.name,
      size: "sm",
      actions: (team) => [
        { key: "rename", label: labels.rename, icon: Pencil, onSelect: () => setRenaming({ team, name: team.name }) },
        {
          key: "delete",
          label: labels.delete,
          icon: Trash2,
          tone: "danger",
          // Asked at the server's level in the dialog; the menu's own question would ask twice.
          confirm: false,
          onSelect: () => setDeleting(team),
        },
      ],
    }),
  ];

  const goes = deleting ? toll(deleting) : undefined;
  const rows = teams.data?.teams ?? [];

  return (
    // Alone in the section named after it: the title is for screen readers, the admin
    // area's sidebar already says it.
    <SettingsSection
      anchor={id}
      title={labels.title}
      titleVisible={false}
      className={["space-y-3", className].filter(Boolean).join(" ")}
    >
      {hint === undefined ? <Caption>{labels.adminHint}</Caption> : hint}
      <HandOnBanner handOn={handOn} onDismiss={() => setHandOn(null)} />
      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <Input label={labels.name} value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" variant="accent" disabled={actions.create.isPending || !name.trim()}>
          <Plus className="size-4" aria-hidden /> {labels.create}
        </Button>
      </form>
      {teams.isError ? (
        <AlertBanner>{say(teams.error)}</AlertBanner>
      ) : teams.isPending ? (
        <LoadingState className="py-6" />
      ) : (
        <DataTable
          chrome="minimal"
          paginated={false}
          rows={rows}
          columns={columns}
          rowKey={(team) => team.id}
          rowName={(team) => team.name}
          onRowClick={(team) => setOpen(open === team.id ? null : team.id)}
          isExpanded={(team) => team.id === open}
          expandedRow={(team) => (
            <TeamPeople
              team={team}
              mode="admin"
              doors={doorsFor(team)}
              languages={languages}
              defaultLocale={defaultLocale}
              labels={labels}
            />
          )}
          mobileExpandAsDialog
          empty={labels.noneAdmin}
        />
      )}

      {renaming && (
        <DialogFrame title={labels.renameTitle(renaming.team.name)} onClose={() => setRenaming(null)}>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const next = renaming.name.trim();
              if (!next) return;
              actions.rename.mutate(
                { team: renaming.team, name: next },
                {
                  onSuccess: (team) => {
                    setRenaming(null);
                    toast.success(labels.renamed(team.name));
                  },
                  onError: (error) => setRenaming((now) => now && { ...now, error }),
                },
              );
            }}
          >
            <Input
              label={labels.name}
              value={renaming.name}
              maxLength={120}
              onChange={(event) => {
                const value = event.target.value;
                setRenaming((now) => now && { ...now, name: value });
              }}
            />
            {renaming.error !== undefined && (
              <AlertBanner variant="inline" tone="danger">
                {say(renaming.error, renaming.name.trim() || renaming.team.name)}
              </AlertBanner>
            )}
            <FormActions
              placement="dialog"
              submitLabel={labels.rename}
              onCancel={() => setRenaming(null)}
              pending={actions.rename.isPending}
              submitDisabled={!renaming.name.trim()}
            />
          </form>
        </DialogFrame>
      )}

      {deleting && (
        <AdminActionConfirm
          level={groupLevel(teams.data?.levels?.group_delete)}
          target={{ kind: "group", id: deleting.id, name: deleting.name }}
          title={labels.deleteTitle(deleting.name)}
          confirmLabel={labels.delete}
          tone="danger"
          consequence={[
            ...(goes ? [{ key: "toll", text: labels.deleteGoes(goes), severe: true }] : []),
            labels.deleteBody,
          ]}
          describeError={(error) => describeError?.(error) ?? confirmBeside(error)}
          onConfirm={(values) =>
            actions.delete.mutateAsync({ team: deleting, acknowledged: values.acknowledged ?? false })
          }
          onClose={(done) => {
            const gone = deleting.name;
            setDeleting(null);
            if (done) {
              if (open === deleting.id) setOpen(null);
              toast.success(labels.deleted(gone));
            }
          }}
        />
      )}
    </SettingsSection>
  );
}

/* ── A member's ──────────────────────────────────────────────────────────── */

/** What {@link AccountTeamsPage} takes. */
export interface AccountTeamsPageProps {
  /** Over the header's own words (`accountTeams.title`, `pageHint`). */
  title?: ReactNode;
  description?: ReactNode;
  /** The invitation's languages, for a manager's add of an address with no account. Default:
   *  the kit's seven. */
  languages?: readonly KitLanguageCode[];
  /** The language the add starts with. Default: the page's, resolved to `languages`. */
  defaultLocale?: string;
  /** The app's words for a refusal; asked before the team's and the account's. */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** The app's own coded refusals (its `billing_gate`'s, its `refuse_address`'). */
  appCode?: DescribeAccountFailureOptions["appCode"];
  labels?: LabelOverride<AccountTeamsLabels>;
  className?: string;
}

/**
 * The teams the caller is in (`GET /teams`) — not a team list: nobody but an admin is told
 * which teams exist beyond their own. A member reads who else is in each; a manager adds and
 * removes the members of the teams they manage, invites an address with no account into it in
 * the invitee's language, and re-sends or withdraws the team's waiting invitations.
 *
 * Each change answers with the whole team, which goes straight into the list. A manager adds
 * and invites on their own standing (server-kit's `billing_gate`): an app with a billing lock
 * puts its `WriteLockProvider` round the page, which holds the add and the re-send and leaves
 * the removals live.
 */
export function AccountTeamsPage({
  title,
  description,
  languages = ALL_LANGUAGES,
  defaultLocale,
  describeError,
  appCode,
  labels: labelsProp,
  className,
}: AccountTeamsPageProps) {
  const labels = useKitLabels("accountTeams", DEFAULT_ACCOUNT_TEAMS_LABELS, labelsProp);
  const say = useSayTeamFailure(labels.codes, describeError, appCode);
  const teams = useMyTeams();
  const actions = useTeamActions();
  const [handOn, setHandOn] = useState<HandOn | null>(null);
  const failed = (team: AccountTeam) => (error: unknown) => toast.error(say(error, team.name));
  const busy =
    actions.addMember.isPending ||
    actions.removeMember.isPending ||
    actions.resendInvitation.isPending ||
    actions.withdrawInvitation.isPending;

  const doorsFor = (team: AccountTeam): TeamDoors => ({
    busy,
    onAdd: (email, _role, locale) =>
      actions.addMember
        .mutateAsync({ team, email, locale })
        .then((next) => {
          // An address with no account was INVITED; one with an account was added, and the
          // manager is told so.
          if (!announceInvited(next.invited, next.name, labels, setHandOn)) {
            toast.success(labels.added(email, next.name));
          }
        })
        .catch((error: unknown) => {
          failed(team)(error);
          throw error;
        }),
    onRemove: (member) =>
      actions.removeMember.mutate(
        { team, userId: member.user_id },
        {
          onSuccess: (next) => toast.success(labels.removed(member.display_name, next.name)),
          onError: failed(team),
        },
      ),
    onResend: (invitation) =>
      actions.resendInvitation.mutate(
        { team, invitationId: invitation.id },
        {
          onSuccess: (next) => announceInvited(next.invited, next.name, labels, setHandOn),
          onError: failed(team),
        },
      ),
    onWithdraw: (invitation) =>
      actions.withdrawInvitation.mutate({ team, invitationId: invitation.id }, { onError: failed(team) }),
  });

  const list = teams.data ?? [];
  const body = teams.isError ? (
    <AlertBanner>{say(teams.error)}</AlertBanner>
  ) : teams.isPending ? (
    <LoadingState className="py-10" />
  ) : list.length === 0 ? (
    <Caption>{labels.none}</Caption>
  ) : (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {list.map((team) => {
        const manages = team.my_role === "manager";
        return (
          <Card key={team.id} padding="md" className="space-y-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-primary">{team.name}</h3>
              {team.my_role && <Caption>{manages ? labels.youManage : labels.youAreIn}</Caption>}
            </div>
            <TeamPeople
              team={team}
              mode={manages ? "manager" : "member"}
              doors={manages ? doorsFor(team) : undefined}
              languages={languages}
              defaultLocale={defaultLocale}
              labels={labels}
            />
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className={["space-y-4", className].filter(Boolean).join(" ")}>
      <PageHeader size="sm" title={title ?? labels.title} description={description ?? labels.pageHint} />
      <HandOnBanner handOn={handOn} onDismiss={() => setHandOn(null)} />
      {body}
    </div>
  );
}
