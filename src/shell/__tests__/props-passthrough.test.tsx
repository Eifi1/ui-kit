import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home } from "lucide-react";
import { AppShell } from "../app-shell";
import { TopBar } from "../top-bar";

/**
 * Audit 2026-09-22 §api-design, wave 4 — the shell half of *"~35 components accept no
 * ...rest"*.
 *
 * These two are the frame every consuming app renders once, at the top of its tree, so
 * a closed prop list here is the most expensive one in the package: there is nowhere
 * above them to hang an id, a landmark label or a `data-tour` anchor, and no wrapper a
 * consumer can add without displacing the shell's own layout (`AppShell`'s root owns
 * `h-dvh`/`overflow-hidden`, and `TopBar` is the `sticky top-0` element itself — wrap
 * either and the sticking or the height goes with it).
 *
 * `TopBar` is a `<header>`, i.e. a `banner` landmark, and `aria-label` is how you tell
 * two landmarks of the same kind apart. It could not take one.
 */

const ANCHOR = "wave-4-anchor";
const NAME = "named by the caller";
const NAV = [{ to: "/", label: "Home", icon: Home }];

function anchored(): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-tour="${ANCHOR}"]`);
  if (!el) throw new Error("nothing in the tree carried the caller's data-tour");
  return el;
}

describe("TopBar", () => {
  const bar = () =>
    render(<TopBar brand={<span>Brand</span>} data-tour={ANCHOR} aria-label={NAME} />);

  it("passes an unknown data-* attribute through to its root element", () => {
    bar();
    expect(anchored()).toBeInTheDocument();
  });

  it("takes the caller's aria-label as the banner landmark's name", () => {
    bar();
    expect(screen.getByRole("banner", { name: NAME })).toBeInTheDocument();
  });

  it("keeps its own sticky chrome when a caller adds classes", () => {
    // `cn` is tailwind-merge, and the caller's `className` was already supported here —
    // the spread must not have quietly replaced it with the rest object's copy.
    render(<TopBar brand={<span>Brand</span>} className="shadow-sm" />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("shadow-sm");
    expect(header.className).toContain("sticky");
  });
});

describe("AppShell", () => {
  const shell = () =>
    render(
      <MemoryRouter>
        <AppShell nav={NAV} topBar={<div>bar</div>} data-tour={ANCHOR} aria-label={NAME}>
          <div>content</div>
        </AppShell>
      </MemoryRouter>,
    );

  it("passes an unknown data-* attribute through to its root element", () => {
    shell();
    expect(anchored()).toBeInTheDocument();
  });

  it("lets the caller's aria-label reach the same element", () => {
    shell();
    expect(anchored()).toHaveAttribute("aria-label", NAME);
  });

  it("does not hand the caller's attributes to the nav the tour already anchors", () => {
    // `data-tour="nav"` is the shell's OWN anchor, on the sidebar list and the mobile
    // bar (feedback #313/#322). A spread that reached those instead of the root would
    // break the tour it is meant to enable.
    shell();
    expect(anchored().tagName).toBe("DIV");
    expect(document.querySelectorAll(`[data-tour="${ANCHOR}"]`)).toHaveLength(1);
    expect(document.querySelectorAll('[data-tour="nav"]')).toHaveLength(2);
  });
});
