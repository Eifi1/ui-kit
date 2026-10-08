import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationBanner, VerifyEmailStatus } from "../verify-email";

/**
 * `/verify-email?token=` and the banner (docs/auth-harmonization.md §7, §2.8): redeem
 * once with a POST the app sends, show the outcome, offer "Send again" while signed in.
 * keksdose's verify-email-page.tsx and verify-email-banner.tsx. Synthetic people only.
 */

afterEach(() => {
  vi.useRealTimers();
});

/** The visible outcome line of a resend — the button's own reason repeats the words. */
const STATUS = '[role="status"]';

/** The polite live region the page announces its outcome in. */
const announcer = (container: HTMLElement) => container.querySelector<HTMLElement>(".sr-only-fixed")!;

describe("VerifyEmailStatus", () => {
  it("says a link without a token is missing it, and asks nobody", () => {
    const onVerify = vi.fn();
    render(<VerifyEmailStatus token="" onVerify={onVerify} />);
    expect(screen.getByText("This link is missing its confirmation token.")).toBeInTheDocument();
    expect(screen.getByText("You can request a new one from inside the app.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/login");
    expect(onVerify).not.toHaveBeenCalled();
  });

  it("redeems once — StrictMode's double effect included — and says when it is confirmed", async () => {
    let answer!: () => void;
    const onVerify = vi.fn(() => new Promise<void>((resolve) => (answer = resolve)));
    const { container } = render(
      <StrictMode>
        <VerifyEmailStatus
          token="tok"
          onVerify={onVerify}
          verifiedContent="Others can now share a budget with you directly."
        />
      </StrictMode>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Confirm your email address" })).toBeInTheDocument();
    expect(screen.getByText("Confirming…")).toBeInTheDocument();
    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith("tok");
    answer();
    expect(await screen.findByText("Your email address is confirmed.")).toBeInTheDocument();
    expect(screen.getByText("Others can now share a budget with you directly.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/login");
    await waitFor(() => expect(announcer(container)).toHaveTextContent("Your email address is confirmed."));
    expect(onVerify).toHaveBeenCalledTimes(1);
  });

  it("continues into the app when signed in, or where the app says", async () => {
    const { unmount } = render(<VerifyEmailStatus token="tok" onVerify={async () => {}} signedIn />);
    expect(await screen.findByRole("link", { name: "Continue" })).toHaveAttribute("href", "/");
    unmount();
    render(<VerifyEmailStatus token="tok" onVerify={async () => {}} continueHref="/budget" />);
    expect(await screen.findByRole("link", { name: "Continue" })).toHaveAttribute("href", "/budget");
  });

  it("says the link is not valid by default when the redeem is refused", async () => {
    render(
      <VerifyEmailStatus token="tok" onVerify={() => Promise.reject({ response: { data: { code: "token_invalid" } } })} />,
    );
    expect(await screen.findByText("This confirmation link is not valid")).toBeInTheDocument();
    expect(
      screen.getByText("The link may have expired or already been used. You can request a new one from inside the app."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send again" })).toBeNull();
  });

  it("says the link has expired when the app classifies the refusal so", async () => {
    const { container } = render(
      <VerifyEmailStatus
        token="tok"
        onVerify={() => Promise.reject(new Error("410"))}
        classifyError={() => "expired"}
      />,
    );
    expect(await screen.findByText("This confirmation link has expired")).toBeInTheDocument();
    expect(screen.getByText("You can request a new one from inside the app.")).toBeInTheDocument();
    await waitFor(() => expect(announcer(container)).toHaveTextContent("This confirmation link has expired"));
  });

  it("offers 'Send again' on a dead link only while signed in, and says what came of it", async () => {
    const user = userEvent.setup();
    const onResend = vi.fn(async () => {});
    const { unmount } = render(
      <VerifyEmailStatus token="tok" onVerify={() => Promise.reject(new Error("x"))} onResend={onResend} />,
    );
    await screen.findByText("This confirmation link is not valid");
    expect(screen.queryByRole("button", { name: "Send again" })).toBeNull();
    unmount();

    render(
      <VerifyEmailStatus token="tok" onVerify={() => Promise.reject(new Error("x"))} onResend={onResend} signedIn />,
    );
    expect(
      await screen.findByText("The link may have expired or already been used. You can request a new one here."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Confirmation email sent", { selector: STATUS })).toBeInTheDocument();
    const held = screen.getByRole("button", { name: /^Send again in \d+ s$/ });
    expect(held).toHaveAttribute("aria-disabled", "true");
    await user.click(held);
    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it("says a failed resend failed, and frees the button at once", async () => {
    const user = userEvent.setup();
    const onResend = vi.fn(() => Promise.reject(new Error("429")));
    render(
      <VerifyEmailStatus token="" onVerify={vi.fn()} onResend={onResend} signedIn />,
    );
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect(await screen.findByText("Could not send the confirmation email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send again" })).not.toHaveAttribute("aria-disabled");
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect(onResend).toHaveBeenCalledTimes(2);
  });
});

describe("VerifyEmailStatus — 0.29.1 additions", () => {
  it("reads a coded token_expired as expired without a classifier, anything else as invalid", async () => {
    const expired = Object.assign(new Error("gone"), { response: { data: { code: "token_expired" } } });
    const { unmount } = render(<VerifyEmailStatus token="t1" onVerify={() => Promise.reject(expired)} />);
    expect(await screen.findByText("This confirmation link has expired")).toBeInTheDocument();
    unmount();
    render(<VerifyEmailStatus token="t2" onVerify={() => Promise.reject(new Error("nope"))} />);
    expect(await screen.findByText("This confirmation link is not valid")).toBeInTheDocument();
  });
});

describe("EmailVerificationBanner", () => {
  it("is keksdose's warning strip: the message, the app's sentence, 'Send again' and 'Not now'", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <EmailVerificationBanner onResend={async () => {}} onDismiss={onDismiss}>
        Until you do, nobody can share a budget with you directly.
      </EmailVerificationBanner>,
    );
    expect(
      screen.getByText(/Please confirm your email address\. Until you do, nobody can share a budget/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has no × without onDismiss", () => {
    render(<EmailVerificationBanner onResend={() => {}} />);
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
    expect(screen.getByRole("button", { name: "Send again" })).toBeInTheDocument();
  });

  it("holds 'Send again' for the cooldown after a mail went out, counting down, then frees it", async () => {
    vi.useFakeTimers();
    const onResend = vi.fn(async () => {});
    render(<EmailVerificationBanner onResend={onResend} cooldown={3} />);
    fireEvent.click(screen.getByRole("button", { name: "Send again" }));
    await act(async () => {});
    expect(screen.getByText("Confirmation email sent", { selector: STATUS })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send again in 3 s" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Send again in 3 s" }));
    expect(onResend).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("button", { name: "Send again in 2 s" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    const free = screen.getByRole("button", { name: "Send again" });
    expect(free).not.toHaveAttribute("aria-disabled");
    fireEvent.click(free);
    await act(async () => {});
    expect(onResend).toHaveBeenCalledTimes(2);
  });

  it("never waits with cooldown={0}", async () => {
    const user = userEvent.setup();
    const onResend = vi.fn();
    render(<EmailVerificationBanner onResend={onResend} cooldown={0} />);
    await user.click(screen.getByRole("button", { name: "Send again" }));
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect(onResend).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Confirmation email sent", { selector: STATUS })).toBeInTheDocument();
  });

  it("is busy while the resend runs, and says when it failed", async () => {
    const user = userEvent.setup();
    let fail!: (error: unknown) => void;
    render(<EmailVerificationBanner onResend={() => new Promise((_, reject) => (fail = reject))} />);
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect(screen.getByRole("button", { name: "Send again" })).toHaveAttribute("aria-busy", "true");
    fail(new Error("500"));
    expect(await screen.findByText("Could not send the confirmation email")).toBeInTheDocument();
  });
});

describe("EmailVerificationBanner — describeError (0.29.1)", () => {
  it("shows the server's own sentence for a refused resend, else the kit's", async () => {
    const throttled = Object.assign(new Error("429"), { detail: "Try again in 5 minutes." });
    const { unmount } = render(
      <EmailVerificationBanner
        onResend={() => Promise.reject(throttled)}
        describeError={(e) => (e as { detail?: string }).detail}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send again" }));
    expect(await screen.findByText("Try again in 5 minutes.", { selector: STATUS })).toBeInTheDocument();
    unmount();
    render(<EmailVerificationBanner onResend={() => Promise.reject(new Error("x"))} describeError={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Send again" }));
    expect(await screen.findByText("Could not send the confirmation email", { selector: STATUS })).toBeInTheDocument();
  });
});

describe("EmailVerificationBanner — a throttled resend (0.31.1)", () => {
  it("says the kit's rateLimited with the Retry-After wait when the app has no words", async () => {
    const thrown = { status: 429, headers: new Headers({ "Retry-After": "120" }) };
    render(<EmailVerificationBanner onResend={() => Promise.reject(thrown)} />);
    fireEvent.click(screen.getByRole("button", { name: "Send again" }));
    expect(await screen.findByText("Too many attempts. Try again in 2 min.", { selector: STATUS })).toBeInTheDocument();
  });
});
