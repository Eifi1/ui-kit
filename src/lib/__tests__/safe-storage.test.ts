import { afterEach, describe, expect, it, vi } from "vitest";
import { readSessionStored, readStored, removeStored, writeSessionStored, writeStored } from "../safe-storage";

describe("readStored / writeStored (safe-storage)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("round-trips a value", () => {
    writeStored("k", "v");
    expect(readStored("k")).toBe("v");
    expect(readStored("missing")).toBeNull();
  });

  it("answers null / does nothing when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeStored("k", "v")).not.toThrow();
    expect(readStored("k")).toBeNull();
  });
});

// DUP-11 (refactor audit 2026-10): the remove and the session pair, which three modules
// had each guarded by hand.
describe("removeStored and the sessionStorage pair (safe-storage, 0.34)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("removes a stored value", () => {
    writeStored("k", "v");
    removeStored("k");
    expect(readStored("k")).toBeNull();
  });

  it("round-trips this tab's value, and `null` removes it — never in localStorage", () => {
    writeSessionStored("k", "v");
    expect(readSessionStored("k")).toBe("v");
    expect(window.localStorage.getItem("k")).toBeNull();
    writeSessionStored("k", null);
    expect(readSessionStored("k")).toBeNull();
  });

  it("does nothing / answers null when storage throws", () => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error("blocked");
      });
    }
    expect(() => removeStored("k")).not.toThrow();
    expect(() => writeSessionStored("k", "v")).not.toThrow();
    expect(() => writeSessionStored("k", null)).not.toThrow();
    expect(readSessionStored("k")).toBeNull();
  });
});
