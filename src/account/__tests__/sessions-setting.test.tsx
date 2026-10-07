import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SessionsSetting } from "../sessions-setting";
import type { SessionItem } from "../sessions-setting";

/**
 * docs/user-admin-harmonization.md §6.3: "Sign out everywhere" in every app — this
 * device included — and the device list where sessions are stored (kastlan).
 * Synthetic data only.
 */

const NOW = Date.now();
const SESSIONS: SessionItem<string>[] = [
  { id: "s1", device: "Firefox on Windows", ip: "192.0.2.10", lastActiveAt: NOW - 60_000, current: true },
  { id: "s2", device: "Safari on iPhone", ip: "2001:db8::1", lastActiveAt: NOW - 3 * 3_600_000 },
  { id: "s3", device: "", lastActiveAt: null },
];

describe("SessionsSetting — sign out everywhere", () => {
  it("asks first, saying this device signs out too, then calls back", async () => {
    const user = userEvent.setup();
    const onSignOutEverywhere = vi.fn(async () => undefined);
    render(<SessionsSetting onSignOutEverywhere={onSignOutEverywhere} />);
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(
      screen.getByText("Signed in on a device you no longer use, or don’t trust? Sign out everywhere."),
    ).toBeInTheDocument();
    // No list without sessions: keksdose and Kurvenschmiede keep a cut-off, not rows.
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out everywhere…" }));
    expect(
      screen.getByText(
        "This ends every session, including this one: you will be signed out on this device too, and sign in again from here.",
      ),
    ).toBeInTheDocument();
    expect(onSignOutEverywhere).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    expect(onSignOutEverywhere).toHaveBeenCalledTimes(1);
  });

  it("a failure is said and the confirm stays open for a retry", async () => {
    const user = userEvent.setup();
    render(<SessionsSetting onSignOutEverywhere={() => Promise.reject(new Error("offline"))} />);
    await user.click(screen.getByRole("button", { name: "Sign out everywhere…" }));
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");
    expect(screen.getByRole("button", { name: "Sign out everywhere" })).toBeInTheDocument();
  });

  it("puts the app's words on a failure", async () => {
    const user = userEvent.setup();
    const describeError = vi.fn(() => "You are offline.");
    const error = new Error("offline");
    render(<SessionsSetting onSignOutEverywhere={() => Promise.reject(error)} describeError={describeError} />);
    await user.click(screen.getByRole("button", { name: "Sign out everywhere…" }));
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You are offline.");
    expect(describeError).toHaveBeenCalledWith(error, "sign-out-everywhere");
  });
});

describe("SessionsSetting — the device list (kastlan)", () => {
  it("lists device, last activity and address, marks this device and offers no sign-out on it", () => {
    render(<SessionsSetting onSignOutEverywhere={() => {}} sessions={SESSIONS} onRevoke={() => {}} locale="en" />);
    const list = screen.getByRole("list", { name: "Where you’re signed in" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);

    expect(rows[0]).toHaveTextContent("Firefox on Windows");
    expect(within(rows[0]).getByText("This device")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent("Last active 1 minute ago");
    expect(within(rows[0]).getByText("IP 192.0.2.10")).toHaveAttribute("dir", "ltr");
    expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument();

    expect(rows[1]).toHaveTextContent("Last active 3 hours ago · IP 2001:db8::1");
    expect(within(rows[1]).getByRole("button", { name: "Sign out Safari on iPhone" })).toHaveTextContent("Sign out");

    // A blank device reads as unknown; no date and no address, no line under it.
    expect(rows[2]).toHaveTextContent("Unknown device");
    expect(within(rows[2]).getByRole("button", { name: "Sign out Unknown device" })).toBeInTheDocument();
    expect(rows[2]).not.toHaveTextContent("Last active");
  });

  it("revokes one session, that row busy and the others held until it settles", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onRevoke = vi.fn((_id: string) => new Promise<void>((r) => (resolve = r)));
    render(<SessionsSetting onSignOutEverywhere={() => {}} sessions={SESSIONS} onRevoke={onRevoke} />);
    const button = screen.getByRole("button", { name: "Sign out Safari on iPhone" });
    await user.click(button);
    expect(onRevoke).toHaveBeenCalledWith("s2");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Sign out Unknown device" })).toBeDisabled();
    resolve();
    await waitFor(() => expect(button).not.toHaveAttribute("aria-busy"));
    expect(screen.getByRole("button", { name: "Sign out Unknown device" })).toBeEnabled();
  });

  it("a failed revoke is said, in the app's words if it has them", async () => {
    const user = userEvent.setup();
    const describeError = vi.fn((_e: unknown, action: string) => (action === "revoke" ? "Already gone." : undefined));
    render(
      <SessionsSetting
        onSignOutEverywhere={() => {}}
        sessions={SESSIONS}
        onRevoke={() => Promise.reject(new Error("404"))}
        describeError={describeError}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Sign out Safari on iPhone" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Already gone.");
  });

  it("no row buttons without onRevoke; a loading and an empty list; the app's date format", () => {
    const { rerender } = render(<SessionsSetting onSignOutEverywhere={() => {}} sessions={SESSIONS} />);
    expect(screen.queryByRole("button", { name: /^Sign out (Safari|Unknown)/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();

    rerender(<SessionsSetting onSignOutEverywhere={() => {}} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading sessions…");

    rerender(<SessionsSetting onSignOutEverywhere={() => {}} sessions={[]} />);
    expect(screen.getByText("No sessions to show.")).toBeInTheDocument();

    rerender(
      <SessionsSetting
        onSignOutEverywhere={() => {}}
        sessions={[SESSIONS[1]]}
        formatLastActive={(date) => `at ${date.getTime() === NOW - 3 * 3_600_000 ? "the given time" : "?"}`}
      />,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Last active at the given time");
  });
});
