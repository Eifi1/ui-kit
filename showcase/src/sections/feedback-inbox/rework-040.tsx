import { useCallback, useState } from "react";
import {
  FeedbackCommentThread,
  FeedbackMenu,
  FeedbackReplyTimeline,
  FeedbackRowDetail,
  FeedbackStatusBadge,
  ToggleGroup,
  UiKitProvider,
} from "@eifi1/ui-kit";
import { UI_KIT_LABELS_DE_CH } from "@eifi1/ui-kit/i18n/de-CH";
import type { FeedbackDetailUpdate, FeedbackRecord, FeedbackReply, FeedbackStatus } from "@eifi1/ui-kit";
import { Example, Note, code } from "../../lib/section";

/**
 * 0.40's feedback round (docs/feedback-harmonization.md §10): the REWORK status, a rework
 * as the author's entry in the timeline, and the menu's three list links by role. Every
 * row, name and text is synthetic; the "server" is this component's state.
 */

const ADMIN = 1;
const AUTHOR = 7;

type Viewer = "admin" | "author";

const HERE = typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`;

const SEED_REPLIES: FeedbackReply[] = [
  {
    id: 1,
    kind: "rework",
    author_name: "Ada",
    body: "Migrated from the body: the header was still cut off on the iPad.",
    status_to: null,
    status_from: null,
    created_at: "2026-10-02T08:30:00Z",
  },
  {
    id: 2,
    author_name: "Marcel Example",
    body: "Fixed the header's wrap; please check on the iPad.",
    status_to: "IN_EVALUATION",
    status_from: "IN_PROGRESS",
    created_at: "2026-10-05T10:00:00Z",
  },
  {
    id: 3,
    kind: "rework",
    author_name: "Ada",
    body: "Better, but the date still runs into the title.",
    attachment_url: "/api/v1/feedback/attachments/3f2a9c1b7d4e.png",
    status_to: "OPEN",
    status_from: "IN_EVALUATION",
    created_at: "2026-10-06T07:45:00Z",
  },
  {
    id: 4,
    author_name: "Marcel Example",
    body: "Sending this back to the loop: the date needs its own line below 400 px.",
    status_to: "REWORK",
    status_from: "OPEN",
    created_at: "2026-10-06T09:10:00Z",
  },
];

function seedRow(): FeedbackRecord {
  return {
    id: 421,
    user_id: AUTHOR,
    title: "Header cut off on the iPad",
    body: "The header's title is cut off in portrait on the iPad.",
    category: "BUG",
    status: "IN_EVALUATION",
    context: null,
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-01T09:12:00Z",
    updated_at: "2026-10-06T09:10:00Z",
    mine: true,
    replies: SEED_REPLIES.slice(0, 2),
  };
}

/** A stand-in for the attachment route: nothing is fetched, the request fails quietly. */
const noFetch = () => Promise.reject(new Error("showcase: no attachment server"));

function Rework({ viewer }: { viewer: Viewer }) {
  const [row, setRow] = useState(seedRow);
  const isAdmin = viewer === "admin";

  const update = useCallback<FeedbackDetailUpdate>((patch, { onSuccess }) => {
    setRow((prev) => ({ ...prev, ...(patch.status ? { status: patch.status } : null) }));
    onSuccess();
  }, []);

  const entry = (fields: Omit<FeedbackReply, "id" | "created_at">) =>
    setRow((prev) => ({
      ...prev,
      status: fields.status_to ?? prev.status,
      replies: [
        ...(prev.replies ?? []),
        { ...fields, id: (prev.replies?.length ?? 0) + 1, created_at: new Date().toISOString() },
      ],
    }));

  return (
    <FeedbackRowDetail
      row={row}
      canEdit={isAdmin}
      viewerId={isAdmin ? ADMIN : AUTHOR}
      onUpdate={update}
      fetcher={noFetch}
      onReply={async (body, status?: FeedbackStatus) =>
        entry({ author_name: "Marcel Example", body, status_to: status ?? null, status_from: status ? row.status : null })
      }
      // The author's rework lands OPEN (§10.2 decision 5): the triager releases it to REWORK.
      onRework={async (note) =>
        entry({ kind: "rework", author_name: "Ada", body: note, status_to: "OPEN", status_from: row.status })
      }
    />
  );
}

export function FeedbackRework040Demo() {
  const [viewer, setViewer] = useState<Viewer>("author");
  const [lang, setLang] = useState<"en" | "de-CH">("en");
  return (
    <Example
      label="Rework as the author's entry"
      hint="as the author, press Rework and send a note; as the admin, reply with the status Rework requested"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Viewer"
            value={viewer}
            onChange={(v) => setViewer(v as Viewer)}
            options={[
              { value: "author", label: "Author" },
              { value: "admin", label: "Admin" },
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
          <div className="flex flex-wrap items-center gap-2" data-showcase-rework-status="">
            <FeedbackStatusBadge status="READY" />
            <FeedbackStatusBadge status="REWORK" />
            <FeedbackStatusBadge status="IN_PROGRESS" />
          </div>
          <Rework key={viewer} viewer={viewer} />
          <FeedbackReplyTimeline replies={SEED_REPLIES} />
          <FeedbackCommentThread replies={SEED_REPLIES} comments={[]} isAdmin={false} isAuthor />
        </UiKitProvider>
      </div>
      <Note>
        {code("REWORK")} — "Rework requested", {code("RotateCcw")} in the danger tint — sits after READY; its next
        step is IN_PROGRESS. The author sends a report back with {code("onRework")} ({code("POST /feedback/{id}/rework")}
        ): an entry of its own, drawn as theirs with the Rework chip and "→ status"; a rework migrated out of the body
        has no status and no arrow. The admin has no Rework button where the reply composer stands: the composer
        offers Rework requested like every status. The thread below draws the same entries for the author
        ({code("isAuthor")}): at the reading end, with the file.
      </Note>
      <Note>Since 0.40.</Note>
    </Example>
  );
}

type Role = "admin" | "member" | "customer";

export function FeedbackMenu040Demo() {
  const [role, setRole] = useState<Role>("admin");
  const [publicParts, setPublicParts] = useState<"on" | "off">("on");
  const showsPublic = publicParts === "on" && role !== "customer";
  return (
    <Example label="FeedbackMenu by role" hint="open the menu: admin 3 list links, member 2; with public parts off, 2 and 1">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Signed in as"
            value={role}
            onChange={(v) => setRole(v as Role)}
            options={[
              { value: "admin", label: "Admin" },
              { value: "member", label: "Member" },
              { value: "customer", label: "Customer" },
            ]}
          />
          <ToggleGroup
            aria-label="Public parts"
            value={publicParts}
            onChange={(v) => setPublicParts(v as "on" | "off")}
            options={[
              { value: "on", label: "Public on" },
              { value: "off", label: "Public off" },
            ]}
          />
        </div>
        <div className="flex items-center justify-end gap-1 rounded-lg border border-subtle bg-surface px-3 py-1.5">
          <span className="me-auto text-sm font-semibold text-primary">Example Ltd</span>
          <FeedbackMenu
            onFile={() => {}}
            isAdmin={role === "admin"}
            myFeedbackHref={HERE}
            inboxHref={HERE}
            publicHref={showsPublic ? HERE : undefined}
          />
        </div>
      </div>
      <Note>
        Under the rule: <strong>Feedback discussion</strong> ({code("publicHref")}), <strong>My feedback</strong> for
        everyone, admins included, and <strong>Feedback inbox</strong> for an admin. Keys {code("all-feedback")},{" "}
        {code("my-feedback")}, {code("view-feedback")} and the routes are unchanged.
      </Note>
      <Note>Since 0.40.</Note>
    </Example>
  );
}
