import { afterEach, describe, expect, it, vi } from "vitest";
import { readStored, writeStored } from "../safe-storage";

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
