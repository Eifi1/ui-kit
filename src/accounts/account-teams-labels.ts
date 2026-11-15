// The words of ./account-teams — their type and the English — in a module with no component
// code: the catalogues (src/i18n/kit-labels.tsx, defaults.ts) import them without the parts,
// so neither the main barrel reaches react-query nor `en` loads the teams (0.34, KS U8).

/** A team's coded refusals (server-kit 0.32's `TeamErrorCode`), each in the reader's
 *  language; the three that name something take the name or the address the answer
 *  carries (`name`, `email`). */
export interface AccountTeamRefusalLabels {
  /** 404: no such team, none the caller manages, or no such member or invitation of it. */
  team_not_found: string;
  team_name_taken: (name: string) => string;
  /** The team moved on from the version sent; the part reads it again at once. */
  team_changed: (name: string) => string;
  manager_named_by_admin: string;
  manager_kept_by_admin: (email: string) => string;
  manager_removed_by_admin: string;
}

/** The `accountTeams` namespace (0.64): the teams' parts' own words — Kurvenschmiede's
 *  `teams.*` keys — and the team's refusals. The invitations' status, re-send and language
 *  are the `invitations` namespace's, a deactivated member's chip `accountState`'s. */
export interface AccountTeamsLabels {
  /** The member's page heading; the admin's section's name, for the app's sidebar entry. */
  title: string;
  /** The member's page's line under its heading. */
  pageHint: string;
  /** The admin's section's help line, for the app's sidebar entry. */
  adminHelp: string;
  /** The admin's line above the list. */
  adminHint: string;
  /** The member's page with no team. */
  none: string;
  /** The admin's list with no team. */
  noneAdmin: string;
  youManage: string;
  youAreIn: string;
  /** The name's field, and the list's column. */
  name: string;
  create: string;
  created: (name: string) => string;
  rename: string;
  /** The rename dialog's heading. */
  renameTitle: (name: string) => string;
  renamed: (name: string) => string;
  delete: string;
  deleteTitle: (name: string) => string;
  deleteBody: string;
  /** `list`: what the cascade takes, joined in the reader's language ("2 members and 1
   *  invitation"). */
  deleteGoes: (list: string) => string;
  deleted: (name: string) => string;
  countMembers: (count: number) => string;
  /** The app's grants to the team: what is shared with it. */
  countGrants: (count: number) => string;
  countInvitations: (count: number) => string;
  /** The members' heading and the list's column. */
  members: string;
  /** The list's column of each team's managers. */
  managers: string;
  /** The waiting invitations' heading and the list's column. */
  invitedTitle: string;
  nobody: string;
  roles: Record<"member" | "manager", string>;
  /** The role switch's name on a member's row. */
  roleOf: (name: string) => string;
  /** The role switch's name beside the address. */
  roleLabel: string;
  remove: (name: string) => string;
  removeShort: string;
  removeTitle: (name: string, team: string) => string;
  removeBody: string;
  addEmail: string;
  add: string;
  added: (email: string, team: string) => string;
  removed: (name: string, team: string) => string;
  /** An add whose address had no account: invited into the team instead. */
  invited: (email: string, team: string) => string;
  invitedNotSent: (email: string) => string;
  withdraw: (email: string) => string;
  withdrawShort: string;
  withdrawTitle: (email: string) => string;
  withdrawBody: string;
  codes: AccountTeamRefusalLabels;
}

/** 0.64: the teams' words. Kurvenschmiede's `teams.*` and `error.refusal.*` keys, which its
 *  reviewers read, with the kit's "administrator" where it said "admin". */
export const DEFAULT_ACCOUNT_TEAMS_LABELS: AccountTeamsLabels = {
  title: "Teams",
  pageHint:
    "The teams you are in. Whatever is shared with a team is shared with everybody in it, for as long as they are in it. Managers add and remove members, and invite somebody who has no account yet; administrators create teams and name the managers.",
  adminHelp: "Groups to share with, and who manages them.",
  adminHint:
    "A team is somebody to share with, not somebody who owns: a grant to a team reaches everybody in it and leaves with whoever leaves. You name the managers, who then add and remove members themselves.",
  none: "You are in no team.",
  noneAdmin: "No teams yet.",
  youManage: "You manage this team.",
  youAreIn: "You are a member.",
  name: "Team name",
  create: "Create team",
  created: (name) => `Team ${name} created.`,
  rename: "Rename",
  renameTitle: (name) => `Rename the team ${name}`,
  renamed: (name) => `The team is now called ${name}.`,
  delete: "Delete team",
  deleteTitle: (name) => `Delete the team ${name}?`,
  deleteBody:
    "Everything that was shared with the team stops being shared with its members, at once. Their own work is untouched.",
  deleteGoes: (list) => `What goes with it: ${list}.`,
  deleted: (name) => `The team ${name} is deleted.`,
  countMembers: (count) => (count === 1 ? "1 member" : `${count} members`),
  countGrants: (count) => (count === 1 ? "1 share" : `${count} shares`),
  countInvitations: (count) => (count === 1 ? "1 invitation" : `${count} invitations`),
  members: "Members",
  managers: "Managers",
  invitedTitle: "Invited",
  nobody: "Nobody in it yet.",
  roles: { member: "Member", manager: "Manager" },
  roleOf: (name) => `Role of ${name} in the team`,
  roleLabel: "As",
  remove: (name) => `Remove ${name}`,
  removeShort: "Remove",
  removeTitle: (name, team) => `Remove ${name} from ${team}?`,
  removeBody:
    "Whatever was shared with the team stops being shared with them on their next request. Their own work is untouched.",
  addEmail: "Add by email address",
  add: "Add",
  added: (email, team) => `${email} is in ${team} now.`,
  removed: (name, team) => `${name} is no longer in ${team}.`,
  invited: (email, team) => `${email} has no account yet — an invitation into ${team} is on its way.`,
  invitedNotSent: (email) => `${email} has no account yet, and the invitation could not be sent — resend it.`,
  withdraw: (email) => `Withdraw the invitation of ${email}`,
  withdrawShort: "Withdraw",
  withdrawTitle: (email) => `Withdraw the invitation of ${email}?`,
  withdrawBody: "The link stops working. An account already made through it stays.",
  codes: {
    team_not_found: "This team no longer exists, or you no longer manage it.",
    team_name_taken: (name) => `There is already a team called ${name}.`,
    team_changed: (name) =>
      `The team ${name} was changed after you opened it. It shows the change now; please try again.`,
    manager_named_by_admin: "Only an administrator names a team’s managers.",
    manager_kept_by_admin: (email) => `${email} manages this team; only an administrator changes that.`,
    manager_removed_by_admin: "Only an administrator removes a team’s manager.",
  },
};
