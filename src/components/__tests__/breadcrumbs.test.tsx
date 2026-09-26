import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "../breadcrumbs";
import { UiKitProvider } from "../../i18n/kit-labels";

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
});
