import type { AdminConfirmLevel } from "../admin/admin-action-confirm";
import type { AccountAdminConfirmation } from "./accounts-api";
import type { AccountsHttp, AccountsRequest } from "./accounts-client";

/**
 * The routes of server-kit 0.32's opt-in teams (`eifi1_server_kit.teams.router`:
 * `teams_router` and `teams_admin_router`), typed once on the account client's `http` — its
 * bearer and refresh in place. Kurvenschmiede's `teamsApi` and `adminApi.*Team*`, whose wire
 * server-kit lifted field for field. Its own module, not `client.api`, as the feedback's: the
 * teams load where they are drawn, not with every sign-in, and an app without teams never
 * loads them.
 *
 * Every answer to a change is the whole team again: who is in it is what the page draws next.
 */

/** A team's coded refusals (server-kit 0.32's `TeamErrorCode`, Kurvenschmiede's spellings):
 * `team_not_found` is a 404, the rest 409s. `team_name_taken` and `team_changed` carry the
 * team's `name`, `manager_kept_by_admin` the manager's `email`. */
export const ACCOUNT_TEAM_ERROR_CODES = [
  "team_not_found",
  "team_name_taken",
  "team_changed",
  "manager_named_by_admin",
  "manager_kept_by_admin",
  "manager_removed_by_admin",
] as const;
export type AccountTeamErrorCode = (typeof ACCOUNT_TEAM_ERROR_CODES)[number];

/** What a membership lets its holder do beyond being in the team (server-kit's `TeamRole`):
 *  a `manager` adds and removes the team's members; who manages is an admin's decision. */
export type AccountTeamRole = "member" | "manager";

/** One person in a team (`TeamMemberOut`): the name's parts, for a page that writes them in
 *  its reader's order, and `display_name` already in the viewer's. */
export interface AccountTeamMember {
  user_id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  role: AccountTeamRole;
  is_active: boolean;
}

/** Somebody invited into the team who has not come in yet (`TeamInvitationOut`) — listed for
 *  an admin and the team's managers only. */
export interface AccountTeamInvitation {
  id: number;
  email: string;
  role: AccountTeamRole;
  /** An accepted one is a member instead, a withdrawn one is gone. */
  status: "open" | "expired";
  expires_at: string | null;
}

/** The note on an add that INVITED an address with no account rather than adding one
 *  (`TeamInvited`): whether the mail went, and the link while mail is the console's. */
export interface AccountTeamInvited {
  email: string;
  sent: boolean;
  /** Only while the server's mail is the console backend, shown this once. */
  link: string | null;
}

/** One team as its viewer may see it (`TeamOut`). */
export interface AccountTeam {
  id: number;
  name: string;
  /** Moves with a rename and every change of who is in it; sent back as `If-Match`. */
  version: number;
  created_at: string;
  /** The caller's own role in it; `null` for an admin looking from the admin's list. */
  my_role: AccountTeamRole | null;
  members: AccountTeamMember[];
  /** Waiting invitations — empty for anybody who may not invite into it. */
  invitations: AccountTeamInvitation[];
  /** Only on the answer to an add (or a re-send) that invited. */
  invited?: AccountTeamInvited | null;
}

/** A team on the admin's list (`AdminTeamOut`): with the grants deleting it takes back, the
 *  app's count (`TeamHooks.deleting`; `0` without one). */
export interface AccountAdminTeam extends AccountTeam {
  grant_count: number;
}

/** `GET /admin/teams` (`AdminTeamsResponse`): every team, and the confirmation each action
 *  asks for — `group_delete` is `acknowledge` on server-kit's table. */
export interface AccountAdminTeams {
  teams: AccountAdminTeam[];
  levels: Record<string, AdminConfirmLevel>;
}

/** Who to put in a team (`TeamMemberIn`): an exact address — invited into the team if it has
 *  no account, in `locale` (the invitee's; left out, the inviter's). */
export interface AccountTeamMemberDraft {
  email: string;
  locale?: string;
}

/** The teams' routes, as {@link accountTeamsApi} answers them. */
export interface AccountTeamsApi {
  /** `GET /teams`: the teams the caller is in, by name — never a list of every team. */
  mine(): Promise<AccountTeam[]>;
  /** `POST /teams/{id}/members`: a manager puts somebody in, as a member (a manager adds no
   *  manager); `version` is sent as `If-Match` when given. */
  addMember(teamId: number, draft: AccountTeamMemberDraft, version?: number): Promise<AccountTeam>;
  /** `DELETE /teams/{id}/members/{user_id}`: a manager takes a member out. */
  removeMember(teamId: number, userId: number, version?: number): Promise<AccountTeam>;
  /** `POST /teams/{id}/invitations/{inv}/resend`: a new link; the answer's `invited` says
   *  whether it went. */
  resendInvitation(teamId: number, invitationId: number): Promise<AccountTeam>;
  /** `DELETE /teams/{id}/invitations/{inv}`. */
  withdrawInvitation(teamId: number, invitationId: number): Promise<AccountTeam>;
  /** The admin's `/admin/teams`. Its invitations are the account layer's own
   *  (`client.api.resendInvitation`, `revokeInvitation`): the admin's router has none. */
  admin: {
    /** `GET /admin/teams`: every team, its members and grants, and the levels. */
    list(): Promise<AccountAdminTeams>;
    /** `POST /admin/teams` (`201`). */
    create(name: string): Promise<AccountTeam>;
    /** `PATCH /admin/teams/{id}`, against `version` when given. */
    rename(teamId: number, name: string, version?: number): Promise<AccountTeam>;
    /** `DELETE /admin/teams/{id}` (`204`), the acknowledgement in the body. */
    delete(teamId: number, confirmation: AccountAdminConfirmation): Promise<void>;
    /** `POST /admin/teams/{id}/members`: anybody, in either role. */
    addMember(teamId: number, draft: AccountTeamMemberDraft & { role: AccountTeamRole }): Promise<AccountTeam>;
    /** `PATCH /admin/teams/{id}/members/{user_id}`: names or un-names a manager. */
    setRole(teamId: number, userId: number, role: AccountTeamRole): Promise<AccountTeam>;
    /** `DELETE /admin/teams/{id}/members/{user_id}`: anybody, a manager too. */
    removeMember(teamId: number, userId: number): Promise<AccountTeam>;
  };
}

/** The teams' routes on the account client's instance: `accountTeamsApi(client.http)`. The
 *  paths are the routers' defaults, `/teams` and `/admin/teams`, under the instance's base. */
export function accountTeamsApi(http: AccountsHttp): AccountTeamsApi {
  const call = async <R>(
    method: AccountsRequest["method"],
    url: string,
    data?: unknown,
    version?: number,
  ): Promise<R> =>
    (
      await http.request({
        method,
        url,
        data,
        // Checked when sent, never demanded (server-kit's `if_match_version`).
        ...(version === undefined ? {} : { headers: { "If-Match": String(version) } }),
      })
    ).data as R;
  const id = (value: number) => encodeURIComponent(String(value));
  const member = ({ email, locale }: AccountTeamMemberDraft) => (locale ? { email, locale } : { email });
  return {
    mine: () => call("get", "/teams"),
    addMember: (team, draft, version) =>
      call("post", `/teams/${id(team)}/members`, { ...member(draft), role: "member" }, version),
    removeMember: (team, user, version) => call("delete", `/teams/${id(team)}/members/${id(user)}`, undefined, version),
    resendInvitation: (team, invitation) => call("post", `/teams/${id(team)}/invitations/${id(invitation)}/resend`),
    withdrawInvitation: (team, invitation) => call("delete", `/teams/${id(team)}/invitations/${id(invitation)}`),
    admin: {
      list: () => call("get", "/admin/teams"),
      create: (name) => call("post", "/admin/teams", { name }),
      rename: (team, name, version) => call("patch", `/admin/teams/${id(team)}`, { name }, version),
      delete: async (team, confirmation) => {
        await call("delete", `/admin/teams/${id(team)}`, confirmation);
      },
      addMember: (team, draft) =>
        call("post", `/admin/teams/${id(team)}/members`, { ...member(draft), role: draft.role }),
      setRole: (team, user, role) => call("patch", `/admin/teams/${id(team)}/members/${id(user)}`, { role }),
      removeMember: (team, user) => call("delete", `/admin/teams/${id(team)}/members/${id(user)}`),
    },
  };
}
