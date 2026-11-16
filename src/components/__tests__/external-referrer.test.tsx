import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ExternalLink, Home, Scale } from "lucide-react";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { List, ListItem } from "../list";
import { TextLink } from "../text-link";
import { AppShell } from "../../shell/app-shell";
import type { AppShellSidebarFooterItem } from "../../shell/app-shell";

/**
 * 0.63 (Marcel 2026-11-13, "Links sind wichtig für Bekanntheit"): an `external` link that
 * counts for the site it names. `referrer` drops `noreferrer` — the target site sees where
 * its visitors came from — and keeps `noopener`; never `nofollow`. Without it every part
 * says `noopener noreferrer`, as before. The mark and "opens in a new tab" stay either way:
 * Kurvenschmiede and Staunlabor had to leave `external` to drop `noreferrer`, and lost both.
 */
describe("external links with referrer (0.63)", () => {
  afterEach(() => window.localStorage.clear());

  it("TextLink: noopener alone, with the mark and the announcement", () => {
    render(
      <>
        <TextLink href="https://anyplot.ai" external referrer>
          anyplot.ai
        </TextLink>
        <TextLink href="https://example.com" external>
          Example
        </TextLink>
      </>,
    );
    const counted = screen.getByRole("link", { name: "anyplot.ai (opens in a new tab)" });
    expect(counted).toHaveAttribute("target", "_blank");
    expect(counted).toHaveAttribute("rel", "noopener");
    expect(counted.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Example (opens in a new tab)" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("TextLink: referrer without external changes nothing", () => {
    render(
      <TextLink href="https://anyplot.ai" referrer>
        anyplot.ai
      </TextLink>,
    );
    const link = screen.getByRole("link", { name: "anyplot.ai" });
    expect(link).not.toHaveAttribute("rel");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("referrer");
  });

  it("Button: noopener alone, the app's own rel still winning", () => {
    render(
      <>
        <Button href="https://anyplot.ai" external referrer>
          Palette
        </Button>
        <Button href="https://example.com/a" external>
          Plain
        </Button>
        <Button href="https://example.com/b" external referrer rel="noopener sponsored">
          Own
        </Button>
      </>,
    );
    const counted = screen.getByRole("link", { name: "Palette (opens in a new tab)" });
    expect(counted).toHaveAttribute("target", "_blank");
    expect(counted).toHaveAttribute("rel", "noopener");
    expect(counted).not.toHaveAttribute("referrer");
    expect(screen.getByRole("link", { name: "Plain (opens in a new tab)" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "Own (opens in a new tab)" })).toHaveAttribute("rel", "noopener sponsored");
  });

  it("IconButton: noopener alone, named with the new tab", () => {
    render(
      <>
        <IconButton href="https://anyplot.ai" external referrer label="anyplot.ai">
          <ExternalLink />
        </IconButton>
        <IconButton href="https://example.com" external label="Example">
          <ExternalLink />
        </IconButton>
      </>,
    );
    const counted = screen.getByRole("link", { name: "anyplot.ai (opens in a new tab)" });
    expect(counted).toHaveAttribute("target", "_blank");
    expect(counted).toHaveAttribute("rel", "noopener");
    expect(counted).not.toHaveAttribute("referrer");
    expect(screen.getByRole("link", { name: "Example (opens in a new tab)" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("ListItem: noopener alone, with the mark and the announcement", () => {
    render(
      <List>
        <ListItem title="anyplot.ai" href="https://anyplot.ai" external referrer />
        <ListItem title="Example" href="https://example.com" external />
      </List>,
    );
    const counted = screen.getByRole("link", { name: /anyplot\.ai.*opens in a new tab/ });
    expect(counted).toHaveAttribute("target", "_blank");
    expect(counted).toHaveAttribute("rel", "noopener");
    expect(counted).not.toHaveAttribute("referrer");
    expect(counted.closest("li")!.querySelector("svg[aria-hidden]")).not.toBeNull();
    expect(screen.getByRole("link", { name: /Example.*opens in a new tab/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("AppShell's footer links: a link and a group's link, expanded and collapsed", () => {
    const items: AppShellSidebarFooterItem[] = [
      { key: "palette", to: "https://anyplot.ai", icon: Scale, label: "Palette", external: true, referrer: true },
      { key: "docs", to: "https://docs.example.com", icon: Scale, label: "Docs", external: true },
      {
        kind: "links",
        key: "credits",
        icon: Scale,
        label: "Credits",
        links: [
          { to: "https://anyplot.ai/palette", label: "Imprint palette", external: true, referrer: true },
          { to: "https://example.com", label: "Example", external: true },
        ],
      },
    ];
    for (const collapsed of [false, true]) {
      window.localStorage.setItem("appLayout.sidebarCollapsed", collapsed ? "1" : "0");
      const { unmount } = render(
        <MemoryRouter>
          <AppShell nav={[{ to: "/", label: "Home", icon: Home }]} topBar={<div />} sidebarFooterItems={items}>
            <div />
          </AppShell>
        </MemoryRouter>,
      );
      const aside = within(document.querySelector("aside")!);
      const palette = aside.getByRole("link", { name: "Palette" });
      expect(palette, `collapsed: ${collapsed}`).toHaveAttribute("rel", "noopener");
      expect(palette).not.toHaveAttribute("referrer");
      expect(aside.getByRole("link", { name: "Docs" })).toHaveAttribute("rel", "noopener noreferrer");
      // Collapsed, the group is one icon link to its first link's target.
      const group = collapsed
        ? aside.getByRole("link", { name: "Credits" })
        : aside.getByRole("link", { name: "Imprint palette" });
      expect(group, `collapsed: ${collapsed}`).toHaveAttribute("rel", "noopener");
      if (!collapsed)
        expect(aside.getByRole("link", { name: "Example" })).toHaveAttribute("rel", "noopener noreferrer");
      unmount();
    }
  });
});
