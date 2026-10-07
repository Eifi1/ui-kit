import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeSetting } from "../../components/settings-fields";
import { TwoFactorSetting } from "../../components/account-settings";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The 0.31 changes to the kit's own setting cards (docs/settings-harmonization.md §2.8,
 * §3.7): the segmented theme control, and two-factor's title.
 */

const OPTIONS = { system: "System", light: "Light", dark: "Dark" };

describe("ThemeSetting variant=\"toggle\"", () => {
  it("is one segmented control of system, light and dark, bound to the preference", () => {
    const onChange = vi.fn();
    render(<ThemeSetting variant="toggle" label="Theme" value="system" onChange={onChange} optionLabels={OPTIONS} />);
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["System", "Light", "Dark"]);
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("keeps the select without a variant", () => {
    render(<ThemeSetting label="Theme" value="light" onChange={() => {}} optionLabels={OPTIONS} />);
    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue("light");
  });
});

describe("TwoFactorSetting's title", () => {
  const card = (labels?: Parameters<typeof TwoFactorSetting>[0]["labels"]) => (
    <TwoFactorSetting enabled={false} setup={null} onStartSetup={() => {}} onEnable={() => {}} onDisable={() => {}} labels={labels} />
  );

  it("names the setting, with the state beside it", () => {
    render(card());
    expect(screen.getByText("Two-factor authentication")).toBeInTheDocument();
    expect(screen.getByText("Off")).toBeInTheDocument();
    // The old "Two-factor authentication: Off" line is gone: the title says the name.
    expect(screen.queryByText(/Two-factor authentication: Off/)).toBeNull();
  });

  it("keeps an app's translated `status` as the title when it gives no title", () => {
    render(card({ status: "Zwei-Faktor-Authentifizierung" }));
    expect(screen.getByText("Zwei-Faktor-Authentifizierung")).toBeInTheDocument();
  });

  it("takes the provider's title over a prop's status, and a prop's title over both", () => {
    const { unmount } = render(
      <UiKitProvider labels={{ accountSettings: { twoFactor: { title: "Zwei-Faktor" } } }}>{card({ status: "2FA" })}</UiKitProvider>,
    );
    expect(screen.getByText("Zwei-Faktor")).toBeInTheDocument();
    unmount();
    render(
      <UiKitProvider labels={{ accountSettings: { twoFactor: { title: "Zwei-Faktor" } } }}>
        {card({ title: "Anmeldecodes" })}
      </UiKitProvider>,
    );
    expect(screen.getByText("Anmeldecodes")).toBeInTheDocument();
  });
});
