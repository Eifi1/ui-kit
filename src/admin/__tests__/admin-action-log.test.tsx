import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { AdminActionLog } from "../admin-action-log";
import type { AdminActionLogEntry } from "../admin-action-log";

/**
 * §4.3: the `admin_actions` rows, newest first — an admin, the user themselves, or the
 * scheduled job as the actor; an erased target scrubbed; the app's own actions by name.
 */

const ADMIN = { id: 1, first: "Ada", last: "Example", email: "ada@example.com" };
const BEN = { id: 2, first: "Ben", last: "Sample", email: "ben@example.com" };

const ENTRIES: AdminActionLogEntry[] = [
  { id: 5, at: "2026-10-06T10:00:00Z", actor: ADMIN, action: "deactivate", target: BEN },
  { id: 4, at: "2026-10-05T10:00:00Z", actor: BEN, action: "deletion_request", target: BEN },
  { id: 3, at: "2026-10-04T10:00:00Z", actor: null, action: "erase", target: null },
  { id: 2, at: "2026-10-03T10:00:00Z", actor: ADMIN, action: "role", target: BEN, detail: "Member → Admin" },
  { id: 1, at: "2026-10-02T10:00:00Z", actor: ADMIN, action: "plan", target: { email: "cy@example.com" } },
];

const rows = () => within(screen.getByRole("list", { name: "Admin actions" })).getAllByRole("listitem");

describe("AdminActionLog", () => {
  it("says who did what to whom, with the detail", () => {
    render(<AdminActionLog entries={ENTRIES} labels={{ actions: { plan: "Plan changed" } }} />);
    const [deactivated, requested, erased, role, plan] = rows();
    expect(deactivated).toHaveTextContent("Deactivated");
    expect(deactivated).toHaveTextContent("Ben Sample");
    expect(deactivated).toHaveTextContent("ben@example.com");
    expect(deactivated).toHaveTextContent("by Ada Example");
    expect(within(deactivated).getByText(/ago|yesterday|today/i).tagName).toBe("TIME");

    expect(requested).toHaveTextContent("Deletion requested");
    expect(requested).toHaveTextContent("by the user themselves");

    expect(erased).toHaveTextContent("Account erased");
    expect(erased).toHaveTextContent("an erased account");
    expect(erased).toHaveTextContent("automatically");

    expect(role).toHaveTextContent("Role changed");
    expect(role).toHaveTextContent("Member → Admin");

    // The app's own action, and an invitee known only by address.
    expect(plan).toHaveTextContent("Plan changed");
    expect(plan).toHaveTextContent("cy@example.com");
    expect(plan).toHaveAttribute("data-action", "plan");
  });

  it("shows an unknown action as its key, and the empty state", () => {
    const { rerender } = render(<AdminActionLog entries={[{ id: 1, at: null, actor: ADMIN, action: "mystery" }]} />);
    expect(rows()[0]).toHaveTextContent("mystery");
    rerender(<AdminActionLog entries={[]} />);
    expect(screen.getByText("No admin actions yet.")).toBeInTheDocument();
  });

  it("filters to a target and back", async () => {
    const user = userEvent.setup();
    const onTargetFilter = vi.fn();
    const { rerender } = render(<AdminActionLog entries={ENTRIES.slice(0, 1)} onTargetFilter={onTargetFilter} />);
    await user.click(screen.getByRole("button", { name: "Show only the actions on Ben Sample" }));
    expect(onTargetFilter).toHaveBeenCalledWith(BEN);

    rerender(<AdminActionLog entries={ENTRIES.slice(0, 1)} target={BEN} onTargetFilter={onTargetFilter} />);
    expect(screen.getByText("Only Ben Sample")).toBeInTheDocument();
    // The filtered account is not a filter button in its own list.
    expect(screen.queryByRole("button", { name: "Show only the actions on Ben Sample" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show all actions" }));
    expect(onTargetFilter).toHaveBeenLastCalledWith(null);
  });

  it("pages through the server's pages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<AdminActionLog entries={ENTRIES} paging={{ page: 0, pageSize: 5, total: 12, onPageChange }} />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("speaks the provider's words", () => {
    render(
      <UiKitProvider labels={{ adminActionLog: { actions: { deactivate: "Deaktiviert" }, by: (a) => `von ${a}` } }}>
        <AdminActionLog entries={ENTRIES.slice(0, 1)} />
      </UiKitProvider>,
    );
    expect(rows()[0]).toHaveTextContent("Deaktiviert");
    expect(rows()[0]).toHaveTextContent("von Ada Example");
  });
});
