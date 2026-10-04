import { Checkbox } from "../components/checkbox";
import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import type { FeedbackContext, FeedbackEnvironment } from "./feedback-record";

/**
 * The reporter context of a feedback report: the box the submit dialog shows, and the
 * `context` object `POST /feedback` sends (0.27.0, docs/feedback-harmonization.md §3.2,
 * §4.2). One file for both, so what the box SAYS will be sent and what IS sent cannot
 * drift apart.
 *
 * Each app had written both halves itself (keksdose `use-feedback-dialog.tsx:105` and
 * `:222`, kastlan `feedback-button.tsx:80`, Kurvenschmiede `use-feedback-dialog.tsx:124`),
 * and they had drifted: kastlan sent six keys with `user_email: null` and no version,
 * Kurvenschmiede a `page_path` column and a sentence where keksdose had a labelled box,
 * and only keksdose showed the full URL it was about to send.
 */

/* ── Who is filing ───────────────────────────────────────────────────────── */

/**
 * The person filing, as the app knows them. Snake case on purpose: keksdose's and
 * Kurvenschmiede's user objects already have this shape (`id`, `email`, `display_name`),
 * so they pass their `user` as it is; kastlan maps its token's `sub` and name parts.
 *
 * A SNAPSHOT for the report and the box. The server should overwrite the three `user_*`
 * keys from the session (§3.2; Kurvenschmiede does), so nobody can file in someone else's
 * name — this is what the reporter is SHOWN, not proof of who they are.
 */
export interface FeedbackSubmitter {
  id?: number | null;
  email?: string | null;
  display_name?: string | null;
}

/** "Ada Example (ada@example.com)", the name alone, the email alone, or "—" when the app
 *  knows neither (keksdose `use-feedback-dialog.tsx:228`). */
function submitterLine(user: FeedbackSubmitter | null | undefined): string {
  const name = user?.display_name?.trim();
  const email = user?.email?.trim();
  if (name && email) return `${name} (${email})`;
  return name || email || "—";
}

/* ── The object (§3.2) ───────────────────────────────────────────────────── */

/** What {@link feedbackContext} is built from. */
export interface FeedbackContextInput {
  /** The submitter, or `null` when signed out / unknown — the three `user_*` keys are then
   *  `null`, as keksdose sends them. */
  user?: FeedbackSubmitter | null;
  /** The box's "Attach current page URL" checkbox. `false` withholds `url` and `route`
   *  (both `""`); nothing else is withheld — `origin` says which copy of the app, which is
   *  not personal, and triage needs it first (keksdose `use-feedback-dialog.tsx:110`). */
  attachUrl: boolean;
  /** `location.href` when the dialog OPENED — the page the report is about, not the one
   *  the reporter may have navigated to while typing. */
  url: string;
  /** Its pathname. Default: read off `url` (a path-only `url` works too). */
  route?: string;
  /** Default `location.origin`. */
  origin?: string;
  /** `"prod"` / `"dev"` / `"local"` — the app's own reading (keksdose
   *  `app/deploy-environment.ts`). Left out of the object when not given. */
  environment?: FeedbackEnvironment | (string & {});
  /** The app build (`__APP_VERSION__`). Left out of the object when not given. */
  version?: string;
  /** Default `${innerWidth}x${innerHeight}` at the time of the call — "406x816". */
  viewport?: string;
  /** Default `navigator.userAgent`. */
  ua?: string;
}

/** The pathname of a full or path-only URL; `""` for something that is neither. */
function pathOf(url: string, base: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url, base || "http://localhost").pathname;
  } catch {
    return "";
  }
}

/**
 * The `context` object of `POST /feedback` (§3.2), keys in keksdose's order: `url`, `route`,
 * `origin`, `environment`, `user_id`, `user_email`, `user_display_name`, `viewport`, `ua`,
 * `version`.
 *
 * With `attachUrl: false`, `url` and `route` are `""` — present and empty, as keksdose
 * sends them, so a reader can tell "withheld" from "an old row without the key".
 * `environment` and `version` are omitted when the app passes none (kastlan had no
 * version), rather than sent as `undefined`.
 *
 * Reads `window` / `navigator` only for the defaults it was not given, so it is a pure
 * function in a test that passes everything.
 */
export function feedbackContext(input: FeedbackContextInput): FeedbackContext {
  const { user, attachUrl, url } = input;
  const win = typeof window === "undefined" ? undefined : window;
  const origin = input.origin ?? win?.location.origin ?? "";
  const context: FeedbackContext = {
    url: attachUrl ? url : "",
    route: attachUrl ? (input.route ?? pathOf(url, origin || win?.location.href)) : "",
    origin,
  };
  if (input.environment !== undefined) context.environment = input.environment;
  context.user_id = user?.id ?? null;
  context.user_email = user?.email ?? null;
  context.user_display_name = user?.display_name ?? null;
  context.viewport = input.viewport ?? (win ? `${win.innerWidth}x${win.innerHeight}` : "");
  context.ua = input.ua ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  if (input.version !== undefined) context.version = input.version;
  return context;
}

/* ── The box (§4.2) ──────────────────────────────────────────────────────── */

/**
 * `feedbackContext` — the context box's words. de-CH canon (keksdose `de-CH.json`):
 * `user` "Nutzer", `attachUrl` "Aktuelle Seiten-URL anhängen".
 */
export interface FeedbackContextLabels {
  /** The submitter line's label — the box draws "**User:** Ada Example (ada@example.com)".
   *  The colon is the box's, after the label. */
  user: string;
  /** The checkbox. The URL it is about is the line beneath it. */
  attachUrl: string;
}

export const DEFAULT_FEEDBACK_CONTEXT_LABELS: FeedbackContextLabels = {
  user: "User",
  attachUrl: "Attach current page URL",
};

export interface FeedbackContextBoxProps {
  /** Who is filing — the same value handed to {@link feedbackContext}. */
  user?: FeedbackSubmitter | null;
  /** The URL that goes with the report — the same `url` handed to {@link feedbackContext}. */
  url: string;
  /** The checkbox, on by default in the dialog (§4.2) — the same `attachUrl`. */
  attachUrl: boolean;
  onAttachUrlChange: (next: boolean) => void;
  /** Prop > `<UiKitProvider labels={{ feedbackContext }}>` > English. */
  labels?: Partial<FeedbackContextLabels>;
  className?: string;
}

/**
 * The submit dialog's context box — the dialog's `contextSlot` (keksdose
 * `use-feedback-dialog.tsx:222`, §4.2): who is filing, and the page URL with a checkbox to
 * leave it out, ON by default.
 *
 * The URL stays visible when the box is off, struck through: the reporter sees what they
 * withheld rather than a line that vanished, and ticking it back on is the same glance.
 * Kurvenschmiede's argument for the checkbox is why it exists at all (its feedback #101):
 * the route is right for a bug and wrong for an idea about a screen one is not on — filed
 * against whatever screen happened to be open, the queue reads as if it were about that
 * screen.
 *
 * Nothing in here is the app's: hand it the values handed to {@link feedbackContext}, and
 * what the box shows is what is sent.
 */
export function FeedbackContextBox({
  user,
  url,
  attachUrl,
  onAttachUrlChange,
  labels: labelsProp,
  className,
}: FeedbackContextBoxProps) {
  const labels = useKitLabels("feedbackContext", DEFAULT_FEEDBACK_CONTEXT_LABELS, labelsProp);
  return (
    <div
      className={cn(
        "space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2 text-xs text-[var(--text-muted)]",
        className,
      )}
    >
      <div className="[overflow-wrap:anywhere]">
        <span className="font-medium text-[var(--text-secondary)]">{labels.user}:</span> {submitterLine(user)}
      </div>
      <Checkbox
        checked={attachUrl}
        onCheckedChange={onAttachUrlChange}
        label={<span className="text-xs font-medium text-[var(--text-secondary)]">{labels.attachUrl}</span>}
        description={
          url ? (
            // `break-all`: a URL is one unbreakable word, and at 390px a long query string
            // would otherwise push the dialog sideways.
            <span
              data-withheld={attachUrl ? undefined : ""}
              className={cn("break-all text-xs", !attachUrl && "line-through opacity-60")}
            >
              {url}
            </span>
          ) : undefined
        }
      />
    </div>
  );
}
