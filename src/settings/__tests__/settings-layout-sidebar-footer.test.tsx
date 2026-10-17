import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Languages, Mail, Users } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsLayout } from "../settings-layout";
import { SettingsSection } from "../settings-section";
import type { SettingsEntry, SettingsGroup } from "../settings-catalogue";
import { AdminToolLinks } from "../../admin/admin-tool-links";
import { PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";

/**
 * 0.42.0 (docs/admin-harmonization.md §2.5 decision 16): `sidebarFooter`, the slot under
 * the desktop's section list — the admin area's Tools list — in the same sticky column.
 * On a phone `phoneFooter` carries the same links.
 */

type G = "users" | "invitations";
const GROUPS: SettingsGroup<G>[] = [
  { id: "users", icon: <Users />, title: "Users", help: "Who has an account." },
  { id: "invitations", icon: <Mail />, title: "Invitations", help: "The links." },
];
const ENTRIES: SettingsEntry<G>[] = [
  { id: "roster", group: "users", anchor: "roster", title: "Users" },
  { id: "invite", group: "invitations", anchor: "invite", title: "Invitations" },
];
const TOOLS = [{ key: "translations", label: "Translations", href: "/translations", icon: <Languages /> }];

function mount(sidebarFooter?: boolean) {
  return render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <SettingsLayout<G>
        title="Administration"
        groups={GROUPS}
        entries={ENTRIES}
        basePath="/admin"
        renderGroup={(g) => <SettingsSection anchor={g === "users" ? "roster" : "invite"} title={g} />}
        sidebarFooter={sidebarFooter ? <AdminToolLinks links={TOOLS} /> : undefined}
        phoneFooter={<AdminToolLinks links={TOOLS} variant="list" />}
      />
    </MemoryRouter>,
  );
}

afterEach(() => Reflect.deleteProperty(window, "matchMedia"));

describe("SettingsLayout sidebarFooter", () => {
  it("puts the content under the section list, the two in one sticky column", () => {
    mount(true);
    const tabs = screen.getByRole("tablist", { name: "Settings sections" });
    const footer = document.querySelector("[data-slot='settings-sidebar-footer']")!;
    expect(within(footer as HTMLElement).getByRole("navigation", { name: "Tools" })).toBeInTheDocument();
    const column = footer.parentElement!;
    expect(column).toContainElement(tabs);
    expect(column.className).toMatch(/md:sticky/);
    // The tablist is no longer sticky on its own inside the sticky column.
    expect(tabs.closest("[class*='md:sticky']")).toBe(column);
    // Before the open section, in the reading order.
    expect(footer.compareDocumentPosition(screen.getByRole("tabpanel")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves the sidebar as it was without one", () => {
    mount(false);
    expect(document.querySelector("[data-slot='settings-sidebar-footer']")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Tools" })).toBeNull();
  });

  it("is not shown on a phone, where the phone footer carries the links", () => {
    stubViewportWidth(PHONE_WIDTH);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <SettingsLayout<G>
          groups={GROUPS}
          entries={ENTRIES}
          basePath="/admin"
          renderGroup={() => null}
          sidebarFooter={<AdminToolLinks links={TOOLS} />}
          phoneFooter={<AdminToolLinks links={TOOLS} variant="list" />}
        />
      </MemoryRouter>,
    );
    expect(document.querySelector("[data-slot='settings-sidebar-footer']")).toBeNull();
    expect(screen.getByRole("link", { name: "Translations" })).toHaveAttribute("href", "/translations");
  });
});
