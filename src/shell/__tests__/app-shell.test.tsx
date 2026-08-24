import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home } from "lucide-react";
import { AppShell } from "../app-shell";

/**
 * Refactor plan 2026-08-24, U-4.
 *
 * `AppShell` read the sidebar collapse flag straight out of `window.localStorage`
 * inside a `useState` initialiser. That access THROWS — it does not return null —
 * where a browser has site data blocked, and it happens during render of the
 * application's top-level shell, so the failure is not a lost preference: nothing
 * mounts, in every consumer of this package at once.
 */

const NAV = [{ to: "/", label: "Home", icon: Home }];

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell nav={NAV} topBar={<div>bar</div>}>
        <div>content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

/** Replace `window.localStorage` with one that throws on every access, the way a
 *  browser with site data blocked does. Returns the restore function. */
function blockSiteData(): () => void {
  const real = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  return () => {
    if (real) Object.defineProperty(window, "localStorage", real);
    else Reflect.deleteProperty(window, "localStorage");
  };
}

describe("AppShell", () => {
  it("mounts normally when storage works, and remembers the collapse flag", () => {
    window.localStorage.setItem("appLayout.sidebarCollapsed", "1");
    renderShell();
    expect(screen.getByText("content")).toBeInTheDocument();
    // Collapsed: the toggle offers to expand.
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
    window.localStorage.removeItem("appLayout.sidebarCollapsed");
  });

  it("still mounts when localStorage throws (U-4)", () => {
    const restore = blockSiteData();
    try {
      renderShell();
      expect(screen.getByText("content")).toBeInTheDocument();
      // Falls back to expanded, which is the default the unreadable key stands for.
      expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});
