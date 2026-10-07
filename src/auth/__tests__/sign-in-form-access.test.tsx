import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabelOverrides } from "../../i18n/kit-labels";
import { SignInForm } from "../sign-in-form";
import type { SignInFormProps } from "../sign-in-form";

/**
 * 0.31 (docs/landing-demo-harmonization.md §4.2): the same `access` the landing takes
 * reaches the sign-in page, so an invitation-only app's "Create account" becomes
 * "Request access".
 */
function setup(props: Partial<SignInFormProps> = {}) {
  const answer = vi.fn(async () => ({ kind: "signed-in" as const }));
  return render(<SignInForm onSubmit={answer} onCode={answer} onSetPassword={answer} {...props} />);
}

describe("SignInForm access", () => {
  it("without the prop, keeps the register link as before", () => {
    setup({ registerHref: "/register" });
    expect(screen.getByText(/No account yet\?/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
  });

  it("without either, draws no line", () => {
    setup();
    expect(screen.queryByText(/No account yet\?/)).toBeNull();
  });

  it("a request turns the link into Request access, the mail to support", () => {
    setup({ registerHref: "/register", access: { kind: "request", email: "support@example.com", app: "Kastlan", askCompany: true } });
    expect(screen.queryByRole("link", { name: "Create account" })).toBeNull();
    const link = screen.getByRole("link", { name: "Request access" });
    expect(link).toHaveAttribute(
      "href",
      "mailto:support@example.com?subject=Access%20to%20Kastlan&body=Name%3A%0D%0ACompany%3A%0D%0AWhat%20would%20you%20use%20it%20for%3A",
    );
  });

  it("an open registration keeps Create account, to the access href", () => {
    setup({ registerHref: "/old", access: { kind: "register", href: "/register" } });
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
  });

  it("takes the link text from signIn and the mail from the landing namespace", () => {
    const labels = {
      signIn: { requestAccess: "Zugang anfragen" },
      landing: { accessSubject: (app?: string) => `Zugang zu ${app}` },
    } as unknown as UiKitLabelOverrides;
    render(
      <UiKitProvider labels={labels}>
        <SignInForm
          onSubmit={vi.fn()}
          onCode={vi.fn()}
          onSetPassword={vi.fn()}
          access={{ kind: "request", email: "support@example.com", app: "Kastlan" }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Zugang anfragen" }).getAttribute("href")).toContain(
      "subject=Zugang%20zu%20Kastlan",
    );
  });
});
