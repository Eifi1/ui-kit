import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AcceptInvitation } from "../accept-invitation";
import type { AcceptInvitationResult } from "../accept-invitation";

/**
 * An existing account accepts an invitation after sign-in (docs/auth-harmonization.md
 * §4.4): `POST /auth/invitations/accept {token}`, sent by the app. keksdose's
 * join-page.tsx. Synthetic people and companies only.
 */

const refused = (code: string) => () => Promise.reject({ response: { data: { code } } });

describe("AcceptInvitation", () => {
  it("asks for a sign-in first, and sends nothing, while nobody is signed in", () => {
    const onAccept = vi.fn();
    render(
      <AcceptInvitation
        token="inv"
        signedIn={false}
        onAccept={onAccept}
        signInHref="/login?next=%2Faccept%3Ftoken%3Dinv"
        registerHref="/register?invite=inv"
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Accept invitation" })).toBeInTheDocument();
    expect(screen.getByText("Sign in to accept this invitation")).toBeInTheDocument();
    expect(screen.getByText("Use the account the invitation was sent to.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=%2Faccept%3Ftoken%3Dinv",
    );
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register?invite=inv");
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("accepts once signed in — once, StrictMode included — and links into the app", async () => {
    let answer!: (result: AcceptInvitationResult) => void;
    const onAccept = vi.fn(() => new Promise<AcceptInvitationResult>((resolve) => (answer = resolve)));
    const { rerender } = render(
      <StrictMode>
        <AcceptInvitation token="inv" signedIn={false} onAccept={onAccept} continueHref="/dashboard" />
      </StrictMode>,
    );
    expect(onAccept).not.toHaveBeenCalled();
    rerender(
      <StrictMode>
        <AcceptInvitation token="inv" signedIn onAccept={onAccept} continueHref="/dashboard" />
      </StrictMode>,
    );
    expect(screen.getByText("Joining…")).toBeInTheDocument();
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith("inv");
    answer({ name: "Example Property Ltd" });
    expect(await screen.findByText("You’ve joined Example Property Ltd.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/dashboard");
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("says 'Invitation accepted.' when the app does not say into what", async () => {
    const { container } = render(<AcceptInvitation token="inv" signedIn onAccept={async () => {}} />);
    expect(await screen.findByText("Invitation accepted.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/");
    await waitFor(() =>
      expect(container.querySelector(".sr-only-fixed")).toHaveTextContent("Invitation accepted."),
    );
  });

  it("says an invitation is not valid — invitation_invalid, or anything unknown", async () => {
    const { unmount } = render(
      <AcceptInvitation token="inv" signedIn onAccept={refused("invitation_invalid")} />,
    );
    expect(await screen.findByText("Could not join with this link")).toBeInTheDocument();
    expect(screen.getByText("Ask the person who invited you to send a new invitation.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toBeInTheDocument();
    unmount();
    render(<AcceptInvitation token="inv" signedIn onAccept={() => Promise.reject(new Error("500"))} />);
    expect(await screen.findByText("Could not join with this link")).toBeInTheDocument();
  });

  it("says an invitation has expired — invitation_expired", async () => {
    render(<AcceptInvitation token="inv" signedIn onAccept={refused("invitation_expired")} />);
    expect(await screen.findByText("This invitation has expired")).toBeInTheDocument();
    expect(screen.getByText("Ask the person who invited you to send a new invitation.")).toBeInTheDocument();
  });

  it("asks for a sign-in when the app classifies the refusal so (a 401)", async () => {
    render(
      <AcceptInvitation
        token="inv"
        signedIn
        onAccept={() => Promise.reject({ response: { status: 401 } })}
        classifyError={(error) =>
          (error as { response?: { status?: number } }).response?.status === 401 ? "signIn" : "invalid"
        }
      />,
    );
    expect(await screen.findByText("Sign in to accept this invitation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Create account" })).toBeNull();
  });

  it("says a link without a token is missing it, and asks nobody", () => {
    const onAccept = vi.fn();
    render(<AcceptInvitation token="" signedIn onAccept={onAccept} title={null} />);
    expect(screen.getByText("This link is missing its invite token.")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(onAccept).not.toHaveBeenCalled();
  });
});
