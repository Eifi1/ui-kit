import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { NotificationBell } from "../notification-bell";
import type { NotificationInboxItem } from "../notification-inbox";
import { TopBarActions } from "../../shell/top-bar-actions";
import { axeViolations } from "../../test/axe";

/** docs/notifications-harmonization.md §10.1: the bell, optional per app. Synthetic rows. */

const item = (id: number, read = false): NotificationInboxItem<number> => ({
  id,
  notification_type: "invoices_overdue",
  title: `Row ${id}`,
  body: `Body ${id}`,
  url: `/invoices?row=${id}`,
  created_at: "2026-10-19T08:30:00Z",
  read_at: read ? "2026-10-19T09:00:00Z" : null,
  company: id === 1 ? "Muster AG" : null,
});

const ITEMS = Array.from({ length: 25 }, (_, i) => item(25 - i, i > 2));

const mount = (props: Partial<Parameters<typeof NotificationBell<number>>[0]> = {}) =>
  render(
    <MemoryRouter>
      <NotificationBell<number>
        items={ITEMS}
        unreadCount={3}
        onOpen={vi.fn()}
        href="/notifications"
        formatDate={(iso) => iso.slice(0, 10)}
        {...props}
      />
    </MemoryRouter>,
  );

const trigger = () => document.querySelector("[data-notification-bell]") as HTMLElement;

describe("NotificationBell", () => {
  it("names the bell with the unread count, and caps the badge at 99+", () => {
    const { rerender } = mount();
    expect(trigger()).toHaveAccessibleName("Notifications 3 unread");
    expect(trigger().querySelector("[data-badge]")).toHaveTextContent("3");
    rerender(
      <MemoryRouter>
        <NotificationBell items={ITEMS} unreadCount={250} onOpen={vi.fn()} href="/notifications" />
      </MemoryRouter>,
    );
    expect(trigger().querySelector("[data-badge]")).toHaveTextContent("99+");
    expect(trigger()).toHaveAccessibleName("Notifications 250 unread");
    rerender(
      <MemoryRouter>
        <NotificationBell items={ITEMS} unreadCount={0} onOpen={vi.fn()} href="/notifications" />
      </MemoryRouter>,
    );
    expect(trigger().querySelector("[data-badge]")).toBeNull();
    expect(trigger()).toHaveAccessibleName("Notifications");
  });

  it("opens the newest 20 in the bar's panel, then All notifications; a row calls onOpen", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    mount({ onOpen });
    await user.click(trigger());
    const menu = screen.getByRole("menu", { name: "Notifications" });
    const rows = within(menu).getAllByRole("menuitem");
    // 20 rows and the link.
    expect(rows).toHaveLength(21);
    expect(rows[0]).toHaveTextContent("Row 25");
    expect(rows[0]).toHaveAccessibleName(expect.stringContaining("Unread"));
    expect(rows[19]).toHaveTextContent("Row 6");
    expect(rows[20]).toHaveTextContent("All notifications");
    expect(rows[20]).toHaveAttribute("href", "/notifications");
    await user.click(rows[1]);
    expect(onOpen).toHaveBeenCalledWith(ITEMS[1]);
  });

  it("hands onOpen the row's company_id, so the app switches to that company exactly (0.46.1)", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const rows = [
      { ...item(2), company: "Muster AG", company_id: 7 },
      { ...item(1), company: "Muster AG", company_id: 3 },
    ];
    mount({ items: rows, onOpen });
    await user.click(trigger());
    const menu = screen.getByRole("menu", { name: "Notifications" });
    await user.click(within(menu).getAllByRole("menuitem")[1]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1, company: "Muster AG", company_id: 3 }));
  });

  it("an empty inbox says so in the panel", async () => {
    const user = userEvent.setup();
    mount({ items: [], unreadCount: 0 });
    await user.click(trigger());
    expect(screen.getByRole("menu")).toHaveTextContent("You’re all caught up.");
  });

  it("sits in the top bar's notifications slot, right before the account menu", () => {
    render(
      <MemoryRouter>
        <TopBarActions
          account={<span data-slot-name="account">me</span>}
          notifications={<NotificationBell items={[]} unreadCount={0} onOpen={vi.fn()} href="/n" />}
          theme={<span data-slot-name="theme">theme</span>}
        />
      </MemoryRouter>,
    );
    const bell = trigger();
    const account = document.querySelector('[data-slot-name="account"]')!;
    expect(bell.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("passes axe, closed and open", async () => {
    const user = userEvent.setup();
    const { container } = mount();
    expect(await axeViolations(container)).toEqual([]);
    await user.click(trigger());
    expect(await axeViolations(container)).toEqual([]);
  });
});
