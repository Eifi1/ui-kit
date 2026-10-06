import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "../reset-password-form";
import type { ResetPasswordCheck, ResetPasswordResult } from "../reset-password-form";

/**
 * docs/auth-harmonization.md §6.3: a reset is NOT a sign-in. The link is checked first,
 * the new password is chosen under the two hard rules, and the page ends on "Go to sign
 * in" with the address filled in, the app's outcomes beside it. keksdose's
 * reset-password-page.tsx. Synthetic people only.
 */

const TOKEN = "tok-123";
const GOOD = "correct horse battery";

const live = (check: ResetPasswordCheck = { email: "ada@example.com" }) => vi.fn(async () => check);
const dead = () => vi.fn(() => Promise.reject({ response: { data: { code: "token_invalid" } } }));

async function fillPassword(user: ReturnType<typeof userEvent.setup>, password = GOOD, confirm = password) {
  await user.type(await screen.findByLabelText("New password"), password);
  await user.type(screen.getByLabelText("Repeat new password"), confirm);
}

describe("ResetPasswordForm — the check", () => {
  it("says a link without a token is incomplete, and asks nobody", () => {
    const onCheck = vi.fn();
    render(<ResetPasswordForm token="" onCheck={onCheck} onSubmit={vi.fn()} />);
    expect(screen.getByText("This link is incomplete.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/forgot-password");
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("checks the link once — StrictMode's double effect included — before the form shows", async () => {
    let answer!: (check: ResetPasswordCheck) => void;
    const onCheck = vi.fn(() => new Promise<ResetPasswordCheck>((resolve) => (answer = resolve)));
    render(
      <StrictMode>
        <ResetPasswordForm token={TOKEN} onCheck={onCheck} onSubmit={vi.fn()} />
      </StrictMode>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Checking the link…");
    expect(screen.queryByLabelText("New password")).toBeNull();
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onCheck).toHaveBeenCalledWith(TOKEN);
    answer({ email: "ada@example.com" });
    expect(await screen.findByLabelText("New password")).toHaveFocus();
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it("shows 'invalid or expired' with the way to a new link when the check fails", async () => {
    render(
      <ResetPasswordForm token={TOKEN} onCheck={dead()} onSubmit={vi.fn()} forgotHref="/password/forgot" />,
    );
    expect(await screen.findByText("This link is invalid or has expired.")).toBeInTheDocument();
    expect(
      screen.getByText("Links are valid for one hour and work only once. Just request a new one."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/password/forgot");
    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  it("treats any rejection of the check as a dead link, a thrown one too", async () => {
    render(
      <ResetPasswordForm
        token={TOKEN}
        onCheck={() => {
          throw new Error("boom");
        }}
        onSubmit={vi.fn()}
      />,
    );
    expect(await screen.findByText("This link is invalid or has expired.")).toBeInTheDocument();
  });

  it("checks again for a new token", async () => {
    const onCheck = live();
    const { rerender } = render(<ResetPasswordForm token="a" onCheck={onCheck} onSubmit={vi.fn()} />);
    await screen.findByLabelText("New password");
    rerender(<ResetPasswordForm token="b" onCheck={onCheck} onSubmit={vi.fn()} />);
    expect(screen.getByText("Checking the link…")).toBeInTheDocument();
    await screen.findByLabelText("New password");
    expect(onCheck.mock.calls).toEqual([["a"], ["b"]]);
  });
});

describe("ResetPasswordForm — the form", () => {
  it("names the account, shows the app's notices first, and hands the address to the password manager", async () => {
    render(
      <ResetPasswordForm
        token={TOKEN}
        onCheck={live({ email: "ada@example.com", notices: <p>Your data is end-to-end encrypted.</p> })}
        onSubmit={vi.fn()}
      />,
    );
    expect(await screen.findByText("You’re setting a new password for ada@example.com.")).toBeInTheDocument();
    expect(screen.getByText("Your data is end-to-end encrypted.")).toBeInTheDocument();
    const username = document.querySelector<HTMLInputElement>('input[autocomplete="username"]')!;
    expect(username).toHaveValue("ada@example.com");
    expect(username).not.toBeVisible();
    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("heading", { level: 2, name: "Choose a new password" })).toBeInTheDocument();
  });

  it("works without an address from the check", async () => {
    render(<ResetPasswordForm token={TOKEN} onCheck={vi.fn(async () => undefined)} onSubmit={vi.fn()} />);
    await screen.findByLabelText("New password");
    expect(screen.queryByText(/You’re setting a new password/)).toBeNull();
    expect(document.querySelector('input[autocomplete="username"]')).toBeNull();
  });

  it("waits for 8 characters, at most 72 bytes and a matching confirmation; the meter only advises", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token={TOKEN} onCheck={live()} onSubmit={vi.fn()} />);
    const save = () => screen.getByRole("button", { name: "Save password" });
    await fillPassword(user, "short", "short");
    expect(save()).toBeDisabled();
    expect(screen.getByText("Too short")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("New password"));
    await user.clear(screen.getByLabelText("Repeat new password"));
    await fillPassword(user, "abcdefgh", "abcdefgX");
    expect(save()).toBeDisabled();
    expect(screen.getByText("The passwords don’t match.")).toBeInTheDocument();

    // "ü" is two bytes: 37 of them are 74 bytes, over bcrypt's 72.
    await user.clear(screen.getByLabelText("New password"));
    await user.clear(screen.getByLabelText("Repeat new password"));
    await fillPassword(user, "ü".repeat(37));
    expect(save()).toBeDisabled();

    // No case, digit or symbol — advised, not required.
    await user.clear(screen.getByLabelText("New password"));
    await user.clear(screen.getByLabelText("Repeat new password"));
    await fillPassword(user, "abcdefgh");
    expect(save()).toBeEnabled();
  });

  it("hands over the token and the password, and ends on 'Go to sign in' with the address filled in", async () => {
    const user = userEvent.setup();
    let answer!: (result: ResetPasswordResult) => void;
    const onSubmit = vi.fn(() => new Promise<ResetPasswordResult>((resolve) => (answer = resolve)));
    render(<ResetPasswordForm token={TOKEN} onCheck={live()} onSubmit={onSubmit} />);
    await fillPassword(user);
    await user.click(screen.getByRole("button", { name: "Save password" }));
    expect(onSubmit).toHaveBeenCalledWith({ token: TOKEN, password: GOOD });
    expect(screen.getByRole("button", { name: "Save password" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("New password")).toHaveAttribute("readonly");

    answer({ email: "ada+app@example.com", notices: <p>Your 2 API tokens were revoked.</p> });
    const success = await screen.findByText("Your password has been changed. You can sign in with it now.");
    expect(success.parentElement).toHaveFocus();
    expect(screen.getByText("Your 2 API tokens were revoked.")).toBeInTheDocument();
    expect(
      screen.getByText("Signed-in devices were signed out — you’ll need to sign in again there."),
    ).toBeInTheDocument();
    // The done answer's address wins over the check's: it saw the account as it was saved.
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
      "href",
      "/login?email=ada%2Bapp%40example.com",
    );
    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  it("calls onSignIn with the address instead, for an app that routes in code", async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn();
    render(
      <ResetPasswordForm
        token={TOKEN}
        onCheck={live()}
        onSubmit={async () => ({ email: "ada@example.com" })}
        onSignIn={onSignIn}
      />,
    );
    await fillPassword(user);
    await user.click(screen.getByRole("button", { name: "Save password" }));
    await user.click(await screen.findByRole("button", { name: "Go to sign in" }));
    expect(onSignIn).toHaveBeenCalledWith("ada@example.com");
  });

  it("keeps a signInHref's own query", async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordForm
        token={TOKEN}
        onCheck={live()}
        onSubmit={async () => ({ email: "ada@example.com" })}
        signInHref="/login?from=reset"
      />,
    );
    await fillPassword(user);
    await user.click(screen.getByRole("button", { name: "Save password" }));
    expect(await screen.findByRole("link", { name: "Go to sign in" })).toHaveAttribute(
      "href",
      "/login?from=reset&email=ada%40example.com",
    );
  });

  it("goes to the dead-link state when the link went stale while the form was open", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token={TOKEN} onCheck={live()} onSubmit={dead()} />);
    await fillPassword(user);
    await user.click(screen.getByRole("button", { name: "Save password" }));
    expect(await screen.findByText("This link is invalid or has expired.")).toBeInTheDocument();
  });

  it("stays on the form with the password after any other failure, in the app's words if it has them", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.reject(new Error("500")));
    const { unmount } = render(<ResetPasswordForm token={TOKEN} onCheck={live()} onSubmit={onSubmit} />);
    await fillPassword(user);
    await user.click(screen.getByRole("button", { name: "Save password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The password could not be changed.");
    expect(screen.getByLabelText("New password")).toHaveValue(GOOD);
    unmount();

    render(
      <ResetPasswordForm
        token={TOKEN}
        onCheck={live()}
        onSubmit={onSubmit}
        describeError={() => "You are offline."}
      />,
    );
    await fillPassword(user);
    await user.click(screen.getByRole("button", { name: "Save password" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("You are offline."));
  });
});
