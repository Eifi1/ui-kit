import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Megaphone } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { NotificationInbox, INBOX_BADGE_INTERVAL } from "../notification-inbox";
import type { NotificationInboxAction, NotificationInboxItem } from "../notification-inbox";
import { axeViolations } from "../../test/axe";

/** docs/notifications-harmonization.md §10.1: keksdose's list, lifted. Synthetic rows. */

const ITEMS: NotificationInboxItem<number>[] = [
  {
    id: 3,
    notification_type: "announcements",
    title: "Something new",
    body: "Two lines of news.",
    url: "/news",
    created_at: "2026-10-19T08:30:00Z",
    read_at: null,
  },
  {
    id: 2,
    notification_type: "retired_type",
    title: "An old kind",
    body: "Its type is gone.",
    url: null,
    created_at: "2026-10-18T08:30:00Z",
    read_at: null,
  },
  {
    id: 1,
    notification_type: "invoices_overdue",
    title: "3 overdue invoices",
    body: "Since yesterday.",
    url: "https://example.org/elsewhere",
    created_at: "2026-10-17T08:30:00Z",
    read_at: "2026-10-17T09:00:00Z",
    company: "Muster AG",
  },
];

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const mount = (props: Partial<Parameters<typeof NotificationInbox<number>>[0]> = {}) =>
  render(
    <MemoryRouter>
      <NotificationInbox<number>
        items={ITEMS}
        unreadCount={2}
        onMarkRead={vi.fn()}
        onClear={vi.fn()}
        formatDate={(iso) => iso.slice(0, 10)}
        {...props}
      />
    </MemoryRouter>,
  );

/** A row's target — its link or button, which carries the row's `data-*`. */
const row = (id: number) => document.querySelector(`[data-inbox-item="${id}"]`) as HTMLElement;

describe("NotificationInbox — what it draws", () => {
  it("lists the rows newest first: title, body, time; unread rows marked", () => {
    mount();
    const list = screen.getByRole("list", { name: "Inbox" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(row(3)).toHaveTextContent("Something new");
    expect(row(3)).toHaveTextContent("Two lines of news.");
    expect(row(3)).toHaveTextContent("2026-10-19");
    expect(row(3)).toHaveAccessibleName(expect.stringContaining("Unread"));
    expect(row(1)).not.toHaveAccessibleName(expect.stringContaining("Unread"));
  });

  it("names a row's company (kastlan) and falls back to the Bell for a type the app does not map", () => {
    const icon = vi.fn((type: string) => (type === "announcements" ? Megaphone : undefined));
    mount({ icon });
    expect(row(1)).toHaveTextContent("Muster AG");
    expect(icon).toHaveBeenCalledWith("retired_type");
    expect(row(3).querySelector("svg.lucide-megaphone")).not.toBeNull();
    expect(row(2).querySelector("svg.lucide-bell")).not.toBeNull();
  });

  it("says so when empty, and while the first page loads", () => {
    const { rerender } = mount({ items: [] });
    expect(screen.getByText("You’re all caught up.")).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <NotificationInbox items={undefined} unreadCount={0} onMarkRead={vi.fn()} onClear={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading notifications…");
  });

  it("formats the time through the provider's locale and zone when the app passes no formatter", () => {
    render(
      <MemoryRouter>
        <UiKitProvider locale="en-GB" timeZone="Asia/Tokyo">
          <NotificationInbox items={ITEMS.slice(0, 1)} unreadCount={1} onMarkRead={vi.fn()} onClear={vi.fn()} />
        </UiKitProvider>
      </MemoryRouter>,
    );
    // 08:30 UTC is 17:30 in Tokyo.
    expect(row(3)).toHaveTextContent("19 Oct 2026, 17:30");
  });

  it("exports the badge's poll interval", () => {
    expect(INBOX_BADGE_INTERVAL).toBe(60_000);
  });
});

describe("NotificationInbox — acting", () => {
  it("opening a row marks it read: a link without `onOpen`, the app's `onOpen` with it", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    const { unmount } = mount({ onMarkRead });
    // An in-app link, through the router; a middle click marks it read too.
    expect(row(3)).toHaveAttribute("href", "/news");
    await user.click(row(3));
    expect(onMarkRead).toHaveBeenLastCalledWith([3]);
    // A row with nothing to open marks itself read.
    await user.click(row(2));
    expect(onMarkRead).toHaveBeenLastCalledWith([2]);
    // An absolute URL leaves in a new tab; a read row marks nothing.
    expect(row(1)).toHaveAttribute("target", "_blank");
    onMarkRead.mockClear();
    row(1).addEventListener("click", (event) => event.preventDefault());
    await user.click(row(1));
    expect(onMarkRead).not.toHaveBeenCalled();
    unmount();

    const onOpen = vi.fn();
    mount({ onMarkRead, onOpen });
    await user.click(row(3));
    expect(onMarkRead).toHaveBeenLastCalledWith([3]);
    expect(onOpen).toHaveBeenCalledWith(ITEMS[0]);
  });

  it("a middle click marks a link row read", () => {
    const onMarkRead = vi.fn();
    mount({ onMarkRead });
    act(() => {
      row(3).dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    });
    expect(onMarkRead).toHaveBeenCalledWith([3]);
  });

  it("marks all read while anything is unread", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    const { rerender } = mount({ onMarkRead });
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(onMarkRead).toHaveBeenCalledWith(null);
    rerender(
      <MemoryRouter>
        <NotificationInbox items={ITEMS} unreadCount={0} onMarkRead={onMarkRead} onClear={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });

  it("clears only after asking, with focus on Cancel; Cancel and Escape go back", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onClear = vi.fn(() => pending.promise);
    mount({ onClear });
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Delete all notifications from your inbox?");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClear).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says a failed request under the list, in the app's words if it has them", async () => {
    const user = userEvent.setup();
    mount({ onMarkRead: () => Promise.reject(new Error("offline")), describeError: () => "You are offline." });
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You are offline.");
  });

  it("tells `describeError` which action failed (0.46.1, keksdose N4)", async () => {
    const user = userEvent.setup();
    const describeError = vi.fn((_error: unknown, action: NotificationInboxAction) => `failed: ${action}`);
    mount({
      onMarkRead: () => Promise.reject(new Error("offline")),
      onClear: () => Promise.reject(new Error("offline")),
      describeError,
    });
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("failed: readAll");
    await user.click(row(2));
    expect(await screen.findByText("failed: read")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(await screen.findByText("failed: clear")).toBeInTheDocument();
    expect(describeError.mock.calls.map(([, action]) => action)).toEqual(["readAll", "read", "clear"]);
  });

  it("shows more with `hasMore`", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = mount();
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <NotificationInbox
          items={ITEMS}
          unreadCount={2}
          onMarkRead={vi.fn()}
          onClear={vi.fn()}
          hasMore
          onLoadMore={onLoadMore}
        />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Show more" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

describe("NotificationInbox — words and access", () => {
  it("takes the provider's words; the prop wins", () => {
    render(
      <MemoryRouter>
        <UiKitProvider labels={{ notifications: { inboxTitle: "Posteingang", markAllRead: "Alle gelesen" } }}>
          <NotificationInbox
            items={[]}
            unreadCount={0}
            onMarkRead={vi.fn()}
            onClear={vi.fn()}
            labels={{ inboxEmpty: "Nichts" }}
          />
        </UiKitProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Posteingang")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alle gelesen" })).toBeInTheDocument();
    expect(screen.getByText("Nichts")).toBeInTheDocument();
  });

  it("passes axe, and while asking to clear", async () => {
    const user = userEvent.setup();
    const { container } = mount({ hasMore: true, onLoadMore: vi.fn() });
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(await axeViolations(container)).toEqual([]);
  });
});
