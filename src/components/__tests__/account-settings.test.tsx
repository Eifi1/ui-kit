import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DEFAULT_ACCOUNT_SETTINGS_LABELS, PasswordSetting, ProfileSetting, TwoFactorSetting } from "../account-settings";
import type { ProfileNameValues } from "../account-settings";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

const LABELS = {
  title: "Profile",
  email: "Email",
  role: "Role",
  memberSince: "Member since",
  displayName: "Display name",
  save: "Save",
};

describe("ProfileSetting", () => {
  it("gives each instance its own field id (0.7.0)", () => {
    // It was the literal "display-name": two on one page shared an id, and the second
    // label pointed at the first field.
    render(
      <>
        <ProfileSetting value="Ada" onChange={() => {}} onSave={() => {}} labels={LABELS} />
        <ProfileSetting value="Bob" onChange={() => {}} onSave={() => {}} labels={LABELS} />
      </>,
    );
    const [a, b] = screen.getAllByLabelText("Display name");
    expect(a).toHaveValue("Ada");
    expect(b).toHaveValue("Bob");
    expect(a.id).not.toBe(b.id);
    expect(a.id).not.toBe("display-name");
  });
});

describe("ProfileSetting — the single name, unchanged (0.30.0 backwards compatibility)", () => {
  it("is the one controlled field, saved by onSave once the draft differs", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    function Page() {
      const [value, setValue] = useState("Ada Example");
      return <ProfileSetting name="Ada Example" value={value} onChange={setValue} onSave={onSave} />;
    }
    render(<Page />);
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();
    const field = screen.getByLabelText("Display name");
    expect(field).toHaveAttribute("maxlength", "120");
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await user.type(field, " Lovelace");
    expect(save).toBeEnabled();
    await user.click(save);
    // As before 0.30: the button's own click handler — the card hands it no names.
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileSetting — first and last name (0.30.0, §6.1)", () => {
  function Page({
    onSave,
    first = "Ada",
    last = "Example" as string | null,
  }: {
    onSave: (values: ProfileNameValues) => void | Promise<unknown>;
    first?: string;
    last?: string | null;
  }) {
    return <ProfileSetting email="ada@example.com" firstName={first} lastName={last} onSave={onSave} />;
  }

  it("two fields replace the single one, filled from the saved names", () => {
    render(<Page onSave={() => {}} />);
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
    const first = screen.getByLabelText("First name");
    const last = screen.getByLabelText("Last name");
    expect(first).toHaveValue("Ada");
    expect(last).toHaveValue("Example");
    expect(first).toHaveAttribute("autocomplete", "given-name");
    expect(last).toHaveAttribute("autocomplete", "family-name");
    expect(first).toHaveAttribute("maxlength", "120");
    // Nothing changed yet: nothing to save.
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    // The avatar's initials come from the two parts.
    expect(screen.getByText("AE")).toBeInTheDocument();
  });

  it("saves the trimmed pair, busy until it settles; the drafts follow the names that come back", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onSave = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { rerender } = render(<Page onSave={onSave} />);
    const last = screen.getByLabelText("Last name");
    await user.clear(last);
    await user.type(last, "  Lovelace ");
    const save = screen.getByRole("button", { name: "Save" });
    await user.click(save);
    expect(onSave).toHaveBeenCalledWith({ firstName: "Ada", lastName: "Lovelace" });
    expect(save).toHaveAttribute("aria-busy", "true");
    expect(last).toHaveAttribute("readonly");
    resolve();
    await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
    rerender(<Page onSave={onSave} last="Lovelace" />);
    expect(screen.getByLabelText("Last name")).toHaveValue("Lovelace");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("Enter in a field saves", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Page onSave={onSave} />);
    await user.type(screen.getByLabelText("First name"), "{Backspace}{Backspace}{Backspace}Grace{Enter}");
    expect(onSave).toHaveBeenCalledWith({ firstName: "Grace", lastName: "Example" });
  });

  it("holds Save while a name is blank, saying why — a migrated account with no last name too", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const { unmount } = render(<Page onSave={onSave} />);
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "   ");
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAccessibleDescription("Enter both a first and a last name.");
    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();
    unmount();

    render(<Page onSave={onSave} first="Ada Example" last={null} />);
    expect(screen.getByLabelText("Last name")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save" })).toHaveAccessibleDescription(
      "Enter both a first and a last name.",
    );
    await user.type(screen.getByLabelText("Last name"), "Example");
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Ada");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ firstName: "Ada", lastName: "Example" });
  });

  it("a rejected save keeps what was typed", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(() => Promise.reject(new Error("500")));
    render(<Page onSave={onSave} />);
    await user.type(screen.getByLabelText("Last name"), "-Lovelace");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("aria-busy"));
    expect(screen.getByLabelText("Last name")).toHaveValue("Example-Lovelace");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("Save is a commit: a write lock holds it with the lock's reason", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled">
        <Page onSave={onSave} />
      </WriteLockProvider>,
    );
    await user.type(screen.getByLabelText("Last name"), "s");
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAccessibleDescription("Read-only demo — saving is disabled");
    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reads firstName / lastName from the provider's accountSettings.profile", () => {
    render(
      <UiKitProvider labels={{ accountSettings: { profile: { firstName: "Vorname", lastName: "Nachname" } } }}>
        <Page onSave={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByLabelText("Vorname")).toHaveValue("Ada");
    expect(screen.getByLabelText("Nachname")).toHaveValue("Example");
  });
});

describe("account settings labels (0.12.0)", () => {
  it("renders in English with no labels at all, and reads the provider's accountSettings", () => {
    const { unmount } = render(
      <PasswordSetting onSubmit={() => {}} />,
    );
    expect(screen.getByText("Change password", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    unmount();

    render(
      <UiKitProvider
        labels={{ accountSettings: { ...DEFAULT_ACCOUNT_SETTINGS_LABELS, profile: UI_KIT_LABELS_DE_CH.accountSettings.profile } }}
      >
        <ProfileSetting email="ada@example.com" value="" onChange={() => {}} onSave={() => {}} labels={{ save: "Übernehmen" }} />
      </UiKitProvider>,
    );
    expect(screen.getByLabelText("Anzeigename")).toBeInTheDocument();
    // The prop still wins over the provider.
    expect(screen.getByRole("button", { name: "Übernehmen" })).toBeInTheDocument();
    // `email` names the address for a screen reader (it was a required key nothing read).
    expect(screen.getByText("ada@example.com")).toHaveTextContent("E-Mail: ada@example.com");
  });
});

describe("TwoFactorSetting setup", () => {
  const URI = "otpauth://totp/Kastlan:ada%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Kastlan";
  const noop = () => {};

  it("draws the QR itself from an otpauth URI and offers the key for manual entry", () => {
    render(
      <TwoFactorSetting
        enabled={false}
        setup={{ otpauthUri: URI }}
        onStartSetup={noop}
        onEnable={noop}
        onDisable={noop}
      />,
    );
    const qr = screen.getByRole("img", { name: "QR code" });
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(qr.closest("[data-private]")).not.toBeNull();
    // Read out of the URI, grouped by four, copyable raw.
    const key = screen.getByText("JBSW Y3DP EHPK 3PXP");
    expect(key).toHaveAttribute("data-private");
    expect(key).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("button", { name: "Copy key" })).toBeInTheDocument();
  });

  it("hands the URI to renderQr when given, and still takes the legacy base64 SVG", () => {
    const renderQr = vi.fn(() => <span>custom qr</span>);
    const { unmount } = render(
      <TwoFactorSetting
        enabled={false}
        setup={{ otpauthUri: URI, secret: "OVERRIDE" }}
        onStartSetup={noop}
        onEnable={noop}
        onDisable={noop}
        renderQr={renderQr}
      />,
    );
    expect(renderQr).toHaveBeenCalledWith(URI);
    expect(screen.getByText("custom qr")).toBeInTheDocument();
    expect(screen.getByText("OVER RIDE")).toBeInTheDocument();
    unmount();

    render(
      <TwoFactorSetting
        enabled={false}
        setup={{ qrSvg: btoa("<svg/>"), secret: "ABCD" }}
        onStartSetup={noop}
        onEnable={noop}
        onDisable={noop}
        labels={{ qrAlt: "Scan me" }}
      />,
    );
    expect(screen.getByRole("img", { name: "Scan me" })).toHaveAttribute(
      "src",
      `data:image/svg+xml;base64,${btoa("<svg/>")}`,
    );
  });
});

describe("PasswordSetting strength meter (0.22.0)", () => {
  const fill = async (current: string, next: string, confirm = next) => {
    await userEvent.type(screen.getByLabelText("Current password"), current);
    await userEvent.type(screen.getByLabelText("New password"), next);
    await userEvent.type(screen.getByLabelText("Confirm new password"), confirm);
  };

  it("shows no meter unless asked — existing callers are unchanged", async () => {
    render(<PasswordSetting onSubmit={() => {}} />);
    await userEvent.type(screen.getByLabelText("New password"), "example-pass");
    expect(screen.queryByText("At least 8 characters")).toBeNull();
    expect(document.querySelector("[data-score]")).toBeNull();
  });

  it("shows the meter under the new-password field, its length rule from minLength", async () => {
    render(<PasswordSetting onSubmit={() => {}} strength minLength={10} />);
    const field = screen.getByLabelText("New password");
    await userEvent.type(field, "abc");
    expect(screen.getByText("Too short")).toBeInTheDocument();
    expect(screen.getByText("At least 10 characters")).toBeInTheDocument();
    // Right under the field: the two share one box in the card's stack.
    const meter = document.querySelector("[data-score]")!;
    expect(field.closest("div.relative")!.parentElement).toContainElement(meter as HTMLElement);
  });

  it("passes the meter's own options through", async () => {
    render(
      <PasswordSetting
        onSubmit={() => {}}
        strength={{ showRequirements: false, score: () => 4, labels: { strong: "Excellent" } }}
      />,
    );
    await userEvent.type(screen.getByLabelText("New password"), "x");
    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.queryByText("At least 8 characters")).toBeNull();
  });

  it("refuses a new password over maxBytes with the meter's sentence, and the meter warns too", async () => {
    const onSubmit = vi.fn();
    render(<PasswordSetting onSubmit={onSubmit} strength maxBytes={10} />);
    // Ten characters, twelve bytes: each "ü" is two.
    await fill("old-example", "üüabcdefgh");
    const sentence = "At most 10 characters (accents and emoji count for more than one).";
    expect(screen.getAllByText(sentence)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(screen.getAllByText(sentence)).toHaveLength(2));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("enforces maxBytes without the meter as well", async () => {
    const onSubmit = vi.fn();
    render(<PasswordSetting onSubmit={onSubmit} maxBytes={8} />);
    await fill("old-example", "abcdefghi");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText(/At most 8 characters/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("counts characters as a person does: four emoji are four, not eight", async () => {
    const onSubmit = vi.fn();
    render(<PasswordSetting onSubmit={onSubmit} />);
    await fill("old-example", "😀😀😀😀");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("The new password is too short.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid pair as before", async () => {
    const onSubmit = vi.fn();
    render(<PasswordSetting onSubmit={onSubmit} strength maxBytes={72} />);
    await fill("old-example", "new-example-1");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("old-example", "new-example-1"));
  });
});

describe("TwoFactorSetting code fields (0.22.0: OneTimeCodeInput)", () => {
  const noop = () => {};
  const URI = "otpauth://totp/Example:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example";

  it("keeps the setup field read-only until focus, looking editable, and takes digits only", async () => {
    const onEnable = vi.fn();
    render(
      <TwoFactorSetting enabled={false} setup={{ otpauthUri: URI }} onStartSetup={noop} onEnable={onEnable} onDisable={noop} />,
    );
    const field = screen.getByLabelText("Verification code");
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveAttribute("autocomplete", "one-time-code");
    expect(field).toHaveAttribute("inputmode", "numeric");
    expect(field.className).toContain("[&[readonly]]:bg-[var(--bg-surface)]");
    await userEvent.click(field);
    expect(field).not.toHaveAttribute("readonly");
    // A grouped code from an authenticator: the space no longer reaches onEnable.
    fireEvent.change(field, { target: { value: "012 345" } });
    expect(field).toHaveValue("012345");
    await userEvent.type(field, "{Enter}");
    expect(onEnable).toHaveBeenCalledWith("012345");
  });

  it("still takes up to eight digits, as its maxLength did", () => {
    render(
      <TwoFactorSetting enabled={false} setup={{ otpauthUri: URI }} onStartSetup={noop} onEnable={noop} onDisable={noop} />,
    );
    const field = screen.getByLabelText("Verification code");
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "0123456789" } });
    expect(field).toHaveValue("01234567");
  });

  it("guards the disable form's code field the same way, and submits with Enter", async () => {
    const onDisable = vi.fn();
    render(<TwoFactorSetting enabled setup={null} onStartSetup={noop} onEnable={noop} onDisable={onDisable} />);
    const field = screen.getByLabelText("Verification code");
    expect(field).toHaveAttribute("readonly");
    await userEvent.type(screen.getByLabelText("Current password"), "example-pass");
    await userEvent.click(field);
    await userEvent.type(field, "654321{Enter}");
    expect(onDisable).toHaveBeenCalledWith("example-pass", "654321");
  });
});
