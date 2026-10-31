import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../components/toast";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackRowDetail } from "../feedback-row-detail";
import { useFeedbackStatusUndo } from "../feedback-status-undo";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * FLW-3 (refactor audit 2026-10-30): a second change sent before the first PATCH answers
 * must not eat the first change's Undo toast — nor close the wrong editor.
 *
 * TanStack Query v5's `MutationObserver.mutate` overwrites the per-call options and
 * detaches from the earlier mutation (mutationObserver.js:136-141), so a per-call
 * `onSuccess` fires for the LATEST call only (:155-168). The promise `mutateAsync`
 * returns settles for every call. The fake below keeps both rules.
 */
function tanstackObserver<P>() {
  let current: object | undefined;
  const requests: Array<{ patch: P; land: () => Promise<void>; fail: () => Promise<void> }> = [];
  const mutateAsync = vi.fn((patch: P, options: { onSuccess?: () => void } = {}) => {
    current = options;
    return new Promise<P>((resolve, reject) => {
      requests.push({
        patch,
        land: async () => {
          if (current === options) options.onSuccess?.();
          resolve(patch);
          await Promise.resolve();
        },
        fail: async () => {
          reject(new Error("409"));
          await Promise.resolve();
        },
      });
    });
  });
  const mutate = (patch: P, options: { onSuccess?: () => void }) => {
    mutateAsync(patch, options).catch(() => undefined);
  };
  return { mutate, mutateAsync, requests };
}

const first = { id: 412, title: "Chart jumps on save", status: "IN_EVALUATION" as const };
const second = { id: 413, title: "Legend overlaps", status: "OPEN" as const };

beforeEach(() => {
  vi.mocked(toast.undo).mockClear();
  vi.mocked(toast.success).mockClear();
});

describe("useFeedbackStatusUndo with mutateAsync — overlapping changes (FLW-3)", () => {
  it("keeps the first change's Undo when a second change is sent before it lands", async () => {
    const observer = tanstackObserver<{ id: number; status: string }>();
    const { result } = renderHook(() => useFeedbackStatusUndo(observer.mutateAsync));
    result.current(first, "DONE");
    result.current(second, "WONT_DO");
    await act(() => observer.requests[0].land());
    expect(toast.undo).toHaveBeenCalledWith("Set to “Done”: Chart jumps on save", expect.anything());
    await act(() => observer.requests[1].land());
    expect(toast.undo).toHaveBeenCalledWith("Set to “Won't do”: Legend overlaps", expect.anything());
    expect(toast.undo).toHaveBeenCalledTimes(2);
  });

  it("confirms the Undo even when another change went out meanwhile", async () => {
    const observer = tanstackObserver<{ id: number; status: string }>();
    const { result } = renderHook(() => useFeedbackStatusUndo(observer.mutateAsync));
    result.current(first, "DONE");
    await act(() => observer.requests[0].land());
    vi.mocked(toast.undo).mock.calls[0][1].onUndo();
    result.current(second, "WONT_DO");
    await act(() => observer.requests[1].land());
    expect(observer.requests[1].patch).toEqual({ id: 412, status: "IN_EVALUATION" });
    expect(toast.success).toHaveBeenCalledWith("Back to “In evaluation”: Chart jumps on save");
  });

  it("toasts once per change, and nothing when the PATCH fails (the mutation's onError owns that)", async () => {
    const observer = tanstackObserver<{ id: number; status: string }>();
    const { result } = renderHook(() => useFeedbackStatusUndo(observer.mutateAsync));
    result.current(first, "DONE");
    // The latest call: the per-call onSuccess AND the promise both answer — one toast.
    await act(() => observer.requests[0].land());
    expect(toast.undo).toHaveBeenCalledTimes(1);
    result.current(second, "WONT_DO");
    await act(() => observer.requests[1].fail());
    expect(toast.undo).toHaveBeenCalledTimes(1);
  });
});

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 412,
    user_id: 7,
    title: "Chart jumps on save",
    body: "Original text.",
    category: "BUG",
    status: "OPEN",
    context: null,
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
    ...over,
  };
}

describe("FeedbackRowDetail with mutateAsync — overlapping PATCHes (FLW-3)", () => {
  it("closes the description editor when its save lands, though a status change went out after it", async () => {
    const observer = tanstackObserver<object>();
    // The author is the admin here: the editor and the pills on one panel.
    render(<FeedbackRowDetail row={record()} canEdit viewerId={7} onUpdate={observer.mutateAsync} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Corrected text." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(observer.requests).toHaveLength(2);
    await act(() => observer.requests[0].land());
    expect(screen.queryByRole("textbox")).toBeNull();
    await act(() => observer.requests[1].land());
    expect(toast.undo).toHaveBeenCalledWith("Set to “Done”: Chart jumps on save", expect.anything());
  });
});
