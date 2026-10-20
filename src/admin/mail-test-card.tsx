import { useState } from "react";
import type { ReactNode } from "react";
import { Send } from "lucide-react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { isRateLimited, retryAfterSeconds } from "../auth/auth-errors";
import { AlertBanner } from "../components/alert-banner";
import { Button } from "../components/button";
import { Chip } from "../components/chip";
import { SettingsSection, type SettingsSectionProps } from "../settings/settings-section";
import { DEFAULT_MAIL_TEST_CARD_LABELS } from "./mail-test-card-labels";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string {@link MailTestCard} renders — the `mailTestCard` namespace of
 *  `<UiKitProvider labels>`, overridable per instance through `labels`
 *  (docs/admin-harmonization.md §9.2.4). */
export interface MailTestCardLabels {
  /** The card's title, and the app's catalogue entry's. */
  title: string;
  /** The sentence under it. */
  description: string;
  /** The transport's chip: "Transport: resend". `backend` is the server's `mail_backend`. */
  transport: (backend: string) => string;
  /** The button. */
  action: string;
  /** The answer said "sent" through a real transport. `address` is masked ("a…@example.com"). */
  sent: (address: string) => string;
  /** `mail_backend` is `console`: said whatever `sent` is — a console answers `true`. */
  console: string;
  /** Not sent, or the request failed. The provider's error stays in the server log. */
  failed: string;
  /** HTTP 429 — the app's limiter (server-kit's `MAIL_TEST_LIMIT`, 3 per 10 minutes);
   *  `seconds` from `Retry-After` when the response has one. */
  rateLimited: (seconds?: number) => string;
  /** For the app's catalogue entry (`keywords`); the card never reads it. */
  keywords: string;
}

// Defined in ./mail-test-card-labels, which holds no component code.
export { DEFAULT_MAIL_TEST_CARD_LABELS };

/* ── The card ────────────────────────────────────────────────────────────── */

/** The answer of `POST /admin/mail/test` — server-kit 0.15's `MailTestResult`. */
export interface MailTestAnswer {
  sent: boolean;
  /** The transport that took it: `console`, `resend`, `smtp`, … */
  mail_backend: string;
}

/** The card's default DOM id: its catalogue entry's `anchor`, the `?focus=` target. */
export const MAIL_TEST_ANCHOR = "admin-mail-test";

export interface MailTestCardProps
  extends Omit<SettingsSectionProps, "anchor" | "title" | "description" | "children"> {
  /** The installation's transport, as the admin page has it (`mail_backend`): the chip
   *  before a send. After one, the answer's. Optional (0.46): without it the chip shows
   *  from the first answer on, and an app needs no query only for the chip. */
  mailBackend?: string;
  /** The app's `POST /admin/mail/test` (kastlan `/platform/mail/test`), no body: it
   *  awaits the app's own send and answers `{sent, mail_backend}`. A rejection is read
   *  for a 429 (the limiter); anything else is "could not send". */
  send: () => Promise<MailTestAnswer>;
  /** The signed-in admin's own address — where the mail goes. Shown masked. */
  address: string;
  /** Default {@link MAIL_TEST_ANCHOR}; the app's catalogue entry names the same. */
  anchor?: string;
  /** The app's sentence after the kit's description. */
  description?: ReactNode;
  labels?: LabelOverride<MailTestCardLabels>;
}

/**
 * An address with its local part masked to its first character: "ada@example.com" →
 * "a…@example.com". The domain stays, so the admin sees which mailbox to open.
 */
export function maskMailAddress(address: string): string {
  const text = address.trim();
  const at = text.lastIndexOf("@");
  if (at <= 0) return text === "" ? "" : `${Array.from(text)[0]}…`;
  return `${Array.from(text.slice(0, at))[0]}…${text.slice(at)}`;
}

type Outcome =
  | { kind: "sent"; backend: string }
  | { kind: "console"; backend: string }
  | { kind: "failed"; backend?: string }
  | { kind: "limited"; seconds?: number };

/**
 * "Send a test mail to me" (docs/admin-harmonization.md §9.2): a `SettingsSection` with a
 * sentence, the transport as a chip, the button and the result line. One mail goes to the
 * signed-in admin's own address, never another, through the app's own send.
 *
 * **The result line reads `mail_backend` first**: with `console` it says "nothing was sent"
 * whatever `sent` is, since every console path answers `true` (§9.2 Today). Otherwise
 * `sent` says "Sent to a…@example.com. Check the inbox." or "Could not send." — the
 * provider's error stays in the server log (§9.2.7). A 429 says the limiter's line. The
 * button is busy while the request runs; the line is a live region.
 *
 * Not a commit: the test writes nothing, so it is not under the write lock (a demo never
 * reaches the admin area, and the server refuses it anyway). The app adds the catalogue
 * entry `{ id, anchor: MAIL_TEST_ANCHOR, title, keywords }` from these labels.
 */
export function MailTestCard({
  mailBackend,
  send,
  address,
  anchor = MAIL_TEST_ANCHOR,
  description,
  labels: labelsProp,
  ...rest
}: MailTestCardProps) {
  const labels = useKitLabels("mailTestCard", DEFAULT_MAIL_TEST_CARD_LABELS, labelsProp);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // The last transport an answer named: a later send with no answer (429, network) keeps it.
  const [answered, setAnswered] = useState<string | undefined>(undefined);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setOutcome(null);
    try {
      const answer = await send();
      const backend = answer.mail_backend;
      if (backend) setAnswered(backend);
      if (backend === "console") setOutcome({ kind: "console", backend });
      else setOutcome(answer.sent ? { kind: "sent", backend } : { kind: "failed", backend });
    } catch (error) {
      setOutcome(isRateLimited(error) ? { kind: "limited", seconds: retryAfterSeconds(error) } : { kind: "failed" });
    } finally {
      setBusy(false);
    }
  };

  const backend = answered ?? mailBackend;

  return (
    <SettingsSection
      {...rest}
      anchor={anchor}
      title={labels.title}
      description={
        description != null ? (
          <>
            {labels.description} {description}
          </>
        ) : (
          labels.description
        )
      }
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" pending={busy} onClick={() => void run()}>
            <Send className="size-4" aria-hidden />
            {labels.action}
          </Button>
          {backend && (
            <Chip size="sm" data-slot="mail-backend">
              {labels.transport(backend)}
            </Chip>
          )}
        </div>
        {outcome?.kind === "sent" && (
          <AlertBanner variant="inline" block tone="success">
            <span data-private>{labels.sent(maskMailAddress(address))}</span>
          </AlertBanner>
        )}
        {outcome?.kind === "console" && (
          <AlertBanner variant="inline" block tone="info">
            {labels.console}
          </AlertBanner>
        )}
        {outcome?.kind === "failed" && (
          <AlertBanner variant="inline" block tone="danger">
            {labels.failed}
          </AlertBanner>
        )}
        {outcome?.kind === "limited" && (
          <AlertBanner variant="inline" block tone="warning">
            {labels.rateLimited(outcome.seconds)}
          </AlertBanner>
        )}
      </div>
    </SettingsSection>
  );
}
