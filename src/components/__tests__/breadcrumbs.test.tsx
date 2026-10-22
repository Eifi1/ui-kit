import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "../breadcrumbs";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkComponent } from "../../i18n/kit-labels";

const TRAIL = [
  { label: "Home", href: "/" },
  { label: "Estates", href: "/estates" },
  { label: "Riverside", href: "/estates/1" },
  { label: "Building A", href: "/buildings/4" },
  { label: "Unit 4" },
];

describe("Breadcrumbs", () => {
  it("is a named nav holding an ordered list, the last crumb the current page", () => {
    render(<Breadcrumbs items={TRAIL.slice(0, 3)} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const list = within(nav).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const current = screen.getByText("Riverside");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Riverside" })).toBeNull();
    expect(screen.getByRole("link", { name: "Estates" })).toHaveAttribute("href", "/estates");
  });

  it("names the nav in the provider's language", () => {
    render(
      <UiKitProvider labels={{ breadcrumbs: { label: "Brotkrümelnavigation" } }}>
        <Breadcrumbs items={TRAIL.slice(0, 2)} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Brotkrümelnavigation" })).toBeInTheDocument();
  });

  it("renders router links through renderLink", () => {
    render(
      <Breadcrumbs
        items={TRAIL.slice(0, 2)}
        renderLink={({ href, children, ...p }) => (
          <a data-router="" href={`#${href}`} {...p}>
            {children}
          </a>
        )}
      />,
    );
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("data-router");
    expect(link).toHaveAttribute("href", "#/");
  });

  it("draws a hidden separator between crumbs, mirrored in RTL", () => {
    const { container } = render(
      <div dir="rtl">
        <Breadcrumbs items={TRAIL.slice(0, 3)} />
      </div>,
    );
    const seps = container.querySelectorAll("li > span[aria-hidden]");
    expect(seps).toHaveLength(2);
    for (const sep of seps) {
      expect(sep.querySelector("svg")!.getAttribute("class")).toContain("rtl:-scale-x-100");
    }
    // Logical layout: nothing physical to flip by hand.
    expect(container.innerHTML).not.toMatch(/\b(ml|mr|pl|pr)-\d/);
  });

  it("draws a custom separator as given", () => {
    render(<Breadcrumbs items={TRAIL.slice(0, 2)} separator="/" />);
    expect(screen.getByText("/")).toHaveAttribute("aria-hidden", "true");
  });

  it("collapses the middle on phones behind a '…' button, keeping the first and the last two", () => {
    render(<Breadcrumbs items={TRAIL} />);
    const items = screen.getAllByRole("listitem");
    // Home, …, Estates, Riverside, Building A, Unit 4
    expect(items).toHaveLength(6);
    const more = screen.getByRole("button", { name: "Show full path" });
    expect(more.closest("li")!.className).toContain("md:hidden");
    expect(screen.getByRole("link", { name: "Estates" }).closest("li")!.className).toContain("hidden md:flex");
    expect(screen.getByRole("link", { name: "Riverside" }).closest("li")!.className).toContain("hidden md:flex");
    expect(screen.getByRole("link", { name: "Building A" }).closest("li")!.className).not.toContain("hidden");
    expect(screen.getByRole("link", { name: "Home" }).closest("li")!.className).not.toContain("hidden");
  });

  it("expands on the '…' and moves focus to the first revealed crumb", () => {
    render(<Breadcrumbs items={TRAIL} />);
    fireEvent.click(screen.getByRole("button", { name: "Show full path" }));
    expect(screen.queryByRole("button", { name: "Show full path" })).toBeNull();
    expect(screen.getByRole("link", { name: "Estates" }).closest("li")!.className).not.toContain("hidden");
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Estates" }));
  });

  it("does not collapse a short trail, or when told not to", () => {
    const { rerender } = render(<Breadcrumbs items={TRAIL.slice(0, 4)} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<Breadcrumbs items={TRAIL} collapse={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing for an empty trail", () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  // 0.49 KIT-9, kastlan S3: a layout's trail above the page's title, with its current entry
  // hidden, shows no lone home link either — not only a trail inside a PageHeader.
  it("with hideCurrent, outside a PageHeader, renders nothing when only home entries are left", () => {
    const marked = [
      { label: "Dashboard", href: "/dashboard", home: true },
      { label: "Invoices", href: "/invoices" },
    ];
    const { container, rerender } = render(<Breadcrumbs items={marked} hideCurrent />);
    expect(container).toBeEmptyDOMElement();
    // An entry linking to "/" counts as home without the mark.
    rerender(<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Invoices" }]} hideCurrent />);
    expect(container).toBeEmptyDOMElement();
    // Without hideCurrent the current entry stays, and the trail with it.
    rerender(<Breadcrumbs items={marked} />);
    expect(screen.getByRole("navigation")).toHaveTextContent("Invoices");
  });

  it("with hideCurrent, outside a PageHeader, renders the trail while an entry that is not home is left", () => {
    const items = [
      { label: "Dashboard", href: "/dashboard", home: true },
      { label: "Invoices", href: "/invoices" },
      { label: "INV-1" },
    ];
    render(<Breadcrumbs items={items} hideCurrent collapse={false} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Invoices" })).toHaveAttribute("href", "/invoices");
    expect(screen.queryByText("INV-1")).toBeNull();
  });
});

const routerLink: KitLinkComponent = ({ href, children, ...p }) => (
  <a {...p} href={href} data-router="">
    {children}
  </a>
);

describe("Breadcrumbs — the provider's router link", () => {
  it("draws in-app crumbs with linkComponent, an absolute URL as <a>, and its own renderLink wins", () => {
    const items = [
      { label: "Site", href: "https://example.com" },
      { label: "Home", href: "/" },
      { label: "Here" },
    ];
    const { unmount } = render(
      <UiKitProvider linkComponent={routerLink}>
        <Breadcrumbs items={items} collapse={false} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("data-router");
    expect(screen.getByRole("link", { name: "Site" })).not.toHaveAttribute("data-router");
    unmount();
    render(
      <UiKitProvider linkComponent={routerLink}>
        <Breadcrumbs items={items} collapse={false} renderLink={(p) => <a {...p} data-own="">{p.children}</a>} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("data-own");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("data-router");
  });
});
