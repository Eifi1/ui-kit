import { useState } from "react";
import { AdminActionConfirm, AdminActionLog, Button, ToggleGroup } from "@eifi1/ui-kit";
import type { AdminActionLogEntry, AdminGroupNoun, AdminGroupTarget } from "@eifi1/ui-kit";
import { Example, Note, beat } from "../lib/section";

/**
 * GROUPS IN THE AUDIT (0.34, docs/user-admin-harmonization.md §11): team
 * operations as log rows, a target that is a group or something else, the group a
 * membership row happened in, each app's noun, and deleting a group at `acknowledge`.
 * Belongs on the "User administration" page, after the roster.
 *
 * The people, the teams and the pretend server are SYNTHETIC; nothing is sent.
 */

const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();

const ADA = { id: 1, first: "Ada", last: "Example", email: "ada@example.com" };
const BEN = { id: 2, first: "Ben", last: "Sample", email: "ben@example.com" };

/** Three apps' nouns, and the default. */
const NOUNS: { value: AdminGroupNoun; label: string }[] = [
  { value: "team", label: "team" },
  { value: "company", label: "company" },
  { value: "budget", label: "budget" },
  { value: "group", label: "group" },
];

interface Team extends AdminGroupTarget {
  id: number;
  name: string;
  members: number;
  grants: number;
  invitations: number;
}

const WORKSHOP: Team = { kind: "group", id: 7, name: "Workshop", members: 3, grants: 2, invitations: 1 };

/** A group as the log draws it: the live name, joined when the log is read. */
const asGroup = (team: Team): AdminGroupTarget => ({ kind: "group", id: team.id, name: team.name });

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function GroupActions034Demo() {
  const [noun, setNoun] = useState<AdminGroupNoun>("team");
  const [team, setTeam] = useState<Team | null>(WORKSHOP);
  const [deleting, setDeleting] = useState(false);
  const [log, setLog] = useState<AdminActionLogEntry[]>([
    { id: 7, at: ago(1), actor: ADA, action: "membership_role", target: BEN, group: asGroup(WORKSHOP), detail: "Member → Manager" },
    { id: 6, at: ago(2), actor: BEN, action: "membership_add", target: BEN, group: asGroup(WORKSHOP), detail: "Member" },
    { id: 5, at: ago(2), actor: ADA, action: "invite", target: { email: "ben@example.com" }, group: asGroup(WORKSHOP) },
    { id: 4, at: ago(3), actor: ADA, action: "group_rename", target: asGroup(WORKSHOP) },
    { id: 3, at: ago(4), actor: ADA, action: "group_create", target: asGroup(WORKSHOP) },
    // A team deleted long ago, its group_delete row lost to retention: no name to join.
    { id: 2, at: ago(30), actor: ADA, action: "membership_remove", target: BEN, group: { kind: "group", id: 3, name: null } },
    { id: 1, at: ago(40), actor: ADA, action: "reseed_demo", target: { kind: "other", label: "The demo dataset" } },
  ]);

  return (
    <Example label="Groups in the audit — AdminActionLog groupNoun, AdminActionConfirm" hint="team operations">
      <div className="flex flex-col gap-3">
        <ToggleGroup label="groupNoun" overflow="wrap" value={noun} onChange={setNoun} options={NOUNS} />
        <div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabledReason={team ? undefined : "Workshop is gone — it stays in the log by its stamped name."}
            onClick={() => setDeleting(true)}
          >
            Delete Workshop…
          </Button>
        </div>
        <AdminActionLog
          entries={log}
          groupNoun={noun}
          labels={{ actions: { reseed_demo: "Demo data reset" } }}
        />
      </div>
      {deleting && team && (
        <AdminActionConfirm
          level="acknowledge"
          target={asGroup(team)}
          title={`Delete ${team.name}?`}
          confirmLabel="Delete"
          tone="danger"
          consequence={`${plural(team.members, "member", "members")}, ${plural(team.grants, "grant", "grants")} and ${plural(team.invitations, "invitation", "invitations")} go with it.`}
          onConfirm={async () => {
            await beat(500);
            setLog((rows) => [
              {
                id: rows.length + 1,
                at: new Date().toISOString(),
                actor: ADA,
                action: "group_delete",
                // The row's own stamp (`target_group_name`): its name, as it was.
                target: asGroup(team),
                detail: `${team.members} members, ${team.grants} grants, ${team.invitations} invitations`,
              },
              ...rows,
            ]);
            setTeam(null);
          }}
          onClose={() => setDeleting(false)}
        />
      )}
      <Note>
        A row about the group itself — created, renamed, deleted — has the group as its `target`; a row about a person in
        it has the person as its target and the group as its `group`, drawn after the person by its name alone, muted,
        with no preposition for a language to inflect. The words say the app&apos;s noun (`groupNoun`): whole phrases per
        noun, since a noun dropped into one phrase breaks the participle&apos;s agreement in French and Italian and the
        suffix in Hungarian. The `company` set&apos;s &ldquo;Removed from the company&rdquo; is the string the log said
        before 0.34. A group with no name left reads as the noun&apos;s &ldquo;a deleted team&rdquo;; only a missing
        person is &ldquo;an erased account&rdquo;, and a `kind: &quot;other&quot;` target is said by its `label`.
        Deleting a group is `acknowledge`: a tick under the app&apos;s own sentence of what goes with it — a group has no
        address to type, so its types allow it only at `none` and `acknowledge`.
      </Note>
    </Example>
  );
}
