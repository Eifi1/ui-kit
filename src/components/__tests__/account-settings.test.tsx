import { render, screen } from "@testing-library/react";
import { DEFAULT_ACCOUNT_SETTINGS_LABELS, PasswordSetting, ProfileSetting, TwoFactorSetting } from "../account-settings";
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
