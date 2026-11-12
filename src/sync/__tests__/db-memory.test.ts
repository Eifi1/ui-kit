import "fake-indexeddb/auto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { createSyncDb } from "../db";

/**
 * `createSyncDb`'s `indexedDB` (0.61, Marcel 2026-11-12): on a computer marked as shared the
 * copy lives in an in-memory IndexedDB, so nothing of it reaches the device. Here the global
 * IndexedDB (`fake-indexeddb/auto`) stands for the device's disk, and a fresh in-memory
 * factory for the next tab.
 */

let n = 0;
const memory = () => ({ indexedDB: new IDBFactory(), IDBKeyRange });

describe("createSyncDb on an in-memory IndexedDB", () => {
  it("works for the session and writes nothing to the device", async () => {
    const name = `kk-budget-shared-${++n}`;
    const db = createSyncDb(name, { indexedDB: memory() });
    await db.meta.put({ key: "cursor", value: 42 });
    expect(await db.meta.get("cursor")).toEqual({ key: "cursor", value: 42 });
    // The device's own database of that name has nothing in it.
    const onDisk = createSyncDb(name);
    expect(await onDisk.meta.count()).toBe(0);
    db.close();
    onDisk.close();
  });

  it("leaves nothing for the next tab", async () => {
    const name = `kk-budget-shared-${++n}`;
    const tab = createSyncDb(name, { indexedDB: memory() });
    await tab.meta.put({ key: "cursor", value: 7 });
    tab.close();
    const next = createSyncDb(name, { indexedDB: memory() });
    expect(await next.meta.count()).toBe(0);
    next.close();
  });

  it("is the device's database as before without it", async () => {
    const name = `kk-budget-own-${++n}`;
    const db = createSyncDb(name);
    await db.meta.put({ key: "cursor", value: 1 });
    db.close();
    const reopened = createSyncDb(name);
    expect(await reopened.meta.get("cursor")).toEqual({ key: "cursor", value: 1 });
    reopened.close();
  });
});
