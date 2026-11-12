import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { toast } from "../../components/toast";
import { useFeedbackComments, type FeedbackCommentsApi } from "../feedback-comments";
import type { FeedbackComment } from "../feedback-public-types";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

/**
 * docs/feedback-harmonization.md §9.8, §14.3: one report's comment thread through the
 * app's API client — the hook that replaces keksdose's `use-feedback-comments.ts` and
 * Kurvenschmiede's `use-feedback-conversation.ts`. Synthetic comments only.
 */

const comment = (id: number, over: Partial<FeedbackComment> = {}): FeedbackComment => ({
  id,
  author_name: "Ben",
  mine: false,
  staff: false,
  body: `Comment ${id}`,
  hidden: false,
  created_at: "2026-10-12T11:00:00Z",
  ...over,
});

/** A server holding each report's thread, answering at once. */
function server(threads: Record<number, FeedbackComment[]> = { 52: [comment(9)] }) {
  const api = {
    comments: vi.fn(async (id: number) => [...(threads[id] ?? [])]),
    comment: vi.fn(async (id: number, body: string, _attachmentUrl?: string) => {
      const created = comment(100 + (threads[id]?.length ?? 0), { body, mine: true });
      threads[id] = [...(threads[id] ?? []), created];
      return created;
    }),
    hideComment: vi.fn(async (id: number, commentId: number, hidden: boolean) => {
      threads[id] = (threads[id] ?? []).map((c) => (c.id === commentId ? { ...c, hidden } : c));
    }),
    deleteComment: vi.fn(async (id: number, commentId: number) => {
      threads[id] = (threads[id] ?? []).filter((c) => c.id !== commentId);
    }),
  };
  return api;
}

/** A promise the test settles by hand. */
function held<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const settle = () => act(async () => {});

let online: PropertyDescriptor | undefined;
beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  online = Object.getOwnPropertyDescriptor(window.navigator, "onLine");
});
afterEach(() => {
  if (online) Object.defineProperty(window.navigator, "onLine", online);
  else delete (window.navigator as { onLine?: boolean }).onLine;
});

describe("useFeedbackComments — the read", () => {
  it("reads the report's thread: undefined and loading, then the comments", async () => {
    const api = server();
    const { result } = renderHook(() => useFeedbackComments(52, api));
    expect(result.current.comments).toBeUndefined();
    expect(result.current.loading).toBe(true);
    await settle();
    expect(api.comments).toHaveBeenCalledWith(52);
    expect(result.current.comments?.map((c) => c.id)).toEqual([9]);
    expect(result.current.loading).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it("reads nothing for no report", async () => {
    const api = server();
    const { result } = renderHook(() => useFeedbackComments(null, api));
    await settle();
    expect(api.comments).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ comments: undefined, loading: false, failed: false, pending: false });
  });

  it("never shows the report before's thread under the next one, nor lets its late answer land", async () => {
    const first = held<FeedbackComment[]>();
    const api = {
      ...server(),
      comments: vi.fn((id: number) => (id === 52 ? first.promise : Promise.resolve([comment(7)]))),
    };
    const { result, rerender } = renderHook(({ id }) => useFeedbackComments(id, api), { initialProps: { id: 52 } });
    rerender({ id: 53 });
    await settle();
    expect(result.current.comments?.map((c) => c.id)).toEqual([7]);
    // #52's read answers after #53's: it is stale, and #53's thread stays.
    first.resolve([comment(9)]);
    await settle();
    expect(result.current.comments?.map((c) => c.id)).toEqual([7]);
  });

  it("reads once for an inline api object, not on every render", async () => {
    const api = server();
    const { rerender } = renderHook(() => useFeedbackComments(52, { ...api }));
    await settle();
    rerender();
    rerender();
    await settle();
    expect(api.comments).toHaveBeenCalledTimes(1);
  });

  it("says a failed read, and reads again on Try again", async () => {
    const api = server();
    api.comments.mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useFeedbackComments(52, api));
    await settle();
    expect(result.current).toMatchObject({ comments: undefined, failed: true, offline: false, loading: false });

    act(() => result.current.retry());
    // The Try again is on its way: loading, not the failure.
    expect(result.current).toMatchObject({ failed: false, loading: true });
    await settle();
    expect(result.current.comments?.map((c) => c.id)).toEqual([9]);
    expect(api.comments).toHaveBeenCalledTimes(2);
  });

  it("says offline when the browser was, and reads again by itself once it is back", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => false });
    const api = server();
    api.comments.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useFeedbackComments(52, api));
    await settle();
    expect(result.current).toMatchObject({ failed: true, offline: true });

    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => true });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await settle();
    expect(api.comments).toHaveBeenCalledTimes(2);
    expect(result.current.comments?.map((c) => c.id)).toEqual([9]);
  });
});

describe("useFeedbackComments — the writes", () => {
  it("sends a comment, resolves once it is on the thread, and tells the app", async () => {
    const api = server();
    const onChanged = vi.fn();
    const { result } = renderHook(() => useFeedbackComments(52, api, { onChanged }));
    await settle();

    // The thread's read after the POST is held: the send must not settle before it lands,
    // or the box would clear a beat before the comment shows.
    const reread = held<FeedbackComment[]>();
    const answer = api.comments.getMockImplementation()!;
    api.comments.mockImplementationOnce(async (id) => {
      const fresh = await answer(id);
      await reread.promise;
      return fresh;
    });
    let landed = false;
    let sent: Promise<unknown> | undefined;
    act(() => {
      sent = result.current.onComment("Me too").then(() => {
        landed = true;
      });
    });
    expect(result.current.pending).toBe(true);
    await settle();
    expect(api.comment).toHaveBeenCalledTimes(1);
    expect(landed).toBe(false);
    expect(result.current.pending).toBe(true);
    await act(async () => {
      reread.resolve([]);
      await sent;
    });
    // Two arguments without a file, as the thread calls `onComment` (§12).
    expect(api.comment.mock.calls[0]).toEqual([52, "Me too"]);
    expect(result.current.comments?.map((c) => c.body)).toEqual(["Comment 9", "Me too"]);
    expect(result.current.pending).toBe(false);
    expect(onChanged).toHaveBeenCalledWith(52);

    await act(async () => {
      await result.current.onComment("With a picture", "/api/v1/feedback/attachments/k.png");
    });
    expect(api.comment.mock.calls[1]).toEqual([52, "With a picture", "/api/v1/feedback/attachments/k.png"]);
  });

  it("is pending for a comment only — not while a hide or a delete is out", async () => {
    // keksdose's hook spun the composer's Send for an admin's Hide too, as if a comment
    // were on its way; the thread's `pending` is "a comment is being sent".
    const api = server({ 52: [comment(9), comment(10, { mine: true })] });
    const hide = held<void>();
    const remove = held<void>();
    api.hideComment.mockReturnValueOnce(hide.promise);
    api.deleteComment.mockReturnValueOnce(remove.promise);
    const { result } = renderHook(() => useFeedbackComments(52, api));
    await settle();

    let hiding: Promise<unknown> | undefined;
    let deleting: Promise<unknown> | undefined;
    act(() => {
      hiding = result.current.onHide?.(comment(9), true);
      deleting = result.current.onDelete?.(comment(10, { mine: true }));
    });
    expect(result.current.pending).toBe(false);
    hide.resolve();
    remove.resolve();
    await act(async () => {
      await Promise.all([hiding, deleting]);
    });
    expect(api.hideComment).toHaveBeenCalledWith(52, 9, true);
    expect(api.deleteComment).toHaveBeenCalledWith(52, 10);
  });

  it("toasts a refused comment in the comment's words, and rejects so the box keeps the draft", async () => {
    const api = server();
    api.comment.mockRejectedValueOnce(new Error("422"));
    const onChanged = vi.fn();
    const { result } = renderHook(() => useFeedbackComments(52, api, { onChanged }));
    await settle();
    await act(async () => {
      await expect(result.current.onComment("x")).rejects.toThrow("422");
    });
    expect(toast.error).toHaveBeenCalledWith("Could not post the comment.");
    expect(result.current.pending).toBe(false);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("toasts a refused hide or delete as a change that did not save, not as a comment", async () => {
    // keksdose said "Could not post the comment." for both; the thread's `onHide` names
    // `feedbackToast.updateFailed`, which is what Kurvenschmiede said.
    const api = server({ 52: [comment(9), comment(10, { mine: true })] });
    api.hideComment.mockRejectedValueOnce(new Error("403"));
    api.deleteComment.mockRejectedValueOnce(new Error("404"));
    const { result } = renderHook(() => useFeedbackComments(52, api));
    await settle();
    await act(async () => {
      await expect(result.current.onHide?.(comment(9), true)).rejects.toThrow("403");
      await expect(result.current.onDelete?.(comment(10, { mine: true }))).rejects.toThrow("404");
    });
    expect(vi.mocked(toast.error).mock.calls).toEqual([
      ["Could not save that change."],
      ["Could not save that change."],
    ]);
  });

  it("lets the server's sentence win through errorMessage", async () => {
    const api = server();
    api.comment.mockRejectedValueOnce(new Error("Demo sessions cannot comment."));
    const errorMessage = vi.fn((error: unknown, fallback: string) =>
      error instanceof Error ? error.message : fallback,
    );
    const { result } = renderHook(() => useFeedbackComments(52, api, { errorMessage }));
    await settle();
    await act(async () => {
      await result.current.onComment("x").catch(() => undefined);
    });
    expect(errorMessage).toHaveBeenCalledWith(expect.any(Error), "Could not post the comment.");
    expect(toast.error).toHaveBeenCalledWith("Demo sessions cannot comment.");
  });

  it("offers no Hide or Delete where the api has none", async () => {
    const { comments, comment: post } = server();
    const { result } = renderHook(() => useFeedbackComments(52, { comments, comment: post }));
    await settle();
    expect(result.current.onHide).toBeUndefined();
    expect(result.current.onDelete).toBeUndefined();
  });

  it("takes both apps' feedbackApi as it is (checked by tsc)", () => {
    // keksdose's and Kurvenschmiede's clients, as their endpoints.ts types them.
    expectTypeOf<{
      comments: (id: number) => Promise<FeedbackComment[]>;
      comment: (id: number, body: string, attachmentUrl?: string) => Promise<FeedbackComment>;
      hideComment: (id: number, commentId: number, hidden: boolean) => Promise<FeedbackComment>;
      deleteComment: (id: number, commentId: number) => Promise<undefined>;
      vote: (id: number, next: boolean) => Promise<{ votes: number; voted: boolean }>;
    }>().toExtend<FeedbackCommentsApi>();
  });
});
