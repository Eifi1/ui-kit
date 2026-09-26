import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NavPills } from "../nav-pills";

const SURFACES = [
  { value: "tx", label: "Transactions" },
  { value: "budgets", label: "Budgets" },
  { value: "accounts", label: "Accounts", disabled: true },
];

describe("NavPills (keksdose swipe-settings-card:152)", () => {
  it("buttons in a wrapping list in a named nav, the current one aria-current=true, no tabs", () => {
    const onSelect = vi.fn();
    render(<NavPills aria-label="Surface" items={SURFACES} current="budgets" onSelect={onSelect} />);
    const nav = screen.getByRole("navigation", { name: "Surface" });
    expect(nav.querySelector("ul")!.className).toContain("flex-wrap");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("tab")).toBeNull();
    const current = screen.getByRole("button", { name: "Budgets" });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(current.className).toContain("bg-[var(--bg-inverse)]");
    expect(screen.getByRole("button", { name: "Transactions" })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: "Transactions" }));
    expect(onSelect).toHaveBeenCalledWith("tx");
    expect(screen.getByRole("button", { name: "Accounts" })).toBeDisabled();
  });

  it("links get aria-current=page and go through renderLink", () => {
    const onSelect = vi.fn();
    render(
      <NavPills
        aria-label="Reports"
        items={[
          { value: "a", label: "A", href: "/a" },
          { value: "b", label: "B", href: "/b" },
        ]}
        current="a"
        onSelect={onSelect}
        renderLink={({ href, children, ...p }) => (
          <a data-router href={`#${href}`} {...p}>
            {children}
          </a>
        )}
      />,
    );
    const a = screen.getByRole("link", { name: "A" });
    expect(a).toHaveAttribute("aria-current", "page");
    expect(a).toHaveAttribute("data-router");
    expect(a).toHaveAttribute("href", "#/a");
    fireEvent.click(screen.getByRole("link", { name: "B" }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("currentType, size and landmark=false", () => {
    render(
      <NavPills landmark={false} aria-label="Steps" size="sm" currentType="step" items={SURFACES} current="tx" />,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("group", { name: "Steps" })).toBeInTheDocument();
    const current = screen.getByRole("button", { name: "Transactions" });
    expect(current).toHaveAttribute("aria-current", "step");
    expect(current.className).toContain("text-xs");
  });
});
