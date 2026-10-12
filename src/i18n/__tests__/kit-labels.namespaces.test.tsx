import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../kit-labels";
import { AccountStateChip } from "../../components/account-chips";
import { ConfirmProvider } from "../../components/confirm-dialog";
import { ReauthDialog } from "../../components/reauth-dialog";
import { ShareCard, ShareDialog } from "../../components/share-card";
import type { ShareRole } from "../../components/share-card";
import { WriteLockProvider, useWriteLock } from "../../components/write-lock";

/**
 * The 0.18.0 namespaces. Each component used to merge its `labels` prop over English
 * on its own, so a `<UiKitProvider labels>` never reached it: these pin that it does
 * now, and that the prop still wins over it.
 */

function LockReason() {
  return <output>{useWriteLock().reason}</output>;
}

describe("writeLock", () => {
  it("takes the fallback reason from the provider; the prop wins", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ writeLock: { reason: "Nur zum Ansehen." } }}>
        <WriteLockProvider locked>
          <LockReason />
        </WriteLockProvider>
      </UiKitProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Nur zum Ansehen.");
    rerender(
      <UiKitProvider labels={{ writeLock: { reason: "Nur zum Ansehen." } }}>
        <WriteLockProvider locked labels={{ reason: "Prop." }}>
          <LockReason />
        </WriteLockProvider>
      </UiKitProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Prop.");
  });
});

describe("accountState", () => {
  it("takes the chip's words from the provider; the prop wins, an undefined does not blank", () => {
    render(
      <UiKitProvider labels={{ accountState: { active: "Aktiv", invited: "Eingeladen" } }}>
        <AccountStateChip state="active" />
        <AccountStateChip state="invited" labels={{ invited: "Prop", active: undefined }} />
        <AccountStateChip state="unverified" />
      </UiKitProvider>,
    );
    expect(screen.getByText("Aktiv").closest("[data-state]")).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Prop").closest("[data-state]")).toHaveAttribute("data-state", "invited");
    // A key the provider did not name still falls back to English.
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });
});

describe("shareCard", () => {
  const ROLES: ShareRole[] = [{ key: "viewer", label: "Viewer" }];
  const provider = { shareCard: { whoHasAccess: "Wer hat Zugriff", nobodyYet: "Niemand", close: "Schließen" } };

  it("SharePanel takes its words from the provider; the prop wins", () => {
    render(
      <UiKitProvider labels={provider}>
        <ConfirmProvider>
          <ShareCard grantees={[]} roles={ROLES} labels={{ nobodyYet: "Prop" }} />
        </ConfirmProvider>
      </UiKitProvider>,
    );
    expect(screen.getByText("Wer hat Zugriff")).toBeInTheDocument();
    expect(screen.getByText("Prop")).toBeInTheDocument();
    expect(screen.queryByText("Niemand")).not.toBeInTheDocument();
  });

  it("ShareDialog's own chrome reads the namespace too", () => {
    render(
      <UiKitProvider labels={provider}>
        <ConfirmProvider>
          <ShareDialog open onClose={vi.fn()} grantees={[]} roles={ROLES} labels={{ dialogTitle: "Prop" }} />
        </ConfirmProvider>
      </UiKitProvider>,
    );
    expect(screen.getByRole("dialog", { name: "Prop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });
});

describe("reauthDialog", () => {
  it("takes its words from the provider; the prop wins", () => {
    render(
      <UiKitProvider labels={{ reauthDialog: { title: "Identität bestätigen", cancel: "Abbrechen" } }}>
        <ReauthDialog onSubmit={vi.fn()} onClose={vi.fn()} labels={{ cancel: "Prop" }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("dialog", { name: "Identität bestätigen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prop" })).toBeInTheDocument();
    // Not named by either: English.
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
  });
});
