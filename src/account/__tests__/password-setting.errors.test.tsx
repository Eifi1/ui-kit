import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PasswordSetting } from "../account-settings";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { refusal } from "../../test/fixtures";

/**
 * KS U3 (round 0.34 C4): `PasswordSetting` read no refusal — it swallowed every
 * rejection, and all three apps toasted a wrong current password in their own words.
 * Now it reads server-kit's `400 password_incorrect` by code and says it under the
 * current password, as `EmailChangeSetting` and `DeleteAccountSetting` do; it takes the
 * siblings' `describeError` for the rest; and its own checks stand under their fields.
 */

const fill = async (current: string, next: string, confirm = next) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  return user;
};

const press = () => fireEvent.click(screen.getByRole("button", { name: "Change password" }));

describe("PasswordSetting reads a wrong password (KS U3)", () => {
  it("says password_incorrect under the current password, which takes the focus; the fields stay", async () => {
    render(<PasswordSetting onSubmit={() => Promise.reject(refusal(400, "password_incorrect"))} />);
    const user = await fill("wrong-example", "new-example-1");
    press();
    const current = screen.getByLabelText("Current password");
    await waitFor(() => expect(current).toHaveAccessibleDescription("The password is incorrect."));
    expect(current).toHaveAttribute("aria-invalid", "true");
    expect(current).toHaveFocus();
    // Not an alert: it is the field's own description, read with it.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(current).toHaveValue("wrong-example");
    expect(screen.getByLabelText("New password")).toHaveValue("new-example-1");
    // Typing a correction answers it.
    await user.type(current, "x");
    expect(current).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("The password is incorrect.")).toBeNull();
  });

  it("an older server's invalid_credentials reads the same", async () => {
    render(<PasswordSetting onSubmit={() => Promise.reject(refusal(401, "invalid_credentials"))} />);
    await fill("wrong-example", "new-example-1");
    press();
    await waitFor(() =>
      expect(screen.getByLabelText("Current password")).toHaveAccessibleDescription("The password is incorrect."),
    );
  });

  it("speaks the provider's language", async () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <PasswordSetting onSubmit={() => Promise.reject(refusal(400, "password_incorrect"))} />
      </UiKitProvider>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Aktuelles Passwort"), "falsch-beispiel");
    await user.type(screen.getByLabelText("Neues Passwort"), "neu-beispiel-1");
    await user.type(screen.getByLabelText("Neues Passwort bestätigen"), "neu-beispiel-1");
    fireEvent.click(screen.getByRole("button", { name: "Passwort ändern" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Aktuelles Passwort")).toHaveAccessibleDescription("Das Passwort ist falsch."),
    );
  });

  it("takes `labels.wrongPassword`", async () => {
    render(
      <PasswordSetting
        onSubmit={() => Promise.reject(refusal(400, "password_incorrect"))}
        labels={{ wrongPassword: "That is not your current password." }}
      />,
    );
    await fill("wrong-example", "new-example-1");
    press();
    await waitFor(() =>
      expect(screen.getByLabelText("Current password")).toHaveAccessibleDescription("That is not your current password."),
    );
  });
});

describe("PasswordSetting's describeError (KS U3)", () => {
  it("is asked first, for every failure, and its words stand in the card", async () => {
    const describeError = vi.fn(() => "Not in the demo.");
    const error = refusal(400, "password_incorrect");
    render(<PasswordSetting onSubmit={() => Promise.reject(error)} describeError={describeError} />);
    await fill("wrong-example", "new-example-1");
    press();
    expect(await screen.findByRole("alert")).toHaveTextContent("Not in the demo.");
    expect(describeError).toHaveBeenCalledWith(error);
    expect(screen.getByLabelText("Current password")).not.toHaveAttribute("aria-invalid");
  });

  it("answering `undefined` leaves the kit's reading: the wrong password under its field", async () => {
    render(
      <PasswordSetting onSubmit={() => Promise.reject(refusal(400, "password_incorrect"))} describeError={() => undefined} />,
    );
    await fill("wrong-example", "new-example-1");
    press();
    await waitFor(() =>
      expect(screen.getByLabelText("Current password")).toHaveAccessibleDescription("The password is incorrect."),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("without it, any other failure shows nothing — the app's toast, as before", async () => {
    const onSubmit = vi.fn(() => Promise.reject(refusal(500)));
    render(<PasswordSetting onSubmit={onSubmit} />);
    await fill("old-example", "new-example-1");
    press();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
    for (const name of ["Current password", "New password", "Confirm new password"]) {
      expect(screen.getByLabelText(name)).not.toHaveAttribute("aria-invalid");
    }
    // The fields keep what was typed, for a retry.
    expect(screen.getByLabelText("Current password")).toHaveValue("old-example");
  });

  it("typing anywhere clears the banner", async () => {
    render(<PasswordSetting onSubmit={() => Promise.reject(refusal(503))} describeError={() => "The server is asleep."} />);
    const user = await fill("old-example", "new-example-1");
    press();
    await screen.findByRole("alert");
    await user.type(screen.getByLabelText("Confirm new password"), "x");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("PasswordSetting's own checks stand under their fields (round 0.34 C4)", () => {
  it("too short under the new password, which takes the focus", async () => {
    const onSubmit = vi.fn();
    render(<PasswordSetting onSubmit={onSubmit} minLength={10} />);
    await fill("old-example", "short");
    press();
    const next = screen.getByLabelText("New password");
    await waitFor(() => expect(next).toHaveAccessibleDescription("The new password is too short."));
    expect(next).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a mismatch under the confirmation", async () => {
    render(<PasswordSetting onSubmit={vi.fn()} />);
    await fill("old-example", "new-example-1", "new-example-2");
    press();
    const confirm = screen.getByLabelText("Confirm new password");
    await waitFor(() => expect(confirm).toHaveAccessibleDescription("The passwords don’t match."));
    expect(confirm).toHaveFocus();
  });

  it("a resolved submit empties the fields and leaves no message", async () => {
    render(<PasswordSetting onSubmit={() => Promise.resolve()} />);
    await fill("old-example", "new-example-1");
    press();
    await waitFor(() => expect(screen.getByLabelText("Current password")).toHaveValue(""));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
