import { useState } from "react";
import { Button, Chip, FeedbackComposer, FeedbackThread } from "@eifi1/ui-kit";
import type { FeedbackThreadAttachment, FeedbackThreadItem } from "@eifi1/ui-kit";
import { Paperclip } from "lucide-react";
import { Example, Note, Row } from "../lib/section";

/**
 * The 0.14 follow-ups from keksdose G4/G5: its support chat on FeedbackThread +
 * FeedbackComposer — event lines, day lines and clock times in the thread; Enter to
 * send and files uploaded ahead of the send in the composer.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const NOW = new Date(2026, 8, 26, 14, 0).getTime();
const MAX_FILES = 3;

const SEED: FeedbackThreadItem[] = [
  {
    id: 1,
    author: "Jana Novak",
    createdAt: NOW - 3 * DAY,
    body: "The CSV export stops after the first 500 rows.",
  },
  {
    id: 2,
    author: "Marcel (support)",
    staff: true,
    createdAt: NOW - 3 * DAY + 40 * MINUTE,
    body: "Thanks — fixed in today's release. Please try again.",
  },
  { kind: "event", id: "e1", createdAt: NOW - 3 * DAY + 41 * MINUTE, body: "Marked as resolved" },
  { kind: "event", id: "e2", createdAt: NOW - DAY, body: "Closed automatically after 48 hours" },
  { id: 3, author: "Jana Novak", createdAt: NOW - 90 * MINUTE, body: "Still cut off for me, sorry!" },
  { kind: "event", id: "e3", createdAt: NOW - 89 * MINUTE, body: "Reopened by Jana" },
];

/** keksdose G4/G5: a support chat — event lines, day lines, clock times, Enter to send
 *  and several pre-uploaded files. */
export function Feedback014Demo() {
  const [items, setItems] = useState<FeedbackThreadItem[]>(SEED);
  const [files, setFiles] = useState<FeedbackThreadAttachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [next, setNext] = useState(1);

  const upload = () => {
    const name = `screenshot-${next}.png`;
    setNext((n) => n + 1);
    setUploading((n) => n + 1);
    // Stands in for the host's upload: the ref comes back later.
    setTimeout(() => {
      setUploading((n) => n - 1);
      setFiles((list) => [...list, { id: name, name, size: 84_000 + next * 1_000 }]);
    }, 700);
  };

  return (
    <Example
      label="FeedbackThread + FeedbackComposer — a support chat"
      hint='kind: "event", daySeparators, timeFormat="clock"; sendOn="enter", attachmentSlot, canSend'
    >
      <div className="rounded-md border border-[var(--border)] p-3">
        <FeedbackThread messages={items} now={NOW} daySeparators timeFormat="clock" redact={false} />
      </div>
      <FeedbackComposer
        className="mt-3"
        sendOn="enter"
        rows={2}
        placeholder="Reply to Jana…"
        attachmentSlot={
          <Row>
            <Button
              variant="ghost"
              size="sm"
              onClick={upload}
              disabled={files.length + uploading >= MAX_FILES}
            >
              <Paperclip className="size-4" aria-hidden />
              Attach
            </Button>
            {files.map((file) => (
              <Chip
                key={file.id}
                size="sm"
                onRemove={() => setFiles((list) => list.filter((f) => f.id !== file.id))}
              >
                {file.name}
              </Chip>
            ))}
            {uploading > 0 && <span className={READOUT}>uploading {uploading}…</span>}
          </Row>
        }
        // Files ready make an empty draft sendable; an upload in flight holds the send.
        canSend={uploading > 0 ? false : files.length > 0 ? true : undefined}
        onSend={(body) => {
          const sent = files;
          setItems((list) => [
            ...list,
            { id: `m${list.length}`, own: true, createdAt: NOW, body, attachments: sent },
          ]);
          return new Promise((resolve) => setTimeout(resolve, 300)).then(() => setFiles([]));
        }}
      />
      <Note>
        Event lines are list items without an author or a side, worded for whoever reads
        them. Day lines say {code("Today")} / {code("Yesterday")} in the kit locale via{" "}
        {code("Intl.RelativeTimeFormat")}, so the clock times under them need no date; the
        Tooltip still has it. In the box, Enter sends and Shift+Enter is a new line (not
        while an IME is composing). Up to {MAX_FILES} files upload ahead of the send; the
        host keeps their refs, reads them in {code("onSend")} and passes{" "}
        {code("canSend")} so a message of files alone can go.
      </Note>
    </Example>
  );
}
