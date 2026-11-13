import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryStorage,
  readSessionStored,
  readStored,
  readStoredJson,
  removeStored,
  writeSessionStored,
  writeStored,
  writeStoredJson,
} from "../safe-storage";

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

  // 0.52 code review (src/index.ts): the two pairs wrote differently — `writeSessionStored(k,
  // null)` removed the key, `writeStored(k, null)` (past the types) stored the string "null".
  // Both take `null` now, so `writeStored(key, on ? "1" : null)` reads like the session one.
  it('removes the key on `null`, as writeSessionStored does — never the string "null"', () => {
    writeStored("k", "v");
    writeStored("k", null);
    expect(window.localStorage.getItem("k")).toBeNull();
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

// DUP-8 (refactor audit 2026-10-30): the JSON pair, for the "readStored + JSON.parse + a
// shape check" each theme store and three other modules wrote in their own try/catch.
describe("readStoredJson / writeStoredJson (safe-storage, 0.52)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  const isSize = (v: unknown): v is { state: { size: string } } =>
    typeof (v as { state?: { size?: unknown } } | null)?.state?.size === "string";

  it("round-trips a value of the shape", () => {
    writeStoredJson("k", { state: { size: "large" }, version: 1 });
    expect(window.localStorage.getItem("k")).toBe('{"state":{"size":"large"},"version":1}');
    expect(readStoredJson("k", isSize)).toEqual({ state: { size: "large" }, version: 1 });
  });

  it("reads absent, malformed and another shape as never set", () => {
    expect(readStoredJson("k", isSize)).toBeNull();
    window.localStorage.setItem("k", "{not json");
    expect(readStoredJson("k", isSize)).toBeNull();
    window.localStorage.setItem("k", "null");
    expect(readStoredJson("k", isSize)).toBeNull();
    window.localStorage.setItem("k", '{"state":{"size":3}}');
    expect(readStoredJson("k", isSize)).toBeNull();
  });

  it("answers null when the shape check itself throws", () => {
    window.localStorage.setItem("k", "{}");
    const careless = (v: unknown): v is { a: { b: string } } => (v as { a: { b: string } }).a.b === "x";
    expect(readStoredJson("k", careless)).toBeNull();
  });

  it("writes nothing for a value with no JSON form, and never throws", () => {
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(() => writeStoredJson("k", cycle)).not.toThrow();
    expect(() => writeStoredJson("k", 1n)).not.toThrow();
    writeStoredJson("k", undefined);
    expect(window.localStorage.getItem("k")).toBeNull();
  });

  it("does nothing / answers null when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeStoredJson("k", { state: { size: "large" } })).not.toThrow();
    expect(readStoredJson("k", isSize)).toBeNull();
  });
});

// 0.62 (keksdose's shared-computer session): a Storage that lives in the page's memory —
// gone with the page, a reload included, and never brought back with a reopened tab, as
// Chrome brings back a closed tab's sessionStorage (Chromium 156). keksdose wrote one
// (`PageMemoryStorage`); the kit's tables and crash buffer take it.
describe("createMemoryStorage (safe-storage, 0.62)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("is a Storage: strings in, strings out, null for a missing key", () => {
    const memory = createMemoryStorage();
    expect(memory.getItem("k")).toBeNull();
    memory.setItem("k", "v");
    // Coerced as a browser's Storage coerces, a value and a key alike.
    memory.setItem("n", 3 as unknown as string);
    memory.setItem(7 as unknown as string, "seven");
    expect(memory.getItem("k")).toBe("v");
    expect(memory.getItem("n")).toBe("3");
    expect(memory.getItem("7")).toBe("seven");
    expect(memory.length).toBe(3);
    expect([0, 1, 2, 3].map((i) => memory.key(i))).toEqual(["k", "n", "7", null]);
    memory.removeItem("k");
    expect(memory.getItem("k")).toBeNull();
    expect(memory.length).toBe(2);
    memory.clear();
    expect(memory.length).toBe(0);
  });

  it("is one store per call, and none of it reaches localStorage", () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage();
    a.setItem("k", "a");
    expect(b.getItem("k")).toBeNull();
    expect(window.localStorage.getItem("k")).toBeNull();
  });

  it("is what readStored, writeStored and removeStored use when they are handed it", () => {
    const memory = createMemoryStorage();
    writeStored("k", "v", memory);
    expect(memory.getItem("k")).toBe("v");
    expect(window.localStorage.getItem("k")).toBeNull();
    expect(readStored("k", memory)).toBe("v");
    expect(readStored("k")).toBeNull();
    writeStored("k", null, memory);
    expect(memory.getItem("k")).toBeNull();
    memory.setItem("gone", "1");
    removeStored("gone", memory);
    expect(memory.getItem("gone")).toBeNull();
  });

  it("keeps the guard for a Storage that throws", () => {
    const hostile = createMemoryStorage();
    hostile.getItem = () => {
      throw new Error("blocked");
    };
    hostile.setItem = () => {
      throw new Error("quota");
    };
    expect(() => writeStored("k", "v", hostile)).not.toThrow();
    expect(readStored("k", hostile)).toBeNull();
  });
});
