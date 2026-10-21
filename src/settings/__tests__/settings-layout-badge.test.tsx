import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LayoutDashboard, Mail, Users } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsLayout } from "../settings-layout";
import { SettingsSection } from "../settings-section";
import type { SettingsEntry, SettingsGroup } from "../settings-catalogue";
import { AdminWaitingBadge } from "../../shell/admin-menu";
import { adminSections } from "../../admin/admin-sections";
import { PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";

/**
 * 0.48 (keksdose live #450: "What are the 14 in the admin section? […] I cannot see any
 * more chips or notifications on the sub menu"): `SettingsGroup.badge`, drawn on the
 * group's row — the phone's drill-down list and the desktop's sidebar — so the account
 * menu's waiting count leads somewhere. `AdminWaitingBadge` is the pill it was asked for.
 */

type G = "users" | "invitations";
const GROUPS: SettingsGroup<G>[] = [
  { id: "users", icon: <Users />, title: "Users", help: "Who has an account.", badge: <AdminWaitingBadge count={3} /> },
  { id: "invitations", icon: <Mail />, title: "Invitations", help: "The links." },
];
const ENTRIES: SettingsEntry<G>[] = [
  { id: "roster", group: "users", anchor: "roster", title: "Users" },
  { id: "invite", group: "invitations", anchor: "invite", title: "Invitations" },
];

function mount(path: string, groups: SettingsGroup<G>[] = GROUPS) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsLayout<G>
        title="Administration"
        groups={groups}
        entries={ENTRIES}
        basePath="/admin"
        renderGroup={(g) => <SettingsSection anchor={g === "users" ? "roster" : "invite"} title={g} />}
      />
    </MemoryRouter>,
  );
}

afterEach(() => Reflect.deleteProperty(window, "matchMedia"));

describe("SettingsGroup.badge", () => {
  it("is drawn on the group's sidebar row on a desktop, and only on its own", () => {
    mount("/admin/invitations");
    const users = screen.getByRole("tab", { name: /Users/ });
    expect(within(users).getByText("3")).toBeInTheDocument();
    // Read with the row: the pill says what the number is.
    expect(users).toHaveAccessibleName(/3 waiting/);
    expect(within(screen.getByRole("tab", { name: /Invitations/ })).queryByText("3")).toBeNull();
  });

  it("is drawn on the group's row in the phone's drill-down list, before the chevron", () => {
    stubViewportWidth(PHONE_WIDTH);
    mount("/admin");
    const row = screen.getByRole("link", { name: /Users/ });
    const count = within(row).getByText("3");
    expect(row).toHaveAccessibleName(/3 waiting/);
    const chevron = row.querySelector("svg.lucide-chevron-right")!;
    expect(count.compareDocumentPosition(chevron) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole("link", { name: /Invitations/ })).queryByText("3")).toBeNull();
  });

  it("draws nothing for a group without one (and AdminWaitingBadge draws nothing for 0)", () => {
    mount("/admin/users", [{ ...GROUPS[0], badge: <AdminWaitingBadge count={0} /> }, GROUPS[1]]);
    expect(screen.getByRole("tab", { name: /Users/ })).toHaveAccessibleName(/^\s*Users\s*$/);
  });

  it("reaches a shared admin section through adminSections' `badges`", () => {
    const groups = adminSections(undefined, [], { badges: { overview: <AdminWaitingBadge count={14} /> } });
    const overview = groups.find((g) => g.id === "overview")!;
    render(<>{overview.badge}</>);
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(groups.filter((g) => g.badge !== undefined)).toHaveLength(1);
  });

  it("passes an app's own section's badge through adminSections", () => {
    const groups = adminSections(undefined, [
      { id: "metrics", icon: <LayoutDashboard />, title: "Metrics", help: "Numbers.", badge: <span>new</span> },
    ]);
    expect(groups.find((g) => g.id === "metrics")!.badge).toBeTruthy();
  });
});
