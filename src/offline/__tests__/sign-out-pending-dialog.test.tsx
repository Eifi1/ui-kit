import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { axeViolations } from "../../test/axe";
import { SignOutPendingDialog } from "../sign-out-pending-dialog";
import type { SignOutPendingDialogProps } from "../sign-out-pending-dialog";

afterEach(cleanup);

function renderDialog(over: Partial<SignOutPendingDialogProps> = {}) {
  const props: SignOutPendingDialogProps = {
    open: true,
    queued: 3,
    waitingForPlan: 0,
    onSyncNow: vi.fn(),
    onSignOutAnyway: vi.fn(),
    onClose: vi.fn(),
    keepsChanges: true,
    ...over,
  };
  const view = render(<SignOutPendingDialog {...props} />);
  return { ...view, props };
}

describe("SignOutPendingDialog — the words", () => {
  it("keepsChanges: the changes stay on this device for their owner (kastlan)", () => {
    renderDialog({ keepsChanges: true, queued: 3 });
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Some changes have not been saved to the server yet");
    expect(screen.getByText(/3 changes are still waiting to sync\. They stay on this device for you/)).toBeInTheDocument();
    expect(screen.queryByText(/only copy/)).toBeNull();
  });

  it("keepsChanges={false}: keksdose's words — the copy is lost", () => {
    renderDialog({ keepsChanges: false, queued: 1 });
    expect(
      screen.getByText("1 change is still waiting to sync. Logging out clears this device’s copy, and it is the only copy."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stays? on this device/)).toBeNull();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <SignOutPendingDialog
          open
          queued={2}
          waitingForPlan={0}
          onSyncNow={() => {}}
          onSignOutAnyway={() => {}}
          onClose={() => {}}
          keepsChanges={false}
        />
      </UiKitProvider>,
    );
    expect(screen.getByText(/2 Änderungen warten noch auf die Synchronisierung/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trotzdem abmelden" })).toBeInTheDocument();
  });

  it("shows the extra line under the sentence", () => {
    renderDialog({ extra: "2 changes waiting for a plan" });
    expect(screen.getByText("2 changes waiting for a plan")).toBeInTheDocument();
  });

  it("is axe-clean", async () => {
    renderDialog({ waitingForPlan: 1, onDiscardWaiting: vi.fn(), extra: "1 change waiting for a plan" });
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("SignOutPendingDialog — discard", () => {
  it("is offered only with the callback and changes waiting for a plan", () => {
    renderDialog({ waitingForPlan: 2 });
    expect(screen.queryByRole("button", { name: "Discard waiting changes" })).toBeNull();
    cleanup();
    renderDialog({ waitingForPlan: 0, onDiscardWaiting: vi.fn() });
    expect(screen.queryByRole("button", { name: "Discard waiting changes" })).toBeNull();
    cleanup();
    renderDialog({ waitingForPlan: 2, onDiscardWaiting: vi.fn() });
    expect(screen.getByRole("button", { name: "Discard waiting changes" })).toBeInTheDocument();
  });

  it("lets them go, then signs out as asked", async () => {
    const order: string[] = [];
    const { props } = renderDialog({
      waitingForPlan: 2,
      onDiscardWaiting: async () => {
        order.push("discard");
      },
      onSignOutAnyway: () => order.push("sign out"),
    });
    fireEvent.click(screen.getByRole("button", { name: "Discard waiting changes" }));
    await waitFor(() => expect(order).toEqual(["discard", "sign out"]));
    expect(props.onClose).not.toHaveBeenCalled();
  });
});

describe("SignOutPendingDialog — sync now and sign out anyway", () => {
  it("sync now is busy while it runs, then closes without signing out so the caller re-evaluates", async () => {
    let finish!: () => void;
    const onSyncNow = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { props } = renderDialog({ onSyncNow });
    const button = screen.getByRole("button", { name: "Sync now" });
    fireEvent.click(button);
    expect(onSyncNow).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByRole("button", { name: "Log out anyway" })).toBeDisabled();
    expect(props.onClose).not.toHaveBeenCalled();
    await act(async () => finish());
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.onSignOutAnyway).not.toHaveBeenCalled();
  });

  it("closes after a failed sync too — the decision is the person's again", async () => {
    const { props } = renderDialog({ onSyncNow: () => Promise.reject(new Error("offline")) });
    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.onSignOutAnyway).not.toHaveBeenCalled();
  });

  it("log out anyway signs out at once", () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Log out anyway" }));
    expect(props.onSignOutAnyway).toHaveBeenCalledTimes(1);
    expect(props.onSyncNow).not.toHaveBeenCalled();
  });

  it("cancel closes", () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("renders nothing while closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
