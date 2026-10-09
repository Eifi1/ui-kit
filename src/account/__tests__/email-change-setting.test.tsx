import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WriteLockProvider } from "../../components/write-lock";
import { EmailChangeSetting } from "../email-change-setting";
import type { EmailChangeSettingProps } from "../email-change-setting";

/**
 * docs/user-admin-harmonization.md §6.2: the new address confirms before it takes
 * effect, the password is asked again, and the card never sends a request. Synthetic
 * people only.
 */

const refusal = (status: number, code: string) => ({ response: { status, data: { detail: "x", code } } });
const throttled = { response: { status: 429, data: { detail: "Too many requests" } } };

function setup(props: Partial<EmailChangeSettingProps> = {}) {
  const onRequest = vi.fn<EmailChangeSettingProps["onRequest"]>(async () => undefined);
  const user = userEvent.setup();
  const utils = render(<EmailChangeSetting currentEmail="ada@example.com" onRequest={onRequest} {...props} />);
  return { user, onRequest, ...utils };
}

type User = ReturnType<typeof userEvent.setup>;

async function request(user: User, email = "ada.new@example.com", password = "correct horse") {
  await user.type(screen.getByLabelText("New email address"), email);
  await user.type(screen.getByLabelText("Current password"), password);
  await user.click(screen.getByRole("button", { name: "Change email address" }));
}

const submit = () => screen.getByRole("button", { name: "Change email address" });

describe("EmailChangeSetting — the form", () => {
  it("shows the current address and asks for the new one and the password", () => {
    setup();
    expect(screen.getByText("Current address: ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Email address" })).toBeInTheDocument();
    const field = screen.getByLabelText("New email address");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toHaveAttribute("autocomplete", "email");
    const password = screen.getByLabelText("Current password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAccessibleDescription(
      "Your address is how you sign in, so changing it takes your password.",
    );
    expect(submit()).toBeDisabled();
  });

  it("waits for a plausible new address and the password; the current address says so", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("New email address"), "ada.new@example");
    await user.type(screen.getByLabelText("Current password"), "pw");
    expect(submit()).toBeDisabled();
    await user.type(screen.getByLabelText("New email address"), ".com");
    expect(submit()).toBeEnabled();

    await user.clear(screen.getByLabelText("New email address"));
    await user.type(screen.getByLabelText("New email address"), " ADA@example.com ");
    expect(screen.getByLabelText("New email address")).toHaveAccessibleDescription("This is already your address.");
    expect(submit()).toBeDisabled();
  });

  it("hands the trimmed address and the untouched password over, then shows the pending state, focused", async () => {
    const { user, onRequest } = setup({ onResend: () => {}, onCancel: () => {} });
    await request(user, "  ada.new@example.com ", " pass word ");
    expect(onRequest).toHaveBeenCalledWith({ newEmail: "ada.new@example.com", password: " pass word " });
    const pending = await screen.findByText("Confirm the link we sent to ada.new@example.com.");
    expect(
      screen.getByText("Until you do, you keep signing in with ada@example.com. Check your spam folder too."),
    ).toBeInTheDocument();
    await waitFor(() => expect(pending.closest("[tabindex='-1']")).toHaveFocus());
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send the link again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel the change" })).toBeInTheDocument();
  });

  it("stays busy while the request runs", async () => {
    let resolve!: () => void;
    const { user } = setup({ onRequest: () => new Promise<void>((r) => (resolve = r)) });
    await request(user);
    expect(submit()).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("New email address")).toHaveAttribute("readonly");
    resolve();
    expect(await screen.findByText("Confirm the link we sent to ada.new@example.com.")).toBeInTheDocument();
  });

  it("offers the tagged address (emailTag), applied only on a click", async () => {
    const { user } = setup({ emailTag: "kastlan" });
    await user.type(screen.getByLabelText("New email address"), "ada.new@example.com");
    await user.click(screen.getByRole("button", { name: "Use ada.new+kastlan@example.com" }));
    expect(screen.getByLabelText("New email address")).toHaveValue("ada.new+kastlan@example.com");
  });
});

describe("EmailChangeSetting — refusals", () => {
  it("email_taken: under the new address, which takes the focus; another address clears it", async () => {
    const { user } = setup({ onRequest: async () => Promise.reject(refusal(409, "email_taken")) });
    await request(user);
    const field = screen.getByLabelText("New email address");
    await waitFor(() => expect(field).toHaveAccessibleDescription("An account with this email address already exists."));
    await waitFor(() => expect(field).toHaveFocus());
    await user.type(field, "m");
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("password_incorrect (a 400): under the password, which takes the focus; typing clears it", async () => {
    const { user } = setup({ onRequest: async () => Promise.reject(refusal(400, "password_incorrect")) });
    await request(user);
    const password = screen.getByLabelText("Current password");
    await waitFor(() => expect(password).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText("The password is incorrect.")).toBeInTheDocument();
    await waitFor(() => expect(password).toHaveFocus());
    await user.type(password, "x");
    expect(screen.queryByText("The password is incorrect.")).not.toBeInTheDocument();
  });

  it("an older server's invalid_credentials reads the same", async () => {
    const { user } = setup({ onRequest: async () => Promise.reject(refusal(401, "invalid_credentials")) });
    await request(user);
    await waitFor(() =>
      expect(screen.getByLabelText("Current password")).toHaveAccessibleDescription(
        "Your address is how you sign in, so changing it takes your password. The password is incorrect.",
      ),
    );
  });

  it("a 429 says rateLimited; anything else failed; describeError comes first", async () => {
    const first = setup({
      onRequest: async () => Promise.reject({ ...throttled, response: { ...throttled.response, headers: { "retry-after": "9" } } }),
    });
    await request(first.user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again in 9 s.");
    expect(screen.getByLabelText("New email address")).toHaveValue("ada.new@example.com");
    first.unmount();

    const second = setup({ onRequest: async () => Promise.reject(new Error("500")) });
    await request(second.user);
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");
    second.unmount();

    const describeError = vi.fn(() => "Not in the demo.");
    const third = setup({ onRequest: async () => Promise.reject(refusal(409, "email_taken")), describeError });
    await request(third.user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Not in the demo.");
    expect(describeError).toHaveBeenCalledWith(expect.anything(), "request");
  });

  it("the submit is a commit: a write lock holds it", async () => {
    const onRequest = vi.fn();
    const user = userEvent.setup();
    render(
      <WriteLockProvider locked reason="Read-only demo">
        <EmailChangeSetting currentEmail="ada@example.com" onRequest={onRequest} />
      </WriteLockProvider>,
    );
    await request(user);
    expect(submit()).toHaveAccessibleDescription("Read-only demo");
    expect(onRequest).not.toHaveBeenCalled();
  });
});

describe("EmailChangeSetting — pending", () => {
  it("renders the app's server state, resends, and says so", async () => {
    let resolve!: () => void;
    const onResend = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { user } = setup({ pendingEmail: "ada.new@example.com", onResend });
    expect(screen.getByText("Confirm the link we sent to ada.new@example.com.")).toBeInTheDocument();
    const resend = screen.getByRole("button", { name: "Send the link again" });
    // Arriving pending takes no focus.
    expect(document.body).toHaveFocus();
    await user.click(resend);
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(resend).toHaveAttribute("aria-busy", "true");
    resolve();
    expect(await screen.findByRole("status")).toHaveTextContent("We sent the link again.");
    // No cancel without onCancel.
    expect(screen.queryByRole("button", { name: "Cancel the change" })).not.toBeInTheDocument();
  });

  it("a throttled resend says so, in the app's words first", async () => {
    const describeError = vi.fn((_error: unknown, action: string) => (action === "resend" ? undefined : "x"));
    const { user } = setup({
      pendingEmail: "ada.new@example.com",
      onResend: () => Promise.reject(throttled),
      describeError,
    });
    await user.click(screen.getByRole("button", { name: "Send the link again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a moment and try again.");
    expect(describeError).toHaveBeenCalledWith(throttled, "resend");
  });

  it("cancel returns to the form, focused on the new address", async () => {
    const onCancel = vi.fn(async () => undefined);
    const { user } = setup({ onCancel });
    await request(user);
    await user.click(await screen.findByRole("button", { name: "Cancel the change" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    const field = await screen.findByLabelText("New email address");
    await waitFor(() => expect(field).toHaveFocus());
    expect(field).toHaveValue("");
  });

  it("a controlled pendingEmail wins: null is no pending change, whatever the card did", async () => {
    const { user, rerender, onRequest } = setup({ pendingEmail: null });
    await request(user);
    expect(onRequest).toHaveBeenCalled();
    // The app has not refreshed its state yet: still the form.
    expect(screen.getByLabelText("New email address")).toBeInTheDocument();
    rerender(<EmailChangeSetting currentEmail="ada@example.com" onRequest={onRequest} pendingEmail="ada.new@example.com" />);
    expect(screen.getByText("Confirm the link we sent to ada.new@example.com.")).toBeInTheDocument();
  });
});

describe("EmailChangeSetting — confirmed", () => {
  it("says the address is now the new one, and that a passkey keeps its old label", () => {
    const { unmount } = setup({ currentEmail: "ada.new@example.com", confirmed: true });
    expect(screen.getByText("Your email address is now ada.new@example.com.")).toBeInTheDocument();
    expect(
      screen.getByText("Your passkeys keep working. Your device may still list them under your old address."),
    ).toBeInTheDocument();
    unmount();

    setup({ currentEmail: "ada.new@example.com", confirmed: true, passkeyNote: false });
    expect(screen.getByText("Your email address is now ada.new@example.com.")).toBeInTheDocument();
    expect(screen.queryByText(/passkeys keep working/)).not.toBeInTheDocument();
  });

  it("takes the namespace from the labels prop", () => {
    setup({ labels: { title: "E-Mail-Adresse", submit: "Adresse ändern" } });
    expect(screen.getByRole("form", { name: "E-Mail-Adresse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adresse ändern" })).toBeInTheDocument();
  });
});

describe("EmailChangeSetting under a write lock (0.33, billing §3.3, §12.36)", () => {
  const PLAN = "Your plan has ended.";

  it("a lapsed plan's lock leaves the request, the resend and the cancel live", async () => {
    const onRequest = vi.fn(async () => undefined);
    const onResend = vi.fn(async () => undefined);
    const onCancel = vi.fn(async () => undefined);
    const user = userEvent.setup();
    const { rerender } = render(
      <WriteLockProvider locked kind="billing" reason={PLAN}>
        <EmailChangeSetting currentEmail="ada@example.com" onRequest={onRequest} />
      </WriteLockProvider>,
    );
    await request(user);
    expect(onRequest).toHaveBeenCalledTimes(1);
    rerender(
      <WriteLockProvider locked kind="billing" reason={PLAN}>
        <EmailChangeSetting
          currentEmail="ada@example.com"
          pendingEmail="ada.new@example.com"
          onRequest={onRequest}
          onResend={onResend}
          onCancel={onCancel}
        />
      </WriteLockProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Send the link again" }));
    expect(onResend).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel the change" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("a demo's lock beside it holds the resend and the cancel, with the demo's reason", async () => {
    const onResend = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <WriteLockProvider
        locked
        holds={[
          { kind: "demo", reason: "Read-only demo" },
          { kind: "billing", reason: PLAN },
        ]}
      >
        <EmailChangeSetting
          currentEmail="ada@example.com"
          pendingEmail="ada.new@example.com"
          onRequest={vi.fn()}
          onResend={onResend}
          onCancel={onCancel}
        />
      </WriteLockProvider>,
    );
    for (const name of ["Send the link again", "Cancel the change"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAccessibleDescription("Read-only demo");
      await user.click(button);
    }
    expect(onResend).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
