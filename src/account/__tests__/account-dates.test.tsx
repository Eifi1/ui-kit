import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";
import { AccountStateChip, DateMark } from "../../components/account-chips";
import { PasskeysSetting } from "../passkeys-setting";
import { SessionsSetting } from "../sessions-setting";

/**
 * The account cards' dates go through the kit's one day ladder (refactor audit
 * 2026-10-30, DUP-2): the card's prop, else `<UiKitProvider formatDate>` (the app's date
 * preference), else the kit's in the provider's locale and `timeZone`. The suite runs in
 * Europe/Berlin.
 */

const preference: KitDateFormatter = (iso, { weekday }) => `pref ${iso}${weekday ? " +wd" : ""}`;
const withProvider = (children: ReactNode, props: { formatDate?: KitDateFormatter; timeZone?: string } = {}) => (
  <UiKitProvider locale="en-GB" {...props}>
    {children}
  </UiKitProvider>
);

describe("the account cards' dates", () => {
  it("PasskeysSetting asks the provider, and reads a bare day on its own calendar", () => {
    render(
      withProvider(
        <PasskeysSetting
          passkeys={[{ id: 1, name: "Laptop", createdAt: "2026-01-02", lastUsedAt: "2026-09-01T23:30:00Z" }]}
          onAdd={vi.fn()}
        />,
        { formatDate: preference, timeZone: "America/New_York" },
      ),
    );
    // The bare day is the day it names; the instant is the zone's day (19:30 in New York).
    expect(screen.getByText(/Added pref 2026-01-02/)).toHaveTextContent("Last used pref 2026-09-01");
  });

  it("PasskeysSetting without a provider formatDate: the kit's medium date, no own Date parse", () => {
    render(
      withProvider(
        <PasskeysSetting passkeys={[{ id: 1, name: "Laptop", createdAt: "2026-01-02" }]} onAdd={vi.fn()} />,
        {
          timeZone: "America/Los_Angeles",
        },
      ),
    );
    // `new Date("2026-01-02")` is UTC midnight: the 1st in Los Angeles. A bare day is not moved.
    expect(screen.getByText(/2 Jan 2026/)).toBeInTheDocument();
  });

  it("SessionsSetting writes a session older than a week as the provider's day", () => {
    render(
      withProvider(
        <SessionsSetting
          onSignOutEverywhere={() => {}}
          sessions={[{ id: "s1", device: "Firefox", lastActiveAt: "2026-01-02T10:00:00Z" }]}
        />,
        { formatDate: preference },
      ),
    );
    expect(screen.getByText("Last active pref 2026-01-02")).toBeInTheDocument();
  });

  it("AccountStateChip's deletion day and DateMark's exact line follow the provider's timeZone", () => {
    render(
      withProvider(
        <>
          <AccountStateChip state="deletion" date="2026-11-06T03:00:00Z" />
          <DateMark value="2026-11-06T03:00:00Z" display="relative" relative={{ now: "2026-11-20T12:00:00Z" }} />
        </>,
        { timeZone: "America/New_York" },
      ),
    );
    // 03:00 UTC on the 6th is 22:00 on the 5th in New York.
    expect(
      screen.getByText(/5 Nov 2026/, { selector: "[data-state='deletion'] *, [data-state='deletion']" }),
    ).toBeInTheDocument();
    expect(screen.getByText("5 Nov 2026, 22:00")).toBeInTheDocument();
  });

  it("AccountStateChip's deletion day asks the provider, with no weekday (a sentence)", () => {
    render(withProvider(<AccountStateChip state="deletion" date="2026-11-06" />, { formatDate: preference }));
    expect(document.querySelector("[data-state='deletion']")).toHaveTextContent("pref 2026-11-06");
    expect(document.querySelector("[data-state='deletion']")).not.toHaveTextContent("+wd");
  });
});
