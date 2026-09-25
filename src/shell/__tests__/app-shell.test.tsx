import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home, Layers, TextCursorInput } from "lucide-react";
import { AppShell } from "../app-shell";

/**
 * Refactor plan 2026-08-24, U-4.
 *
 * `AppShell` read the sidebar collapse flag straight out of `window.localStorage`
 * inside a `useState` initialiser. That access THROWS — it does not return null —
 * where a browser has site data blocked, and it happens during render of the
 * application's top-level shell, so the failure is not a lost preference: nothing
 * mounts, in every consumer of this package at once.
 */

const NAV = [{ to: "/", label: "Home", icon: Home }];

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell nav={NAV} topBar={<div>bar</div>}>
        <div>content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

/** Replace `window.localStorage` with one that throws on every access, the way a
 *  browser with site data blocked does. Returns the restore function. */
function blockSiteData(): () => void {
  const real = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  return () => {
    if (real) Object.defineProperty(window, "localStorage", real);
    else Reflect.deleteProperty(window, "localStorage");
  };
}

describe("AppShell", () => {
  it("mounts normally when storage works, and remembers the collapse flag", () => {
    window.localStorage.setItem("appLayout.sidebarCollapsed", "1");
    renderShell();
    expect(screen.getByText("content")).toBeInTheDocument();
    // Collapsed: the toggle offers to expand.
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
    window.localStorage.removeItem("appLayout.sidebarCollapsed");
  });

  it("still mounts when localStorage throws (U-4)", () => {
    const restore = blockSiteData();
    try {
      renderShell();
      expect(screen.getByText("content")).toBeInTheDocument();
      // Falls back to expanded, which is the default the unreadable key stands for.
      expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});

const GROUPED = [
  { to: "/home", label: "Home", icon: Home },
  {
    to: "/forms",
    label: "Forms",
    icon: Layers,
    end: false,
    items: [
      { to: "/fields", label: "Fields", icon: TextCursorInput },
      { to: "/dates", label: "Dates", icon: TextCursorInput },
    ],
  },
];

function renderGrouped(path: string, subNav?: "flyout" | "inline") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell nav={GROUPED} topBar={<div />} subNav={subNav}>
        <div>content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

/** The sidebar's copy of a link — the mobile bottom bar renders the same entries. */
const sidebarLink = (name: string) =>
  screen.getAllByRole("link", { name }).find((a) => a.closest("aside"))!;

describe("AppShell — the group that holds the current page", () => {
  it("highlights a flyout group while one of its sub-pages is open", () => {
    renderGrouped("/dates");
    // The group's own `to` is /forms; NavLink alone would not mark it on /dates.
    expect(sidebarLink("Forms").className).toContain("bg-[var(--bg-inverse)]");
    expect(sidebarLink("Home").className).not.toContain("bg-[var(--bg-inverse)]");
  });

  it("inline mode lists the sub-pages, opened on the current group, and toggles", () => {
    renderGrouped("/dates", "inline");
    const toggle = screen.getByRole("button", { name: "Forms: pages" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // The page carries the strong marker; the group is the lighter trail.
    expect(sidebarLink("Dates").className).toContain("bg-[var(--bg-inverse)]");
    expect(sidebarLink("Forms").className).not.toContain("bg-[var(--bg-inverse)]");
    expect(sidebarLink("Forms").className).toContain("font-medium");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).not.toBeVisible();
  });

  it("inline mode starts closed on a group the reader is not in", () => {
    renderGrouped("/home", "inline");
    expect(screen.getByRole("button", { name: "Forms: pages" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("AppShell — the phone's page row", () => {
  /** The bottom bar's own wrapper — jsdom renders both navigations, CSS hides one. */
  const phoneNav = (container: HTMLElement) => container.querySelector<HTMLElement>(".fixed.bottom-0")!;

  it("shows the current group's pages above the bar, the current one marked", () => {
    const { container } = renderGrouped("/dates");
    const row = within(phoneNav(container)).getByRole("navigation", { name: "Forms" });
    expect(within(row).getByRole("link", { name: "Dates" })).toHaveAttribute("aria-current", "page");
    expect(within(row).getByRole("link", { name: "Fields" })).not.toHaveAttribute("aria-current");
  });

  it("also shows it on the group's own overview page", () => {
    const { container } = renderGrouped("/forms");
    expect(within(phoneNav(container)).getByRole("navigation", { name: "Forms" })).toBeInTheDocument();
  });

  it("stays one row on a page outside every group", () => {
    const { container } = renderGrouped("/home");
    expect(within(phoneNav(container)).queryByRole("navigation", { name: "Forms" })).toBeNull();
  });

  it("marks the group in the bar while one of its pages is open", () => {
    const { container } = renderGrouped("/dates");
    const cell = within(phoneNav(container))
      .getAllByRole("link", { name: "Forms" })
      .find((a) => a.closest("[data-tour=nav]"))!;
    expect(cell.className).toContain("text-[var(--brand)]");
  });

  it("mobileSubNav={false} keeps the single bar", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dates"]}>
        <AppShell nav={GROUPED} topBar={<div />} mobileSubNav={false}>
          <div />
        </AppShell>
      </MemoryRouter>,
    );
    expect(within(phoneNav(container)).queryByRole("navigation", { name: "Forms" })).toBeNull();
  });
});

describe("AppShell — the inline sidebar is an accordion", () => {
  const TWO_GROUPS = [
    ...GROUPED,
    {
      to: "/display",
      label: "Display",
      icon: Layers,
      items: [{ to: "/charts", label: "Charts", icon: Layers }],
    },
  ];

  it("opening a group closes the one that was open", () => {
    render(
      <MemoryRouter initialEntries={["/dates"]}>
        <AppShell nav={TWO_GROUPS} topBar={<div />} subNav="inline">
          <div />
        </AppShell>
      </MemoryRouter>,
    );
    const forms = screen.getByRole("button", { name: "Forms: pages" });
    const display = screen.getByRole("button", { name: "Display: pages" });
    expect(forms).toHaveAttribute("aria-expanded", "true");
    expect(display).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(display);
    expect(display).toHaveAttribute("aria-expanded", "true");
    expect(forms).toHaveAttribute("aria-expanded", "false");

    // And shut again, leaving none open.
    fireEvent.click(display);
    expect(display).toHaveAttribute("aria-expanded", "false");
  });
});

describe("AppShell in RTL (0.7.0)", () => {
  const GROUPED = [
    {
      to: "/",
      label: "Home",
      icon: Home,
      items: [{ to: "/fields", label: "Fields", icon: TextCursorInput }],
    },
  ];

  it("draws the sidebar's rule on its logical END and mirrors the directional icons", () => {
    render(
      <MemoryRouter>
        <AppShell nav={GROUPED} topBar={<div>bar</div>}>
          <div>content</div>
        </AppShell>
      </MemoryRouter>,
    );
    const aside = document.querySelector("aside")!;
    expect(aside.className).toContain("border-e");
    expect(aside.className).not.toMatch(/\bborder-r\b/);
    const collapseIcon = screen.getByRole("button", { name: "Collapse sidebar" }).querySelector("svg")!;
    expect(collapseIcon.getAttribute("class")).toContain("rtl:-scale-x-100");
    const icons = screen.getAllByRole("link", { name: "Home" })[0].querySelectorAll("svg");
    const groupChevron = icons[icons.length - 1];
    expect(groupChevron.getAttribute("class")).toContain("rtl:-scale-x-100");
  });

  it("carries the page's `dir` onto the portalled flyout and anchors it from the end", () => {
    render(
      <div dir="rtl">
        <MemoryRouter>
          <AppShell nav={GROUPED} topBar={<div>bar</div>} collapseStorageKey="rtl-test">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </div>,
    );
    fireEvent.mouseEnter(screen.getAllByRole("link", { name: "Home" })[0].parentElement!);
    const menu = screen.getByRole("menu", { name: "Home" });
    const panel = menu.parentElement!;
    expect(panel).toHaveAttribute("dir", "rtl");
    expect(panel.style.right).not.toBe("");
    expect(panel.style.left).toBe("");
    expect(panel.className).toContain("ps-1");
  });
});
