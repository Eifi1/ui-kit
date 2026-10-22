import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FileText, Receipt, Wallet } from "lucide-react";
import { SectionNav } from "../section-nav";
import { NavPills } from "../nav-pills";

// 0.49 KIT-6: a section's sub-pages on the phone, as one sideways-scrolling row of pills
// under the page title — NavPills' `layout="scroll"`, the current pill scrolled into view.

const ITEMS = [
  { value: "journal", label: "Journal", href: "/accounting/journal", icon: FileText },
  { value: "accounts", label: "Accounts", href: "/accounting/accounts", icon: Wallet },
  { value: "invoices", label: "Invoices", href: "/accounting/invoices", icon: Receipt },
  { value: "balance", label: "Balance sheet", href: "/accounting/balance" },
  { value: "trial", label: "Trial balance", href: "/accounting/trial" },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SectionNav", () => {
  it("is a navigation landmark named by the section, the current page marked", () => {
    render(<SectionNav label="Accounting" items={ITEMS} current="invoices" />);
    const nav = screen.getByRole("navigation", { name: "Accounting" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Journal", "Accounts", "Invoices", "Balance sheet", "Trial balance"]);
    expect(within(nav).getByRole("link", { name: "Invoices" })).toHaveAttribute("aria-current", "page");
  });

  it("is one row that scrolls sideways, with 44 px touch targets and at most 48 px tall", () => {
    render(<SectionNav label="Accounting" items={ITEMS} current="journal" />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("flex-nowrap", "overflow-x-auto");
    expect(list).not.toHaveClass("flex-wrap");
    for (const link of screen.getAllByRole("link")) expect(link).toHaveClass("min-h-11");
    // 44 px pills and 2 px above and below: 48 px.
    expect(screen.getByRole("navigation")).toHaveClass("py-0.5");
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
    render(<SectionNav label="Accounting" items={ITEMS} current="trial" />);
    expect(scrollBy).toHaveBeenCalledWith({ left: 480 - 300 + 24 });
    expect(pageScroll).not.toHaveBeenCalled();
    delete (HTMLElement.prototype as { scrollBy?: unknown }).scrollBy;
  });

  it("is for the phone by default — the sidebar lists the pages from md up", () => {
    const { rerender } = render(<SectionNav label="Accounting" items={ITEMS} current="journal" />);
    expect(screen.getByRole("navigation")).toHaveClass("md:hidden");
    rerender(<SectionNav label="Accounting" items={ITEMS} current="journal" phoneOnly={false} />);
    expect(screen.getByRole("navigation")).not.toHaveClass("md:hidden");
  });
});

describe("NavPills layout", () => {
  it("wraps by default, as before", () => {
    render(<NavPills aria-label="Pick" items={ITEMS} current="journal" />);
    expect(screen.getByRole("list")).toHaveClass("flex-wrap");
  });
});
