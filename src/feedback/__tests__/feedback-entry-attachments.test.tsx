import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/confirm-dialog";
import { toast } from "../../components/toast";
import { FeedbackCommentThread } from "../feedback-comment-thread";
import { FeedbackEntryFile } from "../feedback-entry-file";
import type { FeedbackComment, FeedbackPublicRecord, FeedbackReply } from "../feedback-public-types";
import { FeedbackPublicDetail } from "../feedback-public-list";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackReplyComposer, FeedbackReplyTimeline } from "../feedback-replies";
import { FeedbackRowDetail, type FeedbackDetailUpdate } from "../feedback-row-detail";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * Attachments on admin replies and public comments, pictures inline
 * (docs/feedback-harmonization.md §12, round 0.47; keksdose run 82 R1, live #447: "Why
 * is the possibility gone to paste a screenshot from the clipboard here rightaway").
 * Synthetic data.
 */

const ATT = "/api/v1/feedback/attachments";
const PNG = `${ATT}/0123456789ab.png`;
const PDF = `${ATT}/ba9876543210.pdf`;
const NOW = new Date("2026-10-21T12:00:00Z");

const picture = (name = "shot.png") => new File(["x"], name, { type: "image/png" });
const clipboard = (...files: File[]) => ({
  clipboardData: { items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })) },
});
const blobFetcher = () => vi.fn(async () => new Blob(["x"], { type: "image/png" }));

function reply(over: Partial<FeedbackReply> = {}): FeedbackReply {
  return {
    id: 1,
    author_name: "Ann Admin",
    body: "Like this?",
    kind: "reply",
    status_to: "REWORK",
    created_at: "2026-10-21T09:00:00Z",
    ...over,
  };
}

function comment(over: Partial<FeedbackComment> = {}): FeedbackComment {
  return {
    id: 5,
    author_name: "Sam",
    mine: false,
    staff: false,
    body: "Same on the iPad",
    hidden: false,
    created_at: "2026-10-21T10:00:00Z",
    ...over,
  };
}

const wrap = (ui: ReactElement) => render(<ConfirmProvider>{ui}</ConfirmProvider>);

beforeAll(() => {
  URL.createObjectURL = () => "blob:file";
  URL.revokeObjectURL = () => {};
});

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe("FeedbackEntryFile", () => {
  it("draws a picture inline through the fetcher, as a link that opens it full size", async () => {
    const fetcher = blobFetcher();
    const { container } = render(<FeedbackEntryFile url={PNG} fetcher={fetcher} />);
    expect(fetcher).toHaveBeenCalledWith(PNG, expect.anything());
    const image = await screen.findByRole("img", { name: "Attachment" });
    expect(image.closest("a")).toHaveAttribute("href", "blob:file");
    expect(container.querySelector(`[data-feedback-entry-file="${PNG}"]`)).not.toBeNull();
  });

  it("offers any other file as a download", () => {
    render(<FeedbackEntryFile url={PDF} fetcher={blobFetcher()} />);
    expect(screen.getByRole("button", { name: "Download ba9876543210.pdf" })).toBeInTheDocument();
  });

  it("falls back to the download when a picture will not load", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 404 }));
    render(<FeedbackEntryFile url={PNG} fetcher={fetcher} />);
    expect(await screen.findByRole("button", { name: "Download 0123456789ab.png" })).toBeInTheDocument();
  });
});

describe("FeedbackReplyTimeline — an admin reply's file (§12)", () => {
  it("draws a reply's picture inline, as it draws a rework's", async () => {
    const fetcher = blobFetcher();
    render(
      <FeedbackReplyTimeline
        fetcher={fetcher}
        replies={[reply({ attachment_url: PNG }), reply({ id: 2, kind: "rework", attachment_url: PDF })]}
      />,
    );
    expect(await screen.findByRole("img", { name: "Attachment" })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(PNG, expect.anything());
    expect(screen.getByRole("button", { name: "Download ba9876543210.pdf" })).toBeInTheDocument();
  });

  it("still takes the app's own renderAttachment", () => {
    render(<FeedbackReplyTimeline replies={[reply({ attachment_url: PNG })]} renderAttachment={(url) => <i>{url}</i>} />);
    expect(screen.getByText(PNG)).toBeInTheDocument();
  });
});

describe("FeedbackReplyComposer — one file, as the rework note (§12)", () => {
  it("is text only without onUpload", () => {
    const { container } = render(<FeedbackReplyComposer status="DONE" onReply={vi.fn()} />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("takes a screenshot pasted into the box, uploads it first, then sends its URL", async () => {
    const onUpload = vi.fn(async () => PNG);
    const onReply = vi.fn(async () => {});
    const { container } = render(
      <FeedbackReplyComposer status="DONE" onReply={onReply} onUpload={onUpload} onCaptureScreenshot={async () => null} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toHaveAttribute("multiple");
    expect(screen.getByRole("button", { name: /capture/i })).toBeInTheDocument();
    const box = screen.getByRole("textbox", { name: "Write a reply" });
    fireEvent.paste(box, clipboard(picture()));
    fireEvent.change(box, { target: { value: "Like this?" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Status with the reply" }), { target: { value: "REWORK" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    });
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onReply).toHaveBeenCalledWith("Like this?", "REWORK", PNG);
    await waitFor(() => expect(box).toHaveValue(""));
  });

  it("sends nothing when the upload fails, and keeps the draft", async () => {
    const onReply = vi.fn();
    const { container } = render(
      <FeedbackReplyComposer
        status="DONE"
        onReply={onReply}
        onUpload={async () => {
          throw new Error("413");
        }}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [picture("big.png")] } });
    const box = screen.getByRole("textbox", { name: "Write a reply" });
    fireEvent.change(box, { target: { value: "See this" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    });
    expect(onReply).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("“big.png” could not be uploaded");
    expect(box).toHaveValue("See this");
  });

  it("refuses a file outside the contract's types", () => {
    const { container } = render(<FeedbackReplyComposer status="DONE" onReply={vi.fn()} onUpload={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["<svg/>"], "a.svg", { type: "image/svg+xml" })] } });
    expect(toast.error).toHaveBeenCalledWith("Only images, PDF or text files are allowed");
  });
});

describe("FeedbackCommentThread — a comment's file (§12)", () => {
  it("draws a comment's picture inline, and none on a veiled one", async () => {
    const fetcher = blobFetcher();
    const { container } = wrap(
      <FeedbackCommentThread
        now={NOW}
        isAdmin={false}
        fetcher={fetcher}
        comments={[
          comment({ attachment_url: PNG }),
          comment({ id: 6, hidden: true, body: null, author_name: null, attachment_url: PDF }),
        ]}
      />,
    );
    expect(await screen.findByRole("img", { name: "Attachment" })).toBeInTheDocument();
    expect(container.querySelector(`[data-feedback-entry-file="${PDF}"]`)).toBeNull();
  });

  it("draws an admin reply's file in the conversation", () => {
    const { container } = wrap(
      <FeedbackCommentThread now={NOW} isAdmin={false} fetcher={blobFetcher()} replies={[reply({ attachment_url: PDF })]} comments={[]} />,
    );
    expect(container.querySelector(`[data-feedback-entry-file="${PDF}"]`)).not.toBeNull();
  });

  it("takes one file with a comment, and sends a text comment as before", async () => {
    const onUpload = vi.fn(async () => PNG);
    const onComment = vi.fn(async () => {});
    const { container } = wrap(
      <FeedbackCommentThread now={NOW} isAdmin={false} comments={[]} onComment={onComment} onUpload={onUpload} />,
    );
    const box = screen.getByRole("textbox", { name: "Write a comment" });
    fireEvent.change(box, { target: { value: "Text only" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    });
    expect(onComment).toHaveBeenLastCalledWith("Text only");
    expect(onUpload).not.toHaveBeenCalled();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [picture()] } });
    fireEvent.change(box, { target: { value: "Here too" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    });
    expect(onComment).toHaveBeenLastCalledWith("Here too", PNG);
  });
});

describe("FeedbackRowDetail and FeedbackPublicDetail (§12)", () => {
  const row = (over: Partial<FeedbackRecord> = {}): FeedbackRecord => ({
    id: 412,
    user_id: 7,
    title: "Chart jumps on save",
    body: "The chart jumps.",
    category: "BUG",
    status: "DONE",
    context: null,
    screenshot_url: `${ATT}/aaaaaaaaaaaa.png`,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-21T09:00:00Z",
    updated_at: "2026-10-21T09:00:00Z",
    replies: [reply({ attachment_url: PDF }), reply({ id: 2, kind: "rework", author_name: "Ada", attachment_url: PNG })],
    ...over,
  });
  const landing = () =>
    vi.fn<FeedbackDetailUpdate>((_patch, { onSuccess }) => {
      onSuccess();
    });

  it("gives the admin's composer the file field, and draws the entries' files in the timeline only", async () => {
    const onReply = vi.fn(async () => {});
    const onUpload = vi.fn(async () => PDF);
    const { container } = render(
      <FeedbackRowDetail
        row={row()}
        canEdit
        viewerId={1}
        onUpdate={landing()}
        onReply={onReply}
        onUpload={onUpload}
        fetcher={blobFetcher()}
      />,
    );
    const composer = container.querySelector("[data-feedback-reply-composer]") as HTMLElement;
    const input = composer.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["%PDF-"], "trace.pdf", { type: "application/pdf" })] } });
    fireEvent.change(within(composer).getByRole("textbox"), { target: { value: "The trace" } });
    await act(async () => {
      fireEvent.click(within(composer).getByRole("button", { name: "Reply" }));
    });
    // DONE with no reply carrying it: the nudge picks DONE (§9.7).
    expect(onReply).toHaveBeenCalledWith("The trace", "DONE", PDF);
    // The Attachment section holds the report's own file; the entries' are in the timeline.
    const timeline = screen.getByRole("list", { name: "Replies" });
    expect(timeline.querySelector(`[data-feedback-entry-file="${PNG}"]`)).not.toBeNull();
    expect(timeline.querySelector(`[data-feedback-entry-file="${PDF}"]`)).not.toBeNull();
    expect(screen.queryAllByRole("button", { name: "Download ba9876543210.pdf" })).toHaveLength(1);
    await waitFor(() => expect(screen.getAllByRole("img", { name: "Attachment" }).length).toBeGreaterThanOrEqual(2));
  });

  it("hands the public detail's comment box the upload", async () => {
    const onComment = vi.fn(async () => {});
    const record: FeedbackPublicRecord = {
      id: 412,
      title: "Chart jumps on save",
      category: "BUG",
      status: "OPEN",
      author_name: "Ada",
      mine: false,
      votes: 1,
      voted: false,
      comment_count: 1,
      created_at: "2026-10-21T09:00:00Z",
      updated_at: "2026-10-21T09:00:00Z",
      resolved_at: null,
      body: "The chart jumps.",
      replies: [],
    };
    const { container } = wrap(
      <FeedbackPublicDetail
        row={record}
        comments={[comment({ attachment_url: PNG })]}
        onVote={async () => ({ votes: 1, voted: true })}
        onComment={onComment}
        onUpload={async () => PNG}
        fetcher={blobFetcher()}
        now={NOW}
      />,
    );
    expect(await screen.findByRole("img", { name: "Attachment" })).toBeInTheDocument();
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [picture()] },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Write a comment" }), { target: { value: "Here too" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    });
    expect(onComment).toHaveBeenCalledWith("Here too", PNG);
  });
});
