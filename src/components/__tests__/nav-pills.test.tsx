import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NavPills } from "../nav-pills";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkComponent } from "../../i18n/kit-labels";

const SURFACES = [
  { value: "tx", label: "Transactions" },
  { value: "budgets", label: "Budgets" },
  { value: "accounts", label: "Accounts", disabled: true },
];

describe("NavPills (keksdose swipe-settings-card:152)", () => {
  it("buttons in a wrapping list in a named nav, the current one aria-current=true, no tabs", () => {
    const onSelect = vi.fn();
    render(<NavPills aria-label="Surface" items={SURFACES} current="budgets" onSelect={onSelect} />);
    const nav = screen.getByRole("navigation", { name: "Surface" });
    expect(nav.querySelector("ul")!.className).toContain("flex-wrap");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("tab")).toBeNull();
    const current = screen.getByRole("button", { name: "Budgets" });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(current.className).toContain("bg-inverse");
    expect(screen.getByRole("button", { name: "Transactions" })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: "Transactions" }));
    expect(onSelect).toHaveBeenCalledWith("tx");
    expect(screen.getByRole("button", { name: "Accounts" })).toBeDisabled();
  });

  it("rests every pill in an outline, the current one filled on the same box (0.60, keksdose live #514)", () => {
    render(<NavPills aria-label="Surface" items={SURFACES} current="budgets" onSelect={vi.fn()} />);
    // Not current: the secondary Button's outline, so it reads as pressable at rest.
    const idle = screen.getByRole("button", { name: "Transactions" });
    expect(idle).toHaveClass("border", "border-subtle");
    expect(idle).not.toHaveClass("bg-inverse");
    // Current: the inverse fill, its border there but transparent, so no pill jumps a pixel.
    const current = screen.getByRole("button", { name: "Budgets" });
    expect(current).toHaveClass("border", "border-transparent", "bg-inverse");
    expect(current).not.toHaveClass("border-subtle");
  });

  it("links get aria-current=page and go through renderLink", () => {
    const onSelect = vi.fn();
    render(
      <NavPills
        aria-label="Reports"
        items={[
          { value: "a", label: "A", href: "/a" },
          { value: "b", label: "B", href: "/b" },
        ]}
        current="a"
        onSelect={onSelect}
        renderLink={({ href, children, ...p }) => (
          <a data-router href={`#${href}`} {...p}>
            {children}
          </a>
        )}
      />,
    );
    const a = screen.getByRole("link", { name: "A" });
    expect(a).toHaveAttribute("aria-current", "page");
    expect(a).toHaveAttribute("data-router");
    expect(a).toHaveAttribute("href", "#/a");
    fireEvent.click(screen.getByRole("link", { name: "B" }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("currentType, size and landmark=false", () => {
    render(<NavPills landmark={false} aria-label="Steps" size="sm" currentType="step" items={SURFACES} current="tx" />);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("group", { name: "Steps" })).toBeInTheDocument();
    const current = screen.getByRole("button", { name: "Transactions" });
    expect(current).toHaveAttribute("aria-current", "step");
    expect(current.className).toContain("text-xs");
  });
});

const routerLink: KitLinkComponent = ({ href, children, ...p }) => (
  <a {...p} href={href} data-router="">
    {children}
  </a>
);

describe("NavPills — the provider's router link", () => {
  it("draws in-app pills with linkComponent and keeps aria-current; its own renderLink wins", () => {
    const items = [
      { value: "a", label: "Alpha", href: "/a" },
      { value: "b", label: "Beta", href: "https://example.com/b" },
    ];
    const { unmount } = render(
      <UiKitProvider linkComponent={routerLink}>
        <NavPills aria-label="Pages" items={items} current="a" />
      </UiKitProvider>,
    );
    const alpha = screen.getByRole("link", { name: "Alpha" });
    expect(alpha).toHaveAttribute("data-router");
    expect(alpha).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Beta" })).not.toHaveAttribute("data-router");
    unmount();
    render(
      <UiKitProvider linkComponent={routerLink}>
        <NavPills
          aria-label="Pages"
          items={items}
          current="a"
          renderLink={(p) => (
            <a {...p} data-own="">
              {p.children}
            </a>
          )}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute("data-own");
    expect(screen.getByRole("link", { name: "Alpha" })).not.toHaveAttribute("data-router");
  });
});

// 0.49 KIT-6: one sideways-scrolling row of pills, the current pill scrolled into view.
// Tested through SectionNav until 0.53 removed it (deprecated in 0.52, MOD-5); the row
// is NavPills' own.
describe('NavPills layout="scroll"', () => {
  const PAGES = [
    { value: "journal", label: "Journal", href: "/accounting/journal" },
    { value: "accounts", label: "Accounts", href: "/accounting/accounts" },
    { value: "invoices", label: "Invoices", href: "/accounting/invoices" },
    { value: "balance", label: "Balance sheet", href: "/accounting/balance" },
    { value: "trial", label: "Trial balance", href: "/accounting/trial" },
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is one row that scrolls sideways, in a named nav, the current page marked", () => {
    render(<NavPills aria-label="Accounting" items={PAGES} current="invoices" layout="scroll" />);
    const nav = screen.getByRole("navigation", { name: "Accounting" });
    const list = within(nav).getByRole("list");
    expect(list).toHaveClass("flex-nowrap", "overflow-x-auto");
    expect(list).not.toHaveClass("flex-wrap");
    expect(within(nav).getByRole("link", { name: "Invoices" })).toHaveAttribute("aria-current", "page");
  });

  it("scrolls the current pill into view, in the row only", () => {
    const scrollBy = vi.fn();
    const pageScroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(HTMLElement.prototype, "scrollBy", { configurable: true, value: scrollBy });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const current = this.getAttribute("aria-current") === "page";
      return (current ? { left: 400, right: 480 } : { left: 0, right: 300 }) as DOMRect;
    });
    render(<NavPills aria-label="Accounting" items={PAGES} current="trial" layout="scroll" />);
    expect(scrollBy).toHaveBeenCalledWith({ left: 480 - 300 + 24 });
    expect(pageScroll).not.toHaveBeenCalled();
    delete (HTMLElement.prototype as { scrollBy?: unknown }).scrollBy;
  });
});
