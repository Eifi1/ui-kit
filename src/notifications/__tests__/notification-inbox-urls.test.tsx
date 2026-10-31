import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { NotificationInbox } from "../notification-inbox";
import type { NotificationInboxItem } from "../notification-inbox";

/**
 * docs/notifications-harmonization.md §3.7: an inbox row's url is an in-app path, "never
 * `//` or a scheme" — and the inbox renders it only as one (refactor audit 2026-10-30,
 * FLW-8). server-kit checks the push payload's url but not the inbox row's.
 */

const at = "2026-10-19T08:30:00Z";
const item = (id: number, url: string): NotificationInboxItem<number> => ({
  id,
  notification_type: "announcements",
  title: `Row ${id}`,
  body: "Body.",
  url,
  created_at: at,
  read_at: null,
});

const mount = (items: NotificationInboxItem<number>[], onMarkRead = vi.fn()) =>
  render(
    <MemoryRouter>
      <NotificationInbox<number> items={items} unreadCount={items.length} onMarkRead={onMarkRead} onClear={vi.fn()} />
    </MemoryRouter>,
  );

const row = (id: number) => document.querySelector(`[data-inbox-item="${id}"]`) as HTMLElement;

describe("NotificationInbox — a row's url is a same-origin path or nothing", () => {
  it("draws a protocol-relative, a foreign or a script url as the plain mark-as-read row", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    mount(
      [
        item(1, "//evil.example/phish"),
        item(2, "https://evil.example/phish"),
        item(3, "javascript:alert(1)"),
        item(4, "/\\evil.example"),
      ],
      onMarkRead,
    );
    for (const id of [1, 2, 3, 4]) {
      expect(row(id).tagName).toBe("BUTTON");
      expect(row(id)).not.toHaveAttribute("href");
    }
    expect(document.querySelector("a")).toBeNull();
    await user.click(row(1));
    expect(onMarkRead).toHaveBeenLastCalledWith([1]);
  });

  it("opens a same-origin url as its path, in this tab", () => {
    mount([item(5, `${window.location.origin}/news?id=5#top`), item(6, "/settings/notifications")]);
    expect(row(5)).toHaveAttribute("href", "/news?id=5#top");
    expect(row(5)).not.toHaveAttribute("target");
    expect(row(6)).toHaveAttribute("href", "/settings/notifications");
  });
});
