import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarChart3, Banknote, Cog, Home, Layers, ListChecks, Tags, Wallet } from "lucide-react";
import { AppShell, DEFAULT_MOBILE_BAR_MAX, splitMobileBar } from "../app-shell";
import type { AppShellNavItem } from "../app-shell";
import { IconButton } from "../../components/ui";
import { applyTextSize } from "../../theme/text-size";

/**
 * The phone bar and the sidebar at Large and Extra large (docs/text-size-harmonization.md
 * §4 Navigation, §10.7): at most four entries plus "More" at Large, three plus "More" at
 * Extra large, every entry at Normal; a More sheet that keeps each group's pages; the
 * hidden entries' links on the More cell for tours; labels that wrap instead of
 * truncating; a sidebar that never collapses to icons at Large; a top bar that keeps its
 * icons.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  window.localStorage.removeItem("appLayout.sidebarCollapsed");
  vi.unstubAllGlobals();
});

/** A `matchMedia` evaluating `(min-width: Npx)` / `(max-width: Npx)` against a fixed
 *  viewport, as use-breakpoint-032 does: 390 px is the phone layout at every size. */
function viewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches = min ? width >= Number(min[1]) : max ? width <= Number(max[1]) : false;
    return { matches, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

const NAV: AppShellNavItem[] = [
  { to: "/", label: "Home", icon: Home, dataTour: "nav-home" },
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
  { to: "/rules", label: "Rules", icon: Tags, dataTour: "nav-rules" },
  { to: "/settings", label: "Settings", icon: Cog },
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

/** The phone bar: the `data-tour="nav"` inside the fixed bottom box. */
function phoneBar(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".fixed.bottom-0 nav[data-tour=nav]")!;
}

/** The cells' names in order: each entry's link, then the More button. */
function cellNames(container: HTMLElement) {
  const bar = phoneBar(container);
  return Array.from(bar.children).map((cell) => {
    const control = cell.matches("a") ? cell : cell.querySelector("button")!;
    return control.textContent;
  });
}

describe("splitMobileBar", () => {
  it("keeps the app's order and moves the rest under More", () => {
    expect(splitMobileBar([1, 2, 3, 4, 5, 6, 7], 4)).toEqual({ shown: [1, 2, 3, 4], hidden: [5, 6, 7] });
  });

  it("shows one entry over the limit in full — More would take the same cell", () => {
    expect(splitMobileBar([1, 2, 3, 4, 5], 4)).toEqual({ shown: [1, 2, 3, 4, 5], hidden: [] });
    expect(splitMobileBar([1, 2, 3, 4], 3)).toEqual({ shown: [1, 2, 3, 4], hidden: [] });
  });

  it("never shows fewer than one entry", () => {
    expect(splitMobileBar([1, 2, 3], 0)).toEqual({ shown: [1], hidden: [2, 3] });
  });

  it("defaults to every entry at Normal, four at Large, three at Extra large", () => {
    expect(DEFAULT_MOBILE_BAR_MAX).toEqual({ normal: Number.POSITIVE_INFINITY, large: 4, xlarge: 3 });
  });
});

describe("mobileBarMax (§10.7)", () => {
  it("shows every entry at Normal, with no More cell", () => {
    viewport(390);
    const { container } = renderShell();
    expect(cellNames(container)).toEqual(NAV.map((n) => n.label));
    expect(phoneBar(container).style.gridTemplateColumns).toBe("repeat(7, minmax(0, 1fr))");
  });

  it("shows four entries and More at Large", () => {
    viewport(390);
    applyTextSize("large");
    const { container } = renderShell();
    expect(cellNames(container)).toEqual(["Home", "Budget", "Transactions", "Accounts", "More"]);
    expect(phoneBar(container).style.gridTemplateColumns).toBe("repeat(5, minmax(0, 1fr))");
  });

  it("shows three entries and More at Extra large", () => {
    viewport(390);
    applyTextSize("xlarge");
    const { container } = renderShell();
    expect(cellNames(container)).toEqual(["Home", "Budget", "Transactions", "More"]);
  });

  it("follows a size switch while mounted", () => {
    viewport(390);
    const { container } = renderShell();
    expect(cellNames(container)).toHaveLength(7);
    act(() => applyTextSize("xlarge"));
    expect(cellNames(container)).toHaveLength(4);
    act(() => applyTextSize("normal"));
    expect(cellNames(container)).toHaveLength(7);
  });

  it("takes a number for every size, and a per-size override", () => {
    viewport(390);
    const { container, unmount } = renderShell({ mobileBarMax: 2 });
    expect(cellNames(container)).toEqual(["Home", "Budget", "More"]);
    unmount();
    applyTextSize("large");
    const second = renderShell({ mobileBarMax: { large: 5 } });
    // Five plus More at Large; Extra large keeps its own default.
    expect(cellNames(second.container)).toEqual(["Home", "Budget", "Transactions", "Accounts", "Reports", "More"]);
  });

  it("counts after mobileHidden, in the app's order", () => {
    viewport(390);
    applyTextSize("large");
    const nav = NAV.map((n) => (n.to === "/" ? { ...n, mobileHidden: true } : n));
    const { container } = renderShell({ nav });
    expect(cellNames(container)).toEqual(["Budget", "Transactions", "Accounts", "Reports", "More"]);
  });
});

describe("the More sheet", () => {
  it("lists the hidden entries, each group with its pages", () => {
    viewport(390);
    applyTextSize("large");
    renderShell();
    const more = screen.getByRole("button", { name: "More" });
    expect(more).toHaveAttribute("aria-haspopup", "dialog");
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    const sheet = screen.getByRole("dialog", { name: "More pages" });
    for (const name of ["Reports", "Rules", "Settings"]) {
      expect(within(sheet).getByRole("link", { name })).toBeInTheDocument();
    }
    const pages = within(sheet).getByRole("list", { name: "Reports" });
    expect(within(pages).getAllByRole("link").map((a) => a.textContent)).toEqual(["Spending", "Income"]);
    // The entries the bar shows are not repeated.
    expect(within(sheet).queryByRole("link", { name: "Budget" })).toBeNull();
  });

  it("navigates and closes on a link", () => {
    viewport(390);
    applyTextSize("large");
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Income" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/reports/income");
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the current page in the sheet", () => {
    viewport(390);
    applyTextSize("large");
    renderShell({}, "/rules");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Rules" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("takes its words from moreLabels", () => {
    viewport(390);
    applyTextSize("large");
    renderShell({ moreLabels: { more: "Mehr", moreTitle: "Weitere Seiten" } });
    fireEvent.click(screen.getByRole("button", { name: "Mehr" }));
    expect(screen.getByRole("dialog", { name: "Weitere Seiten" })).toBeInTheDocument();
  });
});

describe("the More cell", () => {
  it("is marked active on a hidden entry's page and on its sub-pages", () => {
    viewport(390);
    applyTextSize("large");
    const { unmount } = renderShell({}, "/reports/spending");
    expect(screen.getByRole("button", { name: "More" }).className).toContain("text-[var(--brand)]");
    unmount();
    renderShell({}, "/budget");
    expect(screen.getByRole("button", { name: "More" }).className).not.toContain("text-[var(--brand)]");
  });

  it("carries the hidden entries' links and data-tour anchors for tours", () => {
    viewport(390);
    applyTextSize("large");
    const { container } = renderShell();
    const cell = container.querySelector<HTMLElement>("[data-slot=app-shell-more]")!;
    // keksdose's tours: `[data-tour="nav"] a[href="/rules"]` — and the entry's own tag.
    const byHref = container.querySelector('.fixed.bottom-0 [data-tour="nav"] a[href="/rules"]');
    expect(byHref).not.toBeNull();
    expect(cell.contains(byHref)).toBe(true);
    const byTag = container.querySelector('.fixed.bottom-0 [data-tour="nav-reports"]');
    expect(cell.contains(byTag)).toBe(true);
    // A hidden group's pages too.
    expect(cell.querySelector('a[href="/reports/income"]')).not.toBeNull();
    // Inert: hidden from assistive tech, out of the tab order, pointer-transparent.
    for (const anchor of cell.querySelectorAll("a")) {
      expect(anchor).toHaveAttribute("aria-hidden", "true");
      expect(anchor).toHaveAttribute("tabindex", "-1");
      expect(anchor.className).toContain("pointer-events-none");
      expect(anchor.className).toContain("inset-0");
    }
    // An entry the bar shows keeps its own link; More carries none for it.
    expect(cell.querySelector('a[href="/budget"]')).toBeNull();
  });
});

describe("bar labels wrap (§10.7)", () => {
  it("clamps at two lines instead of truncating one", () => {
    viewport(390);
    const { container } = renderShell();
    const label = within(phoneBar(container)).getByText("Transactions");
    expect(label.className).toContain("line-clamp-2");
    expect(label.className).toContain("break-words");
    expect(label.className).not.toMatch(/\btruncate\b/);
  });

  it("sets the bar's type in rem (text-caption), not 11px", () => {
    viewport(390);
    const { container } = renderShell();
    const cell = within(phoneBar(container)).getByRole("link", { name: "Home" });
    expect(cell.className).toContain("text-caption");
    expect(cell.className).not.toContain("text-[11px]");
  });
});

describe("the sidebar at Large (§4)", () => {
  it("is expanded at Large despite a persisted collapse, and offers no toggle", () => {
    viewport(1600);
    window.localStorage.setItem("appLayout.sidebarCollapsed", "1");
    applyTextSize("large");
    const { container } = renderShell();
    const aside = container.querySelector("aside")!;
    expect(aside.className).toContain("md:w-60");
    expect(screen.queryByLabelText("Expand sidebar")).toBeNull();
    expect(screen.queryByLabelText("Collapse sidebar")).toBeNull();
    // The labels are drawn, not only tooltips.
    expect(within(aside).getByText("Budget")).toBeInTheDocument();
    // The preference itself is kept for Normal.
    expect(window.localStorage.getItem("appLayout.sidebarCollapsed")).toBe("1");
  });

  it("collapses again at Normal from the kept preference", () => {
    viewport(1600);
    window.localStorage.setItem("appLayout.sidebarCollapsed", "1");
    applyTextSize("large");
    const { container } = renderShell();
    act(() => applyTextSize("normal"));
    expect(container.querySelector("aside")!.className).toContain("md:w-14");
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
  });
});

describe("the top bar keeps its icons (§4)", () => {
  it("shows no IconButton label as text at Large", () => {
    viewport(390);
    applyTextSize("large");
    const { container } = renderShell({
      topBar: (
        <header data-testid="top">
          <IconButton label="Notifications">
            <Home />
          </IconButton>
        </header>
      ),
    });
    const top = within(container).getByTestId("top");
    expect(within(top).getByRole("button", { name: "Notifications" }).textContent).toBe("");
  });
});
