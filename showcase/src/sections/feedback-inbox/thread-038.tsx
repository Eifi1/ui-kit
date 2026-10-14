import { useCallback, useState } from "react";
import {
  FeedbackCommentThread,
  FeedbackReplyComposer,
  FeedbackReplyTimeline,
  FeedbackRowDetail,
  FeedbackVoteButton,
  ToggleGroup,
  UiKitProvider,
  feedbackReplyNudge,
} from "@eifi1/ui-kit";
import { UI_KIT_LABELS_DE_CH } from "@eifi1/ui-kit/i18n/de-CH";
import type {
  FeedbackComment,
  FeedbackDetailUpdate,
  FeedbackRecord,
  FeedbackReply,
  FeedbackStatus,
} from "@eifi1/ui-kit";
import { Example, Note, code } from "../../lib/section";

/**
 * 0.38's thread parts (docs/feedback-harmonization.md §9.6–§9.8): the vote, the replies'
 * timeline and composer, the comment thread, and the row detail that carries them. Every
 * row, name and text is synthetic; the "server" is this component's state.
 */

const ADMIN = 1;
const AUTHOR = 7;
const OTHER = 42;

type Viewer = "admin" | "author" | "other";

const VIEWER_ID: Record<Viewer, number> = { admin: ADMIN, author: AUTHOR, other: OTHER };

function seedRow(): FeedbackRecord {
  return {
    id: 418,
    user_id: AUTHOR,
    title: "Export as CSV",
    body: "I would like to export the transactions list as CSV.",
    category: "IDEA",
    status: "DONE",
    context: null,
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: "2026-10-12T09:00:00Z",
    created_at: "2026-10-08T09:12:00Z",
    updated_at: "2026-10-12T09:00:00Z",
    public: true,
    filed_private: false,
    votes: 4,
    voted: false,
    comment_count: 3,
    replies: [
      {
        id: 1,
        author_name: null,
        body: "Thanks, noted for the next round.",
        status_to: "READY",
        status_from: "OPEN",
        created_at: "2026-10-09T08:00:00Z",
      },
    ],
  };
}

function seedComments(): FeedbackComment[] {
  return [
    {
      id: 1,
      author_name: "Anna",
      mine: false,
      staff: false,
      body: "Same here, for the tax return.",
      hidden: false,
      created_at: "2026-10-08T15:00:00Z",
    },
    {
      id: 2,
      author_name: null,
      mine: false,
      staff: false,
      body: "Buy cheap watches at …",
      hidden: true,
      created_at: "2026-10-10T07:00:00Z",
    },
  ];
}

/** The server's view of a comment for a viewer (§9.8): a hidden body only for its writer
 *  and an admin; `mine` by writer. */
function forViewer(comments: (FeedbackComment & { by: number })[], viewer: Viewer): FeedbackComment[] {
  const id = VIEWER_ID[viewer];
  return comments.map(({ by, ...comment }) => ({
    ...comment,
    mine: by === id,
    body: comment.hidden && by !== id && viewer !== "admin" ? null : comment.body,
  }));
}

function Thread({ viewer }: { viewer: Viewer }) {
  const [row, setRow] = useState(seedRow);
  const [comments, setComments] = useState(() => seedComments().map((c) => ({ ...c, by: 100 + c.id })));
  const isAdmin = viewer === "admin";
  const viewerId = VIEWER_ID[viewer];

  const update = useCallback<FeedbackDetailUpdate>((patch, { onSuccess }) => {
    setRow((prev) => ({ ...prev, ...(patch.status ? { status: patch.status } : null) }));
    onSuccess();
  }, []);

  const reply = async (body: string, status?: FeedbackStatus) => {
    setRow((prev) => {
      const next: FeedbackReply = {
        id: (prev.replies?.length ?? 0) + 1,
        author_name: "Marcel Example",
        body,
        status_to: status ?? null,
        status_from: status ? prev.status : null,
        created_at: new Date().toISOString(),
      };
      return { ...prev, status: status ?? prev.status, replies: [...(prev.replies ?? []), next] };
    });
  };

  const thread = (
    <FeedbackCommentThread
      replies={row.replies ?? []}
      comments={forViewer(comments, viewer)}
      isAdmin={isAdmin}
      onComment={async (body) =>
        setComments((prev) => [
          ...prev,
          {
            id: prev.length + 10,
            author_name: null,
            mine: true,
            staff: false,
            body,
            hidden: false,
            created_at: new Date().toISOString(),
            by: viewerId,
          },
        ])
      }
      onHide={(comment, hidden) =>
        setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, hidden } : c)))
      }
      onDelete={(comment) => setComments((prev) => prev.filter((c) => c.id !== comment.id))}
    />
  );

  return (
    <div className="space-y-3">
      <FeedbackVoteButton
        votes={row.votes ?? 0}
        voted={row.voted ?? false}
        own={viewerId === row.user_id}
        onVote={async (next) => {
          const state = { votes: (row.votes ?? 0) + (next ? 1 : -1), voted: next };
          setRow((prev) => ({ ...prev, ...state }));
          return state;
        }}
      />
      <FeedbackRowDetail
        row={row}
        canEdit={isAdmin}
        viewerId={viewerId}
        onUpdate={update}
        onReply={reply}
        comments={thread}
        onPublicChange={(next) => setRow((prev) => ({ ...prev, public: next }))}
      />
    </div>
  );
}

export function FeedbackThread038Demo() {
  const [viewer, setViewer] = useState<Viewer>("admin");
  const [lang, setLang] = useState<"en" | "de-CH">("en");
  return (
    <Example
      label="Replies, comments and the vote"
      hint="the row is DONE without a reply that says so: the admin sees the nudge; switch who is looking"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Viewer"
            value={viewer}
            onChange={(v) => setViewer(v as Viewer)}
            options={[
              { value: "admin", label: "Admin" },
              { value: "author", label: "Author" },
              { value: "other", label: "Another user" },
            ]}
          />
          <ToggleGroup
            aria-label="Language"
            value={lang}
            onChange={(v) => setLang(v as "en" | "de-CH")}
            options={[
              { value: "en", label: "English" },
              { value: "de-CH", label: "Deutsch (CH)" },
            ]}
          />
        </div>
        <UiKitProvider labels={lang === "de-CH" ? UI_KIT_LABELS_DE_CH : undefined}>
          <Thread key={viewer} viewer={viewer} />
        </UiKitProvider>
      </div>
      <Note>
        {code("FeedbackRowDetail")} takes {code("onReply")}: the replies' timeline replaces the Outcome section, and the
        admin writes the next reply with the status beside it. {code("comments")} is the app's{" "}
        {code("FeedbackCommentThread")}: replies as staff posts, comments as rows, Hide / Unhide for the admin, Delete
        for the writer. {code("FeedbackVoteButton")} is optimistic and rolls back on a failure; on one's own report it
        is pressed and says why it is disabled.
      </Note>
      <Note>Since 0.38.</Note>
    </Example>
  );
}

/** The two reply parts on their own: the timeline, and the composer with a nudge. */
export function FeedbackReplies038Demo() {
  const [replies, setReplies] = useState<FeedbackReply[]>([
    { id: 1, author_name: null, body: "Migrated outcome: fixed in 0.4.27.", status_to: null, created_at: "2026-10-01T10:00:00Z" },
  ]);
  const [status, setStatus] = useState<FeedbackStatus>("WONT_DO");
  return (
    <Example label="The timeline and the reply composer" hint="a reply with the suggested status clears the nudge">
      <div className="space-y-4">
        <FeedbackReplyTimeline replies={replies} />
        <FeedbackReplyComposer
          status={status}
          suggestedStatus={feedbackReplyNudge({ status, replies })}
          onReply={async (body, next) => {
            setReplies((prev) => [
              ...prev,
              { id: prev.length + 1, author_name: "Marcel", body, status_to: next ?? null, created_at: new Date().toISOString() },
            ]);
            if (next) setStatus(next);
          }}
        />
      </div>
      <Note>Since 0.38.</Note>
    </Example>
  );
}
