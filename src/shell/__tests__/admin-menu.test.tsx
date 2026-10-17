import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home, ShieldCheck, Upload } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { TopBarActionMenu } from "../topbar-action-menu";
import { AppShell } from "../app-shell";
import type { AppShellSidebarFooterItem } from "../app-shell";
import { AdminMenuRow, adminMenuEntry } from "../admin-menu";
import { HoverMenu } from "../../components/hover-menu";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * 0.42.0 (docs/admin-harmonization.md §2.1, §6.3, §6.6, §6.9): the account menu's
 * "Administration" row as an entry and as a HoverMenu row, with the waiting count as its
 * badge, and the count on AppShell's sidebar footer link.
 */

function Menu({ badge }: { badge?: number | null }) {
  return (
    <MemoryRouter>
      <TopBarActionMenu
        icon={<span>A</span>}
        aria-label="Account"
        entries={[adminMenuEntry({ badge }), { key: "logout", label: "Log out", onSelect: () => {} }]}
      />
    </MemoryRouter>
  );
}

const open = () => fireEvent.click(screen.getByRole("button", { name: "Account" }));

describe("adminMenuEntry", () => {
  it("is a link row to /admin with the shield icon, and closes the menu on the way", () => {
    render(<Menu />);
    open();
    const row = screen.getByRole("menuitem", { name: "Administration" });
    expect(row).toHaveAttribute("href", "/admin");
    expect(row.querySelector("svg")).not.toBeNull();
    expect(row.querySelector("[data-slot='admin-badge']")).toBeNull();
    fireEvent.click(row);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("carries the waiting count as a badge, in words for a reader", () => {
    render(<Menu badge={3} />);
    open();
    const row = screen.getByRole("menuitem", { name: "Administration, 3 waiting" });
    expect(within(row).getByText("3")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows no badge for 0 or null, and 99+ past 99", () => {
    const { unmount } = render(<Menu badge={0} />);
    open();
    expect(screen.getByRole("menuitem", { name: "Administration" })).toBeInTheDocument();
    unmount();
    render(<Menu badge={null} />);
    open();
    expect(screen.getByRole("menuitem", { name: "Administration" })).toBeInTheDocument();
    expect(adminMenuEntry({ badge: 120 })).toMatchObject({ kind: "link", key: "administration", to: "/admin" });
  });

  it("takes another address and the app's words", () => {
    const entry = adminMenuEntry({ href: "/verwaltung", labels: UI_KIT_LABELS_DE_CH.adminArea });
    expect(entry).toMatchObject({ kind: "link", to: "/verwaltung", label: "Verwaltung" });
  });
});

describe("AdminMenuRow", () => {
  function RowMenu({ badge }: { badge?: number }) {
    return (
      <MemoryRouter>
        <HoverMenu
          aria-label="Account"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle}>
              Account
            </button>
          )}
        >
          {(close) => (
            <ul>
              <AdminMenuRow badge={badge} onNavigate={close} />
            </ul>
          )}
        </HoverMenu>
      </MemoryRouter>
    );
  }

  it("is the same row for a menu built from HoverMenu children", () => {
    render(<RowMenu badge={120} />);
    open();
    const row = screen.getByRole("menuitem", { name: "Administration, 120 waiting" });
    expect(row).toHaveAttribute("href", "/admin");
    expect(within(row).getByText("99+")).toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <RowMenu badge={2} />
      </UiKitProvider>,
    );
    open();
    expect(screen.getByRole("menuitem", { name: "Verwaltung, 2 offen" })).toBeInTheDocument();
  });
});

describe("AppShell sidebarFooterItems badge", () => {
  const ITEMS: AppShellSidebarFooterItem[] = [
    { key: "admin", to: "/admin", icon: ShieldCheck, label: "Administration", badge: 3, badgeLabel: "3 waiting" },
    { key: "import", to: "/import", icon: Upload, label: "Data import", badge: 0 },
  ];
  const aside = () => document.querySelector("aside")!;
  function renderShell(collapsed: boolean) {
    window.localStorage.setItem("appLayout.sidebarCollapsed", collapsed ? "1" : "0");
    return render(
      <MemoryRouter>
        <AppShell nav={[{ to: "/", label: "Home", icon: Home }]} topBar={<div />} sidebarFooterItems={ITEMS}>
          <div>content</div>
        </AppShell>
      </MemoryRouter>,
    );
  }
  afterEach(() => window.localStorage.clear());

  it("expanded: a count pill after the text, read in its words; none for 0", () => {
    renderShell(false);
    const admin = within(aside()).getByRole("link", { name: "Administration, 3 waiting" });
    expect(admin.querySelector("[data-badge]")).toHaveTextContent("3");
    const imports = within(aside()).getByRole("link", { name: "Data import" });
    expect(imports.querySelector("[data-badge]")).toBeNull();
  });

  it("collapsed: a corner count on the icon, in the link's name", () => {
    renderShell(true);
    const admin = within(aside()).getByRole("link", { name: "Administration, 3 waiting" });
    expect(admin.querySelector("[data-badge]")).toHaveTextContent("3");
    expect(within(aside()).getByRole("link", { name: "Data import" }).querySelector("[data-badge]")).toBeNull();
  });
});
