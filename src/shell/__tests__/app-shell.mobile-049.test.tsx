import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarChart3, Banknote, Cog, Download, Home, Layers, ListChecks, Store, Tags, Wallet } from "lucide-react";
import { AppShell, DEFAULT_MOBILE_MAX_ITEMS, pickMobileBar } from "../app-shell";
import type { AppShellNavItem } from "../app-shell";
import { applyTextSize } from "../../theme/text-size";
import { viewportMatchMedia } from "../../test/viewport";

/**
 * 0.49 KIT-6, the phone navigation: at most `mobileMaxItems` cells (default 5, "More"
 * included) at every text size, `mobilePriority` choosing which entries sit in the bar,
 * a parent with pages opening a sheet of them, and a development warning for a
 * `shortLabel` that names something else than its `label`.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function viewport(width: number) {
  vi.stubGlobal("matchMedia", viewportMatchMedia(width));
}

// Eight entries, as the showcase's example.
const NAV: AppShellNavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: ListChecks },
  { to: "/accounts", label: "Accounts", icon: Banknote },
  {
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    dataTour: "nav-reports",
    items: [
      { to: "/reports/spending", label: "Spending", icon: BarChart3 },
      { to: "/reports/income", label: "Income", icon: Layers },
    ],
  },
  { to: "/imports", label: "Imports", icon: Download },
  { to: "/rules", label: "Rules", icon: Tags },
  { to: "/payees", label: "Payees", icon: Store },
];

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderShell(props: Partial<Parameters<typeof AppShell>[0]> = {}, at = "/") {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <AppShell nav={NAV} topBar={<div>bar</div>} {...props}>
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </AppShell>
    </MemoryRouter>,
  );
}

function phoneBar(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".fixed.bottom-0 nav[data-tour=nav]")!;
}

function cellNames(container: HTMLElement) {
  return Array.from(phoneBar(container).children).map((cell) => {
    const control = cell.matches("a, button") ? cell : cell.querySelector("button")!;
    return control.textContent;
  });
}

describe("pickMobileBar", () => {
  it("shows every entry when they fit, in the list's order", () => {
    expect(pickMobileBar([1, 2, 3, 4, 5], 5)).toEqual({ shown: [1, 2, 3, 4, 5], hidden: [] });
  });

  it("keeps max − 1 entries and a More cell when they do not", () => {
    expect(pickMobileBar([1, 2, 3, 4, 5, 6, 7, 8], 5)).toEqual({ shown: [1, 2, 3, 4], hidden: [5, 6, 7, 8] });
  });

  it("chooses by priority (lower first, unprioritised last) and keeps the list's order", () => {
    const entries = ["a", "b", "c", "d", "e", "f"];
    const priority = (e: string) => ({ f: 1, b: 2, e: 3 })[e];
    expect(pickMobileBar(entries, 4, priority)).toEqual({ shown: ["b", "e", "f"], hidden: ["a", "c", "d"] });
    // Two prioritised, then the list's first unprioritised one.
    expect(pickMobileBar(["a", "b", "c", "d", "e", "f"], 4, (e) => ({ f: 1, b: 2 })[e])).toEqual({
      shown: ["a", "b", "f"],
      hidden: ["c", "d", "e"],
    });
  });

  it("never fewer than one entry beside More", () => {
    expect(pickMobileBar([1, 2, 3], 1)).toEqual({ shown: [1], hidden: [2, 3] });
  });

  it("defaults to five cells at Normal and Large, four at Extra large", () => {
    expect(DEFAULT_MOBILE_MAX_ITEMS).toEqual({ normal: 5, large: 5, xlarge: 4 });
  });
});

describe("mobileMaxItems", () => {
  it("shows four entries and More for eight entries at Normal", () => {
    viewport(390);
    const { container } = renderShell();
    expect(cellNames(container)).toEqual(["Home", "Budget", "Transactions", "Accounts", "More"]);
    expect(phoneBar(container).style.gridTemplateColumns).toBe("repeat(5, minmax(0, 1fr))");
  });

  it("three entries and More at Extra large", () => {
    viewport(390);
    applyTextSize("xlarge");
    const { container } = renderShell();
    expect(cellNames(container)).toEqual(["Home", "Budget", "Transactions", "More"]);
  });

  it("takes a number for every size and a per-size map", () => {
    viewport(390);
    const { container, unmount } = renderShell({ mobileMaxItems: 3 });
    expect(cellNames(container)).toEqual(["Home", "Budget", "More"]);
    unmount();
    const second = renderShell({ mobileMaxItems: { normal: 8 } });
    expect(cellNames(second.container)).toHaveLength(8);
  });

  it("puts the entries with a mobilePriority in the bar, in the list's order", () => {
    viewport(390);
    const nav = NAV.map((n) =>
      n.to === "/payees" ? { ...n, mobilePriority: 1 } : n.to === "/rules" ? { ...n, mobilePriority: 2 } : n,
    );
    const { container } = renderShell({ nav, mobileMaxItems: 4 });
    // Two by priority, then the list's first one; displayed in the list's order.
    expect(cellNames(container)).toEqual(["Home", "Rules", "Payees", "More"]);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const sheet = screen.getByRole("dialog", { name: "More pages" });
    expect(within(sheet).queryByRole("link", { name: "Payees" })).toBeNull();
    expect(within(sheet).getByRole("link", { name: "Budget" })).toBeInTheDocument();
  });
});

describe("a parent with pages on the phone", () => {
  it("opens a sheet of its pages instead of linking to its own page", () => {
    viewport(390);
    const { container } = renderShell({ mobileMaxItems: 8 });
    const reports = within(phoneBar(container)).getByRole("button", { name: "Reports" });
    expect(reports).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(reports);
    const sheet = screen.getByRole("dialog", { name: "Reports" });
    expect(within(sheet).getAllByRole("link").map((a) => a.textContent)).toEqual(["Overview", "Spending", "Income"]);
    fireEvent.click(within(sheet).getByRole("link", { name: "Income" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/reports/income");
    expect(screen.queryByRole("dialog", { name: "Reports" })).toBeNull();
  });

  it("is marked on its pages, and keeps its link for tours", () => {
    viewport(390);
    const { container } = renderShell({ mobileMaxItems: 8 }, "/reports/spending");
    const reports = within(phoneBar(container)).getByRole("button", { name: "Reports" });
    expect(reports).toHaveClass("text-brand");
    expect(phoneBar(container).querySelector('a[href="/reports"][data-tour="nav-reports"]')).not.toBeNull();
  });

  it("is reachable through More too, with its pages", () => {
    viewport(390);
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const pages = within(screen.getByRole("dialog", { name: "More pages" })).getByRole("list", { name: "Reports" });
    expect(within(pages).getAllByRole("link").map((a) => a.textContent)).toEqual(["Spending", "Income"]);
  });

  it("follows a size switch while mounted", () => {
    viewport(390);
    const { container } = renderShell();
    expect(cellNames(container)).toHaveLength(5);
    act(() => applyTextSize("xlarge"));
    expect(cellNames(container)).toHaveLength(4);
  });
});

describe("shortLabel names its label", () => {
  function devBuild() {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", true);
    return vi.spyOn(console, "warn").mockImplementation(() => {});
  }
  const one = (item: Partial<AppShellNavItem>): AppShellNavItem[] => [
    { to: "/", label: "Home", icon: Home },
    { to: "/x", label: "Transactions", icon: Cog, ...item },
  ];

  it("warns in development when the short label is another word", () => {
    const warn = devBuild();
    renderShell({ nav: one({ shortLabel: "Activity", shortLabelFrom: "large" }) });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('shortLabel "Activity" does not start with "Transactions"');
    expect(warn.mock.calls[0]![0]).toContain("from Large text up");
  });

  it("is quiet for an abbreviation, the first word, or a declared alias", () => {
    const warn = devBuild();
    renderShell({ nav: one({ shortLabel: "Trans." }) });
    renderShell({ nav: [{ to: "/i", label: "Import & Export", shortLabel: "Import", icon: Download }] });
    renderShell({ nav: one({ shortLabel: "Activity", shortLabelIsAlias: true }) });
    expect(warn).not.toHaveBeenCalled();
  });

  it("is quiet in production", () => {
    vi.stubEnv("DEV", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderShell({ nav: one({ shortLabel: "Activity" }) });
    expect(warn).not.toHaveBeenCalled();
  });
});
