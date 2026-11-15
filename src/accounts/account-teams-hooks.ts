import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { accountTeamsApi } from "./account-teams-api";
import type { AccountTeam, AccountTeamMemberDraft, AccountTeamRole, AccountTeamsApi } from "./account-teams-api";
import type { AccountAdminConfirmation } from "./accounts-api";
import { accountQueryKeys, useAccountsClient } from "./accounts-context";

/**
 * The teams' TanStack Query hooks (0.64, server-kit 0.32's opt-in teams), under their own root
 * (`accountQueryKeys.teams`): a member's and a manager's (`useMyTeams`, `useTeamActions`) and
 * the admin's (`useAdminTeams`, `useAdminTeamActions`). An app that mounts no team part calls
 * none of them, and nothing is read.
 */

/** The team the change is about: its id, and the version read, sent back as `If-Match`
 *  where the server checks it. */
type TeamRef = Pick<AccountTeam, "id" | "version">;

/** The teams' routes on the provider's client, one per client. */
function useTeamsApi(): AccountTeamsApi {
  const client = useAccountsClient();
  return useMemo(() => accountTeamsApi(client.http), [client]);
}

/** Whether this tab holds a session: the reads wait for one. */
function useSignedIn(): boolean {
  return useAccountsClient().useSession((state) => state.token !== null);
}

/** `GET /teams`: the teams the caller is in, by name. */
export function useMyTeams(options: { enabled?: boolean } = {}) {
  const api = useTeamsApi();
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: accountQueryKeys.teamsMine,
    queryFn: () => api.mine(),
    enabled: signedIn && options.enabled !== false,
  });
}

/**
 * A manager's doors into a team they manage, each answering the whole team, which goes
 * straight into `useMyTeams`' list (Kurvenschmiede's `settle`). The add and the removal send
 * the version read; a refusal reads the list again, so a team that moved on (`team_changed`)
 * or is gone (`team_not_found`) shows as it is now. The answer is handed back: its `invited`
 * says whether an add or a re-send invited, and whether the mail went.
 */
export function useTeamActions() {
  const api = useTeamsApi();
  const queryClient = useQueryClient();
  const settle = (next: AccountTeam) => {
    queryClient.setQueryData<AccountTeam[]>(accountQueryKeys.teamsMine, (rows) =>
      rows?.map((row) => (row.id === next.id ? next : row)),
    );
    // The admin's list holds the same team, and the log the change.
    void queryClient.invalidateQueries({ queryKey: accountQueryKeys.teamsAdmin });
    void queryClient.invalidateQueries({ queryKey: accountQueryKeys.admin });
  };
  const reread = () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.teamsMine });
  const done = { onSuccess: settle, onError: reread };
  return {
    addMember: useMutation({
      mutationFn: ({ team, ...draft }: { team: TeamRef } & AccountTeamMemberDraft) =>
        api.addMember(team.id, draft, team.version),
      ...done,
    }),
    removeMember: useMutation({
      mutationFn: ({ team, userId }: { team: TeamRef; userId: number }) =>
        api.removeMember(team.id, userId, team.version),
      ...done,
    }),
    resendInvitation: useMutation({
      mutationFn: ({ team, invitationId }: { team: TeamRef; invitationId: number }) =>
        api.resendInvitation(team.id, invitationId),
      ...done,
    }),
    withdrawInvitation: useMutation({
      mutationFn: ({ team, invitationId }: { team: TeamRef; invitationId: number }) =>
        api.withdrawInvitation(team.id, invitationId),
      ...done,
    }),
  };
}

/** `GET /admin/teams`: every team with its grants, and the confirmation levels. */
export function useAdminTeams(options: { enabled?: boolean } = {}) {
  const api = useTeamsApi();
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: accountQueryKeys.teamsAdmin,
    queryFn: () => api.admin.list(),
    enabled: signedIn && options.enabled !== false,
  });
}

/**
 * The admin's doors on any team. Each, done or refused, reads the teams again (the admin
 * may be in the teams they edit, and their own `/teams` follows) and the admin's data (the
 * log, the invitations, the overview's counts: a team's invitation is an admin action too).
 * A team's waiting invitation is the account layer's (`/admin/invitations/{id}`): the
 * admin's teams router has no invitation route.
 */
export function useAdminTeamActions() {
  const api = useTeamsApi();
  const client = useAccountsClient();
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.teams }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.admin }),
    ]);
  const done = { onSettled: refresh };
  return {
    create: useMutation({ mutationFn: (name: string) => api.admin.create(name), ...done }),
    rename: useMutation({
      mutationFn: ({ team, name }: { team: TeamRef; name: string }) => api.admin.rename(team.id, name, team.version),
      ...done,
    }),
    delete: useMutation({
      mutationFn: ({ team, ...confirmation }: { team: TeamRef } & AccountAdminConfirmation) =>
        api.admin.delete(team.id, confirmation),
      ...done,
    }),
    addMember: useMutation({
      mutationFn: ({ team, ...draft }: { team: TeamRef; role: AccountTeamRole } & AccountTeamMemberDraft) =>
        api.admin.addMember(team.id, draft),
      ...done,
    }),
    setRole: useMutation({
      mutationFn: ({ team, userId, role }: { team: TeamRef; userId: number; role: AccountTeamRole }) =>
        api.admin.setRole(team.id, userId, role),
      ...done,
    }),
    removeMember: useMutation({
      mutationFn: ({ team, userId }: { team: TeamRef; userId: number }) => api.admin.removeMember(team.id, userId),
      ...done,
    }),
    resendInvitation: useMutation({
      mutationFn: (invitationId: number) => client.api.resendInvitation(invitationId),
      ...done,
    }),
    withdrawInvitation: useMutation({
      mutationFn: (invitationId: number) => client.api.revokeInvitation(invitationId),
      ...done,
    }),
  };
}
