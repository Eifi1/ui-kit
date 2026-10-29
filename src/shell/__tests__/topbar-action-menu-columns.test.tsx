import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TopBarActionMenu } from "../topbar-action-menu";
import type { TopBarMenuEntry } from "../topbar-action-menu";

/**
 * `columns` (0.51.4, DevMenu; keksdose dev #640, Marcel: "Each group gets a column"):
 * from `md` up the heading groups stand side by side. jsdom lays nothing out, so what is
 * checked is the structure the grid places — a column per group, the loose rows after a
 * group in its column, the rest spanning — and that the keyboard order is the reading
 * order.
 */

const row = (key: string): TopBarMenuEntry => ({ key, label: key, onSelect: () => {} });

const ENTRIES: TopBarMenuEntry[] = [
  row("Top"),
  { kind: "heading", key: "h-role", label: "Role" },
  row("Admin"),
  row("Member"),
  { kind: "divider", key: "sep-back" },
  row("Back to Admin"),
  { kind: "heading", key: "h-budget", label: "Budget" },
  row("Owner"),
  { kind: "divider", key: "sep-end" },
  { kind: "heading", key: "h-resets", label: "Resets" },
  row("Reset tour"),
  { kind: "divider", key: "sep-trailing" },
];

function Menu({ columns }: { columns?: boolean }) {
  return (
    <MemoryRouter>
      <TopBarActionMenu
        icon={<span>?</span>}
        aria-label="Dev tools"
        entries={ENTRIES}
        columns={columns}
        footer={<a href="/x">Legal</a>}
      />
    </MemoryRouter>
  );
}

const open = () => fireEvent.click(screen.getByRole("button", { name: "Dev tools" }));
const list = () => screen.getByRole("menu").querySelector("ul")!;
const columnsOf = () => [...list().querySelectorAll<HTMLElement>(":scope > [data-menu-column]")];

describe("TopBarActionMenu columns", () => {
  it("is the one list without it", () => {
    render(<Menu />);
    open();
    expect(list().className).not.toMatch(/md:grid/);
    expect(columnsOf()).toHaveLength(0);
  });

  it("puts each group in a column, its trailing rows with it, as wide as its columns", () => {
    render(<Menu columns />);
    open();
    expect(list()).toHaveClass("md:grid");
    expect(list().style.getPropertyValue("--menu-columns-width")).toBe("42rem");
    const columns = columnsOf();
    expect(columns).toHaveLength(3);
    // The roles' way back stays under the roles, behind its rule.
    expect(
      within(columns[0]!)
        .getAllByRole("menuitem")
        .map((m) => m.textContent),
    ).toEqual(["Admin", "Member", "Back to Admin"]);
    expect(within(columns[0]!).getByRole("group", { name: "Role" })).toBeInTheDocument();
    expect(columns[0]!.querySelector(".border-t")).not.toBeNull();
    // A rule that would only end a column is not drawn: the column's edge separates.
    expect(columns[1]!.querySelector(".border-t")).toBeNull();
    expect(columns[2]!.querySelector(".border-t")).toBeNull();
    // A row before the first group, and the footer, span the panel.
    const top = screen.getByRole("menuitem", { name: "Top" }).closest("li")!;
    expect(top).toHaveClass("md:col-span-full");
    expect(screen.getByRole("link", { name: "Legal" }).closest("li")).toHaveClass("md:col-span-full");
  });

  it("walks the rows down one column and on into the next", () => {
    render(<Menu columns />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Dev tools" }), { key: "ArrowDown" });
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(document.activeElement!.textContent ?? "");
      fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    }
    expect(seen).toEqual(["Top", "Admin", "Member", "Back to Admin", "Owner", "Reset tour"]);
  });

  it("stays a list when there is no group to put side by side", () => {
    render(
      <MemoryRouter>
        <TopBarActionMenu icon={<span>?</span>} aria-label="Dev tools" entries={[row("One"), row("Two")]} columns />
      </MemoryRouter>,
    );
    open();
    expect(list().className).not.toMatch(/md:grid/);
  });
});
