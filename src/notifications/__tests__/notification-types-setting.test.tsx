import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { NotificationTypesSetting } from "../notification-types-setting";
import type { NotificationTypeEntry, NotificationTypeGroup, NotificationTypesValue } from "../notification-types";
import { axeViolations } from "../../test/axe";
import { PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";

/**
 * docs/notifications-harmonization.md §2.1–§2.3, §4.2: the server's list is the only list;
 * two switches per type; one PATCH per switch. Synthetic words and data only.
 */

type KkId =
  | "recurring_posted"
  | "scheduled_due"
  | "overspend"
  | "low_balance"
  | "scan_done"
  | "share_events"
  | "digest"
  | "announcements"
  | "support_chat";

const KK_TYPES: readonly NotificationTypeEntry<KkId>[] = [
  { id: "recurring_posted", label: "Recurring bookings", description: "When a rule books a row." },
  { id: "scheduled_due", label: "Scheduled rows due" },
  { id: "overspend", label: "Overspent categories" },
  { id: "low_balance", label: "Low balance" },
  { id: "scan_done", label: "Finished scans" },
  { id: "share_events", label: "Sharing activity" },
  { id: "digest", label: "Budget digest" },
  { id: "announcements", label: "Product news" },
  { id: "support_chat", label: "Support replies" },
];

const KK_GROUPS: readonly NotificationTypeGroup<KkId>[] = [
  { id: "budget", label: "Budget", types: ["recurring_posted", "scheduled_due", "overspend", "low_balance"] },
  { id: "activity", label: "Scans & sharing", types: ["scan_done", "share_events"] },
  { id: "updates", label: "Summaries & news", types: ["digest", "announcements", "support_chat"] },
];

// The server's order is not the groups' order: the card draws in the groups' order.
const KK_VALUE: NotificationTypesValue = {
  support_chat: { app: true, email: null },
  recurring_posted: { app: true, email: null },
  overspend: { app: true, email: null },
  scan_done: { app: false, email: null },
  share_events: { app: false, email: null },
  low_balance: { app: false, email: null },
  digest: { app: false, email: null },
  announcements: { app: false, email: null },
  scheduled_due: { app: true, email: null },
};

type KaId = "invoices_overdue" | "dunnings_pending";
const KA_TYPES: readonly NotificationTypeEntry<KaId>[] = [
  { id: "invoices_overdue", label: "Overdue invoices", description: "Once a day, per company." },
  { id: "dunnings_pending", label: "Dunnings to send" },
];

type KsId = "feedback_answered" | "share_granted" | "team_added";
const KS_TYPES: readonly NotificationTypeEntry<KsId>[] = [
  { id: "feedback_answered", label: "Answers to your reports" },
  { id: "share_granted", label: "Work shared with you", description: "A project or a gear, or with your team." },
  { id: "team_added", label: "Added to a team" },
];
const KS_VALUE: NotificationTypesValue = {
  feedback_answered: { app: null, email: true },
  share_granted: { app: null, email: false },
  team_added: { app: null, email: false },
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("NotificationTypesSetting — what it draws", () => {
  it("draws the server's types under the app's headings, in the groups' order", () => {
    render(
      <NotificationTypesSetting types={KK_TYPES} groups={KK_GROUPS} value={KK_VALUE} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Notify me about")).toBeInTheDocument();
    const budget = screen.getByRole("group", { name: "Budget" });
    expect(within(budget).getAllByRole("switch")).toHaveLength(4);
    const names = screen.getAllByRole("switch").map((s) => s.closest("[data-notification-type]")?.getAttribute("data-notification-type"));
    expect(names).toEqual([
      "recurring_posted",
      "scheduled_due",
      "overspend",
      "low_balance",
      "scan_done",
      "share_events",
      "digest",
      "announcements",
      "support_chat",
    ]);
    expect(screen.getByRole("switch", { name: "Recurring bookings" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Finished scans" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Recurring bookings" })).toHaveAccessibleDescription(
      "When a rule books a row.",
    );
    // No type here offers mail.
    expect(screen.queryByRole("switch", { name: "By e-mail" })).not.toBeInTheDocument();
  });

  it("without groups, one list in the order of `types`", () => {
    render(
      <NotificationTypesSetting
        types={KA_TYPES}
        value={{ dunnings_pending: { app: false, email: null }, invoices_overdue: { app: true, email: false } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    const rows = [...document.querySelectorAll("[data-notification-type]")].map((el) =>
      el.getAttribute("data-notification-type"),
    );
    expect(rows).toEqual(["invoices_overdue", "dunnings_pending"]);
  });

  it("offers e-mail only where the type does: a column per channel in a group named by its type", () => {
    render(
      <NotificationTypesSetting
        types={KA_TYPES}
        value={{ invoices_overdue: { app: true, email: false }, dunnings_pending: { app: false, email: null } }}
        onChange={vi.fn()}
      />,
    );
    const overdue = screen.getByRole("group", { name: "Overdue invoices" });
    expect(within(overdue).getByRole("switch", { name: "In the app" })).toBeChecked();
    expect(within(overdue).getByRole("switch", { name: "E-mail" })).not.toBeChecked();
    // `dunnings_pending` is `app` only: no group, one switch named by its type.
    expect(screen.queryByRole("group", { name: "Dunnings to send" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Dunnings to send" })).not.toBeChecked();
    expect(screen.getAllByRole("switch", { name: "E-mail" })).toHaveLength(1);
    // kastlan has no push (`push: null` or left out): no push column, no push heading.
    expect(screen.queryByRole("switch", { name: "Push" })).not.toBeInTheDocument();
    const headings = document.querySelector("[data-channel-headings]")!;
    expect(headings).toHaveAttribute("aria-hidden", "true");
    expect(headings).toHaveTextContent(/^In the appE-mail$/);
  });

  it("an app with no `app` channel (Kurvenschmiede): the e-mail switch is the row's", () => {
    render(<NotificationTypesSetting types={KS_TYPES} value={KS_VALUE} onChange={vi.fn()} />);
    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.getByRole("switch", { name: "Answers to your reports" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Work shared with you" })).toHaveAccessibleDescription(
      "A project or a gear, or with your team.",
    );
    expect(screen.queryByRole("switch", { name: "By e-mail" })).not.toBeInTheDocument();
  });

  it("leaves out a type the app names that the server did not answer (kastlan's tenant)", () => {
    render(
      <NotificationTypesSetting
        types={KA_TYPES}
        value={{ invoices_overdue: { app: false, email: false } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Dunnings to send")).not.toBeInTheDocument();
  });

  it("says when the server answered no types, and while it loads", () => {
    const { rerender } = render(<NotificationTypesSetting types={KS_TYPES} value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading notification settings…");
    rerender(<NotificationTypesSetting types={KS_TYPES} value={{}} onChange={vi.fn()} />);
    expect(screen.getByText("There are no notifications for this account.")).toBeInTheDocument();
  });

  it("puts `emailUnverified` under every e-mail switch (decision 16)", () => {
    const { unmount } = render(
      <NotificationTypesSetting types={KS_TYPES} value={KS_VALUE} emailUnverified onChange={vi.fn()} />,
    );
    for (const name of ["Answers to your reports", "Added to a team"]) {
      expect(screen.getByRole("switch", { name })).toHaveAccessibleDescription(
        expect.stringContaining("Confirm your address to receive these."),
      );
    }
    // The type's own line stays, the address's under it.
    expect(screen.getByRole("switch", { name: "Work shared with you" })).toHaveAccessibleDescription(
      expect.stringMatching(/^A project or a gear, or with your team\.\s*Confirm your address to receive these\.$/),
    );
    unmount();
    render(
      <NotificationTypesSetting
        types={KA_TYPES}
        value={{ invoices_overdue: { app: true, email: true }, dunnings_pending: { app: true, email: null } }}
        emailUnverified
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch", { name: "E-mail" })).toHaveAccessibleDescription(
      "Confirm your address to receive these.",
    );
    // The `app` switches say nothing of it: the address gates mail only.
    expect(screen.getByRole("switch", { name: "Dunnings to send" })).not.toHaveAccessibleDescription(
      expect.stringContaining("Confirm"),
    );
  });
});

describe("NotificationTypesSetting — development checks", () => {
  it("throws for a type the server answered with no entry in `types`", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <NotificationTypesSetting
          types={KA_TYPES.slice(0, 1)}
          value={{ invoices_overdue: { app: true, email: true }, dunnings_pending: { app: true, email: null } }}
          onChange={vi.fn()}
        />,
      ),
    ).toThrow(/"dunnings_pending" with no entry in `types`/);
    quiet.mockRestore();
  });

  it("throws for a type the server answered that is in no group", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    const groups = KK_GROUPS.map((group) =>
      group.id === "updates" ? { ...group, types: group.types.filter((id) => id !== "support_chat") } : group,
    );
    expect(() =>
      render(<NotificationTypesSetting types={KK_TYPES} groups={groups} value={KK_VALUE} onChange={vi.fn()} />),
    ).toThrow(/"support_chat" is in no group/);
    quiet.mockRestore();
  });
});

describe("NotificationTypesSetting — saving", () => {
  it("sends one PATCH body per switch, and shows the new state while it runs", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onChange = vi.fn(() => pending.promise);
    render(
      <NotificationTypesSetting
        types={KA_TYPES}
        value={{ invoices_overdue: { app: false, email: false }, dunnings_pending: { app: false, email: null } }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("switch", { name: "In the app" }));
    expect(onChange).toHaveBeenLastCalledWith({ types: { invoices_overdue: { app: true } } });
    expect(screen.getByRole("switch", { name: "In the app" })).toBeChecked();
    await user.click(screen.getByRole("switch", { name: "E-mail" }));
    expect(onChange).toHaveBeenLastCalledWith({ types: { invoices_overdue: { email: true } } });
    expect(onChange).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve());
    expect(screen.getByRole("switch", { name: "In the app" })).toBeChecked();
  });

  it("an e-mail-only row sends `email`", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(async () => undefined);
    render(<NotificationTypesSetting types={KS_TYPES} value={KS_VALUE} onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: "Added to a team" }));
    expect(onChange).toHaveBeenCalledWith({ types: { team_added: { email: true } } });
  });

  it("puts a rejected switch back and says so under the card, in the app's words if it has them", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(() => Promise.reject(new Error("offline")));
    const { rerender } = render(
      <NotificationTypesSetting types={KS_TYPES} value={KS_VALUE} onChange={onChange} />,
    );
    await user.click(screen.getByRole("switch", { name: "Answers to your reports" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");
    expect(screen.getByRole("switch", { name: "Answers to your reports" })).toBeChecked();

    rerender(
      <NotificationTypesSetting
        types={KS_TYPES}
        value={KS_VALUE}
        onChange={onChange}
        describeError={() => "You are offline."}
      />,
    );
    await user.click(screen.getByRole("switch", { name: "Answers to your reports" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You are offline.");
  });

  it("keeps a saved switch until the app hands over the answer, then shows the answer", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(async () => undefined);
    const { rerender } = render(<NotificationTypesSetting types={KS_TYPES} value={KS_VALUE} onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: "Added to a team" }));
    expect(screen.getByRole("switch", { name: "Added to a team" })).toBeChecked();
    // A refetch that says otherwise (another tab turned it off again) wins.
    rerender(
      <NotificationTypesSetting
        types={KS_TYPES}
        value={{ ...KS_VALUE, team_added: { app: null, email: false } }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("switch", { name: "Added to a team" })).not.toBeChecked();
  });

  it("shows the cadence and the app's extra only while their type is on", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(async () => undefined);
    const props = {
      types: KK_TYPES,
      groups: KK_GROUPS,
      digest: { type: "digest" as const, cadence: "weekly" as const },
      renderExtra: (id: KkId) => (id === "low_balance" ? <span>threshold field</span> : null),
      onChange,
    };
    const { rerender } = render(<NotificationTypesSetting {...props} value={KK_VALUE} />);
    expect(screen.queryByRole("combobox", { name: "Frequency" })).not.toBeInTheDocument();
    expect(screen.queryByText("threshold field")).not.toBeInTheDocument();

    const on = {
      ...KK_VALUE,
      digest: { app: true, email: null },
      low_balance: { app: true, email: null },
    };
    rerender(<NotificationTypesSetting {...props} value={on} />);
    expect(screen.getByText("threshold field")).toBeInTheDocument();
    const cadence = screen.getByRole("combobox", { name: "Frequency" });
    expect(cadence).toHaveValue("weekly");
    await user.selectOptions(cadence, "monthly");
    expect(onChange).toHaveBeenCalledWith({ digest_cadence: "monthly" });
    expect(cadence).toHaveValue("monthly");
  });

  it("disabled: nothing can be flipped", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NotificationTypesSetting types={KS_TYPES} value={KS_VALUE} disabled onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: "Added to a team" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

/** keksdose after 0.46 (§10.2): in the app, push and e-mail; `scan_done` has no mail. */
const KK3_TYPES: readonly NotificationTypeEntry<"feedback_received" | "scan_done">[] = [
  { id: "feedback_received", label: "New feedback and reworks" },
  { id: "scan_done", label: "Finished scans" },
];
const KK3_VALUE: NotificationTypesValue = {
  feedback_received: { app: true, push: false, email: true },
  scan_done: { app: true, push: true, email: null },
};

describe("NotificationTypesSetting — a switch per channel (0.46, §10.2)", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("draws three columns headed In the app / Push / E-mail, and a `null` channel not at all", () => {
    render(<NotificationTypesSetting types={KK3_TYPES} value={KK3_VALUE} onChange={vi.fn()} />);
    expect(document.querySelector("[data-channel-headings]")).toHaveTextContent(/^In the appPushE-mail$/);
    const received = screen.getByRole("group", { name: "New feedback and reworks" });
    expect(within(received).getAllByRole("switch").map((el) => el.getAttribute("aria-label"))).toEqual([
      "In the app",
      "Push",
      "E-mail",
    ]);
    expect(within(received).getByRole("switch", { name: "Push" })).not.toBeChecked();
    const scans = screen.getByRole("group", { name: "Finished scans" });
    expect(within(scans).getAllByRole("switch").map((el) => el.getAttribute("aria-label"))).toEqual([
      "In the app",
      "Push",
    ]);
  });

  it("sends `push` alone, independent of `app`", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(async () => undefined);
    render(<NotificationTypesSetting types={KK3_TYPES} value={KK3_VALUE} onChange={onChange} />);
    const received = screen.getByRole("group", { name: "New feedback and reworks" });
    await user.click(within(received).getByRole("switch", { name: "Push" }));
    expect(onChange).toHaveBeenCalledWith({ types: { feedback_received: { push: true } } });
  });

  it("an app with no push (`push: null` on every type) keeps its two channels, a one-channel row its single switch", () => {
    render(
      <NotificationTypesSetting
        types={KA_TYPES}
        value={{
          invoices_overdue: { app: true, push: null, email: true },
          dunnings_pending: { app: true, push: null, email: null },
        }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("switch", { name: "Push" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Dunnings to send" })).toBeChecked();
    expect(document.querySelector('[data-notification-type="dunnings_pending"]')).toHaveAttribute("data-channels", "app");
  });

  it("on a phone the switches stack under the type's label, each with its channel's name in view", () => {
    stubViewportWidth(PHONE_WIDTH);
    render(<NotificationTypesSetting types={KK3_TYPES} value={KK3_VALUE} onChange={vi.fn()} />);
    expect(document.querySelector("[data-channel-headings]")).toBeNull();
    const received = screen.getByRole("group", { name: "New feedback and reworks" });
    const stack = received.querySelector("[data-stacked]")!;
    expect(within(stack as HTMLElement).getAllByRole("switch")).toHaveLength(3);
    // A visible label now, not an aria-label: the column headings are gone.
    expect(within(received).getByText("Push")).toBeVisible();
    expect(within(received).getByRole("switch", { name: "Push" })).not.toHaveAttribute("aria-label");
  });

  it("the cadence and the app's extra show while any channel is on", () => {
    render(
      <NotificationTypesSetting
        types={KK3_TYPES}
        value={{ ...KK3_VALUE, scan_done: { app: false, push: true, email: null } }}
        renderExtra={(id) => (id === "scan_done" ? <span>extra</span> : null)}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("extra")).toBeInTheDocument();
  });

  it("passes axe with three columns, and stacked", async () => {
    const { container, unmount } = render(
      <NotificationTypesSetting types={KK3_TYPES} value={KK3_VALUE} emailUnverified onChange={vi.fn()} />,
    );
    expect(await axeViolations(container)).toEqual([]);
    unmount();
    stubViewportWidth(PHONE_WIDTH);
    const phone = render(<NotificationTypesSetting types={KK3_TYPES} value={KK3_VALUE} emailUnverified onChange={vi.fn()} />);
    expect(await axeViolations(phone.container)).toEqual([]);
  });
});

describe("NotificationTypesSetting — words and access", () => {
  it("takes its words from the provider's `notifications` namespace; the prop wins", () => {
    render(
      <UiKitProvider labels={{ notifications: { typesTitle: "Benachrichtigungen zu", channelEmail: "E-Mail" } }}>
        <NotificationTypesSetting
          types={KA_TYPES}
          value={{ invoices_overdue: { app: true, email: true } }}
          onChange={vi.fn()}
          labels={{ channelEmail: "Prop" }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByText("Benachrichtigungen zu")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Prop" })).toBeInTheDocument();
  });

  it("spreads `id` on the card, the app's anchor", () => {
    render(
      <NotificationTypesSetting id="settings-notifications-card" types={KS_TYPES} value={KS_VALUE} onChange={vi.fn()} />,
    );
    expect(document.getElementById("settings-notifications-card")).toContainElement(
      screen.getByRole("switch", { name: "Added to a team" }),
    );
  });

  it("passes axe, grouped with e-mail and the digest open", async () => {
    const { container } = render(
      <>
        <NotificationTypesSetting
          types={KK_TYPES}
          groups={KK_GROUPS}
          digest={{ type: "digest", cadence: "monthly" }}
          value={{ ...KK_VALUE, digest: { app: true, email: null } }}
          onChange={vi.fn()}
        />
        <NotificationTypesSetting
          types={KA_TYPES}
          value={{ invoices_overdue: { app: true, email: false }, dunnings_pending: { app: false, email: null } }}
          emailUnverified
          onChange={vi.fn()}
        />
        <NotificationTypesSetting types={KS_TYPES} value={KS_VALUE} emailUnverified onChange={vi.fn()} />
      </>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
