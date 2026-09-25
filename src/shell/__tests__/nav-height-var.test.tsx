import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home, Wallet } from "lucide-react";
import { AppShell, type AppShellNavItem } from "../app-shell";

/**
 * `--app-nav-h` — the bottom bar's own height, published so nothing has to guess it.
 *
 * Keksdose live #314's rework: *"Stick it to the bottom touching the bottom icon bar
 * with budget, accounts, … Currently there is a small gap which confuses"*. A receipt
 * footer had been pinned at `bottom-20`, reasoning from the `pb-20` this shell reserves
 * on `<main>` — but that padding is generous CLEARANCE and the bar is content-sized at
 * about 56px, so the footer floated ~24px above it.
 *
 * The number is measured rather than named because it is not a constant anyone owns: an
 * icon, a translated label that can wrap, and whatever the platform does with the
 * safe-area inset. What a test can hold is the CONTRACT — that the variable exists, that
 * it tracks the element rather than a literal, and that it is `0px` where the bar is not
 * rendered — which is what lets a consumer write `bottom-[var(--app-nav-h,0px)]` once.
 *
 * jsdom lays nothing out, so `offsetHeight` is 0 for everything; the assertions below
 * are therefore about WHERE the value comes from, not about 56 versus 80.
 */
const NAV: AppShellNavItem[] = [
  { to: "/", label: "Budget", icon: Home },
  { to: "/accounts", label: "Accounts", icon: Wallet },
];

const navHeight = () => document.documentElement.style.getPropertyValue("--app-nav-h");

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell nav={NAV} topBar={<span>K</span>}>
        <div>page</div>
      </AppShell>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty("--app-nav-h");
});

describe("the bottom bar publishes its own height", () => {
  it("sets the variable while the shell is mounted", () => {
    renderShell();
    // Set at all is the contract: a consumer's `var(--app-nav-h,0px)` falls back to the
    // literal when it is absent, which is exactly the silent 24px gap this replaced.
    expect(navHeight()).toMatch(/px$/);
  });

  it("reads it off the nav element rather than a literal", () => {
    // The value must come from the bar. jsdom reports 0 for every box, so a hard-coded
    // "56px" — the guess this fix exists to stop — would be visible right here.
    renderShell();
    expect(navHeight()).toBe("0px");
  });

  it("cleans up after itself", () => {
    // The variable is global; a shell that unmounts without clearing it would leave a
    // stale offset on whatever renders next.
    const { unmount } = renderShell();
    unmount();
    expect(navHeight()).toBe("");
  });
});

describe("a shell inside a shell (0.7.0)", () => {
  function renderNested() {
    return render(
      <MemoryRouter>
        <AppShell nav={NAV} topBar={<span>outer</span>} data-testid="outer">
          <div data-testid="preview">
            <AppShell nav={NAV} topBar={<span>inner</span>} data-testid="inner">
              <div>page</div>
            </AppShell>
          </div>
        </AppShell>
      </MemoryRouter>,
    );
  }

  it("scopes the variable to each shell's root, and only the OUTER one publishes on <html>", () => {
    const { getByTestId } = renderNested();
    expect(getByTestId("outer").style.getPropertyValue("--app-nav-h")).toBe("0px");
    expect(getByTestId("inner").style.getPropertyValue("--app-nav-h")).toBe("0px");
    expect(navHeight()).toBe("0px");
  });

  it("leaves the outer shell's variable alone when the inner one unmounts", () => {
    // It used to remove the global property on unmount — from under the outer app.
    const view = renderNested();
    view.rerender(
      <MemoryRouter>
        <AppShell nav={NAV} topBar={<span>outer</span>} data-testid="outer">
          <div>preview closed</div>
        </AppShell>
      </MemoryRouter>,
    );
    expect(navHeight()).toBe("0px");
  });

  it("lays the inner shell out in its parent's box, not the viewport's", () => {
    const { getByTestId } = renderNested();
    const inner = getByTestId("inner");
    expect(inner.className).toContain("h-full");
    expect(inner.className).not.toContain("min-h-screen");
    expect(inner.className).not.toContain("md:h-dvh");
    expect(getByTestId("outer").className).toContain("min-h-screen");
  });

  it("does not persist the inner shell's collapse state over the outer one's", () => {
    localStorage.setItem("appLayout.sidebarCollapsed", "1");
    const { getAllByRole } = renderNested();
    // Outer: collapsed, from storage → "Expand". Inner: not reading the shared key.
    const toggles = getAllByRole("button", { name: /collapse|expand/i });
    expect(toggles[0]).toHaveAccessibleName(/expand/i);
    expect(toggles[1]).toHaveAccessibleName(/collapse/i);
    expect(localStorage.getItem("appLayout.sidebarCollapsed")).toBe("1");
    localStorage.removeItem("appLayout.sidebarCollapsed");
  });

  it("takes `embedded` for a preview that is not inside another shell", () => {
    render(
      <MemoryRouter>
        <AppShell nav={NAV} topBar={<span>K</span>} embedded data-testid="solo">
          <div>page</div>
        </AppShell>
      </MemoryRouter>,
    );
    expect(navHeight()).toBe("");
    expect(document.querySelector<HTMLElement>("[data-testid=solo]")!.style.getPropertyValue("--app-nav-h")).toBe("0px");
  });
});
