import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TopBarActionMenu } from "../topbar-action-menu";
import type { TopBarMenuHeader } from "../topbar-action-menu";

/**
 * keksdose F7: the account menu's header carries the admin role chip, and the chip links
 * to the admin area. A router link does not unmount the menu, so `header.extra` takes
 * `(close) => ReactNode` the way `footer` does. The plain `ReactNode` form stays.
 */
function Menu({ extra }: { extra: TopBarMenuHeader["extra"] }) {
  return (
    <MemoryRouter>
      <TopBarActionMenu
        icon={<span>A</span>}
        ariaLabel="Account"
        header={{ title: "Marcel Eifert", subtitle: "marcel@x.com", extra }}
        entries={[{ key: "logout", label: "Log out", onSelect: () => {} }]}
      />
    </MemoryRouter>
  );
}

describe("TopBarActionMenu header.extra", () => {
  it("hands a function `close`, so a link in the header shuts the menu", () => {
    render(
      <Menu
        extra={(close) => (
          <Link to="/admin" onClick={close}>
            Admin
          </Link>
        )}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    const link = screen.getByRole("link", { name: "Admin" });
    // Still a header control: out of the arrow keys, in the Tab order.
    expect(screen.queryByRole("menuitem", { name: "Admin" })).toBeNull();
    expect(link).not.toHaveAttribute("tabindex", "-1");
    fireEvent.click(link);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("still takes plain content", () => {
    render(<Menu extra={<span>Admin role</span>} />);
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByText("Admin role")).toBeInTheDocument();
  });
});
