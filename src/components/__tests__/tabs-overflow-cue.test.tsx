import { createElement } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "../tabs";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * `overflowCue` (0.40, kk run 79 gap 1): the caret beside a scrolling strip below `md` —
 * › while tabs lie past the end (a tap scrolls ~75 %), ‹ at the end (back to the first).
 * keksdose's `tab-strip-more.tsx` is what it replaces.
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

describe("Tabs overflowCue", () => {
  it("shows › while tabs lie past the end; a tap scrolls the strip on by ~75 %", () => {
    render(strip());
    const more = screen.getByRole("button", { name: "More tabs" });
    // Out of the tab order: the strip is one stop, walked with the arrow keys.
    expect(more).toHaveAttribute("tabindex", "-1");
    // Below md only.
    expect(more.closest("[data-tabs-overflow-cue]")).toHaveClass("md:hidden");
    fireEvent.click(more);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 225 }));
  });

  it("turns into ‹ at the end, which goes back to the first tab", () => {
    render(strip());
    geo.left = 700;
    act(() => {
      screen.getByRole("tablist").dispatchEvent(new Event("scroll"));
    });
    const back = screen.getByRole("button", { name: "Back to the first tab" });
    fireEvent.click(back);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 0 }));
    expect(screen.queryByRole("button", { name: "More tabs" })).toBeNull();
  });

  it("stays › in the middle, where tabs lie on both sides", () => {
    render(strip());
    geo.left = 300;
    act(() => {
      screen.getByRole("tablist").dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("button", { name: "More tabs" })).toBeInTheDocument();
  });

  it("scrolls the other way in a right-to-left strip", () => {
    render(<div dir="rtl">{strip()}</div>);
    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () => ({ direction: "rtl", getPropertyValue: () => "" }) as unknown as CSSStyleDeclaration,
    );
    fireEvent.click(screen.getByRole("button", { name: "More tabs" }));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -225 }));
    vi.restoreAllMocks();
  });

  it("is not there while the strip fits", () => {
    geo.scrollWidth = 300;
    render(strip());
    expect(screen.queryByRole("button", { name: /tabs|tab/i })).toBeNull();
  });

  it("is off by default, and the strip stays the root", () => {
    const { container } = render(strip({ overflowCue: undefined, className: "mt-2" }));
    expect(screen.queryByRole("button", { name: "More tabs" })).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("role", "tablist");
    expect(container.firstElementChild).toHaveClass("mt-2");
  });

  it("puts the caller's className on the row that holds the strip and the caret", () => {
    const { container } = render(strip({ className: "mt-2" }));
    const row = container.firstElementChild as HTMLElement;
    expect(row).toHaveClass("mt-2", "flex");
    expect(screen.getByRole("tablist")).not.toHaveClass("mt-2");
    expect(row).toContainElement(screen.getByRole("button", { name: "More tabs" }));
  });

  it("sits between the strip and an add button", () => {
    render(strip({ onAdd: () => {}, addLabel: "Add report" }));
    const more = screen.getByRole("button", { name: "More tabs" });
    const add = screen.getByRole("button", { name: "Add report" });
    expect(more.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("speaks the provider's language", () => {
    render(<UiKitProvider labels={UI_KIT_LABELS_DE_CH}>{strip()}</UiKitProvider>);
    expect(screen.getByRole("button", { name: "Weitere Tabs" })).toBeInTheDocument();
  });
});
