import { useEffect, useRef, useState } from "react";
import {
  Button,
  FeedbackAttachmentField,
  PasskeysSetting,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@eifi1/ui-kit";
import type { PasskeyItem } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.16.0, keksdose's harmonisation sweep: the multiple attachment field keeps two adds
 * made in one tick and titles the screenshot chip; PasskeysSetting hands back the app's
 * own id type and takes id / data-* / rowProps; every Table part takes a `ref`.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

/** A real image for the screenshot slot, drawn in the page's brand colour. */
function useScreenshot(): File | null {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    ctx.fillStyle = css.getPropertyValue("--bg-surface-2").trim() || "gray";
    ctx.fillRect(0, 0, 160, 100);
    ctx.fillStyle = css.getPropertyValue("--brand").trim() || "black";
    ctx.fillRect(12, 12, 136, 16);
    ctx.fillRect(12, 40, 80, 48);
    canvas.toBlob((blob) => {
      if (blob) setFile(new File([blob], "screenshot.webp", { type: blob.type || "image/webp" }));
    }, "image/webp");
  }, []);
  return file;
}

/** Two image pastes delivered back to back, before React re-renders between them. */
function pasteTwice(target: EventTarget, image: File) {
  for (let i = 0; i < 2; i++) {
    const data = new DataTransfer();
    data.items.add(new File([image], "image.png", { type: image.type }));
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }
}

export function FeedbackAttachment016Demo() {
  const shot = useScreenshot();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const pasteRoot = useRef<HTMLDivElement>(null);
  // The demo's screenshot arrives once the canvas is encoded; seed the slot with it.
  const [seeded, setSeeded] = useState(false);
  if (shot && !seeded) {
    setSeeded(true);
    setScreenshot(shot);
  }

  return (
    <Example
      label="FeedbackAttachmentField multiple — screenshot chip and two adds in one tick"
      hint="attachmentScreenshot; attachmentList is the dialog's heading"
    >
      <div ref={pasteRoot} className="max-w-md">
        <FeedbackAttachmentField
          multiple
          value={files}
          onChange={setFiles}
          pasteFrom={pasteRoot}
          screenshot={screenshot}
          onScreenshotChange={setScreenshot}
          onCaptureScreenshot={async () => shot}
          labels={{ attachment: "Attachments" }}
        />
      </div>
      <Row>
        <Button
          variant="secondary"
          size="sm"
          disabled={!shot}
          onClick={() => shot && pasteRoot.current && pasteTwice(pasteRoot.current, shot)}
        >
          Paste two images at once
        </Button>
        <span className={READOUT}>value: [{files.map((f) => f.name).join(", ")}]</span>
      </Row>
      <Note>
        The screenshot slot's chip says {code("Screenshot")} (the {code("attachmentScreenshot")}{" "}
        label) with the file name beneath it. Two pastes in one tick both land — the field
        builds on what it already handed to {code("onChange")}, not on a {code("value")} the
        parent has not re-rendered yet. {code("<FeedbackDialog attachments=\"multiple\">")}{" "}
        heads the list with {code("attachmentList")}; {code("feedbackDialog.attachments")} is a
        deprecated alias.
      </Note>
    </Example>
  );
}

const NOW = Date.now();
const DAY = 86_400_000;
const KEYS: PasskeyItem<number>[] = [
  { id: 101, name: "MacBook Touch ID", createdAt: NOW - 90 * DAY, lastUsedAt: NOW - DAY },
  { id: 102, name: "Pixel 8", createdAt: NOW - 12 * DAY, lastUsedAt: null },
];

export function Passkeys016Demo() {
  const [items, setItems] = useState(KEYS);
  const [log, setLog] = useState("—");
  return (
    <Example label="PasskeysSetting — numeric ids, id, data-* and rowProps" hint="PasskeyItem<number>; rowProps">
      <div className="max-w-md">
        <PasskeysSetting
          id="passkeys"
          data-section="security"
          passkeys={items}
          onAdd={() => {}}
          // `id` is a number here — inferred from `passkeys`, no cast.
          onRename={(id, name) => {
            setLog(`onRename(${id} /* ${typeof id} */, "${name}")`);
            setItems((list) => list.map((k) => (k.id === id ? { ...k, name } : k)));
          }}
          onDelete={(id) => {
            setLog(`onDelete(${id} /* ${typeof id} */)`);
            setItems((list) => list.filter((k) => k.id !== id));
          }}
          rowProps={(item) => ({ id: `passkey-${item.id}` })}
        />
      </div>
      <div className={READOUT}>{log}</div>
      <Note>
        {code("PasskeysSetting")} infers its id type from {code("passkeys")}: numeric ids come
        back to {code("onRename")} / {code("onDelete")} as numbers. {code("id")} and{" "}
        {code("data-*")} land on the card; {code("rowProps")} gives each row's {code("<li>")}{" "}
        an id (here {code("#passkey-101")}), and every row carries {code("data-passkey-id")}.
      </Note>
    </Example>
  );
}

const LINES = ["Rent", "Utilities", "Groceries", "Transport", "Insurance", "Phone", "Leisure", "Savings"];

export function TableRefs016Demo() {
  const rows = useRef(new Map<string, HTMLTableRowElement>());
  const [current, setCurrent] = useState<string | null>(null);
  const jump = (line: string) => {
    setCurrent(line);
    rows.current.get(line)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  return (
    <Example label="Table parts take a ref" hint="<TableRow ref>, <TableCell ref>, <Table ref>">
      <Row>
        <Button variant="secondary" size="sm" onClick={() => jump("Savings")}>
          Scroll to Savings
        </Button>
        <Button variant="secondary" size="sm" onClick={() => jump("Rent")}>
          Scroll to Rent
        </Button>
      </Row>
      <div className="max-h-40 overflow-y-auto rounded-md border border-[var(--border)]">
        <Table aria-label="Budget lines">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Line</TableHeaderCell>
              <TableHeaderCell numeric>Budget</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {LINES.map((line, i) => (
              <TableRow
                key={line}
                ref={(el) => {
                  if (el) rows.current.set(line, el);
                  else rows.current.delete(line);
                }}
                className={line === current ? "bg-[var(--bg-active)]" : undefined}
              >
                <TableCell>{line}</TableCell>
                <TableCell numeric>{(i + 1) * 120}.00</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Note>
        Every Table part forwards {code("ref")} to its element (React 19's ref-as-a-prop),
        so a row can be scrolled into view without {code("useId")} +{" "}
        {code("getElementById")}.
      </Note>
    </Example>
  );
}
