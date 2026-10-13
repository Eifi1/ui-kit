import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell } from "../app-shell";
import { deviceSettings, resetDeviceSettings } from "../../lib/device-settings";

/**
 * The sidebar's folded state joins the reset of this device's settings
 * (docs/settings-harmonization.md §11.4): while the shell is mounted and only with a
 * collapse key, as a view, and the reset unfolds it live.
 */

const NAV = [{ to: "/", label: "Home", icon: Home }];

function renderShell(props: { collapseStorageKey?: string; embedded?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <AppShell nav={NAV} topBar={<div>bar</div>} {...props}>
        <div>content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

const sidebarEntries = () => deviceSettings().filter((e) => e.kind === "view" && !e.prefix);

afterEach(() => localStorage.clear());

describe("AppShell joins the device reset", () => {
  it("joins with its key while mounted, and leaves on unmount", () => {
    const { unmount } = renderShell({ collapseStorageKey: "app.sidebarCollapsed" });
    expect(sidebarEntries().map((e) => [e.key, typeof e.reset])).toEqual([["app.sidebarCollapsed", "function"]]);
    unmount();
    expect(sidebarEntries()).toEqual([]);
  });

  it("joins with the kit's default key when it is given none", () => {
    renderShell();
    expect(sidebarEntries().map((e) => e.key)).toEqual(["appLayout.sidebarCollapsed"]);
  });

  it("an embedded shell without a key of its own stores nothing and joins nothing", () => {
    renderShell({ embedded: true });
    expect(sidebarEntries()).toEqual([]);
  });

  it("unfolds the sidebar live, and stores it unfolded", () => {
    localStorage.setItem("app.sidebarCollapsed", "1");
    renderShell({ collapseStorageKey: "app.sidebarCollapsed" });
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();

    let keys: string[] = [];
    act(() => {
      keys = resetDeviceSettings();
    });
    expect(keys).toContain("app.sidebarCollapsed");
    expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();
    expect(localStorage.getItem("app.sidebarCollapsed")).toBe("0");
  });
});
