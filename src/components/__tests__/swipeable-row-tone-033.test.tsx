import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SWIPE_TONE, SwipeableRow, type SwipeAction, type SwipeTone } from "../swipeable-row";

/**
 * 0.33 (docs/colour-roles-harmonization.md §6, §12.6): a swipe action names a `tone`, or
 * an app's documented exception passes `paint`, and the kit paints the panel — a soft
 * wash under the tone's own text colour while it previews, the solid fill under that
 * fill's `-contrast` foreground once armed.
 *
 * Before, every call site wrote its own fill classes and the panel was dimmed to 60 % at
 * idle, which left the label at 2.4–4.5:1 on the kit's own swipes and white text on
 * every dark-mode pastel. The pairs themselves are measured in every shipped preset by
 * theme/__tests__/tokens-css-audit.test.ts; this file pins what the component applies.
 */

function renderRow(left: SwipeAction[]) {
  render(
    <SwipeableRow left={left}>
      <span>Monthly groceries</span>
    </SwipeableRow>,
  );
}

/** The sliding content div — the one that carries the pointer handlers. */
const slider = () => screen.getByText("Monthly groceries").parentElement!;

/** Drag left by `dx` px. jsdom measures the row 0 wide, so the drag is 200 px and one
 *  action arms at 100. */
function dragLeft(dx: number) {
  const el = slider();
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 300, clientY: 0, button: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 300 - dx / 2, clientY: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 300 - dx, clientY: 0, pointerType: "touch" });
}

/** The reveal panel: the painted layer holding the previewed action's label. */
const panel = (label: string) =>
  screen.getAllByText(label).find((el) => el.tagName === "SPAN" && !el.closest("button"))!.closest(".absolute") as HTMLElement;

const hasClass = (el: Element, cls: string) => el.className.split(/\s+/).includes(cls);

describe("SwipeAction tone", () => {
  it("previews the tone's soft wash under the tone's text, at full strength", () => {
    renderRow([{ label: "Delete", onCommit: vi.fn(), tone: "danger" }]);
    dragLeft(40);
    const p = panel("Delete");
    for (const cls of SWIPE_TONE.danger.idle.split(" ")) expect(hasClass(p, cls), cls).toBe(true);
    // The old dimming is gone: it was what put the label under 4.5:1.
    expect(p.className).not.toMatch(/(^|\s)opacity-60(\s|$)/);
    expect(p.className).not.toMatch(/(^|\s)text-white(\s|$)/);
  });

  it("arms to the solid fill under its -contrast foreground", () => {
    renderRow([{ label: "Delete", onCommit: vi.fn(), tone: "danger" }]);
    dragLeft(150);
    const p = panel("Delete");
    expect(hasClass(p, "bg-danger")).toBe(true);
    expect(hasClass(p, "text-danger-contrast")).toBe(true);
    expect(hasClass(p, "bg-danger-soft")).toBe(false);
  });

  it("gives every tone of the shared vocabulary an idle and an armed look", () => {
    const tones: SwipeTone[] = [
      "brand", "neutral", "success", "warning", "danger", "info", "income", "expense",
      "blue", "indigo", "purple", "teal", "orange",
    ];
    expect(Object.keys(SWIPE_TONE).sort()).toEqual([...tones].sort());
    for (const tone of tones) {
      const { idle, armed } = SWIPE_TONE[tone];
      // Each look sets a background AND a text colour, so no white default leaks in.
      expect(idle, tone).toMatch(/(^|\s)bg-\S+/);
      expect(idle, tone).toMatch(/(^|\s)text-\S+/);
      expect(armed, tone).toMatch(/(^|\s)bg-\S+/);
      expect(armed, tone).toMatch(/-contrast(\s|$)/);
    }
  });

  it("lays the card under the panel, so a translucent dark wash sits on the surface it was measured on", () => {
    renderRow([{ label: "Approve", onCommit: vi.fn(), tone: "success" }]);
    dragLeft(40);
    const base = panel("Approve").previousElementSibling as HTMLElement;
    expect(hasClass(base, "bg-surface")).toBe(true);
    expect(base).toHaveAttribute("aria-hidden");
  });

  it("draws the icon disc in the label's own colour, not white", () => {
    renderRow([{ label: "Delete", onCommit: vi.fn(), tone: "danger", icon: <svg data-testid="icon" /> }]);
    // The panel's copy of the icon; the keyboard button carries one too.
    const disc = () => panel("Delete").querySelector("[data-testid=icon]")!.parentElement!.className;
    dragLeft(40);
    expect(disc()).toContain("bg-current/10");
    dragLeft(150);
    expect(disc()).toContain("bg-current/20");
    expect(disc()).not.toContain("bg-white");
  });
});

describe("SwipeAction paint (a documented app exception)", () => {
  const paint = { fill: "var(--app-uncleared)", foreground: "#0f172a" };

  it("idles as a 14 % wash of the fill under the body ink", () => {
    renderRow([{ label: "Uncleared", onCommit: vi.fn(), paint }]);
    dragLeft(40);
    const p = panel("Uncleared");
    expect(p.style.getPropertyValue("--swipe-paint-fill")).toBe("var(--app-uncleared)");
    expect(p.style.getPropertyValue("--swipe-paint-fg")).toBe("#0f172a");
    expect(p.className).toContain("bg-[color-mix(in_oklab,var(--swipe-paint-fill)_14%,var(--bg-surface))]");
    expect(hasClass(p, "text-primary")).toBe(true);
    expect(p.className).not.toMatch(/(^|\s)opacity-60(\s|$)/);
  });

  it("arms to the fill itself under the app's foreground", () => {
    renderRow([{ label: "Uncleared", onCommit: vi.fn(), paint }]);
    dragLeft(150);
    const p = panel("Uncleared");
    expect(hasClass(p, "bg-[var(--swipe-paint-fill)]")).toBe(true);
    expect(hasClass(p, "text-[var(--swipe-paint-fg)]")).toBe(true);
  });
});

describe("the deprecated className path", () => {
  it("keeps the old look: the caller's fill, white text, dimmed until armed", () => {
    renderRow([{ label: "Archive", onCommit: vi.fn(), className: "bg-[var(--money-neutral)]", armedClassName: "bg-[var(--danger)]" }]);
    dragLeft(40);
    let p = panel("Archive");
    expect(hasClass(p, "bg-[var(--money-neutral)]")).toBe(true);
    expect(hasClass(p, "text-white")).toBe(true);
    expect(hasClass(p, "opacity-60")).toBe(true);
    dragLeft(150);
    p = panel("Archive");
    expect(hasClass(p, "bg-[var(--danger)]")).toBe(true);
    expect(hasClass(p, "opacity-60")).toBe(false);
  });

  it("lets the caller's classes set the text colour over the white default", () => {
    renderRow([
      { label: "Archive", onCommit: vi.fn(), className: "bg-[var(--danger)] text-[var(--danger-contrast)]", armedClassName: "bg-[var(--danger)]" },
    ]);
    dragLeft(40);
    const p = panel("Archive");
    expect(hasClass(p, "text-[var(--danger-contrast)]")).toBe(true);
    expect(hasClass(p, "text-white")).toBe(false);
  });
});
