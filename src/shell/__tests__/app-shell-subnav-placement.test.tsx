import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Box, Circle, Home, Square, Triangle } from "lucide-react";
import { AppShell, type AppShellNavItem, type AppShellProps } from "../app-shell";
import { TopBar } from "../top-bar";
import { TAB_FADE_PX } from "../../lib/strip-fade";
import { stubPhone } from "../../test/viewport";

/**
 * 0.60, kastlan prod feedback #22: `mobileSubNavPlacement="top"` moves the phone's page
 * row from above the bottom bar to under the top bar. Its one `scroll` row and the bar
 * stacked into one deep block at the bottom of every page.
 *
 * jsdom lays nothing out, so where the row sits is pinned by the DOM (which box holds it,
 * what comes before and after it) and by its classes. `--app-nav-h` is pinned by a box
 * height stubbed per row, so the value says how many rows the measured box holds.
 */

const NAV: AppShellNavItem[] = [
  { to: "/", label: "Home", icon: Home },
  {
    to: "/display",
    label: "Display",
    icon: Box,
    items: [
      { to: "/display/buttons", label: "Buttons", icon: Circle },
      { to: "/display/chips", label: "Chips", icon: Square },
      { to: "/display/shapes", label: "Shapes", icon: Triangle },
    ],
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty("--app-nav-h");
});

function renderShell(props: Partial<AppShellProps> = {}, at = "/display/chips") {
  stubPhone();
  return render(
    <MemoryRouter initialEntries={[at]}>
      <AppShell nav={NAV} topBar={<TopBar brand="K" data-testid="top-bar" />} {...props}>
        <div data-testid="page">page</div>
      </AppShell>
    </MemoryRouter>,
  );
}

const shellRoot = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-app-shell]")!;
/** The bottom bar's fixed box, which `--app-nav-h` measures. */
const bottomBox = (container: HTMLElement) => container.querySelector<HTMLElement>(".fixed.bottom-0")!;
const pageRow = () => screen.queryByRole("navigation", { name: "Display" });

describe("AppShell mobileSubNavPlacement (0.60)", () => {
  it("keeps the row above the bar by default", () => {
    const { container } = renderShell();
    const row = pageRow()!;
    expect(bottomBox(container)).toContainElement(row);
    expect(row.nextElementSibling).toHaveAttribute("data-tour", "nav");
  });

  it("top: renders the row under the top bar, out of the bottom box", () => {
    const { container } = renderShell({ mobileSubNavPlacement: "top" });
    const row = pageRow()!;
    expect(bottomBox(container)).not.toContainElement(row);
    // The shell's own child, right after the top bar and before the content row.
    expect(row.parentElement).toBe(shellRoot(container));
    expect(row.previousElementSibling).toBe(screen.getByTestId("top-bar"));
    expect(row.compareDocumentPosition(screen.getByTestId("page")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The bar keeps its cells, the group's among them.
    expect(within(bottomBox(container)).getByRole("button", { name: "Display" })).toBeInTheDocument();
  });

  it("top: sticks right under the TopBar, in the flow, so the page starts below it", () => {
    const { container } = renderShell({ mobileSubNavPlacement: "top" });
    const row = pageRow()!;
    const bar = screen.getByTestId("top-bar");
    // Sticky like the bar, not fixed: it keeps its height in the column, so nothing has
    // to reserve it, and it sticks one TopBar (h-12) down.
    expect(bar).toHaveClass("sticky", "top-0", "h-12", "z-40");
    expect(row).toHaveClass("sticky", "top-12", "bg-surface", "md:hidden");
    expect(row).not.toHaveClass("fixed");
    expect(row).not.toHaveClass("absolute");
    // Under the bar's layer, whose menus open over the row; over a page's own z-30.
    expect(row).toHaveClass("z-[35]");
    // The entrance comes down out of the bar (tokens.css keys on this).
    expect(row).toHaveAttribute("data-placement", "top");
    expect(row).toHaveClass("animate-subnav");
    // `<main>`'s bottom room is still the bar's measured height.
    expect(container.querySelector("main")!.className).toContain("pb-[calc(var(--app-nav-h,4rem)");
  });

  describe("--app-nav-h", () => {
    // Each `<nav>` straight in a box counts 56px, so the published value counts the rows
    // the bottom box holds: 112px for row + bar, 56px for the bar alone.
    function stubRowHeights() {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
        const height = 56 * this.querySelectorAll(":scope > nav").length;
        return { x: 0, y: 0, top: 0, left: 0, right: 0, width: 0, bottom: height, height, toJSON: () => ({}) };
      });
    }
    const navH = () => document.documentElement.style.getPropertyValue("--app-nav-h");

    it("covers both rows when the row is at the bottom", () => {
      stubRowHeights();
      renderShell();
      expect(navH()).toBe("112px");
    });

    it("top: measures the bar alone, on <html> and on the shell", () => {
      stubRowHeights();
      const { container } = renderShell({ mobileSubNavPlacement: "top" });
      expect(navH()).toBe("56px");
      expect(shellRoot(container).style.getPropertyValue("--app-nav-h")).toBe("56px");
    });
  });

  it.each(["wrap", "scroll"] as const)("top: lays the row out as %s, as at the bottom", (layout) => {
    const { container } = renderShell({ mobileSubNavPlacement: "top", mobileSubNavLayout: layout });
    const row = pageRow()!;
    expect(row.parentElement).toBe(shellRoot(container));
    const list = row.querySelector("ul")!;
    if (layout === "wrap") {
      expect(list).toHaveClass("flex-wrap");
      expect(list).not.toHaveClass("overflow-x-auto");
    } else {
      expect(list).toHaveClass("overflow-x-auto");
      expect(list).not.toHaveClass("flex-wrap");
    }
  });

  it("top, scroll: fades the cut edge and scrolls the current page into view", () => {
    const { container } = renderShell(
      { mobileSubNavPlacement: "top", mobileSubNavLayout: "scroll" },
      "/display/buttons",
    );
    const row = pageRow()!;
    expect(row.parentElement).toBe(shellRoot(container));
    const list = row.querySelector("ul")!;
    // Three pills in 300px of a 600px strip: the end is cut.
    Object.defineProperty(list, "scrollWidth", { configurable: true, value: 600 });
    Object.defineProperty(list, "clientWidth", { configurable: true, value: 300 });
    fireEvent.scroll(list);
    expect(list).toHaveAttribute("data-overflow", "end");

    // Opening the last page, which sits past the edge, brings it clear of the fade.
    const box = { x: 0, y: 0, top: 0, bottom: 40, height: 40, toJSON: () => ({}) };
    vi.spyOn(list, "getBoundingClientRect").mockReturnValue({ ...box, left: 0, right: 300, width: 300 });
    const shapes = within(row).getByRole("link", { name: "Shapes" });
    vi.spyOn(shapes, "getBoundingClientRect").mockReturnValue({ ...box, left: 400, right: 480, width: 80 });
    const scrollBy = vi.fn();
    list.scrollBy = scrollBy as typeof list.scrollBy;
    fireEvent.click(shapes);
    expect(shapes).toHaveAttribute("aria-current", "page");
    expect(scrollBy).toHaveBeenCalledWith({ left: 480 - 300 + TAB_FADE_PX });
  });

  it("top, embedded: the row sits under the embedded shell's own top bar", () => {
    const { container } = renderShell({ mobileSubNavPlacement: "top", embedded: true });
    const row = pageRow()!;
    expect(row.parentElement).toBe(shellRoot(container));
    expect(row.previousElementSibling).toBe(screen.getByTestId("top-bar"));
    expect(bottomBox(container)).not.toContainElement(row);
    // Embedded, nothing is published on <html> (the shell keeps its own).
    expect(document.documentElement.style.getPropertyValue("--app-nav-h")).toBe("");
  });

  it("top with mobileSubNav={false}: no row in either place", () => {
    const { container } = renderShell({ mobileSubNavPlacement: "top", mobileSubNav: false });
    expect(pageRow()).toBeNull();
    expect(bottomBox(container).querySelectorAll("nav")).toHaveLength(1);
  });

  it("top, on a page outside every group: no row and no empty shelf", () => {
    const { container } = renderShell({ mobileSubNavPlacement: "top" }, "/");
    expect(pageRow()).toBeNull();
    expect(shellRoot(container).querySelector("[data-slot=app-shell-subnav]")).toBeNull();
    // The top bar, the content row and the bottom box; nothing between them.
    expect(screen.getByTestId("top-bar").nextElementSibling).toBe(container.querySelector("aside")!.parentElement);
  });
});
