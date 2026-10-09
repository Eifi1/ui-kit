import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WriteLockProvider } from "../../components/write-lock";
import { DeleteAccountSetting } from "../delete-account-setting";
import type { DeleteAccountSettingProps } from "../delete-account-setting";

/**
 * docs/user-admin-harmonization.md §6.4 / §2.1: the request deactivates at once and the
 * erasure follows per the app's mode; the confirm asks for the typed address and the
 * password; the coded refusals are said. Synthetic people only.
 */

const refusal = (status: number, code: string) => ({ response: { status, data: { detail: "x", code } } });

function setup(props: Partial<DeleteAccountSettingProps> = {}) {
  const onRequest = vi.fn<DeleteAccountSettingProps["onRequest"]>(async () => undefined);
  const user = userEvent.setup();
  const utils = render(
    <DeleteAccountSetting email="ada@example.com" mode="after_days" onRequest={onRequest} {...props} />,
  );
  return { user, onRequest, ...utils };
}

type User = ReturnType<typeof userEvent.setup>;

const arm = (user: User) => user.click(screen.getByRole("button", { name: "Delete account…" }));
const confirmButton = () => screen.getByRole("button", { name: "Delete my account" });

async function answer(user: User, typed = "ada@example.com", password = "correct horse") {
  await user.type(screen.getByLabelText("Type “ada@example.com” to confirm"), typed);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(confirmButton());
}

describe("DeleteAccountSetting — what it says before anything is pressed", () => {
  it("after_days: deactivated at once, erased 30 days later — or the app's days", () => {
    const { unmount } = setup();
    expect(screen.getByText("Delete account")).toBeInTheDocument();
    expect(
      screen.getByText("Your account is deactivated at once and erased for good 30 days later."),
    ).toBeInTheDocument();
    unmount();

    const second = setup({ days: 14 });
    expect(
      screen.getByText("Your account is deactivated at once and erased for good 14 days later."),
    ).toBeInTheDocument();
    second.unmount();

    setup({ days: 1 });
    expect(screen.getByText("Your account is deactivated at once and erased for good 1 day later.")).toBeInTheDocument();
  });

  it("operator: an operator will erase it (kastlan)", () => {
    setup({ mode: "operator", days: 30 });
    expect(
      screen.getByText("Your account is deactivated at once, and an operator will erase it for good."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/days later/)).not.toBeInTheDocument();
  });
});

describe("DeleteAccountSetting — the confirm", () => {
  it("lists the app's consequences and the hand-over count once armed", async () => {
    const { user } = setup({
      consequences: [
        "Your 2 budgets are deleted.",
        <span key="guests">Their 3 guests are told today.</span>,
        { key: "gone", text: "This cannot be undone after the date.", severe: true },
        false,
      ],
      handOverCount: 3,
    });
    expect(screen.queryByText("Your 2 budgets are deleted.")).not.toBeInTheDocument();
    await arm(user);
    expect(
      screen.getByText("You will be signed out on every device, and your account can no longer be used."),
    ).toBeInTheDocument();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "Your 2 budgets are deleted.",
      "Their 3 guests are told today.",
      "This cannot be undone after the date.",
      "3 items others can see will pass to an administrator.",
    ]);
    expect(screen.getByText("This cannot be undone after the date.")).toHaveClass("text-[var(--danger)]");
  });

  it("one hand-over item reads in the singular; none, no line", async () => {
    const { user, unmount } = setup({ handOverCount: 1 });
    await arm(user);
    expect(screen.getByText("1 item others can see will pass to an administrator.")).toBeInTheDocument();
    unmount();

    const second = setup({ handOverCount: 0 });
    await arm(second.user);
    expect(screen.queryByText(/will pass to an administrator/)).not.toBeInTheDocument();
  });

  it("holds the confirm until the address (any case) and the password are given, then sends both", async () => {
    const { user, onRequest } = setup();
    await arm(user);
    expect(confirmButton()).toHaveAttribute("aria-disabled", "true");
    await user.type(screen.getByLabelText("Type “ada@example.com” to confirm"), " Ada@Example.com ");
    expect(confirmButton()).toHaveAccessibleDescription("Enter your password to confirm");
    await user.type(screen.getByLabelText("Password"), "correct horse");
    await user.click(confirmButton());
    // The address as typed (trimmed), for the server to re-check.
    expect(onRequest).toHaveBeenCalledWith({ password: "correct horse", confirmEmail: "Ada@Example.com" });
  });

  it("after success: deactivated, being signed out — focused, the tile gone", async () => {
    const { user } = setup();
    await arm(user);
    await answer(user);
    const done = await screen.findByText("Your account is deactivated. You are being signed out.");
    await waitFor(() => expect(done.closest("[tabindex='-1']")).toHaveFocus());
    expect(screen.queryByRole("button", { name: "Delete account…" })).not.toBeInTheDocument();
  });
});

describe("DeleteAccountSetting — refusals", () => {
  it.each([
    [refusal(409, "last_admin"), "You are the last administrator. Make someone else an administrator first."],
    [
      refusal(409, "household_has_members"),
      "Your household has other members, so the account can’t be deleted here. Please write to the operator.",
    ],
    [{ response: { status: 429 } }, "Too many attempts. Wait a moment and try again."],
    [{ response: { status: 429, headers: { "retry-after": "20" } } }, "Too many attempts. Try again in 20 s."],
    [{ response: { status: 409, data: { detail: { code: "last_admin" } } } }, "You are the last administrator."],
    [refusal(409, "something_else"), "Your account could not be deleted. Please try again."],
    [new Error("Network Error"), "Your account could not be deleted. Please try again."],
  ])("%j is said, and the confirm stays open with what was typed", async (error, text) => {
    const { user } = setup({ onRequest: () => Promise.reject(error) });
    await arm(user);
    await answer(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(confirmButton()).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveValue("correct horse");
  });

  it("password_incorrect (a 400): under the password, which takes the focus; typing clears it", async () => {
    const { user } = setup({ onRequest: () => Promise.reject(refusal(400, "password_incorrect")) });
    await arm(user);
    await answer(user);
    const password = screen.getByLabelText("Password");
    await waitFor(() => expect(password).toHaveAccessibleDescription("The password is incorrect."));
    expect(password).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(password).toHaveFocus());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.type(password, "x");
    expect(password).not.toHaveAttribute("aria-invalid");
  });

  it("an older server's invalid_credentials reads the same", async () => {
    const { user } = setup({ onRequest: () => Promise.reject(refusal(401, "invalid_credentials")) });
    await arm(user);
    await answer(user);
    await waitFor(() =>
      expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("The password is incorrect."),
    );
  });

  it("confirmation_mismatch: under the typed address", async () => {
    const { user } = setup({ onRequest: () => Promise.reject(refusal(409, "confirmation_mismatch")) });
    await arm(user);
    await answer(user);
    const typed = screen.getByLabelText("Type “ada@example.com” to confirm");
    await waitFor(() => expect(typed).toHaveAccessibleDescription("This is not your account’s address."));
    await waitFor(() => expect(typed).toHaveFocus());
  });

  it("last_admin names kastlan's companies when the answer lists them", async () => {
    const { user } = setup({
      onRequest: () =>
        Promise.reject({
          response: { status: 409, data: { detail: "x", code: "last_admin", companies: ["Example AG", "Sample GmbH"] } },
        }),
    });
    await arm(user);
    await answer(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You are the last administrator of Example AG and Sample GmbH. Make someone else an administrator there first.",
    );
  });

  it("Cancel wipes what was typed and the error", async () => {
    const { user } = setup({ onRequest: () => Promise.reject(refusal(409, "last_admin")) });
    await arm(user);
    await answer(user);
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await arm(user);
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Type “ada@example.com” to confirm")).toHaveValue("");
    // Arming starts at the first guard.
    await waitFor(() => expect(screen.getByLabelText("Type “ada@example.com” to confirm")).toHaveFocus());
  });

  it("the app's words come first — kastlan naming the companies, a demo account's 403", async () => {
    const describeError = vi.fn((error: unknown) =>
      (error as { response?: { status?: number } }).response?.status === 403 ? "Not in the demo." : undefined,
    );
    const { user } = setup({ onRequest: () => Promise.reject({ response: { status: 403 } }), describeError });
    await arm(user);
    await answer(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Not in the demo.");
  });

  it("reads a body thrown as it came, never axios' own err.code", async () => {
    const { user, unmount } = setup({ onRequest: () => Promise.reject({ detail: "x", code: "last_admin" }) });
    await arm(user);
    await answer(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("You are the last administrator.");
    unmount();

    const second = setup({
      onRequest: () => Promise.reject({ code: "ERR_BAD_REQUEST", response: { status: 409, data: "Conflict" } }),
    });
    await arm(second.user);
    await answer(second.user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your account could not be deleted. Please try again.");
  });
});

describe("DeleteAccountSetting under a write lock (0.33, billing decision 14, §12.36)", () => {
  it("a lapsed plan's lock leaves the confirm live: leaving never depends on paying", async () => {
    const onRequest = vi.fn<DeleteAccountSettingProps["onRequest"]>(async () => undefined);
    const user = userEvent.setup();
    render(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <DeleteAccountSetting email="ada@example.com" mode="after_days" onRequest={onRequest} />
      </WriteLockProvider>,
    );
    await arm(user);
    await answer(user);
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it("a demo's lock holds it, with the demo's reason", async () => {
    const onRequest = vi.fn<DeleteAccountSettingProps["onRequest"]>(async () => undefined);
    const user = userEvent.setup();
    render(
      <WriteLockProvider locked kind="demo" reason="Not possible in the demo.">
        <DeleteAccountSetting email="ada@example.com" mode="after_days" onRequest={onRequest} />
      </WriteLockProvider>,
    );
    // The tile is held before it arms: its arm button says the demo's reason.
    const armButton = screen.getByRole("button", { name: "Delete account…" });
    expect(armButton).toHaveAttribute("aria-disabled", "true");
    expect(armButton).toHaveAccessibleDescription("Not possible in the demo.");
    await arm(user);
    expect(screen.queryByRole("button", { name: "Delete my account" })).not.toBeInTheDocument();
    expect(onRequest).not.toHaveBeenCalled();
  });
});
