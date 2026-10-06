import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SignInForm } from "../sign-in-form";
import type { SignInAnswer, SignInFormProps } from "../sign-in-form";

/**
 * §5 / §8: the form never sends a request — it hands each step's input to a callback
 * and renders the answer it resolves with (keksdose's three shapes).
 */

const refusal = (code: string) => ({ response: { status: 401, data: { detail: "nope", code } } });

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(props: Partial<SignInFormProps> = {}) {
  const onSubmit = vi.fn<SignInFormProps["onSubmit"]>(async () => ({ kind: "signed-in" }));
  const onCode = vi.fn<SignInFormProps["onCode"]>(async () => ({ kind: "signed-in" }));
  const onSetPassword = vi.fn<SignInFormProps["onSetPassword"]>(async () => ({ kind: "signed-in" }));
  const user = userEvent.setup();
  const utils = render(<SignInForm onSubmit={onSubmit} onCode={onCode} onSetPassword={onSetPassword} {...props} />);
  return { user, onSubmit, onCode, onSetPassword, ...utils };
}

async function signIn(user: ReturnType<typeof userEvent.setup>, email = "ada@example.com", password = "correct horse") {
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm — credentials", () => {
  it("names the fields for passkey autofill and the password manager", () => {
    setup();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username webauthn");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("hands the trimmed email and the untouched password to onSubmit, and stays busy once signed in", async () => {
    const { user, onSubmit } = setup();
    await signIn(user, "  ada@example.com ", " pass word ");
    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.com", password: " pass word " });
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute("aria-busy", "true"));
  });

  it("sends nothing while a field is empty", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("starts from defaultEmail, and links to forgot-password and register", () => {
    setup({ defaultEmail: "ada@example.com", forgotHref: "/forgot-password", registerHref: "/register" });
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByText("No account yet?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
  });

  it("after invalid_credentials: one sentence, the deactivated hint and the tag hint", async () => {
    const { user } = setup({
      onSubmit: async () => Promise.reject(refusal("invalid_credentials")),
      deactivatedContact: "support@example.com",
      emailTag: "kastlan",
    });
    await signIn(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The email or password is incorrect.");
    expect(alert).toHaveTextContent("Account deactivated? Write to support@example.com.");
    expect(screen.getByRole("link", { name: "support@example.com" })).toHaveAttribute(
      "href",
      "mailto:support@example.com",
    );
    expect(alert).toHaveTextContent("Signed up with ada+kastlan@example.com? Use that address.");
  });

  it("shows no hint the app did not ask for, and none after a failure that is not a refused credential", async () => {
    let answer: unknown = refusal("invalid_credentials");
    const { user } = setup({ onSubmit: async () => Promise.reject(answer) });
    await signIn(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The email or password is incorrect.");
    expect(alert).not.toHaveTextContent("deactivated");
    expect(alert).not.toHaveTextContent("Signed up with");

    answer = new Error("Network Error");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Sign-in failed. Please try again."));
  });

  it("no tag hint when the typed address already carries a tag", async () => {
    const { user } = setup({ onSubmit: async () => Promise.reject(refusal("invalid_credentials")), emailTag: "kastlan" });
    await signIn(user, "ada+kastlan@example.com");
    expect(await screen.findByRole("alert")).not.toHaveTextContent("Signed up with");
  });

  it("puts the app's words on a failure through describeError, the hints still following", async () => {
    const throttled = { response: { status: 429, data: { detail: "slow down" } } };
    const { user } = setup({
      onSubmit: async () => Promise.reject(throttled),
      describeError: (error, action) => (error === throttled && action === "password" ? "Too many attempts." : undefined),
    });
    await signIn(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts.");
  });
});

describe("SignInForm — the second factor", () => {
  it("2fa: the code step, focused; the cleaned code goes to onCode with the challenge", async () => {
    const onStepChange = vi.fn();
    const { user, onCode } = setup({
      onSubmit: async () => ({ kind: "2fa", challengeToken: "challenge-1" }),
      onStepChange,
    });
    await signIn(user);
    expect(await screen.findByRole("heading", { name: "Two-factor authentication" })).toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith("2fa");
    const code = screen.getByLabelText("2FA code");
    await waitFor(() => expect(code).toHaveFocus());
    const verify = screen.getByRole("button", { name: "Verify" });
    expect(verify).toBeDisabled();
    await user.type(code, "123 456");
    expect(code).toHaveValue("123456");
    await user.click(verify);
    expect(onCode).toHaveBeenCalledWith({ challengeToken: "challenge-1", code: "123456" });
  });

  it("a refused code stays on the step with its error, which an edit clears", async () => {
    const { user } = setup({
      onSubmit: async () => ({ kind: "2fa", challengeToken: "c" }),
      onCode: async () => Promise.reject(new Error("401")),
    });
    await signIn(user);
    const code = await screen.findByLabelText("2FA code");
    await user.type(code, "000000{Enter}");
    expect(await screen.findByText("Invalid 2FA code.")).toBeInTheDocument();
    expect(code).toHaveAttribute("aria-invalid", "true");
    await user.type(code, "{Backspace}");
    expect(screen.queryByText("Invalid 2FA code.")).not.toBeInTheDocument();
  });

  it("token_invalid: the challenge expired — back to the credentials, saying so", async () => {
    const { user } = setup({
      onSubmit: async () => ({ kind: "2fa", challengeToken: "c" }),
      onCode: async () => Promise.reject(refusal("token_invalid")),
    });
    await signIn(user);
    await user.type(await screen.findByLabelText("2FA code"), "123456{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("This sign-in has expired. Please sign in again.");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    await waitFor(() => expect(screen.getByLabelText("Password")).toHaveFocus());
  });

  it("Back to sign in returns to the credentials with the password dropped", async () => {
    const { user } = setup({ onSubmit: async () => ({ kind: "2fa", challengeToken: "c" }) });
    await signIn(user);
    await user.click(await screen.findByRole("button", { name: "Back to sign in" }));
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.queryByLabelText("2FA code")).not.toBeInTheDocument();
  });

  it("renders twoFactorContent and takes the code length", async () => {
    const { user } = setup({
      onSubmit: async () => ({ kind: "2fa", challengeToken: "c" }),
      twoFactorContent: <p>Use your backup app.</p>,
      codeLength: 8,
    });
    await signIn(user);
    expect(await screen.findByText("Use your backup app.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("2FA code"), "123456");
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
    await user.type(screen.getByLabelText("2FA code"), "78");
    expect(screen.getByRole("button", { name: "Verify" })).toBeEnabled();
  });
});

describe("SignInForm — a new password", () => {
  it("password-change: the challenge's extra reaches the step's content; the new password goes to onSetPassword", async () => {
    const { user, onSetPassword } = setup({
      defaultEmail: "ada@example.com",
      onSubmit: async () => ({ kind: "password-change", challengeToken: "pc-1", extra: { encrypted: true } }),
      passwordChangeContent: (extra) => (extra?.encrypted ? <p>Your encrypted data is untouched.</p> : null),
    });
    await user.type(screen.getByLabelText("Password"), "old password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    expect(screen.getByText("Your encrypted data is untouched.")).toBeInTheDocument();
    const fresh = screen.getByLabelText("New password");
    await waitFor(() => expect(fresh).toHaveFocus());
    expect(fresh).toHaveAttribute("autocomplete", "new-password");
    const submit = screen.getByRole("button", { name: "Set password and sign in" });

    await user.type(fresh, "short");
    await user.type(screen.getByLabelText("Repeat new password"), "short");
    expect(submit).toBeDisabled();

    await user.clear(fresh);
    await user.type(fresh, "a much longer one");
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText("Repeat new password"));
    await user.type(screen.getByLabelText("Repeat new password"), "a much longer one");
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSetPassword).toHaveBeenCalledWith({ challengeToken: "pc-1", password: "a much longer one" });
  });

  it("refuses a password over 72 bytes", async () => {
    const { user } = setup({ onSubmit: async () => ({ kind: "password-change", challengeToken: "c" }) });
    await signIn(user);
    const long = "ü".repeat(37); // 37 characters, 74 bytes
    await user.type(await screen.findByLabelText("New password"), long);
    await user.type(screen.getByLabelText("Repeat new password"), long);
    expect(screen.getByRole("button", { name: "Set password and sign in" })).toBeDisabled();
  });

  it("2fa then password-change, as keksdose answers when both apply", async () => {
    const { user } = setup({
      onSubmit: async () => ({ kind: "2fa", challengeToken: "c" }),
      onCode: async () => ({ kind: "password-change", challengeToken: "pc" }),
    });
    await signIn(user);
    await user.type(await screen.findByLabelText("2FA code"), "123456{Enter}");
    expect(await screen.findByLabelText("New password")).toBeInTheDocument();
  });

  it("a failed set-password stays on the step and says so", async () => {
    const { user } = setup({
      onSubmit: async () => ({ kind: "password-change", challengeToken: "c" }),
      onSetPassword: async () => Promise.reject(new Error("500")),
    });
    await signIn(user);
    await user.type(await screen.findByLabelText("New password"), "a good password");
    await user.type(screen.getByLabelText("Repeat new password"), "a good password{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("The password could not be set.");
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });
});

describe("SignInForm — passkeys", () => {
  it("no passkey button without onPasskey", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Sign in with a passkey" })).not.toBeInTheDocument();
  });

  it("the button asks for no email and renders the answer", async () => {
    const onPasskey = vi.fn(async (): Promise<SignInAnswer> => ({ kind: "2fa", challengeToken: "c" }));
    const { user } = setup({ onPasskey });
    await user.click(screen.getByRole("button", { name: "Sign in with a passkey" }));
    expect(onPasskey).toHaveBeenCalledWith();
    expect(await screen.findByLabelText("2FA code")).toBeInTheDocument();
  });

  it("a failed ceremony says so; an abort says nothing", async () => {
    let failure: unknown = new DOMException("cancelled", "NotAllowedError");
    const { user } = setup({ onPasskey: async () => Promise.reject(failure) });
    await user.click(screen.getByRole("button", { name: "Sign in with a passkey" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Passkey sign-in failed.");
    failure = new DOMException("gone", "AbortError");
    await user.click(screen.getByRole("button", { name: "Sign in with a passkey" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("passkeyAutofill is armed once on mount, its answer rendered, its signal aborted on unmount", async () => {
    const pending = deferred<SignInAnswer | null>();
    let signal: AbortSignal | undefined;
    const passkeyAutofill = vi.fn((s: AbortSignal) => {
      signal = s;
      return pending.promise;
    });
    const { unmount } = setup({ passkeyAutofill });
    expect(passkeyAutofill).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(false);
    await act(async () => pending.resolve({ kind: "2fa", challengeToken: "from-autofill" }));
    expect(await screen.findByLabelText("2FA code")).toBeInTheDocument();
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("an autofill that ends with nothing changes nothing", async () => {
    setup({ passkeyAutofill: async () => null });
    await act(async () => {});
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

describe("SignInForm — labels", () => {
  it("takes the namespace from the labels prop", () => {
    setup({ labels: { submit: "Anmelden", email: "E-Mail" } });
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
    expect(screen.getByLabelText("E-Mail")).toBeInTheDocument();
  });

  it("puts a contact node of the app's where the template says", async () => {
    const { user } = setup({
      onSubmit: async () => Promise.reject(refusal("invalid_credentials")),
      deactivatedContact: <a href="/contact">your administrator</a>,
      labels: { deactivatedHint: "Konto deaktiviert? Schreiben Sie {contact}." },
    });
    await signIn(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Konto deaktiviert? Schreiben Sie your administrator.");
    expect(screen.getByRole("link", { name: "your administrator" })).toHaveAttribute("href", "/contact");
  });
});
