import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SyncStatusIndicator, syncState, type SyncStatus } from "../sync-status-indicator";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";

/** docs/top-bar-harmonization.md §2.6, §6.9, §6.10: keksdose's indicator, on the kit. */

const IDLE: SyncStatus = { phase: "idle", online: true, pending: 0 };
const state = () => document.querySelector("[data-sync-state]")?.getAttribute("data-sync-state");

describe("syncState — keksdose's ranking", () => {
  it.each([
    [{ ...IDLE, blocked: 1, waitingForPlan: 1, online: false, phase: "error", pending: 2 }, "blocked"],
    [{ ...IDLE, waitingForPlan: 1, online: false, phase: "syncing", pending: 2 }, "waitingForPlan"],
    [{ ...IDLE, online: false, phase: "error", pending: 2 }, "offline"],
    [{ ...IDLE, phase: "offline" }, "offline"],
    [{ ...IDLE, phase: "error", pending: 2 }, "error"],
    [{ ...IDLE, phase: "syncing", pending: 2 }, "syncing"],
    [{ ...IDLE, pending: 2 }, "pending"],
    [IDLE, "synced"],
  ] as [SyncStatus, string][])("%o → %s", (status, expected) => {
    expect(syncState(status)).toBe(expected);
  });

  it("a tap's own round reads as syncing before the engine says so", () => {
    expect(syncState({ ...IDLE, pending: 1 }, true)).toBe("syncing");
  });
});

describe("SyncStatusIndicator", () => {
  it("in sync: the ✓ badge, the success role and the last time", () => {
    const { container } = render(
      <SyncStatusIndicator status={{ ...IDLE, lastSyncedAt: new Date(2026, 9, 17, 14, 5) }} onSync={() => {}} locale="de-CH" />,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAccessibleName("Synced at 14:05 — Tap to sync now");
    expect(container.querySelector('[data-slot="icon-button-badge"] svg')).not.toBeNull();
    expect(button.className).toContain("text-success");
  });

  it("before the first round: Up to date", () => {
    render(<SyncStatusIndicator status={IDLE} />);
    expect(screen.getByRole("status")).toHaveTextContent("Up to date");
  });

  it.each([
    [{ ...IDLE, blocked: 2 }, "2 changes cannot be sent from this device", "text-danger"],
    [{ ...IDLE, waitingForPlan: 3 }, "3 changes waiting for a plan", "text-warning"],
    [{ ...IDLE, phase: "error" }, "The server refused the last sync", "text-warning"],
    [{ ...IDLE, pending: 1 }, "1 change waiting to sync", "text-warning"],
    [{ ...IDLE, phase: "syncing" }, "Syncing…", "text-info"],
  ] as [SyncStatus, string, string][])("%o says %s in %s", (status, words, tone) => {
    render(<SyncStatusIndicator status={status} />);
    const el = screen.getByRole("status");
    expect(el).toHaveTextContent(words);
    expect(el.className).toContain(tone);
  });

  it("uses the kit's tokens, never a raw palette colour", () => {
    for (const status of [{ ...IDLE, blocked: 1 }, { ...IDLE, pending: 1 }, { ...IDLE, phase: "syncing" as const }, IDLE]) {
      const { container, unmount } = render(<SyncStatusIndicator status={status} onSync={() => {}} />);
      expect(container.innerHTML).not.toMatch(/rose-|amber-|sky-|emerald-/);
      unmount();
    }
  });

  it("spins while syncing and is disabled, keeping its colour", () => {
    const { container } = render(<SyncStatusIndicator status={{ ...IDLE, phase: "syncing" }} onSync={() => {}} />);
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAccessibleName("Syncing…");
  });

  it("offline: disabled, and the name says a tap has nothing to do", () => {
    render(<SyncStatusIndicator status={{ ...IDLE, online: false, pending: 2 }} onSync={() => {}} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Offline — changes are saved on this device and will sync when you reconnect — nothing to sync while offline",
    );
  });

  it("a tap runs onSync and spins until its promise settles", async () => {
    let finish!: () => void;
    const onSync = vi.fn(() => new Promise<void>((r) => (finish = r)));
    render(<SyncStatusIndicator status={{ ...IDLE, pending: 2 }} onSync={onSync} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(state()).toBe("syncing");
    expect(screen.getByRole("button")).toBeDisabled();
    await act(async () => finish());
    expect(state()).toBe("pending");
  });

  it("without onSync (§6.9): a status, not a button", () => {
    render(<SyncStatusIndicator status={{ ...IDLE, pending: 2 }} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("2 changes waiting to sync");
    expect(screen.getByRole("status")).not.toHaveTextContent("Tap");
  });

  it("hideWhenIdle: nothing while in sync, there again when something waits", () => {
    const { container, rerender } = render(<SyncStatusIndicator status={IDLE} hideWhenIdle onSync={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SyncStatusIndicator status={{ ...IDLE, online: false }} hideWhenIdle onSync={() => {}} />);
    expect(state()).toBe("offline");
  });

  it("scope words (§6.10): before every state, and the offline sentence replaced", () => {
    const scope = {
      name: "Handovers on this device",
      offline: "Offline: handovers keep working on this device; everything else needs a connection",
    };
    const { rerender } = render(<SyncStatusIndicator status={{ ...IDLE, pending: 3 }} scope={scope} />);
    expect(screen.getByRole("status")).toHaveTextContent("Handovers on this device: 3 changes waiting to sync");
    rerender(<SyncStatusIndicator status={{ ...IDLE, online: false }} scope={scope} />);
    expect(screen.getByRole("status")).toHaveTextContent(scope.offline);
    expect(screen.getByRole("status")).not.toHaveTextContent("Handovers on this device:");
  });

  it("showLabel: the short words beside the cloud, none when in sync", () => {
    const { container, rerender } = render(<SyncStatusIndicator status={{ ...IDLE, pending: 3 }} showLabel />);
    expect(container).toHaveTextContent("3 waiting");
    rerender(<SyncStatusIndicator status={{ ...IDLE, online: false }} showLabel />);
    expect(container.querySelector("[aria-hidden].text-xs")).toHaveTextContent("Offline");
    rerender(<SyncStatusIndicator status={{ ...IDLE, phase: "syncing" }} showLabel />);
    expect(container.querySelector("[aria-hidden].text-xs")).toHaveTextContent("Syncing…");
    rerender(<SyncStatusIndicator status={IDLE} showLabel />);
    expect(container.querySelector("[aria-hidden].text-xs")).toBeNull();
  });

  it("labels: the prop wins over the provider, the provider over English", () => {
    const { rerender } = render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <SyncStatusIndicator status={{ ...IDLE, pending: 2 }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("2 Änderungen warten auf Synchronisierung");
    rerender(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <SyncStatusIndicator status={{ ...IDLE, pending: 2 }} labels={{ pending: (n) => `${n} offen` }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("2 offen");
  });

  it("waiting for a plan reuses billing.waitingChanges", () => {
    render(
      <UiKitProvider labels={{ billing: { waitingChanges: (n) => `${n} held` } }}>
        <SyncStatusIndicator status={{ ...IDLE, waitingForPlan: 4 }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("4 held");
  });

  it("forwards data-* to the trigger — a tour's anchor", () => {
    const { rerender } = render(<SyncStatusIndicator status={IDLE} data-tour="sync-status" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-tour", "sync-status");
    rerender(<SyncStatusIndicator status={IDLE} onSync={() => {}} data-tour="sync-status" />);
    expect(screen.getByRole("button")).toHaveAttribute("data-tour", "sync-status");
  });
});

describe('SyncStatusIndicator storage="none" — an online-only app (KS B1)', () => {
  it("offline: changes can't be saved, never 'saved on this device'", () => {
    render(<SyncStatusIndicator status={{ ...IDLE, online: false }} storage="none" showLabel />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Offline — changes can't be saved until you reconnect");
    expect(status).not.toHaveTextContent("on this device");
  });

  it("a round reads Saving…, in the name and beside the cloud", () => {
    const { container } = render(<SyncStatusIndicator status={{ ...IDLE, phase: "syncing" }} storage="none" showLabel />);
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");
    expect(container.querySelector('span[aria-hidden="true"].text-xs')).toHaveTextContent("Saving…");
  });

  it("pending, blocked and waitingForPlan don't apply", () => {
    render(
      <SyncStatusIndicator status={{ ...IDLE, pending: 3, blocked: 1, waitingForPlan: 2, lastSyncedAt: Date.now() }} storage="none" />,
    );
    expect(state()).toBe("synced");
    expect(screen.getByRole("status")).toHaveTextContent("Up to date");
  });

  it("hideWhenIdle with KS's feed: offline or saving only", () => {
    const { rerender, container } = render(
      <SyncStatusIndicator status={{ ...IDLE, pending: 2 }} storage="none" hideWhenIdle />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<SyncStatusIndicator status={{ ...IDLE, phase: "syncing" }} storage="none" hideWhenIdle />);
    expect(state()).toBe("syncing");
  });

  it.each([
    ["de-CH", UI_KIT_LABELS_DE_CH],
    ["en", uiKitLabelsEn()],
    ["es", UI_KIT_LABELS_ES],
    ["fr", UI_KIT_LABELS_FR],
    ["hu", UI_KIT_LABELS_HU],
    ["it", UI_KIT_LABELS_IT],
    ["zh", UI_KIT_LABELS_ZH],
  ] as const)("%s has its own online-only words", (code, labels) => {
    const sync = labels.topBarParts.sync;
    expect(sync.offlineUnsaved).toBeTruthy();
    expect(sync.saving).toBeTruthy();
    expect(sync.offlineUnsaved).not.toBe(sync.offline);
    if (code !== "en") expect(sync.offlineUnsaved).not.toBe(uiKitLabelsEn().topBarParts.sync.offlineUnsaved);
    if (code === "de-CH") {
      expect(sync.offlineUnsaved + sync.saving).not.toMatch(/ß/);
      expect(sync.saving).toBe("Wird gespeichert…");
    }
  });
});
