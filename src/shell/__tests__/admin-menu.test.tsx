import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home, ShieldCheck, Upload } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { TopBarActionMenu } from "../topbar-action-menu";
import { AppShell } from "../app-shell";
import type { AppShellSidebarFooterItem } from "../app-shell";
import { AdminMenuRow, AdminWaitingBadge, adminMenuEntry } from "../admin-menu";
import { IconButton } from "../../components/icon-button";
import { useAdminAreaLabels } from "../../admin/admin-area-labels";
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

describe("AdminWaitingBadge (0.45, admin §9.3.4)", () => {
  it("draws nothing for 0, null or none", () => {
    for (const count of [0, null, undefined]) {
      const { container, unmount } = render(<AdminWaitingBadge count={count} />);
      expect(container.querySelector("[data-slot='admin-badge']")).toBeNull();
      unmount();
    }
  });

  it("caps at 99+ as the row does, and reads its words alone", () => {
    const { container } = render(<AdminWaitingBadge count={120} />);
    const pill = container.querySelector("[data-slot='admin-badge']")!;
    expect(within(pill as HTMLElement).getByText("99+")).toHaveAttribute("aria-hidden", "true");
    expect(pill).toHaveTextContent(", 120 waiting");
  });

  it("fits IconButton's badge: decorative there, the name carries the count", () => {
    function Platform({ waiting }: { waiting: number }) {
      const area = useAdminAreaLabels();
      return (
        <IconButton
          label={waiting > 0 ? area.waitingLabel("Platform", waiting) : "Platform"}
          badge={<AdminWaitingBadge count={waiting} />}
        >
          <ShieldCheck />
        </IconButton>
      );
    }
    const { container } = render(<Platform waiting={2} />);
    expect(screen.getByRole("button", { name: "Platform, 2 waiting" })).toBeInTheDocument();
    const slot = container.querySelector("[data-slot='icon-button-badge']")!;
    expect(slot).toHaveAttribute("aria-hidden");
    expect(slot).toHaveTextContent("2");
  });

  it("speaks the provider's language in the pill and the phrase", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <AdminWaitingBadge count={4} />
      </UiKitProvider>,
    );
    expect(document.querySelector("[data-slot='admin-badge']")).toHaveTextContent(", 4 offen");
    expect(UI_KIT_LABELS_DE_CH.adminArea.waitingLabel("Plattform", 4)).toBe("Plattform, 4 offen");
  });

  it("is the row's pill: AdminMenuRow draws the same badge", () => {
    render(
      <MemoryRouter>
        <ul>
          <AdminMenuRow badge={5} />
        </ul>
      </MemoryRouter>,
    );
    expect(screen.getByRole("menuitem", { name: "Administration, 5 waiting" }).querySelector("[data-slot='admin-badge']")).not.toBeNull();
  });
});
