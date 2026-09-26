import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  FloatingAction,
  FloatingActionButton,
  FloatingActionGroup,
  FloatingPanel,
  type FloatingActionLinkProps,
} from "../floating-panel";
import { UiKitProvider } from "../../i18n/kit-labels";

const PHYSICAL = /(?:^|\s|:)(?:rounded-(?:l|r|tl|tr|bl|br)|border-(?:l|r)|divide-x|ml|mr|pl|pr|left|right)-?/;

/**
 * The extended FAB (kastlan's offline/sync pill), the FAB's kit tooltip (keksdose
 * dev#523), and the floating action group keksdose hand-built on /transactions and the
 * feedback page.
 */
describe("FloatingActionButton — extended, live, surface", () => {
  it("shows the label beside the icon as a pill, keeping it as the name", () => {
    render(<FloatingActionButton extended label="Offline" icon={<svg />} />);
    const button = screen.getByRole("button", { name: "Offline" });
    expect(button).toHaveTextContent("Offline");
    expect(button.className).toContain("px-4");
    expect(button.className).toContain("h-12");
    expect(button.className).not.toContain("size-12");
  });

  it("stays a round, icon-only disc when not extended", () => {
    render(<FloatingActionButton label="Add" icon="+" />);
    const button = screen.getByRole("button", { name: "Add" });
    expect(button).toHaveTextContent("+");
    expect(button).not.toHaveTextContent("Add");
    expect(button.className).toContain("size-12");
  });

  it("announces a changing label through a polite status region that outlives `hidden`", () => {
    const { rerender } = render(<FloatingActionButton extended live hidden label="Online" icon="·" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Online");
    // The status is not the button: its words are not part of the button's content.
    expect(status.closest("button")).toBeNull();
    rerender(<FloatingActionButton extended live label="Syncing…" icon="·" />);
    expect(screen.getByRole("status")).toHaveTextContent("Syncing…");
    expect(screen.getByRole("button", { name: "Syncing…" })).toBeVisible();
  });

  it("has no status region unless asked", () => {
    render(<FloatingActionButton extended label="Offline" icon="·" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("variant=surface paints the page surface instead of the brand", () => {
    render(<FloatingActionButton variant="surface" extended label="Offline" icon="·" disabled />);
    const cls = screen.getByRole("button", { name: "Offline" }).className;
    expect(cls).toContain("bg-[var(--bg-surface)]");
    expect(cls).not.toContain("bg-[var(--brand)]");
  });

  it("pins an extended pill to the logical start corner in RTL", () => {
    render(
      <div dir="rtl">
        <FloatingActionButton extended corner="bottom-start" label="Offline" icon="·" />
      </div>,
    );
    const button = screen.getByRole("button", { name: "Offline" });
    expect(button).toHaveAttribute("dir", "rtl");
    expect(button.style.insetInlineStart).not.toBe("");
    expect(button.className).not.toMatch(PHYSICAL);
  });
});

describe("FloatingActionButton — kit tooltip", () => {
  it("replaces the native title and positions a fixed wrapper instead of the button", () => {
    render(<FloatingActionButton tooltip label="Assistant" icon="?" offset="4rem" />);
    const button = screen.getByRole("button", { name: "Assistant" });
    expect(button).not.toHaveAttribute("title");
    expect(button.className).not.toContain("fixed");
    const wrapper = button.closest("div")!;
    expect(wrapper.className).toContain("fixed");
    expect(wrapper.style.bottom).toContain("4rem");
    expect(wrapper.style.insetInlineEnd).not.toBe("");
  });

  it("shows the bubble on keyboard focus, not describing the button with its own name, and Escape dismisses it", async () => {
    const user = userEvent.setup();
    render(<FloatingActionButton tooltip label="Assistant" icon="?" />);
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.tab();
    const button = screen.getByRole("button", { name: "Assistant" });
    expect(button).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Assistant");
    expect(button).not.toHaveAttribute("aria-describedby");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.keyboard("{Enter}");
  });

  it("uses other tooltip content as a description", () => {
    render(<FloatingActionButton tooltip="Ask about this page" label="Assistant" icon="?" />);
    const button = screen.getByRole("button", { name: "Assistant" });
    fireEvent.focus(button);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Ask about this page");
    expect(button).toHaveAttribute("aria-describedby", tip.id);
  });

  it("carries the reading direction onto the wrapper in RTL", () => {
    render(
      <div dir="rtl">
        <FloatingActionButton tooltip label="Assistant" icon="?" />
      </div>,
    );
    const wrapper = screen.getByRole("button", { name: "Assistant" }).closest("div")!;
    expect(wrapper).toHaveAttribute("dir", "rtl");
  });

  it("FloatingPanel passes fabTooltip through and keeps the FAB wired to the panel", () => {
    render(
      <FloatingPanel fabTooltip title="Panel" fabLabel="Assistant" fabIcon="?">
        body
      </FloatingPanel>,
    );
    const button = screen.getByRole("button", { name: "Assistant" });
    expect(button).not.toHaveAttribute("title");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Panel" })).toBeInTheDocument();
  });
});

function Toolbar({ pending = 0, onAdd = () => {} }: { pending?: number; onAdd?: () => void }) {
  const [pendingOnly, setPendingOnly] = useState(false);
  return (
    <FloatingActionGroup aria-label="Register" offset="1rem">
      <FloatingAction
        label="Pending only"
        icon="◌"
        pressed={pendingOnly}
        onClick={() => setPendingOnly((on) => !on)}
      />
      <FloatingAction label="Invoices" icon="▤" href="/invoices" badge={pending} />
      <FloatingAction label="Add" icon="+" variant="primary" onClick={onAdd} />
    </FloatingActionGroup>
  );
}

describe("FloatingActionGroup", () => {
  it("is a named, portalled group pinned to the logical corner with logical dividers", () => {
    render(<Toolbar />);
    const group = screen.getByRole("group", { name: "Register" });
    expect(group.parentElement).toBe(document.body);
    expect(group.className).toContain("fixed");
    expect(group.className).toContain("rounded-2xl");
    expect(group.className).toContain("[&>*:not(:first-child)]:border-s");
    expect(group.className).not.toMatch(PHYSICAL);
    expect(group.style.insetInlineEnd).not.toBe("");
    expect(group.style.bottom).toContain("--app-nav-h");
    expect(group.style.bottom).toContain("safe-area-inset-bottom");
  });

  it("carries RTL across the portal and follows bottom-start", () => {
    render(
      <div dir="rtl">
        <FloatingActionGroup aria-label="Feedback" corner="bottom-start">
          <FloatingAction label="Awaiting only" icon="◉" pressed={false} />
        </FloatingActionGroup>
      </div>,
    );
    const group = screen.getByRole("group", { name: "Feedback" });
    expect(group).toHaveAttribute("dir", "rtl");
    expect(group).toHaveAttribute("data-corner", "bottom-start");
    expect(group.style.insetInlineStart).not.toBe("");
    expect(group.style.insetInlineEnd).toBe("");
  });

  it("members are toggles with a pressed look, reachable by Tab and toggled by Space", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<Toolbar onAdd={onAdd} />);
    await user.tab();
    const toggle = screen.getByRole("button", { name: "Pending only" });
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle.className).toContain("bg-[var(--brand-bg)]");
    // Each member its own tab stop, in reading order.
    await user.tab();
    expect(screen.getByRole("link", { name: "Invoices" })).toHaveFocus();
    await user.tab();
    const add = screen.getByRole("button", { name: "Add" });
    expect(add).toHaveFocus();
    expect(add).not.toHaveAttribute("aria-pressed");
    expect(add.className).toContain("bg-[var(--brand)]");
    await user.keyboard("{Enter}");
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("labels each member in a kit tooltip on focus, not twice for a reader", () => {
    render(<Toolbar />);
    const toggle = screen.getByRole("button", { name: "Pending only" });
    fireEvent.focus(toggle);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Pending only");
    expect(toggle).not.toHaveAttribute("aria-describedby");
    expect(toggle).not.toHaveAttribute("title");
  });

  it("draws a count dot and folds the count into the name", () => {
    const { rerender } = render(<Toolbar pending={3} />);
    const link = screen.getByRole("link", { name: "Invoices, 3 new" });
    expect(link).toHaveAttribute("href", "/invoices");
    expect(link).not.toHaveAttribute("aria-pressed");
    const dot = link.querySelector("[data-badge]")!;
    expect(dot).toHaveTextContent("3");
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot.className).toContain("end-1");

    rerender(<Toolbar pending={150} />);
    expect(link.querySelector("[data-badge]")).toHaveTextContent("99+");

    rerender(<Toolbar pending={0} />);
    expect(screen.getByRole("link", { name: "Invoices" }).querySelector("[data-badge]")).toBeNull();
  });

  it("takes the badge words from floatingPanel.badge, or badgeLabel", () => {
    render(
      <UiKitProvider labels={{ floatingPanel: { badge: (n) => `${n} neu` } }}>
        <FloatingActionGroup aria-label="G">
          <FloatingAction label="Rechnungen" icon="▤" badge={2} />
          <FloatingAction label="Inbox" icon="✉" badge={5} badgeLabel="5 unread" badgeTone="danger" />
        </FloatingActionGroup>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Rechnungen, 2 neu" })).toBeInTheDocument();
    const inbox = screen.getByRole("button", { name: "Inbox, 5 unread" });
    expect(inbox.querySelector("[data-badge]")!.className).toContain("bg-[var(--danger)]");
  });

  it("renders a member through renderLink for a router", () => {
    const seen: FloatingActionLinkProps[] = [];
    const onClick = vi.fn();
    render(
      <FloatingActionGroup aria-label="G">
        <FloatingAction
          label="Invoices"
          icon="▤"
          href="/invoices"
          data-tour="open-invoices"
          onClick={onClick}
          renderLink={(p) => {
            seen.push(p);
            const { href, children, ...rest } = p;
            return (
              <a data-router="" href={`#${href}`} {...rest}>
                {children}
              </a>
            );
          }}
        />
      </FloatingActionGroup>,
    );
    const link = screen.getByRole("link", { name: "Invoices" });
    expect(link).toHaveAttribute("data-router");
    expect(link).toHaveAttribute("data-tour", "open-invoices");
    expect(seen[0].href).toBe("/invoices");
    expect(seen[0].className).toContain("size-12");
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("tooltip={false} leaves the member bare in the group", () => {
    render(
      <FloatingActionGroup aria-label="G">
        <FloatingAction tooltip={false} label="Add" icon="+" />
      </FloatingActionGroup>,
    );
    const button = screen.getByRole("button", { name: "Add" });
    expect(button.parentElement).toBe(screen.getByRole("group"));
    act(() => button.focus());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
