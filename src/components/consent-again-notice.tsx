import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { AlertBanner } from "./alert-banner";
import { Button } from "./button";
import { Card, CardTitle } from "./card";
import { Disclosure } from "./disclosure";
import type { CommitScope } from "./write-lock";
import { DEFAULT_CONSENT_AGAIN_LABELS, type ConsentAgainLabels } from "./consent-again-notice-labels";

export { DEFAULT_CONSENT_AGAIN_LABELS };
export type { ConsentAgainLabels };

interface ConsentAgainNoticeBase {
  /** What changed, as a headline: "Price sharing has changed — please agree again". */
  title: ReactNode;
  /** What holds until the answer — what stops, what goes on. */
  intro: ReactNode;
  /** The "what's new" list, one entry per change, in the reader's terms. */
  changes: readonly ReactNode[];
  /** Agree is busy: the consent is on its way to the server. */
  agreePending?: boolean;
  /**
   * Agree commits — under a locked `WriteLockProvider` it is disabled with the lock's
   * reason, as every committing button is. Default `true`: an answer the server keeps is a
   * write, and the demo, a lapsed plan or an offline device refuse it (keksdose's price
   * pool). `false` for a consent that only this device keeps.
   */
  commit?: CommitScope;
  labels?: LabelOverride<ConsentAgainLabels>;
  className?: string;
}

/** `frame="card"`: everything, where the question stays until it is answered. */
export interface ConsentAgainCardProps extends ConsentAgainNoticeBase {
  frame: "card";
  /** The full text agreed to before and the one asked for now, one paragraph per entry,
   *  behind a disclosure. Left out, no disclosure. */
  wording?: {
    before: readonly ReactNode[];
    now: readonly ReactNode[];
  };
  /** Left out for a reader who may not answer (a guest, a member who is not the owner):
   *  no Agree, and {@link note} says who can. */
  onAgree?: () => void;
  /** A quiet line under the list — why this reader cannot agree. */
  note?: ReactNode;
  /** The title's element. Default `h3`; the wording's two headings are one level below
   *  (a `div` title, `div` headings). */
  headingAs?: "div" | "h2" | "h3" | "h4";
}

/** `frame="banner"`: the short form, where the reader is about to do what waits for it. */
export interface ConsentAgainBannerProps extends ConsentAgainNoticeBase {
  frame: "banner";
  /** Always there: the banner is only shown to a reader who may answer. */
  onAgree: () => void;
  /** The ×: the banner does not hide itself — the caller removes it and remembers that it
   *  did, and asks again later. "Not now" is not a refusal. */
  onNotNow: () => void;
  /** The quiet last line under the unfolded list: where the full wording is (a link to
   *  the card). */
  wordingLink?: ReactNode;
}

export type ConsentAgainNoticeProps = ConsentAgainCardProps | ConsentAgainBannerProps;

const SUB_HEADING = { div: "div", h2: "h3", h3: "h4", h4: "h5" } as const;

function ChangeList({ changes }: { changes: readonly ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 ps-5 text-sm text-secondary" data-slot="consent-changes">
      {changes.map((change, i) => (
        // The list is the caller's fixed copy, in a fixed order: the index is its key.
        <li key={i}>{change}</li>
      ))}
    </ul>
  );
}

/**
 * "What you agreed to has changed — agree again?" (0.55): the question an app asks when the
 * text a consent was given to has changed, and the consent is needed again before what it
 * covers goes on. keksdose built it first (shared/components/consent-again-notice.tsx, for
 * its price pool's second consent text, price pool v2 plan §6), display-only so it could be
 * lifted as it is: every word of the subject and both choices are the app's, and nothing
 * here knows a consent version or where "Not now" is remembered.
 *
 * Two frames, which do not hold the same parts:
 *
 * - `card` — everything, for the settings page where the question stays until it is
 *   answered: an info-toned card with the title, the intro, the "what's new" list in front
 *   and the full wording before and now behind a disclosure. No "Not now": there is nothing
 *   for it to do there. A reader who may not answer gets no Agree, and the app's `note`.
 * - `banner` — the short form, where the reader is about to do what waits for the answer:
 *   one or two sentences, the same list one tap away in the banner (informed consent wants
 *   it beside Agree), Agree as the action and "Not now" as the ×. The old and new wording
 *   is not in it — two folding levels in a callout is too much, and on a 390px phone the
 *   banner with everything was ~600px — so the type takes none; `wordingLink` points to
 *   the card.
 *
 * Never a modal: the app stays usable without an answer, and "Not now" is not a refusal
 * (Marcel, 2026-10-24: two choices only, Agree and Not now).
 *
 * On the card the old text is a `<del>` and the new an `<ins>`, each paragraph led by a
 * visually hidden "Removed:" / "Added:": a line-through is not announced, and colour alone
 * must not carry the meaning.
 */
export function ConsentAgainNotice(props: ConsentAgainNoticeProps) {
  const { title, intro, changes, onAgree, agreePending = false, commit = true, className } = props;
  const labels = useKitLabels("consentAgain", DEFAULT_CONSENT_AGAIN_LABELS, props.labels);
  const agree = onAgree && (
    <Button commit={commit} pending={agreePending} onClick={onAgree}>
      {labels.agree}
    </Button>
  );

  if (props.frame === "banner") {
    // `actionPlacement` stays at its default, `own-line`: on a phone Agree sits under the
    // text instead of squeezing it into a column beside the button.
    return (
      <AlertBanner
        tone="info"
        variant="box"
        action={agree}
        onDismiss={props.onNotNow}
        dismissLabel={labels.notNow}
        className={className}
        data-consent-again="banner"
      >
        <div className="space-y-1">
          <p>
            <span className="font-medium">{title}</span> <span className="text-secondary">{intro}</span>
          </p>
          <Disclosure variant="bare" title={labels.changesToggle}>
            <ChangeList changes={changes} />
            {props.wordingLink != null && <p className="mt-1 text-xs">{props.wordingLink}</p>}
          </Disclosure>
        </div>
      </AlertBanner>
    );
  }

  const { wording, note, headingAs = "h3" } = props;
  const Sub = SUB_HEADING[headingAs];
  return (
    <Card
      tone="info"
      toneStrength="strong"
      toneFill
      density="compact"
      padding="md"
      className={cn("space-y-3", className)}
      data-consent-again="card"
    >
      <CardTitle as={headingAs}>{title}</CardTitle>
      <p className="text-sm text-secondary">{intro}</p>
      <ChangeList changes={changes} />
      {wording && (
        <Disclosure variant="bare" title={labels.wordingToggle}>
          <div className="space-y-3 pt-2 text-sm text-secondary">
            <section className="space-y-1">
              <Sub className="text-xs font-medium text-primary">{labels.beforeHeading}</Sub>
              {wording.before.map((text, i) => (
                <p key={i}>
                  <del>
                    <span className="sr-only-fixed">{labels.removed} </span>
                    {text}
                  </del>
                </p>
              ))}
            </section>
            <section className="space-y-1">
              <Sub className="text-xs font-medium text-primary">{labels.nowHeading}</Sub>
              {wording.now.map((text, i) => (
                <p key={i}>
                  <ins className="no-underline">
                    <span className="sr-only-fixed">{labels.added} </span>
                    {text}
                  </ins>
                </p>
              ))}
            </section>
          </div>
        </Disclosure>
      )}
      {note != null && <p className="text-xs text-muted">{note}</p>}
      {agree && <div className="flex flex-wrap gap-2">{agree}</div>}
    </Card>
  );
}
