import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Palette } from "lucide-react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DEVICE_RESET_LABELS, DEVICE_RESET_ANCHOR, DeviceResetSetting } from "../device-reset-setting";
import { SettingsLayout } from "../settings-layout";
import { SettingsSection } from "../settings-section";
import type { SettingsEntry, SettingsGroup } from "../settings-catalogue";
import { ConfirmProvider } from "../../components/confirm-dialog";
import { WriteLockProvider } from "../../components/write-lock";
import { toast } from "../../components/toast";
import { UiKitProvider } from "../../i18n/kit-labels";
import { registerDeviceSetting } from "../../lib/device-settings";

/**
 * `DeviceResetSetting` (docs/settings-harmonization.md §11.4, §11.6 item 4): the appearance
 * group's last card — a confirm in the neutral tone, then the reset, `onReset`, the toast;
 * never a commit, so a write lock leaves it enabled.
 */

const L = DEFAULT_DEVICE_RESET_LABELS;

const leaves: (() => void)[] = [];
afterEach(() => {
  for (const leave of leaves.splice(0)) leave();
  localStorage.clear();
  vi.restoreAllMocks();
});

/** A device setting for the test, with a spy for its reset. */
function joinSpy(key: string, onReset: () => void = () => {}) {
  const reset = vi.fn(onReset);
  leaves.push(registerDeviceSetting({ key, kind: "appearance", reset }));
  return reset;
}

const GROUPS: SettingsGroup<"appearance">[] = [
  { id: "appearance", icon: <Palette />, title: "Appearance", help: "How it looks." },
];
const ENTRIES: SettingsEntry<"appearance">[] = [
  { id: "theme", group: "appearance", anchor: "theme-card", title: "Theme" },
  { id: "device_reset", group: "appearance", anchor: DEVICE_RESET_ANCHOR, title: L.title, keywords: L.keywords },
];

function inLayout(card: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/settings/appearance"]}>
      <ConfirmProvider>
        <SettingsLayout<"appearance">
          title="Settings"
          groups={GROUPS}
          entries={ENTRIES}
          basePath="/settings"
          renderGroup={() => (
            <>
              <SettingsSection anchor="theme-card" title="Theme" />
              {card}
            </>
          )}
        />
      </ConfirmProvider>
    </MemoryRouter>,
  );
}

const plain = (card: ReactNode) => render(<ConfirmProvider>{card}</ConfirmProvider>);

const dialog = () => screen.getByRole("alertdialog");
const pressAction = () => fireEvent.click(screen.getByRole("button", { name: L.action }));

describe("DeviceResetSetting", () => {
  it("renders as the appearance group's last card, with its catalogue entry", () => {
    inLayout(<DeviceResetSetting />);
    const card = document.getElementById(DEVICE_RESET_ANCHOR);
    expect(card).not.toBeNull();
    expect(within(card!).getByRole("heading", { name: L.title })).toBeInTheDocument();
    expect(within(card!).getByText(L.description)).toBeInTheDocument();
    expect(within(card!).getByRole("button", { name: L.action })).toBeEnabled();
    // Last on the page: after the theme card.
    const cards = [...document.querySelectorAll("#theme-card, #" + DEVICE_RESET_ANCHOR)].map((c) => c.id);
    expect(cards).toEqual(["theme-card", DEVICE_RESET_ANCHOR]);
  });

  it("asks first, in the neutral tone, with the namespace's words; cancel changes nothing", async () => {
    const reset = joinSpy("test-cancel");
    const onReset = vi.fn();
    const success = vi.spyOn(toast, "success");
    plain(<DeviceResetSetting onReset={onReset} />);
    pressAction();
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    expect(dialog()).toHaveAttribute("data-confirm-tone", "neutral");
    expect(within(dialog()).getByText(L.confirmTitle)).toBeInTheDocument();
    expect(within(dialog()).getByText(L.confirmBody)).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(reset).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it("confirmed: the reset, then onReset with the keys, then the toast", async () => {
    const order: string[] = [];
    joinSpy("test-confirm", () => order.push("reset"));
    const onReset = vi.fn((keys: string[]) => order.push(`onReset ${keys.includes("test-confirm")}`));
    const success = vi.spyOn(toast, "success").mockImplementation((message) => {
      order.push(`toast ${String(message)}`);
      return 1;
    });
    plain(<DeviceResetSetting onReset={onReset} />);
    pressAction();
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    fireEvent.click(within(dialog()).getByRole("button", { name: L.confirmAction }));
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(order).toEqual(["reset", "onReset true", `toast ${L.done}`]);
    // The card stays where it is.
    expect(screen.getByRole("button", { name: L.action })).toBeInTheDocument();
  });

  it("stays enabled under a locked write lock, the confirm too: nothing is written", async () => {
    const reset = joinSpy("test-locked");
    vi.spyOn(toast, "success").mockImplementation(() => 1);
    render(
      <ConfirmProvider>
        <WriteLockProvider locked reason="A demo cannot change this.">
          <DeviceResetSetting />
        </WriteLockProvider>
      </ConfirmProvider>,
    );
    expect(screen.getByRole("button", { name: L.action })).toBeEnabled();
    pressAction();
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    const go = within(dialog()).getByRole("button", { name: L.confirmAction });
    expect(go).toBeEnabled();
    fireEvent.click(go);
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
  });

  it("puts the app's description after the kit's", () => {
    plain(<DeviceResetSetting description="The date format goes too; presentation mode stays." />);
    const card = document.getElementById(DEVICE_RESET_ANCHOR)!;
    expect(card.textContent).toContain(`${L.description} The date format goes too; presentation mode stays.`);
  });

  it("takes its words from the provider, and a prop's over them", async () => {
    render(
      <UiKitProvider labels={{ deviceReset: { title: "Dieses Gerät zurücksetzen", action: "Zurücksetzen…" } }}>
        <ConfirmProvider>
          <DeviceResetSetting labels={{ action: "Jetzt zurücksetzen", confirmTitle: undefined }} />
        </ConfirmProvider>
      </UiKitProvider>,
    );
    expect(screen.getByText("Dieses Gerät zurücksetzen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jetzt zurücksetzen" }));
    // An undefined in the prop does not blank the English underneath.
    await waitFor(() => expect(within(dialog()).getByText(L.confirmTitle)).toBeInTheDocument());
  });

  it("passes the section's props through", () => {
    plain(<DeviceResetSetting className="extra" data-testid="reset-card" />);
    expect(screen.getByTestId("reset-card")).toHaveClass("extra");
    expect(screen.getByTestId("reset-card")).toHaveAttribute("id", DEVICE_RESET_ANCHOR);
  });
});
