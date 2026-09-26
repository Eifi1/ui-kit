import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../ui";
import { TextLink, isExternalHref, isInPageAnchor, isRoutableHref } from "../text-link";
import { Breadcrumbs } from "../breadcrumbs";
import { NavPills } from "../nav-pills";
import { TopBarBrand } from "../../shell/top-bar-brand";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkComponent } from "../../i18n/kit-labels";

/** The provider's router link, marked so a test can tell it from a plain `<a>`. */
const routerLink: KitLinkComponent = ({ href, children, ...p }) => (
  <a {...p} href={href} data-router="">
    {children}
  </a>
);

const viaRouter = (name: string) => screen.getByRole("link", { name }).hasAttribute("data-router");

describe("the kit's one link rule", () => {
  it("classifies hrefs: external, in-page anchor, routable", () => {
    expect(isExternalHref("https://x.dev")).toBe(true);
    expect(isExternalHref("#/units")).toBe(false);
    expect(isInPageAnchor("#section")).toBe(true);
    expect(isInPageAnchor("#")).toBe(true);
    expect(isInPageAnchor("#/units")).toBe(false);
    expect(isInPageAnchor("/units#section")).toBe(false);
    expect(isRoutableHref("/units")).toBe(true);
    expect(isRoutableHref("units")).toBe(true);
    expect(isRoutableHref("#/units")).toBe(true);
    expect(isRoutableHref("#section")).toBe(false);
    expect(isRoutableHref("mailto:a@b.c")).toBe(false);
  });

  it("Button href: an external href without `external` is NOT handed to the router link", () => {
    render(
      <UiKitProvider linkComponent={routerLink}>
        <Button href="https://example.com">Docs</Button>
        <Button href="/units">Units</Button>
      </UiKitProvider>,
    );
    expect(viaRouter("Docs")).toBe(false);
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "https://example.com");
    expect(viaRouter("Units")).toBe(true);
  });

  it("a plain #anchor stays a plain <a>; a hash-router #/path routes — in every kit link", () => {
    render(
      <UiKitProvider linkComponent={routerLink}>
        <TextLink href="#top">TL anchor</TextLink>
        <TextLink href="#/units">TL route</TextLink>
        <Button href="#top">B anchor</Button>
        <Button href="#/units">B route</Button>
        <Breadcrumbs
          items={[
            { label: "BC anchor", href: "#top" },
            { label: "BC route", href: "#/units" },
            { label: "Here" },
          ]}
        />
        <NavPills
          current={null}
          items={[
            { value: "a", label: "NP anchor", href: "#top" },
            { value: "b", label: "NP route", href: "#/units" },
          ]}
        />
      </UiKitProvider>,
    );
    for (const name of ["TL anchor", "B anchor", "BC anchor", "NP anchor"]) expect([name, viaRouter(name)]).toEqual([name, false]);
    for (const name of ["TL route", "B route", "BC route", "NP route"]) expect([name, viaRouter(name)]).toEqual([name, true]);
  });

  it("TopBarBrand: an external or #anchor `to` is a plain <a>, even with no router around", () => {
    render(
      <>
        <TopBarBrand logo={<svg />} name="Ext" to="https://example.com" />
        <TopBarBrand logo={<svg />} name="Anchor" to="#top" />
      </>,
    );
    expect(screen.getByRole("link", { name: "Ext" })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByRole("link", { name: "Anchor" })).toHaveAttribute("href", "#top");
  });
});
