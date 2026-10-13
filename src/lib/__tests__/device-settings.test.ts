import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceSettings, registerDeviceSetting, resetDeviceSettings, type DeviceSetting } from "../device-settings";
import { storedKeys } from "../safe-storage";

/**
 * The registry behind "Reset this device's settings" (docs/settings-harmonization.md
 * §11.4, §11.6 item 4): what it removes and what it leaves, the two passes, the holders,
 * and blocked storage.
 */

const leaves: (() => void)[] = [];
/** Join for this test only: every entry leaves again after it. */
function join(entry: DeviceSetting): () => void {
  const leave = registerDeviceSetting(entry);
  leaves.push(leave);
  return leave;
}

afterEach(() => {
  for (const leave of leaves.splice(0)) leave();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

/** Replace `window.localStorage` and `sessionStorage` with ones that throw on every
 *  access, as a browser with site data blocked does. Returns the restore function. */
function blockSiteData(): () => void {
  const real = {
    localStorage: Object.getOwnPropertyDescriptor(window, "localStorage"),
    sessionStorage: Object.getOwnPropertyDescriptor(window, "sessionStorage"),
  };
  for (const area of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(window, area, {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  }
  return () => {
    for (const area of ["localStorage", "sessionStorage"] as const) {
      const descriptor = real[area];
      if (descriptor) Object.defineProperty(window, area, descriptor);
      else Reflect.deleteProperty(window, area);
    }
  };
}

describe("resetDeviceSettings — what goes", () => {
  it("removes a key that has no reset", () => {
    localStorage.setItem("app.sidebar", "1");
    join({ key: "app.sidebar", kind: "view" });
    expect(resetDeviceSettings()).toEqual(["app.sidebar"]);
    expect(localStorage.getItem("app.sidebar")).toBeNull();
  });

  it("removes every key under a prefix and nothing else: the legacy key without the dot survives", () => {
    localStorage.setItem("budget.displayCurrency.1", "CHF");
    localStorage.setItem("budget.displayCurrency.2", "EUR");
    localStorage.setItem("budget.displayCurrency", "USD");
    localStorage.setItem("budget.collapsedGroups", "[]");
    join({ key: "budget.displayCurrency.", prefix: true, kind: "view" });
    expect(resetDeviceSettings().sort()).toEqual(["budget.displayCurrency.1", "budget.displayCurrency.2"]);
    expect(storedKeys("budget.displayCurrency.")).toEqual([]);
    expect(localStorage.getItem("budget.displayCurrency")).toBe("USD");
    expect(localStorage.getItem("budget.collapsedGroups")).toBe("[]");
  });

  it("removes from sessionStorage for `storage: \"session\"`, and leaves localStorage's key of the same name", () => {
    sessionStorage.setItem("folded", "1");
    localStorage.setItem("folded", "1");
    join({ key: "folded", storage: "session", kind: "view" });
    expect(resetDeviceSettings()).toEqual(["folded"]);
    expect(sessionStorage.getItem("folded")).toBeNull();
    expect(localStorage.getItem("folded")).toBe("1");
  });

  it("expands a prefix in sessionStorage too", () => {
    sessionStorage.setItem("tab-view:a", "1");
    sessionStorage.setItem("tab-view:b", "1");
    localStorage.setItem("tab-view:a", "1");
    join({ key: "tab-view:", prefix: true, storage: "session", kind: "view" });
    expect(resetDeviceSettings().sort()).toEqual(["tab-view:a", "tab-view:b"]);
    expect(storedKeys("tab-view:", "session")).toEqual([]);
    expect(localStorage.getItem("tab-view:a")).toBe("1");
  });

  it("leaves the keys nobody registered — a sign-in's, an outbox's", () => {
    localStorage.setItem("app-auth", "token");
    localStorage.setItem("app.pendingCrashReports", "[]");
    localStorage.setItem("app.sidebar", "1");
    join({ key: "app.sidebar", kind: "view" });
    resetDeviceSettings();
    expect(localStorage.getItem("app-auth")).toBe("token");
    expect(localStorage.getItem("app.pendingCrashReports")).toBe("[]");
  });

  it("answers only the keys that were there for an entry without reset", () => {
    join({ key: "never-written", kind: "view" });
    join({ key: "nothing-under.", prefix: true, kind: "view" });
    expect(resetDeviceSettings()).toEqual([]);
  });
});

describe("resetDeviceSettings — entries with a reset", () => {
  it("runs the reset once and leaves its key to it", () => {
    localStorage.setItem("app-theme", '{"state":{"preference":"dark"},"version":2}');
    const reset = vi.fn(() => localStorage.setItem("app-theme", '{"state":{"preference":"system"},"version":2}'));
    join({ key: "app-theme", kind: "appearance", reset });
    expect(resetDeviceSettings()).toEqual(["app-theme"]);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("app-theme")).toBe('{"state":{"preference":"system"},"version":2}');
  });

  it("runs every reset first, in join order, and only then removes", () => {
    const order: string[] = [];
    localStorage.setItem("removed", "1");
    join({ key: "removed", kind: "view" });
    join({
      key: "a",
      kind: "appearance",
      reset: () => order.push(`a (removed still ${localStorage.getItem("removed")})`),
    });
    join({ key: "b", kind: "view", reset: () => order.push("b") });
    expect(resetDeviceSettings()).toEqual(["a", "b", "removed"]);
    expect(order).toEqual(["a (removed still 1)", "b"]);
    expect(localStorage.getItem("removed")).toBeNull();
  });

  it("lists a prefix's keys for a reset that clears them itself", () => {
    localStorage.setItem("app.pageParams./reports", "?y=2026");
    join({
      key: "app.pageParams.",
      prefix: true,
      kind: "view",
      reset: () => localStorage.removeItem("app.pageParams./reports"),
    });
    expect(resetDeviceSettings()).toEqual(["app.pageParams./reports"]);
  });

  it("catches a reset that throws, removes its key instead, and runs the rest", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("broken", "1");
    const after = vi.fn();
    join({
      key: "broken",
      kind: "appearance",
      reset: () => {
        throw new Error("boom");
      },
    });
    join({ key: "after", kind: "appearance", reset: after });
    let keys: string[] = [];
    expect(() => {
      keys = resetDeviceSettings();
    }).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("broken")).toBeNull();
    expect(keys).toEqual(["after", "broken"]);
    // In development it says so.
    expect(error).toHaveBeenCalledWith(expect.stringContaining('"broken"'), expect.any(Error));
  });

  it("never reloads or navigates", () => {
    const before = window.location.href;
    join({ key: "x", kind: "appearance", reset: () => {} });
    resetDeviceSettings();
    expect(window.location.href).toBe(before);
  });
});

describe("registerDeviceSetting — one entry per key, and its holders", () => {
  it("lists the entries in join order", () => {
    join({ key: "one", kind: "appearance" });
    join({ key: "two", prefix: true, kind: "view" });
    expect(deviceSettings().map((e) => e.key)).toEqual(["one", "two"]);
    expect(deviceSettings()[1]).toEqual({ key: "two", prefix: true, kind: "view" });
  });

  it("resets a key joined twice once — the latest join's reset", () => {
    const first = vi.fn();
    const second = vi.fn();
    join({ key: "app-theme", kind: "appearance", reset: first });
    join({ key: "app-theme", kind: "appearance", reset: second });
    expect(deviceSettings().filter((e) => e.key === "app-theme")).toHaveLength(1);
    resetDeviceSettings();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("keeps the entry until its last holder leaves; the earlier holder's entry comes back", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const leaveOuter = join({ key: "shared", kind: "view", reset: outer });
    const leaveInner = join({ key: "shared", kind: "view", reset: inner });
    leaveInner();
    leaveInner(); // a second call changes nothing
    expect(deviceSettings().map((e) => e.key)).toEqual(["shared"]);
    resetDeviceSettings();
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).not.toHaveBeenCalled();
    leaveOuter();
    expect(deviceSettings()).toEqual([]);
  });

  it("keeps one key's local and session entries apart", () => {
    join({ key: "k", kind: "view" });
    join({ key: "k", storage: "session", kind: "view" });
    expect(deviceSettings()).toHaveLength(2);
  });
});

describe("resetDeviceSettings where the browser refuses storage", () => {
  it("still runs every reset, throws nothing, and answers what it reset", () => {
    const theme = vi.fn();
    const contrast = vi.fn();
    join({ key: "app-theme", kind: "appearance", reset: theme });
    join({ key: "app.sidebar", kind: "view" });
    join({ key: "app-table:", prefix: true, kind: "view" });
    join({ key: "app-contrast", kind: "appearance", reset: contrast });
    join({ key: "folded", storage: "session", kind: "view" });
    const restore = blockSiteData();
    try {
      let keys: string[] = [];
      expect(() => {
        keys = resetDeviceSettings();
      }).not.toThrow();
      expect(theme).toHaveBeenCalledTimes(1);
      expect(contrast).toHaveBeenCalledTimes(1);
      expect(keys).toEqual(["app-theme", "app-contrast"]);
    } finally {
      restore();
    }
  });
});
