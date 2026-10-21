import { createElement } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "../tabs";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * `overflowCue` (0.40, kk run 79 gap 1; every width since 0.46; 0.47 keksdose live #410 r4; 0.48 r5, in the row):
 * a › after the strip's end while tabs lie past it and a ‹ before its start while tabs lie
 * before it — each a step of ~75 % toward its own side, and neither ever turns round.
 * keksdose's `scroll-edge-cues.tsx` (which replaced the 0.40 caret there) is the reference.
 *
 * jsdom lays nothing out, so the strip's geometry is stubbed: a 300 px strip over 1000 px
 * of tabs, scrolled where `geo.left` says.
 */
const geo = { scrollWidth: 1000, clientWidth: 300, left: 0 };
const scrollBy = vi.fn();
const scrollTo = vi.fn();
const isStrip = (el: Element) => el.getAttribute("role") === "tablist";
const saved: [string, PropertyDescriptor | undefined][] = [];

function stub(name: string, get: (el: HTMLElement) => number, fallback: (el: HTMLElement) => number) {
  saved.push([name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name) ?? Object.getOwnPropertyDescriptor(Element.prototype, name)]);
  Object.defineProperty(HTMLElement.prototype, name, {
    configurable: true,
    get(this: HTMLElement) {
      return isStrip(this) ? get(this) : fallback(this);
    },
  });
}

beforeEach(() => {
  geo.scrollWidth = 1000;
  geo.clientWidth = 300;
  geo.left = 0;
  scrollBy.mockReset();
  scrollTo.mockReset();
  stub("scrollWidth", () => geo.scrollWidth, () => 0);
  stub("clientWidth", () => geo.clientWidth, () => 0);
  stub("scrollLeft", () => geo.left, () => 0);
  Object.assign(HTMLElement.prototype, { scrollBy, scrollTo });
});

afterEach(() => {
  for (const [name, desc] of saved.splice(0)) {
    if (desc) Object.defineProperty(HTMLElement.prototype, name, desc);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name];
  }
  vi.unstubAllGlobals();
});

const TABS = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, label: `Report ${i}` }));

function strip(props: Partial<Parameters<typeof Tabs<string>>[0]> = {}) {
  return createElement(Tabs<string>, { tabs: TABS, active: "t0", onChange: () => {}, overflowCue: true, ...props });
}

const scrollTo_ = () => {
  act(() => {
    screen.getByRole("tablist").dispatchEvent(new Event("scroll"));
  });
};
const more = () => screen.queryByRole("button", { name: "More tabs" });
const previous = () => screen.queryByRole("button", { name: "Previous tabs" });

describe("Tabs overflowCue", () => {
  it("at the start: only ›, and a tap scrolls the strip on by ~75 %", () => {
    render(strip());
    expect(previous()).toBeNull();
    const next = more()!;
    // Out of the tab order: the strip is one stop, walked with the arrow keys.
    expect(next).toHaveAttribute("tabindex", "-1");
    fireEvent.click(next);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 225 }));
  });

  it("in the middle: both, each scrolling toward its own side", () => {
    render(strip());
    geo.left = 300;
    scrollTo_();
    fireEvent.click(more()!);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 225 }));
    fireEvent.click(previous()!);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -225 }));
  });

  it("at the end: only ‹, which steps back rather than jumping to the first tab", () => {
    render(strip());
    geo.left = 700;
    scrollTo_();
    expect(more()).toBeNull();
    expect(screen.queryByRole("button", { name: "Back to the first tab" })).toBeNull();
    fireEvent.click(previous()!);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -225 }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("never changes a caret's direction: › always points to the end, ‹ to the start", () => {
    render(strip());
    geo.left = 300;
    scrollTo_();
    const icon = (b: HTMLElement) => b.querySelector("svg")!.getAttribute("class") ?? "";
    expect(icon(more()!)).toMatch(/chevron-right/);
    expect(icon(previous()!)).toMatch(/chevron-left/);
  });

  it("sits IN the row beside the strip (0.48, keksdose live #410 r5): ‹ before it, › after it", () => {
    render(strip());
    const tablist = screen.getByRole("tablist");
    const box = tablist.parentElement!;
    const endCue = more()!.closest("[data-tabs-overflow-cue]")!;
    expect(endCue).toHaveAttribute("data-tabs-overflow-cue", "end");
    // In flow, not laid over the last visible tab.
    expect(endCue).not.toHaveClass("absolute");
    expect(tablist.compareDocumentPosition(endCue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Centred on the labels, above the strip's rule, which carries on beneath it.
    expect(endCue).toHaveClass("items-center", "self-stretch", "border-b", "border-subtle");
    geo.left = 700;
    scrollTo_();
    const startCue = previous()!.closest("[data-tabs-overflow-cue]")!;
    expect(startCue).toHaveAttribute("data-tabs-overflow-cue", "start");
    expect(startCue).not.toHaveClass("absolute");
    expect(startCue.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Same box around the same strip.
    expect(screen.getByRole("tablist").parentElement).toBe(box);
  });

  it("is a bare glyph: no frame, fill or shadow; muted, primary on hover", () => {
    render(strip());
    const button = more()!;
    const cls = button.getAttribute("class") ?? "";
    expect(cls).not.toMatch(/(^|\s)(border|shadow-sm|bg-surface)(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)hover:bg-(?!transparent)/);
    expect(button).toHaveClass("text-muted", "hover:text-primary", "bg-transparent");
  });

  it("is reading-direction aware: in a right-to-left strip › still goes on and ‹ back", () => {
    render(<div dir="rtl">{strip()}</div>);
    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () => ({ direction: "rtl", getPropertyValue: () => "" }) as unknown as CSSStyleDeclaration,
    );
    // An RTL strip counts scrollLeft negative from its start.
    geo.left = -300;
    scrollTo_();
    fireEvent.click(more()!);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -225 }));
    fireEvent.click(previous()!);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 225 }));
    // The carets are mirrored with the direction, so each still points outward.
    expect(more()!.querySelector("svg")).toHaveClass("rtl:-scale-x-100");
    vi.restoreAllMocks();
  });

  it("is not there while the strip fits", () => {
    geo.scrollWidth = 300;
    render(strip());
    expect(screen.queryByRole("button", { name: /tabs|tab/i })).toBeNull();
  });

  it("is off by default, and the strip stays the root", () => {
    const { container } = render(strip({ overflowCue: undefined, className: "mt-2" }));
    expect(more()).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("role", "tablist");
    expect(container.firstElementChild).toHaveClass("mt-2");
  });

  it("puts the caller's className on the row that holds the strip and the carets", () => {
    const { container } = render(strip({ className: "mt-2" }));
    const row = container.firstElementChild as HTMLElement;
    expect(row).toHaveClass("mt-2", "flex");
    expect(screen.getByRole("tablist")).not.toHaveClass("mt-2");
    expect(row).toContainElement(more());
  });

  it("puts › after the strip's end, before an add button", () => {
    render(strip({ onAdd: () => {}, addLabel: "Add report" }));
    const add = screen.getByRole("button", { name: "Add report" });
    expect(more()!.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("tablist").parentElement).toContainElement(more());
    expect(screen.getByRole("tablist").parentElement).not.toContainElement(add);
  });

  it("speaks the provider's language", () => {
    render(<UiKitProvider labels={UI_KIT_LABELS_DE_CH}>{strip()}</UiKitProvider>);
    expect(screen.getByRole("button", { name: "Weitere Tabs" })).toBeInTheDocument();
    geo.left = 700;
    scrollTo_();
    expect(screen.getByRole("button", { name: "Vorherige Tabs" })).toBeInTheDocument();
  });
});
