import { useCallback, useMemo, useRef, useState } from "react";
import { FeedbackCommentThread, FeedbackRowDetail } from "@eifi1/ui-kit";
import type {
  AuthedFetcher,
  FeedbackComment,
  FeedbackDetailUpdate,
  FeedbackRecord,
  FeedbackReply,
  FeedbackStatus,
} from "@eifi1/ui-kit";
import { Example, Note, code } from "../../lib/section";

/**
 * Round 0.47 (docs/feedback-harmonization.md §12): the
 * admin's reply composer and the comment box take one file as the rework note does —
 * pasted from the clipboard, captured or picked — and every entry's and comment's
 * picture is drawn inline. The upload and the authenticated GET are faked in memory;
 * every row, name and key is synthetic.
 */

const ATT = "/api/v1/feedback/attachments";
const ADMIN = 1;
const AUTHOR = 7;

/** A picture for a `.png` key — an SVG blob, decoded as the server's bytes would be. */
function picture(label: string, hue: number): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="hsl(${hue} 60% 85%)"/><text x="160" y="96" font-family="sans-serif" font-size="18" text-anchor="middle" fill="hsl(${hue} 50% 30%)">${label}</text></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

const SEEDED = {
  reply: `${ATT}/047000000001.png`,
  comment: `${ATT}/047000000002.png`,
  log: `${ATT}/047000000003.txt`,
};

const SEED_REPLIES: FeedbackReply[] = [
  {
    id: 1,
    author_name: "Marcel Example",
    body: "Is this the spot you mean? Sending it back with the corner marked.",
    attachment_url: SEEDED.reply,
    status_to: "REWORK",
    status_from: "IN_EVALUATION",
    created_at: "2026-10-20T08:30:00Z",
  },
];

const SEED_COMMENTS: FeedbackComment[] = [
  {
    id: 1,
    author_name: "Sam",
    mine: false,
    staff: false,
    body: "Same here on the tablet, see the bottom edge.",
    hidden: false,
    attachment_url: SEEDED.comment,
    created_at: "2026-10-20T09:00:00Z",
  },
  {
    id: 2,
    author_name: "Lea",
    mine: false,
    staff: false,
    body: "The console said this.",
    hidden: false,
    attachment_url: SEEDED.log,
    created_at: "2026-10-20T09:20:00Z",
  },
];

function seedRow(): FeedbackRecord {
  return {
    id: 447,
    user_id: AUTHOR,
    title: "Footer overlaps the last row",
    body: "On a short screen the footer covers the last table row.",
    category: "BUG",
    status: "IN_EVALUATION",
    context: null,
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-19T09:12:00Z",
    updated_at: "2026-10-20T08:30:00Z",
    replies: SEED_REPLIES,
  };
}

/** The "server": uploaded files by URL, so the fetcher can hand the bytes back. */
function useFakeFiles() {
  const files = useRef(new Map<string, Blob>());
  const counter = useRef(10);
  const fetcher = useMemo<AuthedFetcher>(
    () => async (url) => {
      const uploaded = files.current.get(url);
      if (uploaded) return uploaded;
      if (url === SEEDED.reply) return picture("The admin's screenshot", 210);
      if (url === SEEDED.comment) return picture("A commenter's screenshot", 30);
      if (url === SEEDED.log) return new Blob(["synthetic console log\n"], { type: "text/plain" });
      throw new Error("404");
    },
    [],
  );
  const onUpload = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    counter.current += 1;
    const url = `${ATT}/${String(counter.current).padStart(12, "0")}.${ext}`;
    files.current.set(url, file);
    return url;
  }, []);
  return { fetcher, onUpload };
}

export function FeedbackAttachments047Demo() {
  const { fetcher, onUpload } = useFakeFiles();
  const [row, setRow] = useState(seedRow);
  const [comments, setComments] = useState(SEED_COMMENTS);
  const update = useCallback<FeedbackDetailUpdate>((patch, { onSuccess }) => {
    setRow((prev) => ({ ...prev, ...(patch.status ? { status: patch.status } : null) }));
    onSuccess();
  }, []);

  return (
    <Example
      label="Attachments on replies and comments"
      hint="paste a screenshot into the reply or comment box, or attach one, then send: the picture shows inline, a tap opens it"
    >
      <div className="flex flex-col gap-4">
        <FeedbackRowDetail
          row={row}
          canEdit
          viewerId={ADMIN}
          onUpdate={update}
          onUpload={onUpload}
          replyAttachments
          fetcher={fetcher}
          showSubject={false}
          onReply={async (body: string, status?: FeedbackStatus, attachmentUrl?: string) =>
            setRow((prev) => ({
              ...prev,
              status: status ?? prev.status,
              replies: [
                ...(prev.replies ?? []),
                {
                  id: (prev.replies?.length ?? 0) + 1,
                  author_name: "Marcel Example",
                  body,
                  attachment_url: attachmentUrl ?? null,
                  status_to: status ?? null,
                  status_from: status ? prev.status : null,
                  created_at: new Date().toISOString(),
                },
              ],
            }))
          }
          comments={
            <FeedbackCommentThread
              comments={comments}
              isAdmin
              fetcher={fetcher}
              onUpload={onUpload}
              onComment={async (body: string, attachmentUrl?: string) =>
                setComments((prev) => [
                  ...prev,
                  {
                    id: prev.length + 1,
                    author_name: "Marcel Example",
                    mine: true,
                    staff: false,
                    body,
                    hidden: false,
                    attachment_url: attachmentUrl ?? null,
                    created_at: new Date().toISOString(),
                  },
                ])
              }
            />
          }
        />
      </div>
      <Note>
        The admin answers with a reply, so with {code("replyAttachments")} the reply composer takes the rework
        note's one file: pasted from the clipboard into the box, captured ({code("onCaptureScreenshot")}) or picked,
        the contract's types and 10 MB. It is uploaded first through {code("onUpload")}; its URL is{" "}
        {code("onReply")}'s third argument and the reply body's {code("attachment_url")} (server-kit 0.18). Off by
        default: {code("onUpload")} alone stays the rework's, so an app never shows a file field an{" "}
        {code("onReply(body, status)")} would drop. The comment box does the same with{" "}
        {code("onComment(body, attachmentUrl)")}. A picture — a reply's, a rework's, a comment's — is drawn inline
        through the app's {code("fetcher")} ({code("FeedbackEntryFile")}), a tap opens it full size; any other file is
        a download. The Attachment section keeps the report's own files.
      </Note>
    </Example>
  );
}
