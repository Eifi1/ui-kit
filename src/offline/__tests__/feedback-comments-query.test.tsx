import { act, renderHook, waitFor } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../components/toast";
import type { FeedbackComment } from "../../feedback/feedback-public-types";
import { feedbackCommentsQueryKey, useFeedbackCommentsQuery } from "../feedback-comments-query";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), undo: vi.fn() }),
}));

/**
 * `useFeedbackCommentsQuery` (0.61, Marcel 2026-11-12): keksdose's comment thread through the
 * TanStack cache, so a persisted cache keeps it for offline reading — under keksdose's keys,
 * an admin's apart for the persistence to refuse.
 */

const comment = (id: number, body: string) =>
  ({ id, body, author: "Ada", created_at: "2026-11-12T10:00:00Z" }) as unknown as FeedbackComment;

function client() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}
function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function api(comments: FeedbackComment[] = [comment(1, "Same on the iPad.")]) {
  return {
    comments: vi.fn(async (_id: number) => comments),
    comment: vi.fn(async (_id: number, _body: string, _url?: string): Promise<unknown> => ({})),
    hideComment: vi.fn(async (_id: number, _c: number, _hidden: boolean): Promise<unknown> => ({})),
    deleteComment: vi.fn(async (_id: number, _c: number): Promise<unknown> => ({})),
  };
}

beforeEach(() => vi.mocked(toast.error).mockClear());
afterEach(() => onlineManager.setOnline(true));

describe("useFeedbackCommentsQuery", () => {
  it("reads the thread under keksdose's key, an admin's apart", async () => {
    expect(feedbackCommentsQueryKey(52, false)).toEqual(["feedback", "comments", 52]);
    expect(feedbackCommentsQueryKey(52, true)).toEqual(["feedback", "admin", "comments", 52]);
    const qc = client();
    const server = api();
    const { result } = renderHook(() => useFeedbackCommentsQuery(52, server), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    expect(server.comments).toHaveBeenCalledWith(52);
    expect(qc.getQueryData(["feedback", "comments", 52])).toHaveLength(1);
    const admin = renderHook(() => useFeedbackCommentsQuery(52, server, { admin: true }), { wrapper: wrapper(qc) });
    await waitFor(() => expect(admin.result.current.comments).toHaveLength(1));
    expect(qc.getQueryData(["feedback", "admin", "comments", 52])).toHaveLength(1);
  });

  it("shows the cached thread offline, as a persisted cache restores it", async () => {
    const qc = client();
    qc.setQueryData(["feedback", "comments", 52], [comment(9, "From the device's cache.")]);
    onlineManager.setOnline(false);
    const server = api();
    const { result } = renderHook(() => useFeedbackCommentsQuery(52, server), { wrapper: wrapper(qc) });
    expect(result.current.comments?.[0]?.body).toBe("From the device's cache.");
    expect(result.current.failed).toBe(false);
    expect(result.current.offline).toBe(false);
  });

  it("says offline where nothing is cached, and reads once the browser is back", async () => {
    const qc = client();
    onlineManager.setOnline(false);
    const server = api();
    const { result } = renderHook(() => useFeedbackCommentsQuery(52, server), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.offline).toBe(true);
    expect(result.current.comments).toBeUndefined();
    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    expect(result.current.failed).toBe(false);
  });

  it("comments, reads the thread again and tells the app; pending only while the comment is out", async () => {
    const qc = client();
    const server = api();
    const onChanged = vi.fn();
    const { result } = renderHook(() => useFeedbackCommentsQuery(52, server, { onChanged }), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    let release!: () => void;
    server.comment.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve({}))));
    let sent!: Promise<unknown>;
    act(() => {
      sent = result.current.onComment("Me too");
    });
    await waitFor(() => expect(result.current.pending).toBe(true));
    await act(async () => {
      release();
      await sent;
    });
    expect(server.comment).toHaveBeenCalledWith(52, "Me too");
    expect(onChanged).toHaveBeenCalledWith(52);
    expect(server.comments).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.pending).toBe(false));
    // A hide is no comment being sent.
    await act(async () => {
      await result.current.onHide!(comment(1, "x"), true);
    });
    expect(server.hideComment).toHaveBeenCalledWith(52, 1, true);
  });

  it("toasts a refused hide as a change that did not save, through the app's words", async () => {
    const qc = client();
    const server = api();
    server.hideComment.mockRejectedValueOnce(new Error("403"));
    const errorMessage = vi.fn((_e: unknown, fallback: string) => `server: ${fallback}`);
    const { result } = renderHook(() => useFeedbackCommentsQuery(52, server, { errorMessage }), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    await act(async () => {
      await result.current.onHide!(comment(1, "x"), true).catch(() => undefined);
    });
    expect(toast.error).toHaveBeenCalledWith("server: Could not save that change.");
  });

  it("reads nothing for no report, and offers no Hide or Delete the client lacks", async () => {
    const qc = client();
    const server = api();
    const { result } = renderHook(
      () => useFeedbackCommentsQuery(null, { comments: server.comments, comment: server.comment }),
      {
        wrapper: wrapper(qc),
      },
    );
    expect(result.current.comments).toBeUndefined();
    expect(result.current.failed).toBe(false);
    expect(result.current.onHide).toBeUndefined();
    expect(result.current.onDelete).toBeUndefined();
    expect(server.comments).not.toHaveBeenCalled();
  });
});
