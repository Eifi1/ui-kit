import { useRef, useState } from "react";
import { Chip, FeedbackComposer, TopBarActionMenu, UserAvatar } from "@eifi1/ui-kit";
import type { FeedbackComposerHandle } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * The 0.13 follow-ups from keksdose: a header link that can close the account menu
 * (F7), and a support composer that canned-reply chips can write into, with a hint of
 * the caller's own (F9).
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

/** keksdose F7: the admin role chip in the account header links to the admin area. */
export function AccountHeaderLinkDemo() {
  const [log, setLog] = useState("—");
  return (
    <Example
      label="TopBarActionMenu — a link in the header that closes the menu"
      hint="header.extra takes (close) => ReactNode, like footer"
    >
      <div className="flex justify-end rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-2">
        <TopBarActionMenu
          ariaLabel="Account menu"
          triggerClassName="rounded-full"
          trigger={() => <UserAvatar name="Marcel Eifert" email="marcel@example.com" />}
          header={{
            title: "Marcel Eifert",
            subtitle: "marcel@example.com",
            extra: (close) => (
              <Chip
                size="xs"
                tone="info"
                href="/shell"
                renderLink={({ href, children, ...p }) => (
                  <a {...p} href={`#${href}`}>
                    {children}
                  </a>
                )}
                onClick={(event) => {
                  event.preventDefault();
                  setLog("admin chip → menu closed");
                  close();
                }}
              >
                Admin
              </Chip>
            ),
          }}
          entries={[{ key: "logout", label: "Log out", tone: "danger", onSelect: () => setLog("log out") }]}
          panelClassName="w-64"
        />
      </div>
      <Row className="mt-2">
        <span className={READOUT}>{log}</span>
      </Row>
      <Note>
        A router link does not unmount the menu, so a header link that is handed nothing
        leaves the panel open over the page it navigated to. The plain {code("ReactNode")}{" "}
        form still works for a chip that is only a label.
      </Note>
    </Example>
  );
}

const CANNED = [
  "Thanks for the report — ",
  "We can reproduce it; a fix is going out with the next release.",
  "Could you send a screenshot of the error?",
];

/** keksdose F9: canned replies for the support admin, and a hint naming the member. */
export function ComposerCannedRepliesDemo() {
  const composer = useRef<FeedbackComposerHandle>(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  return (
    <Example
      label="FeedbackComposer — canned replies and a custom placeholder"
      hint="ref.insertText(text) at the caret; value / onValueChange for a draft the host keeps"
    >
      <Row className="mb-2">
        {CANNED.map((text) => (
          <Chip key={text} size="sm" onClick={() => composer.current?.insertText(text)}>
            {text.length > 32 ? `${text.slice(0, 30)}…` : text.trim()}
          </Chip>
        ))}
      </Row>
      <FeedbackComposer
        ref={composer}
        placeholder="Reply to Jana…"
        value={draft}
        onValueChange={setDraft}
        onSend={(body) => {
          setSent((list) => [...list, body]);
          return new Promise((resolve) => setTimeout(resolve, 400));
        }}
      />
      <Row className="mt-2">
        <span className={READOUT}>draft: {JSON.stringify(draft)}</span>
        <span className={READOUT}>sent: {sent.length}</span>
      </Row>
      <Note>
        A chip inserts at the caret the box last had and replaces a selection — the
        selection survives the chip's click — then focuses the box after the text. The
        draft here is controlled; a resolved send still clears only what was sent,
        reaching the host as {code('onValueChange("")')}.
      </Note>
    </Example>
  );
}
