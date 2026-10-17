import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router";
import { Languages, ShieldCheck } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { AccountRoleChip, RoleChip } from "../account-chips";
import type { RoleVocabulary } from "../account-chips";

/**
 * 0.42.0 (docs/admin-harmonization.md §2.1, §7): the role in the account menu's header —
 * keksdose's look as the defaults, a link to the role's tool when the vocabulary names
 * one, a plain chip for every other role.
 */

type Role = "ADMIN" | "REVIEWER" | "MEMBER";
const ROLES: RoleVocabulary<Role> = {
  ADMIN: { label: "Admin", tone: "brand", icon: ShieldCheck, href: "/admin" },
  REVIEWER: { label: "Reviewer", tone: "info", icon: Languages, href: "/translations" },
  MEMBER: { label: "Member", tone: "neutral" },
};

describe("AccountRoleChip", () => {
  it("links an admin to /admin and calls onNavigate on the way", () => {
    const onNavigate = vi.fn();
    render(<AccountRoleChip value="ADMIN" roles={ROLES} onNavigate={onNavigate} />);
    const link = screen.getByRole("link", { name: "Admin" });
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toHaveAttribute("data-role", "ADMIN");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("links a reviewer to its own tool", () => {
    render(<AccountRoleChip value="REVIEWER" roles={ROLES} />);
    expect(screen.getByRole("link", { name: "Reviewer" })).toHaveAttribute("href", "/translations");
  });

  it("is a plain chip for a role without a tool — every account shows its role (§7)", () => {
    const onNavigate = vi.fn();
    render(<AccountRoleChip value="MEMBER" roles={ROLES} onNavigate={onNavigate} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    const chip = screen.getByText("Member").closest("[data-role]")!;
    expect(chip).toHaveAttribute("data-role", "MEMBER");
  });

  it("draws keksdose's look: solid, sm, square, caps, in the role's tone and icon", () => {
    render(
      <>
        <AccountRoleChip value="MEMBER" roles={ROLES} data-testid="kit" />
        <RoleChip value="MEMBER" roles={ROLES} variant="solid" data-testid="roster" />
        <AccountRoleChip value="ADMIN" roles={ROLES} />
      </>,
    );
    // The same chip RoleChip draws with `variant="solid"`: its defaults are sm, square, caps.
    expect(screen.getByTestId("kit").className).toBe(screen.getByTestId("roster").className);
    expect(screen.getByTestId("kit").className).toMatch(/uppercase/);
    expect(screen.getByRole("link", { name: "Admin" }).querySelector("svg")).not.toBeNull();
  });

  it("goes through the router's link with renderLink", () => {
    const onNavigate = vi.fn();
    render(
      <MemoryRouter>
        <AccountRoleChip
          value="ADMIN"
          roles={ROLES}
          onNavigate={onNavigate}
          renderLink={({ href, ...p }) => <Link to={href} data-router="" {...p} />}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Admin" });
    expect(link).toHaveAttribute("data-router");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("shows an unknown key as itself, and nothing for no role", () => {
    const { container } = render(<AccountRoleChip value={null} roles={ROLES} />);
    expect(container).toBeEmptyDOMElement();
    render(<AccountRoleChip value={"OWNER" as Role} roles={ROLES} />);
    expect(screen.getByText("OWNER")).toBeInTheDocument();
  });

  it("leaves RoleChip a plain chip whatever the href — a roster's chips are no way in", () => {
    render(<RoleChip value="ADMIN" roles={ROLES} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
