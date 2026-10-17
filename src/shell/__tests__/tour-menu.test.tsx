import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourMenu, type TourMenuTour } from "../tour-menu";

/** docs/top-bar-harmonization.md §2.4, §6.7: keksdose's tours menu, fed as data. */

const TOURS: TourMenuTour[] = [
  { id: "reports", title: "Understand reports", route: "/reports", completed: true },
  { id: "spending", title: "Spending tab", route: "/reports/spending" },
  { id: "budgets", title: "Budgets basics", route: "/budgets" },
  { id: "import", title: "Bank import", route: "/import", isNew: true, since: "2026-09-01" },
  { id: "share", title: "Sharing", route: "/share", isNew: true, since: "2026-10-01" },
  { id: "goals", title: "Goals", route: "/goals", isNew: true, since: "2026-08-01" },
  { id: "rules", title: "Rules", route: "/rules", isNew: true, since: "2026-07-01" },
];

function App({ tours = TOURS, href, path = "/reports/overview", onLaunch = () => {} }: {
  tours?: TourMenuTour[];
  href?: string;
  path?: string;
  onLaunch?: (id: string) => void;
}) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <TourMenu tours={tours} href={href} onLaunch={onLaunch} />
      <Routes>
        <Route path="*" element={<p>Page</p>} />
        <Route path="/tours" element={<p>Tours page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Open by hover (works for the link and the button trigger alike). */
function open(trigger: HTMLElement) {
  fireEvent.mouseEnter(trigger.parentElement!);
  act(() => {
    vi.advanceTimersByTime(300);
  });
  return screen.getByRole("menu");
}

describe("TourMenu", () => {
  it("with href: the compass is a link to the tours page, and the list ends in All tours…", () => {
    render(<App href="/tours" />);
    const link = screen.getByRole("link", { name: /Guided tours/ });
    expect(link).toHaveAttribute("href", "/tours");
    const menu = open(link);
    const groups = within(menu).getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-labelledby") && document.getElementById(g.getAttribute("aria-labelledby")!)?.textContent)).toEqual([
      "On this page",
      "New tours",
    ]);
    // This page: the tours whose route's first segment is /reports.
    expect(within(groups[0]).getAllByRole("menuitem").map((r) => r.textContent)).toEqual([
      expect.stringContaining("Understand reports"),
      expect.stringContaining("Spending tab"),
    ]);
    // New: at most three, newest first.
    expect(within(groups[1]).getAllByRole("menuitem").map((r) => r.textContent?.replace(/New$/, ""))).toEqual([
      "Sharing",
      "Bank import",
      "Goals",
    ]);
    expect(menu.querySelector("li.border-t")).not.toBeNull();
    const items = within(menu).getAllByRole("menuitem");
    expect(items.at(-1)).toHaveTextContent("All tours…");
    expect(items.at(-1)).toHaveAttribute("href", "/tours");
  });

  it("marks a taken tour with a ✓ (named for a reader) and a new one with a NEW chip", () => {
    render(<App href="/tours" />);
    const menu = open(screen.getByRole("link", { name: /Guided tours/ }));
    expect(within(menu).getByRole("menuitem", { name: /Understand reports/ })).toHaveTextContent("Completed");
    expect(within(menu).getByRole("menuitem", { name: /Sharing/ })).toHaveTextContent("New");
    expect(within(menu).getByRole("menuitem", { name: /Spending tab/ }).textContent).toBe("Spending tab");
  });

  it("shows the NEW dot while a tour is new and untaken, and names it", () => {
    const { container, unmount } = render(<App href="/tours" />);
    expect(screen.getByRole("link", { name: /Guided tours.*New tours/ })).toBeInTheDocument();
    expect(container.querySelector("a span.absolute")).not.toBeNull();
    unmount();
    render(<App href="/tours" tours={TOURS.map((t) => ({ ...t, isNew: false }))} />);
    expect(screen.getByRole("link", { name: "Guided tours" })).toBeInTheDocument();
  });

  it("launches a tour through onLaunch", () => {
    const onLaunch = vi.fn();
    render(<App href="/tours" onLaunch={onLaunch} />);
    const menu = open(screen.getByRole("link", { name: /Guided tours/ }));
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Spending tab/ }));
    expect(onLaunch).toHaveBeenCalledWith("spending");
  });

  it("without href (§6.7): a button, no All tours…, and the other tours below a rule", () => {
    render(<App path="/budgets" tours={TOURS.slice(0, 3)} />);
    expect(screen.queryByRole("link")).toBeNull();
    const trigger = screen.getByRole("button", { name: "Guided tours" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByText("All tours…")).toBeNull();
    expect(within(menu).getAllByRole("menuitem").map((r) => r.textContent?.replace("Completed", ""))).toEqual([
      "Budgets basics",
      "Understand reports",
      "Spending tab",
    ]);
    expect(menu.querySelector("li.border-t")).not.toBeNull();
  });

  it("renders nothing with no tours and no tours page", () => {
    const { container } = render(<App tours={[]} />);
    expect(container.querySelector("button, a")).toBeNull();
  });

  it("with no tour on this page and none new, offers All tours… alone", () => {
    render(<App href="/tours" path="/elsewhere" tours={TOURS.slice(0, 3)} />);
    const menu = open(screen.getByRole("link", { name: "Guided tours" }));
    expect(within(menu).getAllByRole("menuitem").map((r) => r.textContent)).toEqual(["All tours…"]);
    expect(menu.querySelector("li.border-t")).toBeNull();
  });
});
