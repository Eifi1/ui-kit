import { useState } from "react";
import { MessagesSquare, Sparkles } from "lucide-react";
import {
  Chip,
  FeedbackContextBox,
  FeedbackMenu,
  ToggleGroup,
  feedbackContext,
  useFeedbackSubmit,
  type FeedbackCreatePayload,
  type TopBarMenuEntry,
} from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.27's submit side of feedback (docs/feedback-harmonization.md §4.1, §4.2): the top-bar
 * menu, the wired dialog, the context box and the screenshot capture — what keksdose,
 * kastlan and Kurvenschmiede each built around the kit's dialog, once. Synthetic data
 * only; nothing leaves the page.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const ADA = { id: 7, email: "ada@example.com", display_name: "Ada Example" };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let uploads = 0;
// Every link stays in the showcase; in an app they are /assistant, /support, /my-feedback
// and /feedback (the menu's defaults).
const HERE = "/feedback-compose";

export function FeedbackSubmit027Demo() {
  const [role, setRole] = useState<"user" | "admin">("user");
  const [outcome, setOutcome] = useState<"ok" | "fail">("ok");
  const [last, setLast] = useState<FeedbackCreatePayload | null>(null);
  const [attach, setAttach] = useState(true);

  const feedback = useFeedbackSubmit({
    // An app's authed client goes here; the demo hands back a made-up attachment URL.
    upload: async (file) => {
      await wait(300);
      const ext = file.name.split(".").pop() ?? "bin";
      return `/api/v1/feedback/attachments/${(++uploads).toString(16).padStart(12, "0")}.${ext}`;
    },
    create: async (payload) => {
      await wait(500);
      if (outcome === "fail") throw new Error("Demo: the server said no");
      setLast(payload);
      return { id: 412 };
    },
    user: ADA,
    environment: "local",
    version: "0.27.0",
  });

  // keksdose's extra rows, as an app passes them: the help assistant and the support chat
  // with its unread count.
  const extraEntries: TopBarMenuEntry[] = [
    { kind: "link", key: "assistant", to: HERE, icon: <Sparkles className="size-4" />, label: "Help assistant" },
    {
      kind: "link",
      key: "support",
      to: HERE,
      icon: <MessagesSquare className="size-4" />,
      label: "Support chat",
      trailing: (
        <Chip size="sm" variant="solid" tone="danger">
          2
        </Chip>
      ),
    },
  ];

  const here = typeof window === "undefined" ? "" : window.location.href;

  return (
    <>
      <Example
        label="FeedbackMenu + useFeedbackSubmit — the top-bar menu and the wired dialog"
        hint="pick a row; the report is not sent anywhere — its payload is printed below"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              aria-label="Signed in as"
              value={role}
              onChange={(v) => setRole(v as "user" | "admin")}
              options={[
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <ToggleGroup
              aria-label="The create call"
              value={outcome}
              onChange={(v) => setOutcome(v as "ok" | "fail")}
              options={[
                { value: "ok", label: "Succeeds" },
                { value: "fail", label: "Fails" },
              ]}
            />
          </div>
          {/* A stand-in for the app's top bar: the menu sits where the app puts it. */}
          <div className="flex items-center justify-end gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5">
            <span className="me-auto text-sm font-semibold text-[var(--text-primary)]">Example Ltd</span>
            <FeedbackMenu
              onFile={feedback.open}
              isAdmin={role === "admin"}
              extraEntries={extraEntries}
              myFeedbackHref={HERE}
              inboxHref="/feedback-inbox"
              iconBadge={{ label: "2 unread", tone: "danger" }}
            />
          </div>
          {feedback.dialog}
          {last && (
            <pre className="max-h-72 overflow-auto rounded-md bg-[var(--bg-surface-2)] p-3 text-xs text-[var(--text-secondary)]">
              {JSON.stringify(last, null, 2)}
            </pre>
          )}
          <Note>
            {code("<FeedbackMenu onFile={feedback.open} isAdmin={…} />")} draws §4.1: Bug · Idea · Question · Other,
            a rule, the app&apos;s {code("extraEntries")}, then one list link: {code("View feedback")} for an admin,{" "}
            {code("My feedback")} for everyone else — never a Crash row. {code("useFeedbackSubmit")} takes the
            app&apos;s {code("upload(file) → url")} and {code("create(payload)")} and owns the rest: multiple attachments
            (one screenshot + 5 files, images/PDF/text, 10 MB), the capture, the context box, uploads before the create,
            and every toast in the kit&apos;s words. Hand it {code("errorMessage")} to toast the server&apos;s{" "}
            {code("detail")} instead of the generic failure.
          </Note>
        </div>
      </Example>

      <Example
        label="FeedbackContextBox + feedbackContext() — what the box shows is what is sent"
        hint="untick the box: the URL is struck through, and url / route go empty"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FeedbackContextBox user={ADA} url={here} attachUrl={attach} onAttachUrlChange={setAttach} />
          <pre className="min-w-0 overflow-auto rounded-md bg-[var(--bg-surface-2)] p-3 text-xs text-[var(--text-secondary)]">
            {JSON.stringify(
              feedbackContext({ user: ADA, attachUrl: attach, url: here, environment: "local", version: "0.27.0" }),
              null,
              2,
            )}
          </pre>
        </div>
        <Note>
          One set of values feeds both, so the box cannot promise one thing while the report carries another.{" "}
          {code("origin")} and {code("environment")} are never withheld — which copy of the app is not personal, and
          triage asks it first.
        </Note>
      </Example>
    </>
  );
}
