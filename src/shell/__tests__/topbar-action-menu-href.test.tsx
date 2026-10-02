import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Compass } from "lucide-react";
import { TopBarActionMenu } from "../topbar-action-menu";
import type { TopBarMenuEntry } from "../topbar-action-menu";

/**
 * keksdose dev #585 (Marcel): the guided-tours compass is a TopBarActionMenu, and a click
 * on it should go to /tours like the menu's "All tours" row. With `href` the trigger is a
 * link: a click or Enter follows it and shuts the panel, hover still opens the panel, and
 * the arrow keys still reach the rows.
 */

const ENTRIES: TopBarMenuEntry[] = [
  { key: "budget", label: "Budget tour", onSelect: () => {} },
  { kind: "divider", key: "sep" },
  { kind: "link", key: "all", to: "/tours", label: "All tours" },
];

function App() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <TopBarActionMenu ariaLabel="Guided tours" icon={<Compass />} href="/tours" heading="Tours" entries={ENTRIES} />
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/tours" element={<p>Tours page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const trigger = () => screen.getByRole("link", { name: "Guided tours" });
const wrapper = () => trigger().parentElement!;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("TopBarActionMenu href", () => {
  it("renders the trigger as a link that announces its menu", () => {
    render(<App />);
    expect(trigger()).toHaveAttribute("href", "/tours");
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Guided tours" })).toBeNull();
  });

  it("a click follows the link and shuts a panel hover opened", () => {
    render(<App />);
    fireEvent.mouseEnter(wrapper());
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("menuitem", { name: "Budget tour" })).toBeInTheDocument();
    fireEvent.click(trigger());
    expect(screen.getByText("Tours page")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Budget tour" })).toBeNull();
  });

  it("ArrowDown on the focused link opens the menu onto its first row", () => {
    render(<App />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Budget tour" })).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("Enter follows the link and leaves no pending focus for the next hover-open", () => {
    render(<App />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "Enter" });
    fireEvent.click(trigger());
    expect(screen.getByText("Tours page")).toBeInTheDocument();
    fireEvent.mouseEnter(wrapper());
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("menuitem", { name: "Budget tour" })).not.toHaveFocus();
  });

  it("without href it stays a button that toggles", () => {
    render(
      <MemoryRouter>
        <TopBarActionMenu ariaLabel="Guided tours" icon={<Compass />} entries={ENTRIES} />
      </MemoryRouter>,
    );
    const button = screen.getByRole("button", { name: "Guided tours" });
    fireEvent.click(button);
    expect(screen.getByRole("menuitem", { name: "Budget tour" })).toBeInTheDocument();
  });
});
