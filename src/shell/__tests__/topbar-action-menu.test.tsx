import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LogOut, UserCog } from "lucide-react";
import { TopBarActionMenu } from "../topbar-action-menu";
import type { TopBarMenuEntry } from "../topbar-action-menu";
import { UserAvatar } from "../../components/user-avatar";

/**
 * The account menu kastlan (top-bar.tsx:147) and keksdose (account-menu.tsx) each
 * hand-build on `HoverMenu`: an avatar trigger, a name + role header, the rows (logout
 * in red), and the legal links underneath — as `TopBarActionMenu` props.
 */
function AccountMenu({
  onLogout = () => {},
  dir,
  unread = 0,
}: {
  onLogout?: () => void;
  dir?: "rtl";
  unread?: number;
}) {
  const entries: TopBarMenuEntry[] = [
    { kind: "link", key: "profile", to: "/profile", icon: <UserCog className="size-4" />, label: "Profile" },
    { key: "demo", label: "Demo mode", checked: true, checkable: "checkbox", onSelect: () => {} },
    { kind: "divider", key: "sep" },
    { key: "logout", label: "Log out", icon: <LogOut className="size-4" />, tone: "danger", onSelect: onLogout },
  ];
  return (
    <MemoryRouter>
      <div dir={dir}>
        <TopBarActionMenu
          ariaLabel="Marcel Eifert"
          triggerClassName="rounded-full"
          trigger={() => (
            <UserAvatar name="Marcel Eifert" badge={unread ? { label: `${unread} unread` } : null} />
          )}
          header={{ title: "Marcel Eifert", subtitle: "marcel@x.com" }}
          entries={entries}
          footerLabel="Legal"
          footer={(close) => (
            <>
              <Link to="/impressum" onClick={close}>
                Imprint
              </Link>
              <Link to="/privacy" onClick={close}>
                Privacy
              </Link>
            </>
          )}
        />
        <button type="button">After</button>
      </div>
    </MemoryRouter>
  );
}

const trigger = () => screen.getByRole("button", { name: /Marcel Eifert/ });
const items = () => Array.from(screen.getByRole("menu").querySelectorAll('[role^="menuitem"]'));

describe("TopBarActionMenu as an account menu", () => {
  it("wires the custom trigger like the icon one: popup, expanded state and a name", () => {
    render(<AccountMenu />);
    const btn = trigger();
    expect(btn).toHaveAttribute("aria-haspopup", "menu");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveAccessibleName("Marcel Eifert");
    expect(btn.className).toContain("rounded-full");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Marcel Eifert" })).toBeInTheDocument();
  });

  it("names the trigger with the avatar badge's label as well", () => {
    render(<AccountMenu unread={3} />);
    expect(trigger()).toHaveAccessibleName("Marcel Eifert 3 unread");
  });

  it("takes the person's name from ariaLabel only: the avatar's initials stay hidden", () => {
    render(
      <MemoryRouter>
        <TopBarActionMenu
          ariaLabel="Account menu"
          trigger={() => <UserAvatar name="Marcel Eifert" badge={{ label: "3 unread" }} />}
          entries={[{ key: "x", label: "Log out", onSelect: () => {} }]}
        />
      </MemoryRouter>,
    );
    const btn = screen.getByRole("button");
    // "Account menu" + the badge's sr-only label — not the name, not "ME".
    expect(btn).toHaveAccessibleName("Account menu 3 unread");
    expect(btn).not.toHaveAccessibleName(/Marcel|ME/);
  });

  it("draws the header as text, not as a menu item", () => {
    render(<AccountMenu />);
    fireEvent.click(trigger());
    const email = screen.getByText("marcel@x.com");
    expect(email.closest('[role^="menuitem"]')).toBeNull();
    expect(items().map((el) => el.textContent)).toEqual(["Profile", "Demo mode", "Log out"]);
  });

  it("builds the rows on MenuItem: a danger logout, a checked choice, a router link", () => {
    const onLogout = vi.fn();
    render(<AccountMenu onLogout={onLogout} />);
    fireEvent.click(trigger());
    const logout = screen.getByRole("menuitem", { name: "Log out" });
    expect(logout.className).toContain("text-[var(--danger)]");
    expect(screen.getByRole("menuitemcheckbox", { name: "Demo mode" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
    fireEvent.click(logout);
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("keeps the footer links out of the menu items and in the Tab order", () => {
    render(<AccountMenu />);
    fireEvent.click(trigger());
    const nav = screen.getByRole("navigation", { name: "Legal" });
    for (const name of ["Imprint", "Privacy"]) {
      const link = screen.getByRole("link", { name });
      expect(nav).toContainElement(link);
      expect(link).not.toHaveAttribute("tabindex", "-1");
    }
    expect(screen.queryByRole("menuitem", { name: "Imprint" })).toBeNull();
  });

  it("roves over the rows only, skipping header and footer, and wraps", async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toHaveFocus();
  });

  it("Tabs from a row through the footer links without closing, then closes on the way out", async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    await user.tab();
    expect(screen.getByRole("link", { name: "Imprint" })).toHaveFocus();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveFocus();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape from a footer link and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    await user.tab();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("works the same in RTL: end-aligned panel, same keys, logical badge corner", async () => {
    const user = userEvent.setup();
    render(<AccountMenu dir="rtl" unread={2} />);
    const dot = trigger().querySelector(".rounded-full.absolute")!;
    expect(dot.className).toContain("-end-0.5");
    expect(dot.className).not.toMatch(/(^|\s)-?(left|right)-/);
    trigger().focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toHaveFocus();
    expect(screen.getByRole("menu").parentElement!.className).toContain("end-0");
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveFocus();
  });
});

describe("TopBarActionMenu, the icon button", () => {
  it("still names its button by aria-label and runs plain rows", () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <TopBarActionMenu
          icon={<span>?</span>}
          ariaLabel="Feedback"
          heading="Send"
          entries={[{ key: "bug", label: "Bug", onSelect }]}
        />
      </MemoryRouter>,
    );
    const btn = screen.getByRole("button", { name: "Feedback" });
    expect(btn).toHaveAttribute("aria-label", "Feedback");
    fireEvent.click(btn);
    expect(screen.getByText("Send", { selector: "li" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Bug" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("renders free rows after the entries, and no footer or header without them", () => {
    render(
      <MemoryRouter>
        <TopBarActionMenu
          icon={<span>?</span>}
          ariaLabel="More"
          entries={[{ key: "a", label: "A", onSelect: () => {} }]}
        >
          {(close) => (
            <li>
              <button type="button" onClick={close}>
                B
              </button>
            </li>
          )}
        </TopBarActionMenu>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(items().map((el) => el.textContent)).toEqual(["A", "B"]);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
