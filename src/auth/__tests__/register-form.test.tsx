import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RegisterForm } from "../register-form";
import type { RegisterFormProps } from "../register-form";

/**
 * §4.1 / §4.5 / §8: the same sign-up form in every app — callbacks only, the submit
 * waiting for a complete form, the address tag offered and never applied.
 */

const refusal = (status: number, code: string) => ({ response: { status, data: { detail: "x", code } } });

function setup(props: Partial<RegisterFormProps> = {}) {
  const onSubmit = vi.fn<RegisterFormProps["onSubmit"]>(async () => undefined);
  const user = userEvent.setup();
  const utils = render(<RegisterForm onSubmit={onSubmit} {...props} />);
  return { user, onSubmit, ...utils };
}

type User = ReturnType<typeof userEvent.setup>;

async function fillIn(user: User, { email = "ada@example.com", password = "a good password" } = {}) {
  await user.type(screen.getByLabelText("First name"), " Ada ");
  await user.type(screen.getByLabelText("Last name"), "Example");
  if (email) await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Repeat password"), password);
}

const termsBox = () => screen.getByRole("checkbox");
const submitButton = () => screen.getByRole("button", { name: "Create account" });

describe("RegisterForm — gating", () => {
  it("waits for every required field, the same password twice and the terms", async () => {
    const { user, onSubmit } = setup();
    expect(submitButton()).toBeDisabled();
    await fillIn(user);
    expect(submitButton()).toBeDisabled();
    await user.click(termsBox());
    expect(submitButton()).toBeEnabled();
    await user.click(submitButton());
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: "Ada",
      lastName: "Example",
      email: "ada@example.com",
      password: "a good password",
      locale: "en",
    });
    await waitFor(() => expect(submitButton()).toHaveAttribute("aria-busy", "true"));
  });

  it("a blank name, a short password or a mismatch keep it disabled; the mismatch says so", async () => {
    const { user } = setup();
    await fillIn(user, { password: "short" });
    await user.click(termsBox());
    expect(submitButton()).toBeDisabled();

    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "a good password");
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    await user.clear(screen.getByLabelText("Repeat password"));
    await user.type(screen.getByLabelText("Repeat password"), "a good password");
    expect(submitButton()).toBeEnabled();

    await user.clear(screen.getByLabelText("Last name"));
    await user.type(screen.getByLabelText("Last name"), "   ");
    expect(submitButton()).toBeDisabled();
  });

  it("names are capped at 120 characters and the meter is the kit's, advisory", async () => {
    const { user } = setup();
    expect(screen.getByLabelText("First name")).toHaveAttribute("maxlength", "120");
    expect(screen.getByLabelText("Last name")).toHaveAttribute("autocomplete", "family-name");
    await user.type(screen.getByLabelText("Password"), "abcdefgh");
    expect(screen.getByText("Weak")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("waits for appFieldsComplete", async () => {
    const { user, rerender, onSubmit } = setup({ appFieldsComplete: false });
    await fillIn(user);
    await user.click(termsBox());
    expect(submitButton()).toBeDisabled();
    rerender(<RegisterForm onSubmit={onSubmit} appFieldsComplete />);
    expect(submitButton()).toBeEnabled();
  });
});

describe("RegisterForm — defaultEmail (0.29.1)", () => {
  it("starts with the address, editable, and still offers the tag", async () => {
    const { user } = setup({ defaultEmail: "ada@example.com", emailTag: "exampleapp" });
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("ada@example.com");
    expect(email).not.toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: /^Use ada\+exampleapp@example\.com/ })).toBeInTheDocument();
    await user.clear(email);
    await user.type(email, "grace@example.com");
    expect(email).toHaveValue("grace@example.com");
  });

  it("gives way to invitedEmail, which locks the field", () => {
    setup({ defaultEmail: "ada@example.com", invitedEmail: "grace@example.com" });
    expect(screen.getByLabelText("Email")).toHaveValue("grace@example.com");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
  });
});

describe("RegisterForm — the address tag", () => {
  it("offers the tagged address once the address is plausible, and applies it only on a click", async () => {
    const { user, onSubmit } = setup({ emailTag: "kastlan" });
    const email = screen.getByLabelText("Email");
    await user.type(email, "ada@example");
    expect(screen.queryByRole("button", { name: /^Use / })).not.toBeInTheDocument();
    await user.type(email, ".com");
    const offer = screen.getByRole("button", { name: "Use ada+kastlan@example.com" });
    expect(offer).toHaveAccessibleDescription(/many providers deliver name\+tag@…/i);
    expect(email).toHaveValue("ada@example.com");

    await user.click(offer);
    expect(email).toHaveValue("ada+kastlan@example.com");
    expect(screen.queryByRole("button", { name: /^Use / })).not.toBeInTheDocument();

    await fillIn(user, { email: "" });
    await user.click(termsBox());
    await user.click(submitButton());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: "ada+kastlan@example.com" }));
  });

  it("offers nothing without emailTag, or for an address that carries a tag already", async () => {
    const { user, rerender, onSubmit } = setup();
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    expect(screen.queryByRole("button", { name: /^Use / })).not.toBeInTheDocument();
    rerender(<RegisterForm onSubmit={onSubmit} emailTag="kastlan" />);
    expect(screen.getByRole("button", { name: "Use ada+kastlan@example.com" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "ada+bank@example.com");
    expect(screen.queryByRole("button", { name: /^Use / })).not.toBeInTheDocument();
  });
});

describe("RegisterForm — an invitation", () => {
  it("fixes the field to the invited address", async () => {
    const { user, onSubmit } = setup({ invitedEmail: "ada@example.com" });
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("ada@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(email).toHaveAccessibleDescription("The address your invitation was sent to.");
    await fillIn(user, { email: "" });
    await user.click(termsBox());
    await user.click(submitButton());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: "ada@example.com" }));
  });

  it("lets the invitee take the tagged form and go back", async () => {
    const { user } = setup({ invitedEmail: "ada@example.com", emailTag: "kastlan" });
    const email = screen.getByLabelText("Email");
    await user.click(screen.getByRole("button", { name: "Use ada+kastlan@example.com" }));
    expect(email).toHaveValue("ada+kastlan@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.getByText("The tagged address gets a confirmation mail of its own.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use ada@example.com" }));
    expect(email).toHaveValue("ada@example.com");
    expect(screen.queryByText("The tagged address gets a confirmation mail of its own.")).not.toBeInTheDocument();
  });
});

describe("RegisterForm — slots and language", () => {
  it("renders the four slots where §4.1 puts them", () => {
    setup({
      aboveForm: <p>Closed beta.</p>,
      underEmail: <p>Use your work address.</p>,
      appFields: <label>Company <input /></label>,
      afterFields: <p>Your data is stored unencrypted by default.</p>,
    });
    const order = ["Closed beta.", "Email", "Use your work address.", "Password", "Language", "Company", "Your data is stored unencrypted by default.", "Create account"];
    const nodes = order.map((text) =>
      text === "Email" || text === "Password" || text === "Language" || text === "Company"
        ? screen.getByLabelText(text, { selector: "input, select" })
        : text === "Create account"
          ? submitButton()
          : screen.getByText(text),
    );
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i - 1].compareDocumentPosition(nodes[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByRole("link", { name: "Terms of Service" })).toBeInTheDocument();
  });

  it("the language field can be the app's, with no state of its own", async () => {
    function App() {
      const [lang, setLang] = useState("de-CH");
      return (
        <>
          <p data-testid="app-language">{lang}</p>
          <RegisterForm onSubmit={async () => undefined} locale={lang} onLocaleChange={setLang} languages={["de-CH", "en", "fr"]} />
        </>
      );
    }
    const user = userEvent.setup();
    render(<App />);
    const select = screen.getByLabelText("Language");
    expect(select).toHaveValue("de-CH");
    expect(within(select).getAllByRole("option")).toHaveLength(3);
    await user.selectOptions(select, "fr");
    expect(screen.getByTestId("app-language")).toHaveTextContent("fr");
    expect(select).toHaveValue("fr");
  });

  it("a languageField replaces the select, and the submitted locale is the prop's", async () => {
    const { user, onSubmit } = setup({ locale: "fr-CA", languageField: <p>App language switch</p> });
    expect(screen.queryByLabelText("Language")).not.toBeInTheDocument();
    expect(screen.getByText("App language switch")).toBeInTheDocument();
    await fillIn(user);
    await user.click(termsBox());
    await user.click(submitButton());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ locale: "fr" }));
  });
});

describe("RegisterForm — refusals", () => {
  async function submitRejected(error: unknown, props: Partial<RegisterFormProps> = {}) {
    const ctx = setup({ onSubmit: async () => Promise.reject(error), ...props });
    await fillIn(ctx.user);
    await ctx.user.click(termsBox());
    await ctx.user.click(submitButton());
    return ctx;
  }

  it("email_taken: under the email field, which takes the focus; another address clears it", async () => {
    const { user } = await submitRejected(refusal(409, "email_taken"));
    const email = screen.getByLabelText("Email");
    await waitFor(() => expect(email).toHaveAccessibleDescription("An account with this email address already exists."));
    expect(email).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(email).toHaveFocus());
    expect(submitButton()).toBeEnabled();
    await user.type(email, "m");
    expect(email).not.toHaveAttribute("aria-invalid");
  });

  it.each([
    [refusal(403, "registration_closed"), "New accounts are by invitation only. Ask the operator to invite your email address."],
    [refusal(400, "invitation_invalid"), "This invitation link is not valid."],
    [refusal(410, "invitation_expired"), "This invitation has expired. Ask for a new one."],
    [new Error("Network Error"), "Registration failed. Please try again."],
  ])("%j shows above the button", async (error, text) => {
    await submitRejected(error);
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(submitButton()).toBeEnabled();
  });

  it("describeError has the app's words first", async () => {
    await submitRejected(refusal(429, "x"), { describeError: () => "Too many sign-ups from here." });
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many sign-ups from here.");
  });

  it("a 429 says the kit's rateLimited, after the app's words (0.30.0)", async () => {
    const { unmount } = await submitRejected({ response: { status: 429, data: { detail: "Too many requests" } } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a moment and try again.");
    expect(submitButton()).toBeEnabled();
    unmount();

    await submitRejected(
      { status: 429, headers: new Headers({ "Retry-After": "120" }) },
      { labels: { rateLimited: (seconds) => `Slow down: ${seconds} s.` } },
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Slow down: 120 s.");
  });
});
