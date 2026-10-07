import { useEffect, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Download } from "lucide-react";

import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { hasMessage } from "../components/choice-parts";
import { TextLink } from "../components/text-link";
import { Button, Card } from "../components/ui";
import { englishWait, isRateLimited, retryAfterSeconds } from "../auth/auth-errors";
import { CARD_DESCRIPTION_CLASS, settle, useMounted } from "./account-parts";
import { SettingsCardTitle } from "../settings/settings-heading";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string {@link DataExportSetting} renders — the `dataExport` namespace of
 *  `<UiKitProvider labels>`, overridable per instance through `labels`. */
export interface DataExportLabels {
  /** The card's title. */
  title: string;
  /** What the download is. The app's own sentence (`description`) follows it. */
  description: string;
  /** The button. */
  download: string;
  /** Said once the file was handed to the browser. */
  started: string;
  /** The link under it that saves the same file again, for a browser that held the
   *  download back. */
  saveAgain: string;
  /** The export was throttled — HTTP 429 (§6.5: once a minute) — given its
   *  `Retry-After` wait in seconds, or `undefined` without one. */
  rateLimited: (seconds?: number) => string;
  /** Any other failure. */
  failed: string;
}

export const DEFAULT_DATA_EXPORT_LABELS: DataExportLabels = {
  title: "Export your data",
  description: "Download a copy of your account’s data as a JSON file.",
  download: "Download my data",
  started: "Your download has started.",
  saveAgain: "Didn’t start? Save the file",
  rateLimited: (seconds) =>
    seconds && seconds > 0
      ? `You exported your data a moment ago. Try again in ${englishWait(seconds)}.`
      : "You exported your data a moment ago. Please try again in a minute.",
  failed: "The export failed. Please try again.",
};

/* ── Props ───────────────────────────────────────────────────────────────── */

/**
 * What {@link DataExportSettingProps.onExport} resolves with: the file itself — a `Blob`
 * (axios' `responseType: "blob"`, `await res.blob()`) — or a URL the browser fetches
 * itself (a signed link), with the file name to save it under.
 */
export type DataExportFile = Blob | { url: string; filename?: string };

export interface DataExportSettingProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /**
   * Fetch the export (`GET /auth/me/export`, §6.5). Resolve with the file — the card
   * saves it under `filename` — or reject with the client's error: a 429 (the export is
   * throttled to once a minute) says `rateLimited`, anything else (a demo account's 403)
   * goes through `describeError`, else `failed`.
   */
  onExport: () => Promise<DataExportFile>;
  /**
   * The app's sentence under the kit's — what the export holds and what it doesn't.
   * kastlan's: "Your account; your company's records are your company's, ask them."
   */
  description?: ReactNode;
  /** The name the file is saved under. Default `account-export-YYYY-MM-DD.json` (the
   *  local day); a `{ url, filename }` answer's own name wins. */
  filename?: string;
  /** The app's own words for a failure, or `undefined` for the kit's. Asked first. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: Partial<DataExportLabels>;
}

interface Saved {
  href: string;
  filename: string;
  /** An object URL of ours, revoked when it is replaced or the card goes. */
  owned: boolean;
}

/** `account-export-2026-10-07.json`, the local day — the one a person looks for. */
function defaultFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `account-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** A `{ url }` answer, as opposed to a Blob or anything else. */
function isUrlAnswer(value: unknown): value is { url: string; filename?: string } {
  return typeof value === "object" && value !== null && typeof (value as { url?: unknown }).url === "string";
}

/** Hand `href` to the browser as a download named `filename`: a link with `download`,
 *  clicked once and taken out again — the one way a page saves a file without a new
 *  tab that would show the JSON instead. */
function startDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * The account's data as a download (docs/user-admin-harmonization.md §6.5, §2.2): what it
 * is, the app's sentence on what it holds, and one button.
 *
 * **The kit saves the file.** `onExport` fetches it — the request is the app's, with its
 * auth (auth §8) — and resolves with a `Blob` or a `{ url }`; the card hands it to the
 * browser through a link with a `download` name, so it lands as `account-export-….json`
 * rather than opening as a page of JSON. A `Blob` becomes an object URL, revoked when
 * the next export replaces it or the card unmounts.
 *
 * The click comes after an `await`, which some browsers count as no longer the
 * person's: "Didn't start? Save the file" stays under the confirmation, a real link to
 * the same file that the person clicks themselves.
 *
 * **The throttle** (once a minute, §6.5) is a 429, said as such; the app's
 * `describeError` comes first (keksdose's demo account answers 403).
 */
export function DataExportSetting({
  onExport,
  description,
  filename,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: DataExportSettingProps) {
  const labels = useKitLabels("dataExport", DEFAULT_DATA_EXPORT_LABELS, labelsProp);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();

  // Our object URL lives as long as the "Save the file" link that points at it.
  useEffect(() => {
    if (!saved?.owned) return;
    const href = saved.href;
    return () => URL.revokeObjectURL(href);
  }, [saved]);

  const run = () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    // The last file's link goes (and its object URL with it): it would sit beside this
    // export's answer as if it were it.
    setSaved(null);
    settle(onExport).then(
      (answer) => {
        if (!mounted.current) return;
        setBusy(false);
        let next: Saved;
        if (answer instanceof Blob) {
          next = { href: URL.createObjectURL(answer), filename: filename ?? defaultFilename(), owned: true };
        } else if (isUrlAnswer(answer)) {
          next = { href: answer.url, filename: answer.filename ?? filename ?? defaultFilename(), owned: false };
        } else {
          // Nothing to save: an app that resolved with its response object, say.
          setFailure(labels.failed);
          return;
        }
        setSaved(next);
        startDownload(next.href, next.filename);
      },
      (error: unknown) => {
        if (!mounted.current) return;
        setBusy(false);
        const own = describeError?.(error);
        setFailure(
          hasMessage(own) ? own : isRateLimited(error) ? labels.rateLimited(retryAfterSeconds(error)) : labels.failed,
        );
      },
    );
  };

  return (
    <Card {...rest} className={cn("p-4 space-y-3", className)}>
      <div className="space-y-1">
        <SettingsCardTitle>{labels.title}</SettingsCardTitle>
        <div className={CARD_DESCRIPTION_CLASS}>{labels.description}</div>
        {hasMessage(description) && <div className={CARD_DESCRIPTION_CLASS}>{description}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="button" variant="secondary" pending={busy} onClick={run}>
          <Download aria-hidden className="size-4" />
          {labels.download}
        </Button>
        {/* Always in the tree, so the confirmation that appears in it is announced; in
            the button's row, so an empty one takes no line of its own. */}
        <span role="status" className="text-xs text-[var(--text-secondary)]">
          {saved && (
            <>
              {labels.started}{" "}
              <TextLink href={saved.href} download={saved.filename} reloadDocument tone="secondary">
                {labels.saveAgain}
              </TextLink>
            </>
          )}
        </span>
      </div>
      {hasMessage(failure) && (
        <AlertBanner tone="danger" size="sm" role="alert">
          {failure}
        </AlertBanner>
      )}
    </Card>
  );
}
