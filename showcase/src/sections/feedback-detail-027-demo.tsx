import { useCallback, useMemo, useRef, useState } from "react";
import {
  FeedbackRowDetail,
  ToggleGroup,
  UiKitProvider,
  appendRework,
  useFeedbackStatusUndo,
  type AuthedFetcher,
  type FeedbackDetailUpdate,
  type FeedbackRecord,
  type UiKitLabelOverrides,
} from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.27's row detail (docs/feedback-harmonization.md §4.4): the panel a feedback table
 * unfolds under a row, lifted from keksdose's `FeedbackRow`. The PATCH, the upload and
 * the authenticated GET are faked in memory here; every row and key is synthetic.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const ATT = "/api/v1/feedback/attachments";

/** A picture for a `.png` key — an SVG blob, which the image decodes as it would the
 *  server's bytes. The key's extension is what makes it a picture (§3.5). */
function picture(label: string, hue: number): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="hsl(${hue} 60% 85%)"/><text x="160" y="96" font-family="sans-serif" font-size="18" text-anchor="middle" fill="hsl(${hue} 50% 30%)">${label}</text></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

const KEYS = {
  shot: `${ATT}/000000000001.png`,
  // kastlan's key shape (§3.5): <uuid32>_<sha12>.<ext> — the kit matches [\w.-]+.
  log: `${ATT}/00000000000000000000000000000000_000000000002.txt`,
  rework: `${ATT}/000000000003.png`,
};

function seedRow(): FeedbackRecord {
  const body =
    appendRework(
      "The chart jumps to the top when I save a transaction.",
      "Still jumps when the list is filtered.",
      KEYS.rework,
      new Date("2026-10-03T08:30:00Z"),
    ) ?? "";
  return {
    id: 412,
    user_id: 7,
    user_email: "reporter@example.test",
    title: "Chart jumps on save",
    body,
    category: "BUG",
    status: "IN_EVALUATION",
    context: {
      url: "https://app.example.test/accounts?p=2&sort=date#chart",
      route: "/accounts",
      environment: "dev",
    },
    screenshot_url: KEYS.shot,
    attachment_urls: [KEYS.log],
    outcome: "The scroll position is kept now.",
    resolved_at: null,
    created_at: "2026-10-02T09:12:00Z",
    updated_at: "2026-10-03T08:30:00Z",
  };
}

// The de-CH canon of the namespaces the detail reads, as the i18n round will ship it —
// here only to show the provider taking over.
const DE_CH = {
  feedbackDetail: {
    body: "Was ist passiert?",
    edit: "Bearbeiten",
    editDescription: "Beschreibung bearbeiten",
    save: "Speichern",
    cancel: "Abbrechen",
    url: "URL",
    copyUrl: "URL kopieren",
    attachment: "Anhang",
    download: (name: string) => `${name} herunterladen`,
    downloadFailed: "Der Anhang konnte nicht heruntergeladen werden.",
    outcome: "Ergebnis",
    resolvedAt: (date: string) => `Erledigt am: ${date}`,
    outcomeAdd: "Ergebnis hinzufügen",
    outcomeUpdate: "Aktualisieren",
    outcomePlaceholder: "Was wurde umgesetzt, entschieden oder warum nicht.",
    rework: "Nacharbeit",
    openPage: "Seite öffnen",
    reworkTitle: "Zur Nacharbeit senden",
    reworkSend: "Nacharbeit senden",
    reworkPlaceholder: "Was muss noch angepasst werden? Neue Anforderungen oder Richtungswechsel.",
    reworkUploadFailed: "Die Datei konnte nicht hochgeladen werden. Die Nacharbeit wurde nicht gesendet.",
    status: "Status",
  },
  feedbackDialog: { bodyOptional: "Was ist passiert? (optional)" },
  feedbackStatus: {
    OPEN: "Offen",
    IN_PROGRESS: "In Bearbeitung",
    IN_EVALUATION: "Zur Prüfung",
    NEEDS_LIVE_TEST: "Live testen",
    POSTPONED: "Zurückgestellt",
    DONE: "Erledigt",
    WONT_DO: "Wird nicht umgesetzt",
  },
} as unknown as UiKitLabelOverrides;

type Viewer = "admin" | "author" | "other";

const VIEWERS: Record<Viewer, { canEdit: boolean; viewerId: number }> = {
  // The admin on /feedback (not the author of this row).
  admin: { canEdit: true, viewerId: 1 },
  // The author on /my-feedback.
  author: { canEdit: false, viewerId: 7 },
  // Anyone else — a read-only picture.
  other: { canEdit: false, viewerId: 99 },
};

function Detail({ viewer }: { viewer: Viewer }) {
  const [row, setRow] = useState(seedRow);
  // The "server": uploaded files by URL, so the fetcher can hand the bytes back.
  const files = useRef(new Map<string, Blob>());
  const counter = useRef(10);

  // Stands in for the page's TanStack mutation: the PATCH "lands" at once, and a rework
  // append on an answered row reopens it, as the server does (§3.4).
  const update = useCallback<FeedbackDetailUpdate>((patch, { onSuccess }) => {
    setRow((prev) => {
      const next = { ...prev, updated_at: new Date().toISOString() };
      if (patch.body !== undefined) {
        const append = patch.body.startsWith(prev.body) && patch.body.length > prev.body.length;
        next.body = patch.body;
        if (append && prev.status !== "OPEN" && prev.status !== "IN_PROGRESS") {
          next.status = "OPEN";
          next.resolved_at = null;
        }
      }
      if (patch.outcome !== undefined) next.outcome = patch.outcome;
      if (patch.status !== undefined) {
        const settled = patch.status === "DONE" || patch.status === "WONT_DO";
        const was = prev.status === "DONE" || prev.status === "WONT_DO";
        next.status = patch.status;
        next.resolved_at = settled ? (was ? prev.resolved_at : new Date().toISOString()) : null;
      }
      return next;
    });
    onSuccess();
  }, []);
  const statusChange = useFeedbackStatusUndo(update);

  const fetcher = useMemo<AuthedFetcher>(
    () => async (url) => {
      const uploaded = files.current.get(url);
      if (uploaded) return uploaded;
      if (url === KEYS.shot) return picture("Screenshot", 210);
      if (url === KEYS.rework) return picture("Rework picture", 30);
      if (url === KEYS.log) return new Blob(["synthetic log\n"], { type: "text/plain" });
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

  return (
    <div className="space-y-3">
      <FeedbackRowDetail
        row={row}
        canEdit={VIEWERS[viewer].canEdit}
        viewerId={VIEWERS[viewer].viewerId}
        onUpdate={update}
        statusChange={statusChange}
        onUpload={onUpload}
        fetcher={fetcher}
      />
      <button
        type="button"
        className="text-xs text-[var(--text-muted)] underline"
        onClick={() => setRow(seedRow())}
      >
        Reset the row
      </button>
    </div>
  );
}

export function FeedbackDetail027Demo() {
  const [lang, setLang] = useState<"en" | "de-CH">("en");
  const [viewer, setViewer] = useState<Viewer>("admin");
  return (
    <Example
      label="The row detail"
      hint="switch who is looking — the admin edits outcome and status, the author sends it back for rework"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Viewer"
            value={viewer}
            onChange={(v) => setViewer(v as Viewer)}
            options={[
              { value: "admin", label: "Admin, /feedback" },
              { value: "author", label: "Author, /my-feedback" },
              { value: "other", label: "Someone else" },
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
        <UiKitProvider labels={lang === "de-CH" ? DE_CH : undefined}>
          {/* Keyed by the viewer: a different person is a different panel. */}
          <Detail key={viewer} viewer={viewer} />
        </UiKitProvider>
      </div>
      <Note>
        {code("FeedbackRowDetail")} is what {code("DataTable")}'s {code("expandedRow")} renders: the row, {code("canEdit")}{" "}
        (admin on {code("/feedback")}), {code("viewerId")}, the page's {code("update.mutate")} as {code("onUpdate")}, the
        upload, the authed {code("fetcher")} and {code("useFeedbackStatusUndo")}'s change. The author's Edit holds the
        original text only — the rework rounds and file lines go back unchanged. Rework needs a note, takes one file
        (uploaded first) and PATCHes the body alone; the server reopens the row. Send a rework as the author: the row goes
        back to Open, and the Edit button appears.
      </Note>
    </Example>
  );
}
