import "fake-indexeddb/auto";
import Dexie, { type Table } from "dexie";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncStatusIndicator } from "../../shell/sync-status-indicator";
import { createSyncDb, type SyncDb } from "../db";
import { createSyncEngine, type SyncEngine, type SyncEngineState } from "../engine";
import { useSyncQuery, useSyncStatus, useSyncWorker } from "../hooks";

function fakeEngine(state: Partial<SyncEngineState> = {}) {
  let current: SyncEngineState = {
    phase: "idle",
    online: true,
    counts: { pending: 0, waiting: 0, blocked: 0, rejected: 0 },
    lastSyncedAt: null,
    nextRetryAt: null,
    ...state,
  };
  const listeners = new Set<() => void>();
  const engine = {
    start: vi.fn(),
    stop: vi.fn(),
    syncNow: vi.fn(async () => ({ outcome: "synced" as const, waiting: 0, blocked: 0, rejected: 0 })),
    getState: () => current,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    emit(next: Partial<SyncEngineState>) {
      current = { ...current, ...next };
      listeners.forEach((l) => l());
    },
  };
  return engine as unknown as SyncEngine & {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    syncNow: ReturnType<typeof vi.fn>;
    emit(next: Partial<SyncEngineState>): void;
  };
}

describe("useSyncWorker", () => {
  it("starts nothing without an engine (a computer marked shared)", () => {
    const { unmount } = renderHook(() => useSyncWorker(null));
    unmount();
  });

  it("starts the engine, and stops the old one when the engine changes (a company switch)", () => {
    const a = fakeEngine();
    const b = fakeEngine();
    const { rerender, unmount } = renderHook(({ engine }) => useSyncWorker(engine), {
      initialProps: { engine: a as SyncEngine | null },
    });
    expect(a.start).toHaveBeenCalledTimes(1);
    rerender({ engine: b });
    expect(a.stop).toHaveBeenCalledTimes(1);
    expect(b.start).toHaveBeenCalledTimes(1);
    rerender({ engine: null });
    expect(b.stop).toHaveBeenCalledTimes(1);
    unmount();
    expect(a.start).toHaveBeenCalledTimes(1);
  });
});

describe("useSyncStatus", () => {
  it("maps the engine's state onto the indicator's status", () => {
    const engine = fakeEngine({
      phase: "syncing",
      online: true,
      counts: { pending: 3, waiting: 2, blocked: 1, rejected: 4 },
      lastSyncedAt: "2026-10-19T10:00:00.000Z",
    });
    const { result } = renderHook(() => useSyncStatus(engine));
    expect(result.current.status).toEqual({
      phase: "syncing",
      online: true,
      pending: 3,
      waitingForPlan: 2,
      blocked: 5,
      lastSyncedAt: "2026-10-19T10:00:00.000Z",
    });
    act(() => engine.emit({ phase: "offline", online: false }));
    expect(result.current.status).toMatchObject({ phase: "offline", online: false });
  });

  it("onSync is the engine's syncNow, and feeds SyncStatusIndicator", async () => {
    const engine = fakeEngine({ counts: { pending: 2, waiting: 0, blocked: 0, rejected: 0 } });
    function Indicator() {
      const { status, onSync } = useSyncStatus(engine);
      return <SyncStatusIndicator status={status} onSync={onSync} />;
    }
    render(<Indicator />);
    const button = screen.getByRole("button");
    act(() => button.click());
    await waitFor(() => expect(engine.syncNow).toHaveBeenCalledTimes(1));
  });

  it("is an idle status without an engine", () => {
    const { result } = renderHook(() => useSyncStatus(null));
    expect(result.current.status).toMatchObject({ phase: "idle", pending: 0, blocked: 0, waitingForPlan: 0 });
  });
});

describe("useSyncQuery", () => {
  let db: SyncDb | null = null;
  let engine: SyncEngine | null = null;
  afterEach(async () => {
    engine?.stop();
    if (db) {
      db.close();
      await Dexie.delete(db.name);
    }
  });

  it("re-renders when a write lands in the copy", async () => {
    db = createSyncDb(`sync-hooks-test-${Date.now()}`);
    engine = createSyncEngine({ db, scopes: () => [], send: vi.fn(), sharedComputer: () => false });
    const copy = db;
    const { result } = renderHook(() =>
      useSyncQuery(copy, (d) => d.rows.where("entity").equals("protocols").count(), []),
    );
    await waitFor(() => expect(result.current).toEqual({ data: 0, isLoading: false }));
    await act(() => engine!.write("handover", "protocols", "p1", "upsert", { notes: "x" }));
    await waitFor(() => expect(result.current.data).toBe(1));
  });

  it("is still loading without a database (the copy is not open yet: no flash of an empty page)", () => {
    const { result } = renderHook(() => useSyncQuery(null, async () => 1, []));
    expect(result.current).toEqual({ data: undefined, isLoading: true });
  });

  it("hands the query the app's own database type (kastlan's HandoverDb with photos)", async () => {
    type PhotoDb = SyncDb & { photos: Table<{ id: string }, string> };
    const typed = createSyncDb<PhotoDb>(`sync-hooks-typed-${Date.now()}`, { extraStores: { photos: "id" } });
    db = typed;
    const { result } = renderHook(() => useSyncQuery(typed, (d: PhotoDb) => d.photos.count(), []));
    await waitFor(() => expect(result.current).toEqual({ data: 0, isLoading: false }));
  });
});
