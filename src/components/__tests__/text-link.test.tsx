import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ArrowLeft } from "lucide-react";
import { TextLink, isExternalHref } from "../text-link";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkComponent } from "../../i18n/kit-labels";

const routerLink: KitLinkComponent = ({ href, children, ...p }) => (
  <a {...p} href={href} data-router="">
    {children}
  </a>
);

describe("TextLink", () => {
  it("is a plain brand link, underlined on hover, with a focus ring", () => {
    render(<TextLink href="/units">Units</TextLink>);
    const link = screen.getByRole("link", { name: "Units" });
    expect(link).toHaveAttribute("href", "/units");
    expect(link.className).toContain("text-[var(--brand)]");
    expect(link.className).toContain("hover:underline");
    expect(link.className).toContain("focus-visible:outline-[length:var(--focus-ring-width)]");
    expect(link).not.toHaveAttribute("target");
  });

  it("takes a tone and an underline", () => {
    render(
      <>
        <TextLink href="/a" tone="muted" underline="always">
          A
        </TextLink>
        <TextLink href="/b" tone="danger" underline="none">
          B
        </TextLink>
        <TextLink href="/c" tone="inherit">
          C
        </TextLink>
      </>,
    );
    const a = screen.getByRole("link", { name: "A" }).className;
    expect(a).toContain("text-[var(--text-muted)]");
    expect(a).toMatch(/(^|\s)underline(\s|$)/);
    const b = screen.getByRole("link", { name: "B" }).className;
    expect(b).toContain("text-[var(--danger)]");
    expect(b).toContain("no-underline");
    expect(screen.getByRole("link", { name: "C" }).className).not.toMatch(/text-\[var/);
  });

  it("goes through the provider's linkComponent; its own renderLink wins", () => {
    render(
      <UiKitProvider linkComponent={routerLink}>
        <TextLink href="/units">Units</TextLink>
        <TextLink href="/own" renderLink={(p) => <a {...p} data-own="">{p.children}</a>}>
          Own
        </TextLink>
        <TextLink href="https://example.com">Absolute</TextLink>
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Units" })).toHaveAttribute("data-router");
    expect(screen.getByRole("link", { name: "Own" })).toHaveAttribute("data-own");
    expect(screen.getByRole("link", { name: "Own" })).not.toHaveAttribute("data-router");
    expect(screen.getByRole("link", { name: "Absolute" })).not.toHaveAttribute("data-router");
  });

  it("external: a new tab, a mirrored mark, and the words for a reader — never the router link", () => {
    render(
      <UiKitProvider linkComponent={routerLink} labels={{ common: { opensInNewTab: "öffnet in neuem Tab" } }}>
        <TextLink href="https://www.bwo.admin.ch" external renderLink={(p) => <a {...p} data-own="">{p.children}</a>}>
          BWO
        </TextLink>
      </UiKitProvider>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAccessibleName("BWO (öffnet in neuem Tab)");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).not.toHaveAttribute("data-router");
    expect(link).not.toHaveAttribute("data-own");
    const mark = link.querySelector("svg")!;
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark.getAttribute("class")).toContain("rtl:-scale-x-100");
  });

  it("stopPropagation keeps the click and Enter from the clickable row", () => {
    const onRow = vi.fn();
    const onRowKey = vi.fn();
    const onClick = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- fixture: a consumer's clickable row, only here to observe what bubbles.
      <div onClick={onRow} onKeyDown={onRowKey}>
        <TextLink href="#x" stopPropagation onClick={onClick}>
          Cell
        </TextLink>
      </div>,
    );
    const link = screen.getByRole("link", { name: "Cell" });
    fireEvent.click(link);
    fireEvent.keyDown(link, { key: "Enter" });
    fireEvent.keyDown(link, { key: "Tab" });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();
    expect(onRowKey).toHaveBeenCalledTimes(1);
  });

  it("current marks aria-current (true is page); an icon is decorative", () => {
    render(
      <>
        <TextLink href="/privacy" current>
          Privacy
        </TextLink>
        <TextLink href="/terms" current="location">
          Terms
        </TextLink>
        <TextLink href="/login" icon={ArrowLeft}>
          Back
        </TextLink>
      </>,
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("aria-current", "location");
    const back = screen.getByRole("link", { name: "Back" });
    expect(back).not.toHaveAttribute("aria-current");
    expect(back.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("forwards its ref to the anchor", () => {
    let el: HTMLAnchorElement | null = null;
    render(
      <TextLink href="/x" ref={(node) => { el = node; }}>
        X
      </TextLink>,
    );
    expect(el).toBe(screen.getByRole("link", { name: "X" }));
  });
});

describe("isExternalHref", () => {
  it("is true for a scheme or a protocol-relative URL, false for a path", () => {
    expect(isExternalHref("https://a.b")).toBe(true);
    expect(isExternalHref("mailto:a@b.c")).toBe(true);
    expect(isExternalHref("//cdn.x")).toBe(true);
    expect(isExternalHref("/units")).toBe(false);
    expect(isExternalHref("units/1")).toBe(false);
    expect(isExternalHref("#top")).toBe(false);
  });
});
