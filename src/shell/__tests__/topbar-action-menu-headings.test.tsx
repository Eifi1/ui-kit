import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TopBarActionMenu } from "../topbar-action-menu";
import type { TopBarMenuEntry } from "../topbar-action-menu";

/**
 * Group headings (0.23, keksdose's guided-tours menu): the tours filed by topic, each
 * block NAMED instead of fenced off by a bare divider. A heading is not a row — no focus,
 * no arrow-key stop — and its rows are a `role="group"` named by it, as the
 * CommandPalette's groups are.
 */

function TourMenu({
  entries,
  onLaunch = () => {},
  ariaLabel = "Guided tours",
}: {
  entries?: TopBarMenuEntry[];
  onLaunch?: (id: string) => void;
  ariaLabel?: string;
}) {
  const row = (id: string, label: string): TopBarMenuEntry => ({ key: id, label, onSelect: () => onLaunch(id) });
  return (
    <MemoryRouter>
      <TopBarActionMenu
        icon={<span>?</span>}
        ariaLabel={ariaLabel}
        entries={
          entries ?? [
            { kind: "heading", key: "here", label: "On this page" },
            row("budgets", "Budgets basics"),
            row("goals", "Savings goals"),
            { kind: "heading", key: "new", label: "New" },
            row("import", "Bank import"),
            { kind: "divider", key: "sep-all" },
            row("all", "All tours…"),
          ]
        }
      />
      <button type="button">After</button>
    </MemoryRouter>
  );
}

const trigger = (name = "Guided tours") => screen.getByRole("button", { name });
const names = (els: Element[]) => els.map((el) => el.textContent);

describe("TopBarActionMenu group headings", () => {
  it("puts each heading's rows in a group named by it, and a row behind a divider in none", () => {
    render(<TourMenu />);
    fireEvent.click(trigger());
    const here = screen.getByRole("group", { name: "On this page" });
    expect(names(within(here).getAllByRole("menuitem"))).toEqual(["Budgets basics", "Savings goals"]);
    // The next heading ends the group, with no divider in between.
    const fresh = screen.getByRole("group", { name: "New" });
    expect(names(within(fresh).getAllByRole("menuitem"))).toEqual(["Bank import"]);
    // The divider ends "New": the closing row belongs to no topic.
    const all = screen.getByRole("menuitem", { name: "All tours…" });
    expect(all.closest('[role="group"]')).toBeNull();
    expect(screen.getAllByRole("group")).toHaveLength(2);
    // The groups are the menu's own: nothing between them and the menu has a role
    // other than `none`.
    const menu = screen.getByRole("menu", { name: "Guided tours" });
    for (let el = here.parentElement; el && el !== menu; el = el.parentElement) {
      expect(el.getAttribute("role")).toBe("none");
    }
  });

  it("draws the heading as text, never as a menu item, with no focus stop", () => {
    render(<TourMenu />);
    fireEvent.click(trigger());
    const heading = screen.getByText("On this page");
    expect(heading.closest('[role^="menuitem"]')).toBeNull();
    expect(heading).not.toHaveAttribute("tabindex");
    expect(heading.querySelector("button, a, [tabindex]")).toBeNull();
    const menu = screen.getByRole("menu");
    expect(names(Array.from(menu.querySelectorAll('[role^="menuitem"]')))).toEqual([
      "Budgets basics",
      "Savings goals",
      "Bank import",
      "All tours…",
    ]);
  });

  it("walks the arrow keys, Home and End over the rows, across groups, passing the headings by", async () => {
    const user = userEvent.setup();
    render(<TourMenu />);
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Budgets basics" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Savings goals" })).toHaveFocus();
    // Out of one group and into the next: the "New" heading is not a stop.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Bank import" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "All tours…" })).toHaveFocus();
    // Wraps to the first ROW, not to the heading above it.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Budgets basics" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "All tours…" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Budgets basics" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "All tours…" })).toHaveFocus();
  });

  it("runs a grouped row and closes, like any other row", () => {
    const onLaunch = vi.fn();
    render(<TourMenu onLaunch={onLaunch} />);
    fireEvent.click(trigger());
    fireEvent.click(within(screen.getByRole("group", { name: "New" })).getByRole("menuitem", { name: "Bank import" }));
    expect(onLaunch).toHaveBeenCalledWith("import");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not draw a heading with no rows under it — no empty group, no orphan title", () => {
    // keksdose builds the blocks from data: "this page" is often empty.
    render(
      <TourMenu
        entries={[
          { kind: "heading", key: "here", label: "On this page" },
          { kind: "heading", key: "new", label: "New" },
          { key: "import", label: "Bank import", onSelect: () => {} },
          { kind: "heading", key: "late", label: "Nothing here" },
          { kind: "divider", key: "sep" },
          { key: "all", label: "All tours…", onSelect: () => {} },
        ]}
      />,
    );
    fireEvent.click(trigger());
    expect(screen.queryByText("On this page")).toBeNull();
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-labelledby"))).toHaveLength(1);
    expect(screen.getByRole("group", { name: "New" })).toBeInTheDocument();
  });

  it("names each group by its heading's id, unique per menu even with spaces in the key", () => {
    render(
      <>
        <TourMenu
          ariaLabel="One"
          entries={[
            { kind: "heading", key: "a topic with spaces", label: "Topic" },
            { key: "x", label: "Row one", onSelect: () => {} },
          ]}
        />
        <TourMenu
          ariaLabel="Two"
          entries={[
            { kind: "heading", key: "a topic with spaces", label: "Topic" },
            { key: "y", label: "Row two", onSelect: () => {} },
          ]}
        />
      </>,
    );
    fireEvent.click(trigger("One"));
    const first = screen.getByRole("group", { name: "Topic" });
    const firstId = first.getAttribute("aria-labelledby")!;
    expect(firstId).not.toMatch(/\s/);
    fireEvent.click(trigger("Two"));
    // Opening the second menu closed the first (one hover menu at a time).
    const second = screen.getByRole("group", { name: "Topic" });
    expect(within(second).getByRole("menuitem", { name: "Row two" })).toBeInTheDocument();
    expect(second.getAttribute("aria-labelledby")).not.toBe(firstId);
  });

  it("keeps the menu-wide title, and leaves a menu without headings exactly as before", () => {
    render(
      <MemoryRouter>
        <TopBarActionMenu
          icon={<span>?</span>}
          ariaLabel="Feedback"
          heading="Send"
          entries={[
            { key: "bug", label: "Bug", onSelect: () => {} },
            { kind: "divider", key: "sep" },
            { key: "idea", label: "Idea", onSelect: () => {} },
          ]}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));
    expect(screen.getByText("Send", { selector: "li" })).toBeInTheDocument();
    expect(screen.queryByRole("group")).toBeNull();
    const menu = screen.getByRole("menu");
    // Rows are still direct list items of the panel's list.
    const list = menu.querySelector("ul")!;
    expect(Array.from(list.children).map((li) => li.textContent)).toEqual(["Send", "Bug", "", "Idea"]);
  });

  it("sets a heading under a rule tight and one straight under rows with its own gap", () => {
    render(
      <TourMenu
        entries={[
          { kind: "heading", key: "a", label: "First" },
          { key: "x", label: "Row x", onSelect: () => {} },
          { kind: "heading", key: "b", label: "Second" },
          { key: "y", label: "Row y", onSelect: () => {} },
          { kind: "divider", key: "sep" },
          { kind: "heading", key: "c", label: "Third" },
          { key: "z", label: "Row z", onSelect: () => {} },
        ]}
      />,
    );
    fireEvent.click(trigger());
    expect(screen.getByText("First").className).toContain("pt-1");
    expect(screen.getByText("Second").className).toContain("pt-2.5");
    expect(screen.getByText("Third").className).toContain("pt-1");
    expect(screen.getByText("Third").className).not.toContain("pt-2.5");
  });
});
