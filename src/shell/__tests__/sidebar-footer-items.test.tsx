// The link renderers below take `children` from their spread props.
/* eslint-disable jsx-a11y/anchor-has-content */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Home, Scale, Sparkles } from "lucide-react";
import { AppShell } from "../app-shell";
import type { AppShellSidebarFooterItem } from "../app-shell";
import { UiKitProvider } from "../../i18n/kit-labels";

/** kastlan app-layout.tsx:82-144 — the version link and the legal links, as data. */
const ITEMS: AppShellSidebarFooterItem[] = [
  {
    key: "version",
    to: "/changelog",
    icon: Sparkles,
    label: "What's new · v1.4.0",
    text: "Kastlan v1.4.0",
    hint: "What's new",
  },
  {
    kind: "links",
    key: "legal",
    icon: Scale,
    label: "Legal",
    links: [
      { to: "/impressum", label: "Imprint" },
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
    ],
  },
];

const aside = () => document.querySelector("aside")!;

function renderShell(collapsed: boolean, items = ITEMS) {
  window.localStorage.setItem("appLayout.sidebarCollapsed", collapsed ? "1" : "0");
  return render(
    <MemoryRouter>
      <AppShell nav={[{ to: "/", label: "Home", icon: Home }]} topBar={<div />} sidebarFooterItems={items}>
        <div>content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

afterEach(() => window.localStorage.clear());

describe("AppShell sidebarFooterItems", () => {
  it("expanded: the version link with its text, and the legal links in a named nav", () => {
    renderShell(false);
    const version = within(aside()).getByRole("link", { name: "Kastlan v1.4.0" });
    expect(version).toHaveAttribute("href", "/changelog");
    const legal = within(aside()).getByRole("navigation", { name: "Legal" });
    expect(within(legal).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Imprint", "/impressum"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ]);
    // Above the collapse toggle.
    const toggle = within(aside()).getByRole("button", { name: "Collapse sidebar" });
    expect(legal.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("expanded: the hint shows as a tooltip on hover", () => {
    renderShell(false);
    fireEvent.mouseEnter(within(aside()).getByRole("link", { name: "Kastlan v1.4.0" }).parentElement!);
    fireEvent.focus(within(aside()).getByRole("link", { name: "Kastlan v1.4.0" }));
    expect(screen.getAllByText("What's new").length).toBeGreaterThan(0);
  });

  it("collapsed: each item is one icon link, named by its label, the group linking to its first page", () => {
    renderShell(true);
    const version = within(aside()).getByRole("link", { name: "What's new · v1.4.0" });
    expect(version).toHaveAttribute("href", "/changelog");
    expect(version.textContent).toBe("");
    const legal = within(aside()).getByRole("link", { name: "Legal" });
    expect(legal).toHaveAttribute("href", "/impressum");
    expect(within(aside()).queryByRole("navigation", { name: "Legal" })).toBeNull();
    expect(within(aside()).queryByText("Privacy")).toBeNull();
  });

  it("collapsed: a group's `to` overrides the first link", () => {
    renderShell(true, [
      { kind: "links", key: "legal", icon: Scale, label: "Legal", to: "/legal", links: [{ to: "/x", label: "X" }] },
    ]);
    expect(within(aside()).getByRole("link", { name: "Legal" })).toHaveAttribute("href", "/legal");
  });

  it("opens external links in a new tab, and routes in-app ones through the provider link", () => {
    window.localStorage.setItem("appLayout.sidebarCollapsed", "0");
    render(
      <MemoryRouter>
        <UiKitProvider linkComponent={({ href, ...p }) => <a data-via="provider" href={href} {...p} />}>
          <AppShell
            nav={[{ to: "/", label: "Home", icon: Home }]}
            topBar={<div />}
            sidebarFooterItems={[
              { key: "docs", to: "https://docs.example.com", icon: Sparkles, label: "Docs", external: true },
              { key: "changelog", to: "/changelog", icon: Sparkles, label: "Changelog" },
            ]}
          >
            <div />
          </AppShell>
        </UiKitProvider>
      </MemoryRouter>,
    );
    const docs = within(aside()).getByRole("link", { name: "Docs" });
    expect(docs).toHaveAttribute("target", "_blank");
    expect(docs).toHaveAttribute("rel", "noopener noreferrer");
    expect(docs).not.toHaveAttribute("data-via");
    expect(within(aside()).getByRole("link", { name: "Changelog" })).toHaveAttribute("data-via", "provider");
  });

  it("renders nothing extra without items, and keeps sidebarFooter", () => {
    window.localStorage.setItem("appLayout.sidebarCollapsed", "0");
    render(
      <MemoryRouter>
        <AppShell
          nav={[{ to: "/", label: "Home", icon: Home }]}
          topBar={<div />}
          sidebarFooter={(c) => <div>custom {c ? "compact" : "full"}</div>}
        >
          <div />
        </AppShell>
      </MemoryRouter>,
    );
    expect(document.querySelector("[data-slot=sidebar-footer-items]")).toBeNull();
    expect(within(aside()).getByText("custom full")).toBeInTheDocument();
  });
});
