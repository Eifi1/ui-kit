import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Home } from "lucide-react";

import { FloatingAction, FloatingActionButton, FloatingActionGroup, FloatingPanel } from "../floating-panel";
import { AppShell } from "../../shell/app-shell";

/**
 * keksdose dev#612 (R8, UX-1.3 "the help button covers content"): the shell pads `<main>`
 * for the bottom nav alone, so on a phone the last row sat under a floating launcher.
 * Every kit launcher now publishes the room it takes above the nav as
 * `--app-float-clearance` on `<html>` while it is mounted, hidden or not; with several,
 * the largest wins; the shell's padding is the nav plus the larger of 1.5rem and that.
 */

const read = () => document.documentElement.style.getPropertyValue("--app-float-clearance");

afterEach(() => {
  document.documentElement.style.removeProperty("--app-float-clearance");
});

describe("--app-float-clearance", () => {
  it("a FloatingActionButton publishes its offset + the 3rem disc + a 0.5rem gap, and removes it on unmount", () => {
    const view = render(<FloatingActionButton label="Add" icon="+" />);
    expect(read()).toBe("calc(1rem + 3.5rem)");
    view.unmount();
    expect(read()).toBe("");
  });

  it("follows the offset", () => {
    const view = render(<FloatingActionButton label="Add" icon="+" offset="2rem" />);
    expect(read()).toBe("calc(2rem + 3.5rem)");
    view.rerender(<FloatingActionButton label="Add" icon="+" offset="5.5rem" />);
    expect(read()).toBe("calc(5.5rem + 3.5rem)");
  });

  it("a hidden launcher keeps its room, so the page does not change length as it shows", () => {
    const view = render(<FloatingActionButton label="Offline" icon="!" hidden />);
    expect(read()).toBe("calc(1rem + 3.5rem)");
    view.rerender(<FloatingActionButton label="Offline" icon="!" />);
    expect(read()).toBe("calc(1rem + 3.5rem)");
  });

  it("FloatingPanel hidden: FAB and panel off screen, open state and room kept (keksdose's covered launcher)", () => {
    const panel = (hidden: boolean) => (
      <FloatingPanel title="Help" fabLabel="Help" fabIcon="?" defaultOpen hidden={hidden}>
        body
      </FloatingPanel>
    );
    const view = render(panel(false));
    expect(screen.getByRole("dialog", { name: "Help" })).toBeInTheDocument();
    view.rerender(panel(true));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Help" })).toBeNull();
    expect(read()).toBe("calc(1rem + 3.5rem)");
    view.rerender(panel(false));
    expect(screen.getByRole("dialog", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help" })).toHaveAttribute("aria-expanded", "true");
  });

  it("with several launchers the largest wins, and the rest stay when one goes", () => {
    const view = render(
      <>
        <FloatingActionButton label="Add" icon="+" />
        <FloatingPanel title="Help" fabLabel="Help" fabIcon="?" offset="5.5rem">
          body
        </FloatingPanel>
      </>,
    );
    expect(read()).toBe("max(calc(1rem + 3.5rem), calc(5.5rem + 3.5rem))");
    view.rerender(<FloatingActionButton label="Add" icon="+" />);
    expect(read()).toBe("calc(1rem + 3.5rem)");
    view.unmount();
    expect(read()).toBe("");
  });

  it("a FloatingActionGroup publishes too (its members are 3rem, plus the 1px frame)", () => {
    const view = render(
      <FloatingActionGroup aria-label="Actions">
        <FloatingAction label="Filter" icon="f" />
      </FloatingActionGroup>,
    );
    expect(read()).toBe("calc(1rem + 3.5rem + 2px)");
    view.unmount();
    expect(read()).toBe("");
  });

  it("the shell's <main> pads the phone for the nav plus the larger of 1.5rem and the clearance", () => {
    render(
      <MemoryRouter>
        <AppShell nav={[{ to: "/", label: "Home", icon: Home }]} topBar={<div />}>
          page
        </AppShell>
      </MemoryRouter>,
    );
    const main = document.querySelector("main")!;
    expect(main.className).toContain("pb-[calc(var(--app-nav-h,4rem)+max(1.5rem,var(--app-float-clearance,0px)))]");
    expect(main.className).toContain("md:pb-0");
  });
});
