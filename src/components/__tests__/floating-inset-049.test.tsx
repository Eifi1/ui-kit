import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingAction, FloatingActionButton, FloatingActionGroup, FloatingPanel } from "../floating-panel";
import { Modal } from "../modal";
import { Popover } from "../popover";
import { Tooltip } from "../tooltip";

/** 0.49 KIT-11: `--kit-floating-inset` and `hideWhenOverlay`. */

const root = () => document.documentElement.style;
// A hidden element has no accessible name (accname §2B), so it is found by its label.
const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`)!;

afterEach(() => {
  root().removeProperty("--app-float-clearance");
  root().removeProperty("--kit-floating-inset");
});

describe("--kit-floating-inset", () => {
  it("is the nav (or the home indicator) plus the launchers' clearance, and goes with the last launcher", () => {
    const view = render(<FloatingActionButton label="Add" icon="+" />);
    expect(root().getPropertyValue("--app-float-clearance")).toBe("calc(1rem + 3.5rem)");
    expect(root().getPropertyValue("--kit-floating-inset")).toBe(
      "calc(max(var(--app-nav-h, 0px), env(safe-area-inset-bottom, 0px)) + var(--app-float-clearance))",
    );
    view.unmount();
    expect(root().getPropertyValue("--kit-floating-inset")).toBe("");
  });
});

function WithModal({ fab }: { fab: ReactNode }) {
  return (
    <>
      {fab}
      <Modal open aria-label="Edit" onClose={() => {}}>
        body
      </Modal>
    </>
  );
}

describe("hideWhenOverlay (default true)", () => {
  it("a FloatingActionButton steps aside while a dialog is open and comes back after", () => {
    const fab = <FloatingActionButton label="Add" icon="+" />;
    const view = render(fab);
    expect(screen.getByRole("button", { name: "Add" })).toBeVisible();
    view.rerender(<WithModal fab={fab} />);
    expect(byLabel("Add")).toHaveAttribute("hidden");
    // Its room stays, so the page does not change length.
    expect(root().getPropertyValue("--app-float-clearance")).toBe("calc(1rem + 3.5rem)");
    view.rerender(fab);
    expect(screen.getByRole("button", { name: "Add" })).not.toHaveAttribute("hidden");
  });

  it("hideWhenOverlay={false} keeps it on screen", () => {
    render(<WithModal fab={<FloatingActionButton label="Add" icon="+" hideWhenOverlay={false} />} />);
    expect(byLabel("Add")).not.toHaveAttribute("hidden");
  });

  it("a popover counts; a tooltip does not", () => {
    render(
      <>
        <FloatingActionButton label="Add" icon="+" tooltip />
        <Popover
          aria-label="Filters"
          trigger={({ toggle, ref }) => (
            <button type="button" ref={ref} onClick={toggle}>
              Filter
            </button>
          )}
        >
          {() => <p>filters</p>}
        </Popover>
      </>,
    );
    const wrapper = () => byLabel("Add").closest("div.fixed")!;
    act(() => {
      fireEvent.focus(screen.getByRole("button", { name: "Add" }));
    });
    expect(wrapper()).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(wrapper()).toHaveAttribute("hidden");
  });

  it("a FloatingActionGroup steps aside too", () => {
    render(
      <WithModal
        fab={
          <FloatingActionGroup aria-label="Actions">
            <FloatingAction label="Filter" icon="f" />
          </FloatingActionGroup>
        }
      />,
    );
    expect(byLabel("Actions")).toHaveAttribute("hidden");
  });

  it("a closed FloatingPanel's launcher steps aside; an open panel stays", () => {
    const panel = (open: boolean) => (
      <FloatingPanel title="Help" fabLabel="Help" fabIcon="?" open={open} onOpenChange={() => {}}>
        body
      </FloatingPanel>
    );
    const view = render(<WithModal fab={panel(false)} />);
    expect(byLabel("Help")).toHaveAttribute("hidden");
    view.rerender(<WithModal fab={panel(true)} />);
    expect(screen.getByRole("dialog", { name: "Help" })).toBeInTheDocument();
    expect(byLabel("Help")).not.toHaveAttribute("hidden");
  });

  it("its own tooltip does not hide a FloatingAction's group", () => {
    render(
      <FloatingActionGroup aria-label="Actions">
        <Tooltip label="Filter rows">
          <FloatingAction label="Filter" icon="f" />
        </Tooltip>
      </FloatingActionGroup>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("group", { name: "Actions" })).not.toHaveAttribute("hidden");
  });
});
