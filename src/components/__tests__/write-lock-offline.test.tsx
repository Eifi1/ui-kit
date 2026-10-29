import { renderHook, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { combineWriteLocks } from "../../billing/billing-lock";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import {
  COMMIT_EXCEPT_OFFLINE,
  DEFAULT_WRITE_LOCK_LABELS,
  OFFLINE_LOCK,
  WriteLockProvider,
  useOfflineWriteLock,
  useWriteLock,
} from "../write-lock";
import type { CommitScope } from "../write-lock";

/** 0.46 (kastlan K4): "offline" is a lock kind of the kit's, with its words. */

function Probe({ scope }: { scope: CommitScope }) {
  const lock = useWriteLock(scope);
  return <output data-locked={String(lock.locked)}>{lock.reason}</output>;
}

describe("the offline lock", () => {
  it("is named, with its scope constant", () => {
    expect(OFFLINE_LOCK).toBe("offline");
    expect(COMMIT_EXCEPT_OFFLINE).toEqual({ except: ["offline"] });
  });

  it("useOfflineWriteLock: a source with the kit's words; a control that works offline is exempt", () => {
    const { result } = renderHook(() => useOfflineWriteLock(true));
    expect(result.current).toEqual({ locked: true, kind: "offline", reason: DEFAULT_WRITE_LOCK_LABELS.offline });
    const lock = combineWriteLocks([{ locked: false, kind: "demo" }, result.current]);
    const { rerender } = render(
      <WriteLockProvider {...lock}>
        <Probe scope />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-locked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Needs a connection.");
    rerender(
      <WriteLockProvider {...lock}>
        <Probe scope={COMMIT_EXCEPT_OFFLINE} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-locked", "false");
  });

  it("online: not locked; the reason may be the app's", () => {
    expect(renderHook(() => useOfflineWriteLock(false)).result.current.locked).toBe(false);
    const { result } = renderHook(() => useOfflineWriteLock(true, { offline: "Offline." }));
    expect(result.current.reason).toBe("Offline.");
  });

  it.each([
    UI_KIT_LABELS_DE_CH,
    UI_KIT_LABELS_ES,
    UI_KIT_LABELS_FR,
    UI_KIT_LABELS_HU,
    UI_KIT_LABELS_IT,
    UI_KIT_LABELS_ZH,
  ])("every language has its own words (%#)", (catalogue) => {
    const { result } = renderHook(() => useOfflineWriteLock(true), {
      wrapper: ({ children }) => <UiKitProvider labels={catalogue}>{children}</UiKitProvider>,
    });
    expect(result.current.reason).toBe(catalogue.writeLock.offline);
    expect(result.current.reason).not.toBe(DEFAULT_WRITE_LOCK_LABELS.offline);
    expect(String(result.current.reason)).not.toContain("ß");
  });
});
