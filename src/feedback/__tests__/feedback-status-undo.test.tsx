import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../components/toast";
import { UiKitProvider, type UiKitLabelOverrides } from "../../i18n/kit-labels";
import {
  FEEDBACK_UNDO_DURATION,
  useFeedbackStatusUndo,
  type FeedbackStatusMutate,
} from "../feedback-status-undo";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * §4.5 of the feedback contract — keksdose's `changeStatusUndoably` (dev #587): after the
 * PATCH lands an 8 s toast says what the row became, names it, and offers the old status
 * back; Undo PATCHes it and confirms.
 */

const row = { id: 412, title: "Chart jumps on save", status: "IN_EVALUATION" as const };

/** A mutation that answers at once, as TanStack's `mutate` would on success. */
const landing = () =>
  vi.fn<FeedbackStatusMutate>((_patch, { onSuccess }) => {
    onSuccess();
  });

beforeEach(() => {
  vi.mocked(toast.undo).mockClear();
  vi.mocked(toast.success).mockClear();
});

describe("useFeedbackStatusUndo", () => {
  it("PATCHes the status, then offers the old one back for 8 s", () => {
    const mutate = landing();
    const { result } = renderHook(() => useFeedbackStatusUndo(mutate));
    result.current(row, "DONE");

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ id: 412, status: "DONE" });
    expect(toast.undo).toHaveBeenCalledWith(
      "Set to “Done”: Chart jumps on save",
      expect.objectContaining({ label: "Undo", duration: FEEDBACK_UNDO_DURATION }),
    );
    expect(FEEDBACK_UNDO_DURATION).toBe(8000);

    vi.mocked(toast.undo).mock.calls[0][1].onUndo();
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate.mock.calls[1][0]).toEqual({ id: 412, status: "IN_EVALUATION" });
    expect(toast.success).toHaveBeenCalledWith("Back to “In evaluation”: Chart jumps on save");
  });

  it("toasts nothing until the PATCH has landed, and nothing at all when it fails", () => {
    // The mutation's own onError owns the failure toast; this hook adds no second one.
    const mutate = vi.fn<FeedbackStatusMutate>();
    const { result } = renderHook(() => useFeedbackStatusUndo(mutate));
    result.current(row, "WONT_DO");
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(toast.undo).not.toHaveBeenCalled();
    mutate.mock.calls[0][1].onSuccess();
    expect(toast.undo).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the row is already there", () => {
    const mutate = landing();
    const { result } = renderHook(() => useFeedbackStatusUndo(mutate));
    result.current(row, "IN_EVALUATION");
    expect(mutate).not.toHaveBeenCalled();
    expect(toast.undo).not.toHaveBeenCalled();
  });

  it("speaks the provider's language, and an option's words over it", () => {
    const de = {
      feedbackStatus: { DONE: "Erledigt", IN_EVALUATION: "Zur Prüfung" },
      feedbackToast: {
        statusChanged: (s: string, t: string) => `Auf „${s}“ gesetzt: ${t}`,
        statusUndo: "Rückgängig",
        statusRestored: (s: string, t: string) => `Zurück auf „${s}“: ${t}`,
      },
    } as unknown as UiKitLabelOverrides;
    const wrapper = ({ children }: { children: ReactNode }) => <UiKitProvider labels={de}>{children}</UiKitProvider>;
    const mutate = landing();
    const { result } = renderHook(() => useFeedbackStatusUndo(mutate, { statusLabels: { DONE: "Fertig" } }), {
      wrapper,
    });
    result.current(row, "DONE");
    expect(toast.undo).toHaveBeenCalledWith(
      "Auf „Fertig“ gesetzt: Chart jumps on save",
      expect.objectContaining({ label: "Rückgängig" }),
    );
    vi.mocked(toast.undo).mock.calls[0][1].onUndo();
    expect(toast.success).toHaveBeenCalledWith("Zurück auf „Zur Prüfung“: Chart jumps on save");
  });

  it("keeps the old status and title from the moment of the change", () => {
    // The row object may be gone (filtered out) or replaced by a refetch before Undo.
    const mutate = landing();
    const { result } = renderHook(() => useFeedbackStatusUndo(mutate));
    const live = { ...row };
    result.current(live, "DONE");
    live.title = "renamed";
    vi.mocked(toast.undo).mock.calls[0][1].onUndo();
    expect(mutate.mock.calls[1][0]).toEqual({ id: 412, status: "IN_EVALUATION" });
    expect(toast.success).toHaveBeenCalledWith("Back to “In evaluation”: Chart jumps on save");
  });

  it("returns a stable function while its inputs are", () => {
    const mutate = landing();
    const { result, rerender } = renderHook(() => useFeedbackStatusUndo(mutate));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
