import { Suspense, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "../components/toast";
import { lazyWithFallback } from "../lib/lazy-with-fallback";
// Types only, gone from the built module: the dialog's modules load with the dialog.
import type { FeedbackSubmitter } from "./feedback-context";
import type { FeedbackSubmitDialogProps } from "./feedback-submit-dialog";
import type { FeedbackMultipleSubmission } from "./feedback-dialog";
import { useFeedbackToastLabels } from "./feedback-labels";
import { FEEDBACK_PICKABLE_CATEGORIES, type FeedbackContext, type FeedbackEnvironment } from "./feedback-record";
import type { FeedbackCategory } from "./feedback-vocabulary";

/**
 * The dialog, loaded when it is first opened rather than with the top bar that mounts the
 * hook (0.34, MOD-1 of the refactor audit 2026-10; see feedback-submit-dialog.tsx). A
 * LITERAL relative `import()`, as the catalogue loaders are (i18n/languages.ts): the
 * library build keeps the module its own (`bundle: false`), and a path an app's bundler
 * can read is a chunk it can split off.
 *
 * A fetch that fails — a tab left open across a deploy, offline — closes the dialog
 * rather than throwing (0.52 code review, tour.tsx): the hook lives in the top bar, above
 * the routes' error boundaries, so the rejected import took the whole shell down. The
 * next open fetches again.
 */
const LazySubmitDialog = lazyWithFallback(
  () => import("./feedback-submit-dialog").then((module) => module.FeedbackSubmitDialog),
  SubmitDialogUnavailable,
);

function SubmitDialogUnavailable({ onClose }: FeedbackSubmitDialogProps) {
  useLayoutEffect(onClose, [onClose]);
  return null;
}

/**
 * `FeedbackCreate` — the body of `POST /feedback` (keksdose `schemas/feedback.py:25`, §3.4
 * of docs/feedback-harmonization.md), as {@link useFeedbackSubmit} hands it to the app's
 * `create`.
 */
export interface FeedbackCreatePayload {
  /** Trimmed; never blank (the dialog will not send a subject of spaces). */
  title: string;
  /** `""` when the reporter wrote nothing or only whitespace — the server stores `""`. */
  body: string;
  /** Never `CRASH` — the server answers that with a 422 (§3.4). */
  category: FeedbackCategory;
  /** §3.2, built by `feedbackContext` from what the context box showed. */
  context: FeedbackContext;
  /** The captured screenshot's upload URL, or `null`. */
  screenshot_url: string | null;
  /** The picked and pasted files' upload URLs, in the order they were added — `[]` when
   *  none, as keksdose sends it. At most 5. */
  attachment_urls: string[];
}

export interface UseFeedbackSubmitOptions<R = unknown> {
  /**
   * `POST /feedback/attachments` for ONE file → its URL (§3.3) — the app's authed client.
   * Every file goes up BEFORE the report is created, so a row never names a file that did
   * not arrive (keksdose `use-feedback-dialog.tsx:89`); if any upload rejects, nothing is
   * created and the failure toast says so.
   */
  upload: (file: File) => Promise<string>;
  /** `POST /feedback` with the payload. Whatever it resolves with reaches `onSubmitted`. */
  create: (payload: FeedbackCreatePayload) => Promise<R>;
  /** Who is filing — shown in the context box and sent in `context.user_*`. */
  user?: FeedbackSubmitter | null;
  /** `context.environment` — the app's own reading of which copy it is (keksdose
   *  `deployEnvironment()`). */
  environment?: FeedbackEnvironment | (string & {});
  /** `context.version` — the app build (`__APP_VERSION__`). */
  version?: string;
  /** The report was filed: after the "Thanks for the feedback!" toast and the close. The
   *  place to invalidate the app's feedback queries. */
  onSubmitted?: (result: R) => void;
  /**
   * The failure toast's text from what `upload` or `create` rejected with — the app's own
   * `extractApiErrorMessage(err, fallback)` (keksdose) / `apiErrorMessage` (Kurvenschmiede),
   * so the server's `detail` wins (§3.7: a 413, a 415, keksdose's demo-session 403). Without
   * it every failure says `feedbackToast.submitFailed`.
   */
  errorMessage?: (error: unknown, fallback: string) => string;
  /**
   * The "Capture screenshot" button's capture. Default {@link captureAppScreenshot} of
   * `#root`; another root is `() => captureAppScreenshot({ rootId: "app" })`. `false`
   * hides the button — for an app that does not install the optional peer
   * `modern-screenshot`. A rejection becomes the `captureFailed` toast.
   */
  capture?: false | (() => Promise<File | null>);
  /**
   * The app's reports are public (0.38, docs/feedback-harmonization.md §9.2 decision 6):
   * `true` shows **"Other users will see the title and text (never your screenshots or
   * files)"** (`feedbackDialog.publicNotice`) under the body. keksdose and Kurvenschmiede
   * pass it — for a viewer who passes the app's `public_viewer` — and kastlan, whose
   * public parts are off, does not. Default `false`.
   */
  publicNotice?: boolean;
}

export interface FeedbackSubmit {
  /**
   * Open the dialog on `category` — a `FeedbackMenu` row's (§4.2: "default category when
   * opened from a row: that row's"). Without one, or with `CRASH` (never pickable), it
   * opens on `OTHER`, the server's own default (§3.4). Each open starts a fresh form,
   * reads `location.href` for the context box and ticks "Attach current page URL" again.
   */
  open: (category?: FeedbackCategory) => void;
  /** Close it, as Cancel does. */
  close: () => void;
  /**
   * The dialog — render it once, anywhere (it portals). `null` while closed. Since 0.34
   * its module loads when it is first opened (MOD-1), so it appears a moment after
   * `open`: a test finds it with `await screen.findBy…`, not `getBy…`.
   */
  dialog: ReactNode;
}

/**
 * The feedback submit dialog, wired (0.27.0, docs/feedback-harmonization.md §4.2): the
 * one call that replaces keksdose's `use-feedback-dialog.tsx`, kastlan's `FeedbackButton`
 * and Kurvenschmiede's `use-feedback-dialog.tsx`.
 *
 * ```tsx
 * const feedback = useFeedbackSubmit({
 *   upload: (file) => feedbackApi.uploadAttachment(file),
 *   create: (payload) => feedbackApi.create(payload),
 *   user, environment: deployEnvironment(), version: __APP_VERSION__,
 *   errorMessage: extractApiErrorMessage,
 *   onSubmitted: () => qc.invalidateQueries({ queryKey: queryKeys.feedback.all }),
 * });
 * <FeedbackMenu onFile={feedback.open} isAdmin={user?.role === "ADMIN"} />
 * {feedback.dialog}
 * ```
 *
 * What it settles, so no app restates it:
 *
 * - `FeedbackDialog` in `attachments="multiple"` with `requireBody={false}` (§7.4): a
 *   subject alone is a report. One captured screenshot in its own slot plus up to 5
 *   picked or pasted files, `FEEDBACK_ATTACHMENT_ACCEPT` (images, PDF, text), 10 MB each.
 * - The pickable categories — Bug, Idea, Question, Other, in the kit's words. `CRASH` is
 *   filed by the error boundary and is never offered (keksdose feedback #160).
 * - The context box, built from the same values as the `context` it sends
 *   ({@link FeedbackContextBox} / `feedbackContext`), the URL read when the dialog OPENS.
 * - Upload every file, then create (keksdose `use-feedback-dialog.tsx:89`): the
 *   screenshot to `screenshot_url`, the rest to `attachment_urls`, all in parallel.
 * - The toasts, from `feedbackToast`: filed, failed (the server's `detail` through
 *   `errorMessage`), a refused file's type, size or count, a failed capture.
 *
 * What stays the app's: the API client, the user, the environment and version, and what
 * to refresh afterwards. No TanStack in here — `create` is a plain promise, so the hook
 * runs in any app; the app's mutation, if it wants one, lives inside `create`.
 *
 * A failure keeps the dialog open with the draft, as keksdose's did. A dialog closed and
 * opened again while a send is still running is NOT closed by that send's success — the
 * new draft is somebody's next report.
 */
export function useFeedbackSubmit<R = unknown>(options: UseFeedbackSubmitOptions<R>): FeedbackSubmit {
  const { upload, create, user, environment, version, onSubmitted, errorMessage, capture, publicNotice } = options;
  const toastText = useFeedbackToastLabels();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("OTHER");
  const [url, setUrl] = useState("");
  const [attachUrl, setAttachUrl] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Which opening a send belongs to — see "closed and opened again" above.
  const opening = useRef(0);
  const inFlight = useRef(false);

  const open = (next?: FeedbackCategory) => {
    opening.current += 1;
    setCategory(next && FEEDBACK_PICKABLE_CATEGORIES.includes(next) ? next : "OTHER");
    setUrl(typeof window === "undefined" ? "" : window.location.href);
    // Fresh every time (Kurvenschmiede use-feedback-dialog.tsx:80): a reporter who left the
    // page out of one idea is not saying the bug report after it is unrelated too.
    setAttachUrl(true);
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  // `context` comes from the dialog, built off the values its context box shows.
  const submit = async (data: FeedbackMultipleSubmission<FeedbackCategory>, context: FeedbackContext) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    const from = opening.current;
    let result: R;
    try {
      const [screenshot_url, attachment_urls] = await Promise.all([
        data.screenshot ? upload(data.screenshot) : Promise.resolve(null),
        Promise.all(data.attachments.map((file) => upload(file))),
      ]);
      result = await create({
        title: data.title.trim(),
        body: data.body.trim() ? data.body : "",
        category: data.category,
        context,
        screenshot_url,
        attachment_urls,
      });
    } catch (error) {
      toast.error(errorMessage ? errorMessage(error, toastText.submitFailed) : toastText.submitFailed);
      return;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
    toast.success(toastText.submitted);
    if (opening.current === from) setIsOpen(false);
    onSubmitted?.(result);
  };

  // Nothing is drawn while the dialog's module is on its way — a few milliseconds, once per
  // page load; a spinner would only flash. A load that fails (a deploy replaced the chunk,
  // offline) closes the dialog (`SubmitDialogUnavailable`): the hook sits in the top bar,
  // above the routes' error boundaries, where a thrown chunk error took the shell down.
  const dialog = isOpen ? (
    <Suspense fallback={null}>
      <LazySubmitDialog
        onClose={close}
        category={category}
        onCategoryChange={setCategory}
        submitting={submitting}
        onSubmit={submit}
        user={user}
        url={url}
        attachUrl={attachUrl}
        onAttachUrlChange={setAttachUrl}
        environment={environment}
        version={version}
        capture={capture}
        publicNotice={publicNotice}
      />
    </Suspense>
  ) : null;

  return { open, close, dialog };
}
