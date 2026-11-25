import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as offline from "../../offline";
import * as sync from "../../sync";
import { randomUuid, uuid5, uuid5Sync } from "../local-first";

/**
 * The plain-http ids (refactor audit 2026-11-22, DUP-4): keksdose's `randomUUID` + `uuidV5`
 * and kastlan's `randomUuid` were the same code, and the kit's `uuid5` needed
 * `crypto.subtle`, which a page over plain http (a phone testing the dev server on the LAN)
 * does not have. `crypto.getRandomValues` is there in every context.
 */

const DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A browser over plain http: `getRandomValues`, and neither `randomUUID` nor `subtle`. */
function plainHttp() {
  vi.stubGlobal("crypto", { getRandomValues: (b: Uint8Array<ArrayBuffer>) => webcrypto.getRandomValues(b) });
}

afterEach(() => vi.unstubAllGlobals());

describe("uuid5 on plain http", () => {
  it("resolves Python's uuid5(NAMESPACE_DNS, 'python.org') without crypto.subtle", async () => {
    plainHttp();
    await expect(uuid5(DNS, "python.org")).resolves.toBe("886313e1-3b8a-5372-9b90-0c9aee199e5d");
  });
});

describe("uuid5Sync", () => {
  it("is byte-for-byte Python's uuid.uuid5, across SHA-1's padding edges and in UTF-8", () => {
    plainHttp();
    const ns = "a2b36d99-d1b6-549a-849c-b38801b8c162";
    // keksdose's vectors (balance-adjustments.test.ts), each Python's: 16 namespace bytes
    // + 40 = 56 no longer leaves room for the length in the first block; 55 and 100 cross.
    expect(uuid5Sync(DNS, "python.org")).toBe("886313e1-3b8a-5372-9b90-0c9aee199e5d");
    expect(uuid5Sync(ns, "a".repeat(40))).toBe("85beed3e-fde4-51e4-9a6e-6a93f2cddd56");
    expect(uuid5Sync(ns, "a".repeat(55))).toBe("04f696c3-2d42-50d1-b061-334d995768b4");
    expect(uuid5Sync(ns, "x".repeat(100))).toBe("b0d01c0d-ab87-5d93-aaf4-7d93cb4f662c");
    expect(uuid5Sync(ns, "Saldokorrekturen – ü")).toBe("2f8368fd-2bf5-54ff-9588-bc2b903f5249");
  });

  it("takes the namespace in either case, hyphenated or not, and refuses anything else", () => {
    expect(uuid5Sync(DNS.toUpperCase().replaceAll("-", ""), "python.org")).toBe("886313e1-3b8a-5372-9b90-0c9aee199e5d");
    expect(() => uuid5Sync("not-a-uuid", "x")).toThrow(TypeError);
  });
});

describe("randomUuid", () => {
  it("is a version-4 UUID from getRandomValues where randomUUID is missing", () => {
    plainHttp();
    const ids = new Set(Array.from({ length: 50 }, () => randomUuid()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(V4);
  });

  it("is the browser's own randomUUID where there is one", () => {
    const own = vi.fn(() => "00000000-0000-4000-8000-000000000000");
    vi.stubGlobal("crypto", { randomUUID: own, getRandomValues: () => new Uint8Array(16) });
    expect(randomUuid()).toBe("00000000-0000-4000-8000-000000000000");
    expect(own).toHaveBeenCalledOnce();
  });
});

describe("the entries", () => {
  it("/offline and /sync both export the three", () => {
    for (const entry of [offline, sync] as Record<string, unknown>[]) {
      expect(entry.randomUuid).toBe(randomUuid);
      expect(entry.uuid5Sync).toBe(uuid5Sync);
      expect(entry.uuid5).toBe(uuid5);
    }
  });
});
