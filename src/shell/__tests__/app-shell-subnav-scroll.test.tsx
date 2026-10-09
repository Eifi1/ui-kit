import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Box, Circle, Square } from "lucide-react";
import { AppShell, type AppShellNavItem } from "../app-shell";
import { applyTextSize } from "../../theme/text-size";

/** The phone sub-nav's opt-in single scrolling row (showcase audit). jsdom has no
 *  layout, so the scroll and the fade are pinned by classes and the default by its absence. */
const nav: AppShellNavItem[] = [
  {
    to: "/display",
    label: "Display",
    icon: Box,
    items: [
      { to: "/display/buttons", label: "Buttons", icon: Circle },
      { to: "/display/chips", label: "Chips", icon: Square },
    ],
  },
];

function phone() {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("max-width"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-text-size");
});

function shell(layout?: "wrap" | "scroll") {
  phone();
  render(
    <MemoryRouter initialEntries={["/display/chips"]}>
      <AppShell nav={nav} topBar={<div />} mobileSubNavLayout={layout}>
        page
      </AppShell>
    </MemoryRouter>,
  );
  return screen.getByRole("navigation", { name: "Display" }).querySelector("ul")!;
}

describe("AppShell mobileSubNavLayout", () => {
  it("wraps by default", () => {
    const list = shell();
    expect(list.className).toContain("flex-wrap");
    expect(list.className).not.toContain("overflow-x-auto");
  });

  it("scrolls in one row with scroll", () => {
    const list = shell("scroll");
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).not.toContain("flex-wrap");
  });

  it("scrolls by default at Large and Extra large, where a wrapped group covered the page (0.32.2)", () => {
    applyTextSize("large");
    expect(shell().className).toContain("overflow-x-auto");
  });

  it("keeps an explicit layout at every size", () => {
    applyTextSize("xlarge");
    expect(shell("wrap").className).toContain("flex-wrap");
  });
});
