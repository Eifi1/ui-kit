import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tabs } from "../tabs";

/**
 * The strip is one scrolling row with an underline marker (the multirow `wrap` strip of
 * keksdose live #262 was deprecated in 0.40 and removed in 0.41: keksdose went back to
 * one scrolling row with the `overflowCue` caret, live #410).
 *
 * jsdom has no layout and no media queries, so the shape is asserted on the class
 * string — which is exactly what these tests can read.
 *
 * The colours are design-system variables, not palette literals, so there is no
 * `dark:` half to assert: one class covers both themes because the token flips.
 */

const TABS = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

const LINKED = TABS.map((t) => ({ ...t, href: `/x/${t.id}` }));

const list = () => screen.getByRole("tablist");

describe("Tabs", () => {
  describe("the strip — the shape the pages that use tabs depend on", () => {
    it("stays the single-row underline strip, character for character", () => {
      render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} />);
      // The scroller and its bottom rule.
      expect(list()).toHaveAttribute("class", "flex gap-1 overflow-x-auto overflow-y-hidden border-b border-subtle");
      // The active marker is the underline riding that rule, not a fill.
      const active = screen.getByRole("tab", { name: "Two" });
      expect(active).toHaveClass("border-b-2");
      expect(active).toHaveClass("-mb-px");
      expect(active).toHaveClass("border-[var(--text-primary)]");
      expect(active).not.toHaveClass("bg-brand");
      // …and nothing wraps.
      expect(list()).not.toHaveClass("flex-wrap");
    });

    it("names the tablist only when asked to", () => {
      render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} />);
      expect(list()).not.toHaveAttribute("aria-label");
    });
  });

  describe("roles and routing", () => {
    it("gives the tablist an accessible name and keeps the roles", () => {
      render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} aria-label="Report" />);
      expect(screen.getByRole("tablist", { name: "Report" })).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(3);
      expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "false");
    });

    it("routes a linked tab client-side, and leaves ⌘-click to the browser", () => {
      const onChange = vi.fn();
      render(<Tabs tabs={LINKED} active="one" onChange={onChange} />);
      const two = screen.getByRole("tab", { name: "Two" });
      expect(two.tagName).toBe("A");
      expect(two).toHaveAttribute("href", "/x/two");
      // Plain click: cancelled, so the switch stays client-side.
      expect(fireEvent.click(two, { button: 0 })).toBe(false);
      expect(onChange).toHaveBeenCalledWith("two");
      // ⌘-click belongs to the browser (feedback #451) — untouched. "Untouched" is read
      // by a listener on `window`, which runs after the component's own handler: it
      // records whether the component cancelled the click, and THEN cancels it itself —
      // left alone, jsdom would try to follow `/x/two` and log "Not implemented:
      // navigation to another Document" into every test run.
      onChange.mockClear();
      let cancelledByComponent: boolean | null = null;
      const record = (e: MouseEvent) => {
        cancelledByComponent = e.defaultPrevented;
        e.preventDefault();
      };
      window.addEventListener("click", record);
      try {
        fireEvent.click(two, { button: 0, metaKey: true });
      } finally {
        window.removeEventListener("click", record);
      }
      expect(cancelledByComponent).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
      // Space is what an anchor does not do on its own.
      fireEvent.keyDown(two, { key: " " });
      expect(onChange).toHaveBeenCalledWith("two");
    });
  });

  describe("keyboard", () => {
    // The arrows walk the tabs in DOM order. Focus only: activation stays on click/Enter/Space, because a tab here can be a real route
    // and arrowing past one must not navigate to it.
    const arrow = (key: string) => fireEvent.keyDown(document.activeElement!, { key });

    it("walks the strip with the arrow keys, wrapping at both ends", () => {
      const onChange = vi.fn();
      render(<Tabs tabs={LINKED} active="one" onChange={onChange} aria-label="Report" />);
      const [one, two, three] = screen.getAllByRole("tab");
      one.focus();
      arrow("ArrowRight");
      expect(document.activeElement).toBe(two);
      arrow("ArrowRight");
      expect(document.activeElement).toBe(three);
      // Off the end and back to the first tab.
      arrow("ArrowRight");
      expect(document.activeElement).toBe(one);
      arrow("ArrowLeft");
      expect(document.activeElement).toBe(three);
      // Moving focus is not choosing a report.
      expect(onChange).not.toHaveBeenCalled();
    });

    it("jumps to the ends with Home and End", () => {
      render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} />);
      const [one, , three] = screen.getAllByRole("tab");
      one.focus();
      arrow("End");
      expect(document.activeElement).toBe(three);
      arrow("Home");
      expect(document.activeElement).toBe(one);
    });

    // jsdom implements no Tab traversal, so the tab ORDER cannot be walked here. The
    // attribute that decides it can: exactly one tab may carry `tabindex="0"`, and it
    // has to be the open one. Ten reports otherwise cost ten Tab presses to step over.
    it("keeps exactly one tab in the page's tab order", () => {
      render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} />);
      const [one, two, three] = screen.getAllByRole("tab");
      expect(one).toHaveAttribute("tabindex", "-1");
      expect(two).toHaveAttribute("tabindex", "0");
      expect(three).toHaveAttribute("tabindex", "-1");
    });

    it("moves that one stop with the selection, not with the arrow keys", () => {
      const { rerender } = render(<Tabs tabs={LINKED} active="one" onChange={vi.fn()} />);
      const [one, , three] = screen.getAllByRole("tab");
      one.focus();
      // Arrowing is a look around, not a choice: it must not re-point the tab stop at
      // a report the user has not opened.
      fireEvent.keyDown(document.activeElement!, { key: "End" });
      expect(three).toHaveFocus();
      expect(one).toHaveAttribute("tabindex", "0");
      expect(three).toHaveAttribute("tabindex", "-1");
      // Choosing one does.
      rerender(<Tabs tabs={LINKED} active="three" onChange={vi.fn()} />);
      expect(one).toHaveAttribute("tabindex", "-1");
      expect(three).toHaveAttribute("tabindex", "0");
    });

    it("leaves every other key to the browser", () => {
      render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} />);
      const [one, two] = screen.getAllByRole("tab");
      two.focus();
      arrow("ArrowDown");
      expect(document.activeElement).toBe(two);
      arrow("Tab");
      expect(document.activeElement).toBe(two);
      expect(one).not.toHaveFocus();
    });
  });

  describe("the panel it does not render", () => {
    // `Tabs` is the STRIP; the caller renders the content, often in another part of
    // the tree. `panelId` is how the two halves find each other.
    it("wires the open tab to the caller's panel, and names the panel back", () => {
      render(
        <div>
          <Tabs tabs={TABS} active="two" onChange={vi.fn()} panelId="report-panel" />
          <div id="report-panel" role="tabpanel" aria-labelledby="report-panel-tab">
            Two's content
          </div>
        </div>,
      );
      const [one, two, three] = screen.getAllByRole("tab");
      expect(two).toHaveAttribute("aria-controls", "report-panel");
      // The panel takes its accessible name from whichever tab is open, so the id the
      // caller points `aria-labelledby` at has to be on the open one.
      expect(two).toHaveAttribute("id", "report-panel-tab");
      expect(screen.getByRole("tabpanel", { name: "Two" })).toBeInTheDocument();
      // A closed tab controls nothing: its panel is not in the document, and a
      // dangling aria-controls describes the tab as opening something that is gone.
      expect(one).not.toHaveAttribute("aria-controls");
      expect(three).not.toHaveAttribute("aria-controls");
    });

    it("stays silent about panels when the caller wires none", () => {
      render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} />);
      for (const tab of screen.getAllByRole("tab")) {
        expect(tab).not.toHaveAttribute("aria-controls");
      }
    });
  });
});
