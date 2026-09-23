import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tabs } from "../ui";

/**
 * Keksdose live #262, round 3: *"I would rather keep the tabs but have multirow tabs
 * depending on the screen size, I will not loose the function to see all reports at
 * once and navigate by single click rather by double click."*
 *
 * Ten report tabs on a 406px screen used to be a sideways scroller showing about
 * three; round 2 answered with a `<select>` below `md`, which cost a tap to open and
 * a tap to choose and hid nine reports behind the tenth. `wrap` is the answer that
 * keeps all ten on screen and one click each: the strip flows onto as many rows as it
 * needs and the active tab becomes a filled chip, because an underline hung off the
 * container's bottom rule can only mark a tab in the row that touches that rule.
 *
 * jsdom has no layout and no media queries, so the whole breakpoint lives in the
 * class string — which is exactly what these tests can read. The `md:` half is
 * asserted as literal tokens rather than by rendering, because it is the half that
 * has to keep three OTHER pages (invoices, statements, bank imports) unchanged.
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

const classes = (el: Element) => el.className.split(/\s+/);
const list = () => screen.getByRole("tablist");

describe("Tabs", () => {
  describe("without `wrap` — the shape three other pages depend on", () => {
    it("stays the single-row underline strip, character for character", () => {
      render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} />);
      // The scroller and its bottom rule.
      expect(classes(list())).toEqual(
        "flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[var(--border)]".split(
          " ",
        ),
      );
      // The active marker is the underline riding that rule, not a fill.
      const active = screen.getByRole("tab", { name: "Two" });
      expect(classes(active)).toContain("border-b-2");
      expect(classes(active)).toContain("-mb-px");
      expect(classes(active)).toContain("border-[var(--text-primary)]");
      expect(active.className).not.toContain("bg-[var(--brand)]");
      // …and nothing wraps.
      expect(classes(list())).not.toContain("flex-wrap");
    });

    it("names the tablist only when asked to", () => {
      render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} />);
      expect(list()).not.toHaveAttribute("aria-label");
    });
  });

  describe("with `wrap`", () => {
    it("wraps the strip instead of scrolling it, and puts the row back at md", () => {
      render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} wrap />);
      const cls = classes(list());
      // The point of the row: every tab is laid out, none is pushed out of frame.
      expect(cls).toContain("flex-wrap");
      // Not a scroller. Asserted as a TOKEN, because `md:overflow-x-auto` contains
      // the substring and a `toContain` on the raw string would pass either way.
      expect(cls).not.toContain("overflow-x-auto");
      expect(cls).not.toContain("border-b");
      // …and from 768px up it is the default strip again, rule and all.
      expect(cls).toContain("md:flex-nowrap");
      expect(cls).toContain("md:overflow-x-auto");
      expect(cls).toContain("md:border-b");
      expect(cls).toContain("md:border-[var(--border)]");
    });

    it("marks the active tab with a filled brand chip, not a floating underline", () => {
      render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} wrap />);
      const active = classes(screen.getByRole("tab", { name: "Two" }));
      // Theme- and palette-proof: the store writes `--brand` and `--brand-contrast`
      // together for every preset, so this pair cannot end up unreadable.
      expect(active).toContain("bg-[var(--brand)]");
      expect(active).toContain("text-[var(--brand-contrast)]");
      // An underline attached to the container's bottom rule would mark only the
      // LAST row, and `-mb-px` would pull every other chip into the row beneath it.
      expect(active).not.toContain("border-b-2");
      expect(active).not.toContain("-mb-px");
      // Above the breakpoint the underline is exactly the default one again.
      expect(active).toContain("md:border-b-2");
      expect(active).toContain("md:-mb-px");
      expect(active).toContain("md:border-[var(--text-primary)]");
      expect(active).toContain("md:bg-transparent");
    });

    it("keeps every inactive tab readable, on the raised surface", () => {
      render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} wrap />);
      const idle = classes(screen.getByRole("tab", { name: "Three" }));
      expect(idle).toContain("bg-[var(--bg-surface)]");
      expect(idle).toContain("text-[var(--text-primary)]");
      expect(idle).not.toContain("bg-[var(--brand)]");
      // Ten labels have to fit three rows on a 406px phone: 32px chips (py-2 on
      // text-xs), the desktop sizing restored at md.
      expect(idle).toContain("text-xs");
      expect(idle).toContain("px-2.5");
      expect(idle).toContain("py-2");
      expect(idle).toContain("rounded-md");
      expect(idle).toContain("md:text-sm");
      expect(idle).toContain("md:px-3");
      expect(idle).toContain("md:rounded-none");
    });

    it("gives the tablist an accessible name and keeps the roles", () => {
      render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} wrap label="Report" />);
      expect(screen.getByRole("tablist", { name: "Report" })).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(3);
      expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "false");
    });

    it("still routes a linked tab the way an unwrapped one does", () => {
      const onChange = vi.fn();
      render(<Tabs tabs={LINKED} active="one" onChange={onChange} wrap />);
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
    // The rows flow in DOM order, so walking the tabs in DOM order is what carries
    // focus off the end of one row and onto the start of the next. Focus only:
    // activation stays on click/Enter/Space, because a tab here can be a real route
    // and arrowing past one must not navigate to it.
    const arrow = (key: string) => fireEvent.keyDown(document.activeElement!, { key });

    it("walks the strip with the arrow keys, wrapping at both ends", () => {
      const onChange = vi.fn();
      render(<Tabs tabs={LINKED} active="one" onChange={onChange} wrap label="Report" />);
      const [one, two, three] = screen.getAllByRole("tab");
      one.focus();
      arrow("ArrowRight");
      expect(document.activeElement).toBe(two);
      arrow("ArrowRight");
      expect(document.activeElement).toBe(three);
      // Off the end of the last row and back to the first chip of the first.
      arrow("ArrowRight");
      expect(document.activeElement).toBe(one);
      arrow("ArrowLeft");
      expect(document.activeElement).toBe(three);
      // Moving focus is not choosing a report.
      expect(onChange).not.toHaveBeenCalled();
    });

    it("jumps to the ends with Home and End", () => {
      render(<Tabs tabs={TABS} active="two" onChange={vi.fn()} wrap />);
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
