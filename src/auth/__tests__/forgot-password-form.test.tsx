import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "../forgot-password-form";

/**
 * keksdose's always-204 rule (forgot-password-page.tsx): whatever the server knows, the
 * form ends on "If an account exists for …, the link is on its way". The kit sends
 * nothing; the address goes to `onSubmit`. Synthetic people only.
 */

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ForgotPasswordForm", () => {
  it("asks for the address with keksdose's words, and links back to sign-in", () => {
    render(<ForgotPasswordForm onSubmit={() => {}} signInHref="/sign-in" />);
    expect(screen.getByRole("heading", { level: 2, name: "Forgot password" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Forgot password" })).toBeInTheDocument();
    expect(
      screen.getByText("Enter your account’s email address. We’ll send you a link to choose a new password."),
    ).toBeInTheDocument();
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toHaveAttribute("autocomplete", "email");
    expect(field).toBeRequired();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("hands the trimmed address over, busy until it settles, then says the one sentence", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onSubmit = vi.fn(() => request.promise);
    render(<ForgotPasswordForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Email"), "  ada@example.com ");
    await user.click(screen.getByRole("button", { name: "Send the link" }));
    expect(onSubmit).toHaveBeenCalledWith("ada@example.com");
    const button = screen.getByRole("button", { name: "Send the link" });
    expect(button).toHaveAttribute("aria-busy", "true");
    // A second press while the first is out sends nothing.
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    request.resolve();
    const sent = await screen.findByText("If an account exists for ada@example.com, the link is on its way.");
    expect(
      screen.getByText("The link is valid for one hour and works exactly once. Check your spam folder too."),
    ).toBeInTheDocument();
    // The button that had focus is gone; the confirmation takes it.
    // Focus moves in an effect after the confirmation renders: wait for it, not the paint.
    await waitFor(() => expect(sent.parentElement).toHaveFocus());
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
  });

  it("ends on the same sentence for a callback that returns nothing", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm onSubmit={() => undefined} defaultEmail="bea@example.com" />);
    expect(screen.getByLabelText("Email")).toHaveValue("bea@example.com");
    await user.click(screen.getByRole("button", { name: "Send the link" }));
    expect(screen.getByText("If an account exists for bea@example.com, the link is on its way.")).toBeInTheDocument();
  });

  it("sends nothing for a blank address", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ForgotPasswordForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Email"), "   ");
    await user.click(screen.getByRole("button", { name: "Send the link" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("stays on the form with the address after a request that did not go through", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.reject(new Error("offline")));
    render(<ForgotPasswordForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("The request failed. Please try again later.");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    // Typing again clears the message: it was about the attempt, not the field.
    await user.type(screen.getByLabelText("Email"), "m");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says the app's words for a failure it knows (a throttle)", async () => {
    const user = userEvent.setup();
    render(
      <ForgotPasswordForm
        onSubmit={() => Promise.reject({ response: { status: 429 } })}
        describeError={(error) =>
          (error as { response?: { status?: number } }).response?.status === 429 ? "Too many requests." : undefined
        }
      />,
    );
    await user.type(screen.getByLabelText("Email"), "ada@example.com{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests.");
  });

  it("says the kit's rateLimited for a 429 the app has no words for (0.30.0)", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm onSubmit={() => Promise.reject({ response: { status: 429 } })} />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a moment and try again.");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("names the wait in minutes from a minute up — keksdose's hourly reset throttle", async () => {
    const user = userEvent.setup();
    render(
      <ForgotPasswordForm
        onSubmit={() => Promise.reject({ response: { status: 429, headers: { "Retry-After": "3600" } } })}
      />,
    );
    await user.type(screen.getByLabelText("Email"), "ada@example.com{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again in 60 min.");
  });

  it("says it for a callback that throws a 429 before returning, too", async () => {
    const user = userEvent.setup();
    render(
      <ForgotPasswordForm
        onSubmit={() => {
          throw Object.assign(new Error("429"), { status: 429 });
        }}
      />,
    );
    await user.type(screen.getByLabelText("Email"), "ada@example.com{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a moment and try again.");
  });

  it("takes labels, app content, a heading level, or no heading at all", () => {
    const { unmount } = render(
      <ForgotPasswordForm
        onSubmit={() => {}}
        headingAs="h1"
        formContent={<p>Example App support: help@example.com</p>}
        labels={{ submit: "Mail me a link" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Forgot password" })).toBeInTheDocument();
    expect(screen.getByText("Example App support: help@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mail me a link" })).toBeInTheDocument();
    unmount();
    render(<ForgotPasswordForm onSubmit={() => {}} title={null} />);
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
