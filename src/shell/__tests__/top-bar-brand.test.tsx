// The link renderers below take `children` from their spread props.
/* eslint-disable jsx-a11y/anchor-has-content */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TopBar } from "../top-bar";
import { TopBarBrand } from "../top-bar-brand";
import { UiKitProvider } from "../../i18n/kit-labels";

const Mark = () => <svg data-testid="mark" />;

describe("TopBarBrand", () => {
  it("links home through react-router, named by the product name", () => {
    render(
      <MemoryRouter>
        <TopBar brand={<TopBarBrand logo={<Mark />} name="Kastlan" to="/dashboard" />} />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Kastlan" });
    expect(link).toHaveAttribute("href", "/dashboard");
    // The mark is decoration beside the name.
    expect(screen.getByTestId("mark").parentElement).toHaveAttribute("aria-hidden");
  });

  it("collapses the name to the logo below sm by default — visually hidden, still in the name", () => {
    render(
      <MemoryRouter>
        <TopBarBrand logo={<Mark />} name="Kastlan" />
      </MemoryRouter>,
    );
    const name = screen.getByText("Kastlan");
    expect(name.className).toContain("sr-only");
    expect(name.className).toContain("sm:not-sr-only");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });

  it("takes an md breakpoint, or never collapses", () => {
    const { rerender } = render(
      <MemoryRouter>
        <TopBarBrand logo={<Mark />} name="Kastlan" collapseBelow="md" />
      </MemoryRouter>,
    );
    expect(screen.getByText("Kastlan").className).toContain("md:not-sr-only");
    rerender(
      <MemoryRouter>
        <TopBarBrand logo={<Mark />} name="Kastlan" collapseBelow={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Kastlan").className).not.toContain("sr-only");
  });

  it("uses the provider's linkComponent, and a renderLink over it", () => {
    const { rerender } = render(
      <UiKitProvider linkComponent={({ href, ...p }) => <a data-via="provider" href={`#${href}`} {...p} />}>
        <TopBarBrand logo={<Mark />} name="Kastlan" to="/home" />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Kastlan" })).toHaveAttribute("data-via", "provider");
    expect(screen.getByRole("link")).toHaveAttribute("href", "#/home");
    rerender(
      <UiKitProvider linkComponent={({ href, ...p }) => <a data-via="provider" href={href} {...p} />}>
        <TopBarBrand
          logo={<Mark />}
          name="Kastlan"
          renderLink={({ href, ...p }) => <a data-via="own" href={href} {...p} />}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Kastlan" })).toHaveAttribute("data-via", "own");
  });

  it("passes anchor attributes through", () => {
    render(
      <MemoryRouter>
        <TopBarBrand logo={<Mark />} name="Kastlan" data-tour="brand" className="extra" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-tour", "brand");
    expect(link.className).toContain("extra");
  });
});
