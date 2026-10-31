import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";
import { NotificationBell } from "../notification-bell";
import { NotificationInbox } from "../notification-inbox";
import type { NotificationInboxItem } from "../notification-inbox";
import { PushDevicesSetting } from "../push-devices-setting";

/**
 * The notification cards' dates go through the kit's one day ladder (refactor audit
 * 2026-10-30, DUP-2): the card's prop, else `<UiKitProvider formatDate>` — the app's date
 * preference, which keksdose had to pass into each card by hand — else the kit's in the
 * provider's locale and `timeZone`. The suite runs in Europe/Berlin.
 */

const preference: KitDateFormatter = (iso, { weekday }) => `pref ${iso}${weekday ? " +wd" : ""}`;
const withProvider = (children: ReactNode, props: { formatDate?: KitDateFormatter; timeZone?: string } = {}) => (
  <MemoryRouter>
    <UiKitProvider locale="en-GB" {...props}>
      {children}
    </UiKitProvider>
  </MemoryRouter>
);

const ROW: NotificationInboxItem<number> = {
  id: 1,
  notification_type: "announcements",
  title: "News",
  body: "Body.",
  url: null,
  created_at: "2026-10-19T08:30:00Z",
  read_at: null,
};

describe("the notification cards' dates", () => {
  it("the inbox writes the provider's day with the language's clock", () => {
    render(
      withProvider(<NotificationInbox<number> items={[ROW]} unreadCount={1} onMarkRead={vi.fn()} onClear={vi.fn()} />, {
        formatDate: preference,
      }),
    );
    expect(document.querySelector('[data-inbox-item="1"]')).toHaveTextContent("pref 2026-10-19, 10:30");
  });

  it("the bell too", async () => {
    const user = userEvent.setup();
    render(
      withProvider(<NotificationBell<number> items={[ROW]} unreadCount={1} onOpen={vi.fn()} href="/inbox" />, {
        formatDate: preference,
      }),
    );
    await user.click(document.querySelector("[data-notification-bell]") as HTMLElement);
    expect(await screen.findByText("pref 2026-10-19, 10:30")).toBeInTheDocument();
  });

  it("without a provider formatDate, the inbox's time is in the provider's timeZone", () => {
    render(
      withProvider(<NotificationInbox<number> items={[ROW]} unreadCount={1} onMarkRead={vi.fn()} onClear={vi.fn()} />, {
        timeZone: "Asia/Tokyo",
      }),
    );
    expect(document.querySelector('[data-inbox-item="1"]')).toHaveTextContent("19 Oct 2026, 17:30");
  });

  it("the push devices' dates follow the provider, the prop still wins", () => {
    const device = {
      id: "d1",
      endpoint: "https://push.example/a",
      user_agent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120",
      created_at: "2026-10-19T23:30:00Z",
      last_success_at: null,
      failure_count: 0,
      muted_types: [],
    };
    const { unmount } = render(
      withProvider(<PushDevicesSetting devices={[device]} onRemove={vi.fn()} />, {
        formatDate: preference,
        timeZone: "Asia/Tokyo",
      }),
    );
    // 23:30 UTC on the 19th is the 20th in Tokyo: the day asked for is the zone's.
    expect(screen.getByText(/pref 2026-10-20/)).toBeInTheDocument();
    unmount();
    render(
      withProvider(<PushDevicesSetting devices={[device]} onRemove={vi.fn()} formatDate={() => "own"} />, {
        formatDate: preference,
      }),
    );
    expect(screen.getByText(/Added own/)).toBeInTheDocument();
  });
});
