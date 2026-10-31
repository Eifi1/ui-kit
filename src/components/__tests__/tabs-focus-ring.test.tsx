import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tabs } from "../tabs";
import { FOCUS_RING } from "../focus-ring";

/**
 * The strip's keyboard focus is the kit's one focus frame (refactor audit 2026-10-30,
 * DSP-8). It rang in `ring-strong` (`--border-strong`): 2.54:1 on the light page and
 * 2.76:1 on a card, under WCAG 1.4.11's 3:1, where every other control rings in brand —
 * NavPills made the same move in 0.34 (DOC-7).
 *
 * jsdom compiles no CSS, so this pins the class contract, as `focus-visible-ring.test`
 * does for the calculator and the pills.
 */
const ONE_FRAME = FOCUS_RING.split(" ");
const offFrame = (el: Element) => el.className.split(/\s+/).filter((c) => /ring-strong$/.test(c));
const TABS = [
  { id: "one", label: "One" },
  { id: "two", label: "Two", href: "/two" },
];

describe("Tabs ring keyboard focus in brand", () => {
  it("on every tab of the strip, inset where the strip's overflow would clip it", () => {
    render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} onAdd={vi.fn()} addLabel="Add report" />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab, tab.textContent ?? "").toHaveClass(...ONE_FRAME, "focus-visible:ring-inset");
      expect(offFrame(tab), tab.textContent ?? "").toEqual([]);
    }
    const add = screen.getByRole("button", { name: "Add report" });
    expect(add).toHaveClass(...ONE_FRAME);
    expect(offFrame(add)).toEqual([]);
  });

  it("on every row of the side nav", () => {
    render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} orientation="vertical" />);
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab, tab.textContent ?? "").toHaveClass(...ONE_FRAME);
      expect(offFrame(tab), tab.textContent ?? "").toEqual([]);
    }
  });
});
