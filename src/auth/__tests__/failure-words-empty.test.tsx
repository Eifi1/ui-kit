import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CompleteNameDialog } from "../complete-name-dialog";
import { ForgotPasswordForm } from "../forgot-password-form";
import { ResetPasswordForm } from "../reset-password-form";
import { EmailVerificationBanner } from "../verify-email";
import { fill } from "../../test/fill";

/**
 * The failure ladder (refactor audit 2026-10-30, DUP-14): the app's words when it has any,
 * else the kit's. An app's `describeError` that answers `""` — "nothing of my own for this
 * one" — or an `error` built as `failed && words` that is `false`, has no words; written as
 * `own ?? fallback`, the forms printed that nothing: an empty alert, an empty status.
 */

describe("an app's empty words for a failure leave the kit's", () => {
  it("ForgotPasswordForm", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm onSubmit={() => Promise.reject(new Error("500"))} describeError={() => ""} />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/\S/);
  });

  it("ResetPasswordForm", async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordForm
        token="tok-123"
        onCheck={async () => ({ email: "ada@example.com" })}
        onSubmit={() => Promise.reject(new Error("500"))}
        describeError={() => ""}
      />,
    );
    await fill(user, await screen.findByLabelText("New password"), "correct horse battery");
    await fill(user, screen.getByLabelText("Repeat new password"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Save password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The password could not be changed.");
  });

  it("EmailVerificationBanner's resend", async () => {
    render(<EmailVerificationBanner onResend={() => Promise.reject(new Error("500"))} describeError={() => ""} />);
    fireEvent.click(screen.getByRole("button", { name: "Send again" }));
    expect(await screen.findByText("Could not send the confirmation email")).toBeInTheDocument();
  });

  it("CompleteNameDialog's `error`", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [failed, setFailed] = useState(false);
      return (
        <CompleteNameDialog
          firstName="Ada"
          lastName="Example"
          onSave={vi.fn(() => {
            setFailed(true);
            return Promise.reject(new Error("500"));
          })}
          // An app's `failed && words`, before it has any words.
          error={failed && ""}
          onClose={() => {}}
        />
      );
    }
    render(<Harness />);
    await user.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your name could not be saved. Please try again.");
  });
});
