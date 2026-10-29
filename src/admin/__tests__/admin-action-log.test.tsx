import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, onTestFinished } from "vitest";

import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { ADMIN_ACTION_KINDS, AdminActionLog } from "../admin-action-log";
import type { AdminActionLogEntry, AdminGroupNoun } from "../admin-action-log";
import type { AdminPerson } from "../admin-parts";

/**
 * §4.3: the `admin_actions` rows, newest first — an admin, the user themselves, or the
 * scheduled job as the actor; an erased target scrubbed; the app's own actions by name.
 */

const ADMIN = { id: 1, first: "Ada", last: "Example", email: "ada@example.com" };
const BEN = { id: 2, first: "Ben", last: "Sample", email: "ben@example.com" };

const ENTRIES: AdminActionLogEntry[] = [
  { id: 5, at: "2026-10-06T10:00:00Z", actor: ADMIN, action: "deactivate", target: BEN },
  { id: 4, at: "2026-10-05T10:00:00Z", actor: BEN, action: "deletion_request", target: BEN },
  { id: 3, at: "2026-10-04T10:00:00Z", actor: null, action: "erase", target: null },
  { id: 2, at: "2026-10-03T10:00:00Z", actor: ADMIN, action: "role", target: BEN, detail: "Member → Admin" },
  { id: 1, at: "2026-10-02T10:00:00Z", actor: ADMIN, action: "plan", target: { email: "cy@example.com" } },
];

const rows = () => within(screen.getByRole("list", { name: "Admin actions" })).getAllByRole("listitem");

describe("AdminActionLog", () => {
  it("says who did what to whom, with the detail", () => {
    // The relative words ("… ago") need the entries to be recent: pin the clock a day after
    // the newest fixture, or the test turns red a week after the fixtures were written.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
    onTestFinished(() => {
      vi.useRealTimers();
    });
    render(<AdminActionLog entries={ENTRIES} labels={{ actions: { plan: "Plan changed" } }} />);
    const [deactivated, requested, erased, role, plan] = rows();
    expect(deactivated).toHaveTextContent("Deactivated");
    expect(deactivated).toHaveTextContent("Ben Sample");
    expect(deactivated).toHaveTextContent("ben@example.com");
    expect(deactivated).toHaveTextContent("by Ada Example");
    // 0.32: DateMark shows the exact date beside the relative words, both inside one
    // <time>, so the words are a span within it.
    expect(
      within(deactivated)
        .getByText(/ago|yesterday|today/i)
        .closest("time"),
    ).not.toBeNull();

    expect(requested).toHaveTextContent("Deletion requested");
    expect(requested).toHaveTextContent("by the user themselves");

    expect(erased).toHaveTextContent("Account erased");
    expect(erased).toHaveTextContent("an erased account");
    expect(erased).toHaveTextContent("automatically");

    expect(role).toHaveTextContent("Role changed");
    expect(role).toHaveTextContent("Member → Admin");

    // The app's own action, and an invitee known only by address.
    expect(plan).toHaveTextContent("Plan changed");
    expect(plan).toHaveTextContent("cy@example.com");
    expect(plan).toHaveAttribute("data-action", "plan");
  });

  it("shows an unknown action as its key, and the empty state", () => {
    const { rerender } = render(<AdminActionLog entries={[{ id: 1, at: null, actor: ADMIN, action: "mystery" }]} />);
    expect(rows()[0]).toHaveTextContent("mystery");
    rerender(<AdminActionLog entries={[]} />);
    expect(screen.getByText("No admin actions yet.")).toBeInTheDocument();
  });

  it("filters to a target and back", async () => {
    const user = userEvent.setup();
    const onTargetFilter = vi.fn();
    const { rerender } = render(<AdminActionLog entries={ENTRIES.slice(0, 1)} onTargetFilter={onTargetFilter} />);
    await user.click(screen.getByRole("button", { name: "Show only the actions on Ben Sample" }));
    expect(onTargetFilter).toHaveBeenCalledWith(BEN);

    rerender(<AdminActionLog entries={ENTRIES.slice(0, 1)} target={BEN} onTargetFilter={onTargetFilter} />);
    expect(screen.getByText("Only Ben Sample")).toBeInTheDocument();
    // The filtered account is not a filter button in its own list.
    expect(screen.queryByRole("button", { name: "Show only the actions on Ben Sample" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show all actions" }));
    expect(onTargetFilter).toHaveBeenLastCalledWith(null);
  });

  it("pages through the server's pages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<AdminActionLog entries={ENTRIES} paging={{ page: 0, pageSize: 5, total: 12, onPageChange }} />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("speaks the provider's words", () => {
    render(
      <UiKitProvider labels={{ adminActionLog: { actions: { deactivate: "Deaktiviert" }, by: (a) => `von ${a}` } }}>
        <AdminActionLog entries={ENTRIES.slice(0, 1)} />
      </UiKitProvider>,
    );
    expect(rows()[0]).toHaveTextContent("Deaktiviert");
    expect(rows()[0]).toHaveTextContent("von Ada Example");
  });
});

/**
 * Round 0.34 (§11): groups in the audit — a target that is a group or something else,
 * the group a membership row happened in, and the five words in each app's noun.
 */
describe("AdminActionLog — groups (§11)", () => {
  const WORKSHOP = { kind: "group", id: 7, name: "Workshop" } as const;

  it("draws each kind of target: a person, a group, something else, null, and none", () => {
    render(
      <AdminActionLog
        groupNoun="team"
        labels={{ actions: { reseed_demo: "Demo data reset" } }}
        entries={[
          { id: 6, at: null, actor: ADMIN, action: "deactivate", target: BEN },
          { id: 5, at: null, actor: ADMIN, action: "group_create", target: WORKSHOP },
          {
            id: 4,
            at: null,
            actor: ADMIN,
            action: "reseed_demo",
            target: { kind: "other", label: "The demo dataset" },
          },
          { id: 3, at: null, actor: null, action: "erase", target: null },
          { id: 2, at: null, actor: ADMIN, action: "mystery" },
        ]}
      />,
    );
    const [person, group, other, erased, none] = rows();
    expect(person).toHaveTextContent("Ben Sample");
    expect(group).toHaveTextContent("Team created");
    expect(within(group).getByText("Workshop")).toHaveAttribute("data-private");
    expect(group).not.toHaveTextContent("an erased account");
    expect(other).toHaveTextContent("Demo data reset");
    expect(other).toHaveTextContent("The demo dataset");
    expect(other).not.toHaveTextContent("an erased account");
    expect(erased).toHaveTextContent("an erased account");
    // Left out: nothing at all — until 0.34 it read as erased.
    expect(none).not.toHaveTextContent("an erased account");
    expect(none).toHaveTextContent("mystery");
  });

  it("names a deleted group by its stamp, and says “a deleted team” only where there is none", () => {
    render(
      <AdminActionLog
        groupNoun="team"
        entries={[
          // The group_delete row's own stamp (`target_group_name`, decision 6).
          {
            id: 3,
            at: null,
            actor: ADMIN,
            action: "group_delete",
            target: { kind: "group", id: 9, name: "Paint shop" },
          },
          { id: 2, at: null, actor: ADMIN, action: "group_rename", target: { kind: "group", id: 8, name: null } },
          {
            id: 1,
            at: null,
            actor: ADMIN,
            action: "membership_add",
            target: BEN,
            group: { kind: "group", id: 8, name: " " },
          },
        ]}
      />,
    );
    const [stamped, gone, member] = rows();
    expect(stamped).toHaveTextContent("Team deleted");
    expect(stamped).toHaveTextContent("Paint shop");
    expect(stamped).not.toHaveTextContent("a deleted team");
    expect(gone).toHaveTextContent("Team renamed");
    expect(within(gone).getByText("a deleted team")).toHaveClass("italic");
    expect(member).toHaveTextContent("Ben Sample");
    expect(member.querySelector("[data-group]")).toHaveTextContent("a deleted team");
  });

  it("draws a membership row's person, then its group by name alone, muted", () => {
    render(
      <AdminActionLog
        groupNoun="team"
        entries={[
          {
            id: 2,
            at: null,
            actor: ADMIN,
            action: "membership_role",
            target: BEN,
            group: WORKSHOP,
            detail: "Member → Manager",
          },
          { id: 1, at: null, actor: ADMIN, action: "invite", target: { email: "cy@example.com" }, group: WORKSHOP },
        ]}
      />,
    );
    const [role, invite] = rows();
    expect(role).toHaveTextContent("Role in the team changed");
    expect(role).toHaveTextContent("Ben Sample");
    const group = role.querySelector("[data-group]")!;
    // The name alone: no "in", "dans", "im" before it for a language to inflect.
    expect(group.textContent).toBe("Workshop");
    expect(group).toHaveClass("text-muted");
    expect(role).toHaveTextContent("Member → Manager");
    // An invitation names the group beside the address.
    expect(invite).toHaveTextContent("cy@example.com");
    expect(invite.querySelector("[data-group]")).toHaveTextContent("Workshop");
  });

  it("never reads a group as the actor's own account, and never makes it a filter", () => {
    render(
      <AdminActionLog
        onTargetFilter={() => {}}
        entries={[
          // The group's id is the actor's: still not "by the user themselves".
          { id: 2, at: null, actor: { ...ADMIN, id: 7 }, action: "group_create", target: WORKSHOP },
          { id: 1, at: null, actor: ADMIN, action: "membership_add", target: BEN, group: WORKSHOP },
        ]}
      />,
    );
    const [created, added] = rows();
    expect(created).toHaveTextContent("by Ada Example");
    expect(created).not.toHaveTextContent("by the user themselves");
    expect(within(created).queryByRole("button")).not.toBeInTheDocument();
    // The person is a filter; the group beside them is not.
    expect(within(added).getAllByRole("button")).toHaveLength(1);
    expect(within(added).getByRole("button", { name: "Show only the actions on Ben Sample" })).toBeInTheDocument();
  });

  it("picks each noun's set, `group` by default, and an app's own words still win", () => {
    const entries: AdminActionLogEntry[] = [
      { id: 2, at: null, actor: ADMIN, action: "group_create", target: WORKSHOP },
      { id: 1, at: null, actor: ADMIN, action: "membership_remove", target: BEN, group: WORKSHOP },
    ];
    const { rerender } = render(<AdminActionLog entries={entries} />);
    expect(rows()[0]).toHaveTextContent("Group created");
    expect(rows()[1]).toHaveTextContent("Removed from the group");
    for (const [noun, created, removed] of [
      ["team", "Team created", "Removed from the team"],
      ["company", "Company created", "Removed from the company"],
      ["budget", "Budget created", "Removed from the budget"],
    ] as const) {
      rerender(<AdminActionLog entries={entries} groupNoun={noun} />);
      expect(rows()[0]).toHaveTextContent(created);
      expect(rows()[1]).toHaveTextContent(removed);
    }
    // A noun the type doesn't know (plain JS) says the neutral word.
    rerender(<AdminActionLog entries={entries} groupNoun={"crew" as AdminGroupNoun} />);
    expect(rows()[0]).toHaveTextContent("Group created");
    // `labels.actions` outranks the noun's set, from the provider and from the prop.
    rerender(
      <UiKitProvider labels={{ adminActionLog: { actions: { group_create: "Crew founded" } } }}>
        <AdminActionLog
          entries={entries}
          groupNoun="team"
          labels={{ actions: { membership_remove: "Left the crew" } }}
        />
      </UiKitProvider>,
    );
    expect(rows()[0]).toHaveTextContent("Crew founded");
    expect(rows()[1]).toHaveTextContent("Left the crew");
    // A deep override of one phrase keeps the set's others.
    rerender(
      <AdminActionLog
        entries={entries}
        groupNoun="team"
        labels={{ groupActions: { team: { group_create: "Crew founded" } } }}
      />,
    );
    expect(rows()[0]).toHaveTextContent("Crew founded");
    expect(rows()[1]).toHaveTextContent("Removed from the team");
  });
});

describe("AdminActionLogEntry — the wider target (§11.6)", () => {
  it("still takes the three apps' mappings, and narrows on `kind`", () => {
    // Type tests — checked by `tsc --noEmit`: each app's code as it is today.
    // keksdose `admin-actions-panel.tsx`: a person or the invitee's address, then the
    // filtered person found by `target.id` over the union (AdminOtherTarget's `id`).
    const row = {
      id: 1,
      at: "2026-10-12T09:00:00Z",
      action: "deactivate",
      actor: null,
      target: null,
      target_email: "a@example.com",
    };
    const kk: AdminActionLogEntry[] = [
      {
        id: row.id,
        at: row.at,
        action: row.action,
        actor: row.actor ?? null,
        target: row.target ?? (row.target_email ? { email: row.target_email } : null),
      },
    ];
    const wanted = 2 as number | undefined;
    const filtered: AdminPerson | null =
      wanted === undefined
        ? null
        : (kk.find((e) => e.target && typeof e.target === "object" && e.target.id === wanted)?.target ?? {
            id: wanted,
            name: `#${wanted}`,
          });
    // kastlan `admin-actions-card.tsx`: an id and an address, or null.
    const ka: AdminActionLogEntry = {
      id: 1,
      at: null,
      actor: null,
      action: "plan",
      target: { id: undefined, email: undefined },
    };
    // Code that reads a person's address narrows first.
    const address = (target: AdminActionLogEntry["target"]) =>
      target && !("kind" in target) ? target.email : undefined;
    const groupName = (target: AdminActionLogEntry["target"]) =>
      target && "kind" in target && target.kind === "group" ? target.name : undefined;
    expect([filtered, ka.target, address(BEN), groupName({ kind: "group", name: "Workshop" })]).toEqual([
      { id: 2, name: "#2" },
      { id: undefined, email: undefined },
      "ben@example.com",
      "Workshop",
    ]);
  });
});

/** The catalogues, English (the defaults) first, as the provider is handed them. */
const CATALOGUES = {
  en: DEFAULT_UI_KIT_LABELS,
  "de-CH": UI_KIT_LABELS_DE_CH,
  es: UI_KIT_LABELS_ES,
  fr: UI_KIT_LABELS_FR,
  hu: UI_KIT_LABELS_HU,
  it: UI_KIT_LABELS_IT,
  zh: UI_KIT_LABELS_ZH,
} as const;
const NOUNS: AdminGroupNoun[] = ["group", "team", "company", "budget"];
/** The five words of 0.34, `membership_remove`, and 0.45's group (de)activation, which the
 *  nouns' sets now carry. */
const GROUP_KINDS = [
  "group_create",
  "group_rename",
  "group_delete",
  "membership_add",
  "membership_role",
  "membership_remove",
  "group_deactivate",
  "group_reactivate",
] as const;

describe("AdminActionLog — the group words in every language (§11.5)", () => {
  it("lists the five words in ADMIN_ACTION_KINDS", () => {
    expect(ADMIN_ACTION_KINDS.slice(-7, -2)).toEqual([
      "group_create",
      "group_rename",
      "group_delete",
      "membership_add",
      "membership_role",
    ]);
    expect(new Set(ADMIN_ACTION_KINDS).size).toBe(ADMIN_ACTION_KINDS.length);
  });

  it("ends with server-kit 0.15's group_deactivate and group_reactivate (admin §9.1.3)", () => {
    // server-kit's `AdminAction` order: the two come after `membership_role`.
    expect(ADMIN_ACTION_KINDS.slice(-2)).toEqual(["group_deactivate", "group_reactivate"]);
    expect(ADMIN_ACTION_KINDS).toHaveLength(24);
  });

  it("words a company's deactivation as the company's, not a person's", () => {
    render(
      <AdminActionLog
        groupNoun="company"
        entries={[
          {
            id: 2,
            at: null,
            actor: ADMIN,
            action: "group_reactivate",
            target: { kind: "group", id: 3, name: "Muster AG" },
          },
          {
            id: 1,
            at: null,
            actor: ADMIN,
            action: "group_deactivate",
            target: { kind: "group", id: 3, name: "Muster AG" },
          },
        ]}
      />,
    );
    const [reactivated, deactivated] = rows();
    expect(reactivated).toHaveTextContent("Company reactivated");
    expect(deactivated).toHaveTextContent("Company deactivated");
    expect(deactivated).toHaveTextContent("Muster AG");
    expect(deactivated).not.toHaveTextContent(/^Deactivated/);
  });

  it("a company rename with {from, to} reads “Company renamed from A to B”; with one name, as before", () => {
    render(
      <AdminActionLog
        groupNoun="company"
        entries={[
          {
            id: 2,
            at: null,
            actor: ADMIN,
            action: "group_rename",
            target: { kind: "group", id: 3, name: "Muster Treuhand AG" },
            renamed: { from: "Muster AG", to: "Muster Treuhand AG" },
          },
          {
            id: 1,
            at: null,
            actor: ADMIN,
            action: "group_rename",
            target: { kind: "group", id: 4, name: "Beispiel GmbH" },
            renamed: { from: "", to: "Beispiel GmbH" },
          },
        ]}
      />,
    );
    const [both, one] = rows();
    expect(within(both).getByText("Company renamed")).toBeInTheDocument();
    expect(within(both).getByText("from Muster AG to Muster Treuhand AG")).toHaveAttribute("data-private");
    expect(one).toHaveTextContent("Company renamed");
    expect(one).toHaveTextContent("Beispiel GmbH");
    expect(one.querySelector("[data-renamed]")).toBeNull();
  });

  it("a team rename logs {} and reads “Team renamed” with the team", () => {
    render(
      <AdminActionLog
        groupNoun="team"
        entries={[
          {
            id: 1,
            at: null,
            actor: ADMIN,
            action: "group_rename",
            target: { kind: "group", id: 8, name: "Paint shop" },
          },
        ]}
      />,
    );
    expect(rows()[0]).toHaveTextContent("Team renamed");
    expect(rows()[0]).toHaveTextContent("Paint shop");
    expect(rows()[0]).not.toHaveTextContent(/from/);
  });

  it.each(Object.entries(CATALOGUES))("%s: the rename phrase names both, in its own words", (code, catalogue) => {
    const phrase = catalogue.adminActionLog.renamedFromTo("A1", "B2");
    expect(phrase).toContain("A1");
    expect(phrase).toContain("B2");
    if (code !== "en") expect(phrase).not.toBe(DEFAULT_UI_KIT_LABELS.adminActionLog.renamedFromTo("A1", "B2"));
  });

  it.each(Object.entries(CATALOGUES))(
    "%s: every group word renders in every noun's set, none falling back",
    (_code, catalogue) => {
      const english = DEFAULT_UI_KIT_LABELS.adminActionLog.groupActions;
      const entries: AdminActionLogEntry[] = [
        ...GROUP_KINDS.map((action, index) => ({
          id: index,
          at: null,
          actor: ADMIN,
          action,
          target: { kind: "group", id: 1, name: "X" } as const,
        })),
        { id: 99, at: null, actor: ADMIN, action: "group_delete", target: { kind: "group", id: 2 } },
      ];
      const seen = new Map<string, Set<string>>();
      for (const noun of NOUNS) {
        const words = catalogue.adminActionLog.groupActions[noun];
        const { unmount } = render(
          <UiKitProvider labels={catalogue}>
            <AdminActionLog entries={entries} groupNoun={noun} />
          </UiKitProvider>,
        );
        const list = within(screen.getByRole("list")).getAllByRole("listitem");
        GROUP_KINDS.forEach((kind, index) => {
          const phrase = words[kind];
          expect(phrase.trim(), `${noun}.${kind}`).not.toBe("");
          expect(phrase).not.toBe(kind);
          // Its own words, not the English set's under another language's name.
          if (catalogue !== DEFAULT_UI_KIT_LABELS) expect(phrase, `${noun}.${kind}`).not.toBe(english[noun][kind]);
          expect(within(list[index]).getByText(phrase)).toBeInTheDocument();
          seen.set(kind, (seen.get(kind) ?? new Set()).add(phrase));
        });
        expect(within(list[GROUP_KINDS.length]).getByText(words.deleted)).toBeInTheDocument();
        if (catalogue !== DEFAULT_UI_KIT_LABELS) expect(words.deleted).not.toBe(english[noun].deleted);
        seen.set("deleted", (seen.get("deleted") ?? new Set()).add(words.deleted));
        unmount();
      }
      // Four nouns, four phrases for each word: the noun is in the phrase.
      for (const [kind, phrases] of seen) expect(phrases.size, kind).toBe(NOUNS.length);
      // No catalogue keeps a group kind in `actions`, where it would outrank the noun's set.
      for (const kind of GROUP_KINDS) expect(catalogue.adminActionLog.actions[kind], kind).toBeUndefined();
    },
  );

  it("keeps kastlan's “Removed from the company” exactly, in all seven languages", () => {
    const TODAY = {
      en: "Removed from the company",
      "de-CH": "Aus dem Unternehmen entfernt",
      es: "Quitada de la empresa",
      fr: "Retiré de l’entreprise",
      hu: "Eltávolítva a cégből",
      it: "Rimosso dall’azienda",
      zh: "已从公司移除",
    } as const;
    for (const [code, catalogue] of Object.entries(CATALOGUES)) {
      const { unmount } = render(
        <UiKitProvider labels={catalogue}>
          <AdminActionLog
            groupNoun="company"
            entries={[{ id: 1, at: null, actor: ADMIN, action: "membership_remove", target: BEN }]}
          />
        </UiKitProvider>,
      );
      expect(catalogue.adminActionLog.groupActions.company.membership_remove, code).toBe(
        TODAY[code as keyof typeof TODAY],
      );
      // The list's name is the catalogue's, so the row is found by its role alone.
      expect(screen.getByRole("listitem")).toHaveTextContent(TODAY[code as keyof typeof TODAY]);
      unmount();
    }
  });
});
