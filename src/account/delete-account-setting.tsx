import { isValidElement, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { UserX } from "lucide-react";

import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { hasMessage } from "../components/choice-parts";
import {
  CurrentPasswordInput,
  DangerConfirm,
  DEFAULT_DANGER_CONFIRM_LABELS,
  TypedConfirmField,
  typedMatches,
} from "../components/danger-confirm";
import type { DangerConsequence } from "../components/danger-confirm";
import { Card } from "../components/ui";
import { authErrorCode, englishRateLimited, isRateLimited, retryAfterSeconds } from "../auth/auth-errors";
import { useFocusWhen } from "../auth/status-parts";
import { CARD_DESCRIPTION_CLASS, refusalCompanies, settle, useMounted } from "./account-parts";
import { SettingsCardTitle } from "../settings/settings-heading";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/**
 * Every string {@link DeleteAccountSetting} renders — the `deleteAccount` namespace of
 * `<UiKitProvider labels>`, overridable per instance through `labels`. The confirm's
 * Cancel, "Password" and "Type … to confirm" are `dangerConfirm`'s.
 */
export interface DeleteAccountLabels {
  /** The card's title. */
  title: string;
  /** Mode `after_days`, given the days: what happens and when. */
  afterDays: (days: number) => string;
  /** Mode `operator`: what happens, and who erases it. */
  operator: string;
  /** The button that opens the confirm. */
  arm: string;
  /** The confirm's warning, over the consequences. */
  prompt: string;
  /** The line in the consequences when `handOverCount` is given (Kurvenschmiede, §2.7),
   *  given the count. */
  handOver: (count: number) => string;
  /** The button that sends it. */
  confirm: string;
  /** Said once the request is accepted — the app signs out next. */
  done: string;
  /** `password_incorrect` (server-kit's `400` for a wrong current password), under the
   *  password field. */
  wrongPassword: string;
  /** `confirmation_mismatch` — the server did not take the typed address as the
   *  account's — under the address field. */
  confirmationMismatch: string;
  /** `last_admin` — the account is the last active admin. */
  lastAdmin: string;
  /** `last_admin` naming the companies (kastlan checks per company), given them as one
   *  list in the reader's language ("Example AG and Sample GmbH"). */
  lastAdminOf: (companies: string) => string;
  /** `household_has_members` — keksdose's guard (§6.4). */
  householdHasMembers: string;
  /** A request was throttled — HTTP 429 — given its `Retry-After` wait in seconds, or
   *  `undefined` without one. */
  rateLimited: (seconds?: number) => string;
  /** Any other failure. */
  failed: string;
}

export const DEFAULT_DELETE_ACCOUNT_LABELS: DeleteAccountLabels = {
  title: "Delete account",
  afterDays: (days) =>
    days === 1
      ? "Your account is deactivated at once and erased for good 1 day later."
      : `Your account is deactivated at once and erased for good ${days} days later.`,
  operator: "Your account is deactivated at once, and an operator will erase it for good.",
  arm: "Delete account…",
  prompt: "You will be signed out on every device, and your account can no longer be used.",
  handOver: (count) =>
    count === 1
      ? "1 item others can see will pass to an administrator."
      : `${count} items others can see will pass to an administrator.`,
  confirm: "Delete my account",
  done: "Your account is deactivated. You are being signed out.",
  wrongPassword: "The password is incorrect.",
  confirmationMismatch: "This is not your account’s address.",
  lastAdmin: "You are the last administrator. Make someone else an administrator first.",
  lastAdminOf: (companies) =>
    `You are the last administrator of ${companies}. Make someone else an administrator there first.`,
  householdHasMembers:
    "Your household has other members, so the account can’t be deleted here. Please write to the operator.",
  rateLimited: englishRateLimited,
  failed: "Your account could not be deleted. Please try again.",
};

/* ── Props ───────────────────────────────────────────────────────────────── */

/** What happens after the deactivation (§2.1, §6.4) — the app's setting. */
export type DeletionMode = "after_days" | "operator";

/** What {@link DeleteAccountSettingProps.onRequest} gets: the `POST /auth/me/deletion`
 *  body. */
export interface DeleteAccountValues {
  /** As typed. */
  password: string;
  /** The address as TYPED, trimmed — the server re-checks it against the account
   *  (server-kit's `confirm_email_matches`), as keksdose's admin actions do. */
  confirmEmail: string;
}

/** One line of the consequences: a node of the app's, or a {@link DangerConsequence}
 *  for a key of its own and the `severe` mark. */
export type DeleteAccountConsequence = ReactNode | DangerConsequence;

export interface DeleteAccountSettingProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** The account's address — the text to type. */
  email: string;
  /** `"after_days"` (keksdose, Kurvenschmiede: erased by a scheduled job) or
   *  `"operator"` (kastlan: company data is involved, an operator erases it). */
  mode: DeletionMode;
  /** With `after_days`: how many. Default 30 (§2.1). */
  days?: number;
  /**
   * What goes, in the app's words (§6.4: "the app's own list") — derived from the
   * account's own facts where it can be: keksdose's "Budget X will be deleted; its 2
   * guests are told", rather than the worst case for everybody.
   */
  consequences?: readonly DeleteAccountConsequence[];
  /** Kurvenschmiede (§2.7): how many owned items others can see — they pass to the
   *  first active admin at erasure. A line of its own in the consequences; 0 or left
   *  out, none. */
  handOverCount?: number;
  /**
   * The confirm was answered: send `POST /auth/me/deletion {password, confirm_email}`.
   * Resolve once it is accepted — the card says "You are being signed out" — and then
   * sign the user out: the server ended every session with the deactivation. Reject
   * with the client's error: `password_incorrect` under the password,
   * `confirmation_mismatch` under the address, `last_admin` (with kastlan's
   * `companies`) and `household_has_members` above the buttons, a 429 as
   * `rateLimited`, anything else (a demo account's 403, an app's own code) through
   * `describeError`, else `failed`. The confirm stays open with what was typed, for a
   * retry.
   */
  onRequest: (values: DeleteAccountValues) => Promise<unknown> | void;
  /** The app's own words for a failure, or `undefined` for the kit's. Asked first, for
   *  every failure — kastlan's `last_admin` names the companies. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: Partial<DeleteAccountLabels>;
}

/** Whether an item is a `{ text }` line rather than a node — a React element is an
 *  object too, and so would a `{ text }` lookalike be, so the element test comes first. */
function isConsequence(item: DeleteAccountConsequence): item is DangerConsequence {
  return typeof item === "object" && item !== null && !isValidElement(item) && "text" in item;
}

/**
 * Deleting one's own account (docs/user-admin-harmonization.md §6.4, §2.1): what it does,
 * the password, the typed address — then the app signs out.
 *
 * **Two stages, said before the button.** The request DEACTIVATES the account at once
 * (no sign-in, every session ended, marked for deletion); the erasure follows per the
 * app's `mode` — "erased for good 30 days later" (`after_days`, a scheduled job) or "an
 * operator will erase it" (`operator`, kastlan, where company records are involved).
 * The sentence is under the title, so it is read before anything is pressed.
 *
 * **The confirm is a {@link DangerConfirm}** with the two guards of every "type the
 * address" rule in the apps: the address typed (compared caseless, as in all of them)
 * and the password. They are the tile's own {@link TypedConfirmField} and
 * {@link CurrentPasswordInput}, drawn in its fields slot and held by
 * `confirmDisabledReason` with the tile's own sentences, rather than its built-in
 * `phrase` / `requirePassword` — those have no error of their own, and a wrong password
 * belongs under the password. Its consequences are the app's list, plus
 * Kurvenschmiede's hand-over line (`handOverCount`, §2.7: shared work goes to an
 * administrator, never a refusal). The typed address goes to `onRequest` as typed, so
 * the server re-checks it (`confirm_email_matches`).
 *
 * **Refusals** (§6.4) are read by code ({@link authErrorCode}): `password_incorrect` (a
 * `400`, so an app's 401 handling never signs the person out over a typo) under the
 * password, `confirmation_mismatch` under the address, `last_admin` — naming kastlan's
 * companies when the answer lists them — and keksdose's `household_has_members` guard
 * above the buttons; a 429; and the rest in the app's words. The confirm stays open with
 * what was typed, for a retry; Cancel wipes it.
 *
 * **After success** the card says the account is deactivated and the person is being
 * signed out — the app's to do, since the kit sends nothing (auth §8).
 *
 * **Under a write lock** the confirm is a `commit` exempt from billing
 * (`COMMIT_EXCEPT_BILLING`, 0.33): leaving never depends on paying
 * (docs/billing-harmonization.md decision 14, §12.36); a demo's lock still holds it.
 */
export function DeleteAccountSetting({
  email,
  mode,
  days = 30,
  consequences,
  handOverCount,
  onRequest,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: DeleteAccountSettingProps) {
  const labels = useKitLabels("deleteAccount", DEFAULT_DELETE_ACCOUNT_LABELS, labelsProp);
  // The guards speak the tile's words, so "Type “…” to confirm" and "Enter your password
  // to confirm" are translated once, in `dangerConfirm`.
  const guardLabels = useKitLabels("dangerConfirm", DEFAULT_DANGER_CONFIRM_LABELS);
  const locale = useKitLocale();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<"email" | "password" | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const mounted = useMounted();
  const typedRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  // The tile went with the press; the answer takes the focus, so it is read out.
  useFocusWhen(done, doneRef);

  const modeSentence = mode === "operator" ? labels.operator : labels.afterDays(days);

  const lines: (string | DangerConsequence)[] = (consequences ?? [])
    // `{cond && "…"}` lines that came out empty are no lines.
    .filter((item) => item !== null && item !== undefined && item !== false && item !== "")
    .map((item, index) => (isConsequence(item) ? item : { key: `app-${index}`, text: item }));
  if (handOverCount !== undefined && handOverCount > 0) {
    lines.push({ key: "hand-over", text: labels.handOver(handOverCount) });
  }

  // The first guard still open, in the order the fields are drawn — DangerConfirm's rule.
  const held = !typedMatches(typed, email, "caseless")
    ? typeof guardLabels.needsPhrase === "function"
      ? guardLabels.needsPhrase(email)
      : guardLabels.needsPhrase
    : password === ""
      ? guardLabels.needsPassword
      : undefined;

  const present = (error: unknown) => {
    const own = describeError?.(error);
    if (hasMessage(own)) {
      setFailure(own);
      return;
    }
    if (isRateLimited(error)) {
      setFailure(labels.rateLimited(retryAfterSeconds(error)));
      return;
    }
    const code = authErrorCode(error);
    // `invalid_credentials` too, for a server that answered a wrong password so before
    // server-kit 0.4.0 named `password_incorrect`.
    if (code === "password_incorrect" || code === "invalid_credentials") {
      setFieldError("password");
      passwordRef.current?.focus();
      return;
    }
    if (code === "confirmation_mismatch" || code === "confirmation_required") {
      setFieldError("email");
      typedRef.current?.focus();
      return;
    }
    if (code === "last_admin") {
      const companies = refusalCompanies(error);
      setFailure(
        companies
          ? labels.lastAdminOf(new Intl.ListFormat(locale, { type: "conjunction" }).format(companies))
          : labels.lastAdmin,
      );
      return;
    }
    setFailure(code === "household_has_members" ? labels.householdHasMembers : labels.failed);
  };

  const confirm = () => {
    setFailure(null);
    setFieldError(null);
    setBusy(true);
    const values: DeleteAccountValues = { password, confirmEmail: typed.trim() };
    return settle(() => onRequest(values)).then(
      () => {
        if (!mounted.current) return;
        setBusy(false);
        setDone(true);
      },
      (error: unknown) => {
        if (mounted.current) {
          setBusy(false);
          present(error);
        }
        // Rejected again, so DangerConfirm stays armed with what was typed.
        throw error;
      },
    );
  };

  // A disarmed tile holds no password — DangerConfirm's own rule, for the fields it
  // does not own here.
  const disarmed = (armed: boolean) => {
    if (armed) return;
    setTyped("");
    setPassword("");
    setFieldError(null);
    setFailure(null);
  };

  return (
    <Card
      {...rest}
      data-state={done ? "done" : "form"}
      tone="danger"
      className={cn("p-4 space-y-3", className)}
    >
      <div>
        <SettingsCardTitle>{labels.title}</SettingsCardTitle>
        <div className={CARD_DESCRIPTION_CLASS}>{modeSentence}</div>
      </div>
      {done ? (
        <div ref={doneRef} tabIndex={-1} role="status" className="flex items-start gap-2 text-sm outline-none">
          <UserX aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
          <span>{labels.done}</span>
        </div>
      ) : (
        <>
          <DangerConfirm
            commit={COMMIT_EXCEPT_BILLING}
            armLabel={labels.arm}
            prompt={labels.prompt}
            consequences={lines}
            confirmLabel={labels.confirm}
            confirmDisabledReason={held}
            busy={busy}
            onArmedChange={disarmed}
            onConfirm={confirm}
          >
            <TypedConfirmField
              ref={typedRef}
              target={email}
              match="caseless"
              value={typed}
              onValueChange={(next) => {
                setTyped(next);
                if (fieldError === "email") setFieldError(null);
              }}
              error={fieldError === "email" ? labels.confirmationMismatch : undefined}
              busy={busy}
            />
            <CurrentPasswordInput
              ref={passwordRef}
              value={password}
              onValueChange={(next) => {
                setPassword(next);
                if (fieldError === "password") setFieldError(null);
              }}
              error={fieldError === "password" ? labels.wrongPassword : undefined}
              busy={busy}
            />
          </DangerConfirm>
          {hasMessage(failure) && (
            <AlertBanner tone="danger" size="sm" role="alert">
              {failure}
            </AlertBanner>
          )}
        </>
      )}
    </Card>
  );
}
