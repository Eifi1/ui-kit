import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { RefreshCw, Trash2, UserPlus } from "lucide-react";
import { cn } from "../lib/cn";
import type { DateInput } from "../lib/format";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { KIT_LANGUAGES, resolveLanguage } from "../i18n/languages";
import type { KitLanguageCode } from "../i18n/languages";
import { RoleChip } from "../components/account-chips";
import type { RoleVocabulary } from "../components/account-chips";
import { AlertBanner } from "../components/alert-banner";
import { Chip } from "../components/chip";
import type { ChipTone } from "../components/chip";
import { CopyButton } from "../components/copy-button";
import { LanguageSelect } from "../components/language-select";
import { SectionLabel, Caption } from "../components/text";
import { Button, IconButton, Input, Select, Spinner } from "../components/ui";
import { useWriteLock } from "../components/write-lock";
import { hasMessage, settle, useDayText, usePersonLabel } from "./admin-parts";
import type { AdminPerson, MaybePromise } from "./admin-parts";
import { RoleSelect } from "./role-select";

/**
 * Who is invited, and the form that invites (docs/user-admin-harmonization.md §5; auth
 * §4.4: a hashed one-time token, 14 days, an address with a role and a scope).
 *
 * Kurvenschmiede's `invitations-panel.tsx` with its parts made props: a form (the address,
 * a role from the app's vocabulary, an optional scope — a team, a company — the language
 * the invitation is written in, a note), then one row per invitation with its status, when
 * it was sent and until when it works, and resend / copy link / revoke.
 *
 * - **It assumes nothing about who invites.** Admins do, team managers into their team,
 *   kastlan's company admins into their company — and in keksdose ANY budget owner, from
 *   the budget's sharing (Marcel, 2026-10-07). So no word here says "admin"; the roles,
 *   the scopes and the callbacks are the app's, and so is the frame around it.
 * - **The address is someone else's.** No `+app` tag is offered (auth §4.5): a tag is
 *   the owner's own choice, made when they sign up.
 * - **The link is shown once.** The token is stored hashed, so the server can show a link
 *   only in the answer that minted it — on creation and on resend, and only while mail
 *   goes to the console (dev, a deploy without mail). The panel keeps such a link for as
 *   long as it is mounted and offers to copy it on its row; reloading the page loses it,
 *   and "resend" mints a new one. With the console backend the panel says so up front.
 * - **Revoked is optional.** An app that deletes the row instead (kastlan) never sends
 *   `revoked`; the status chip simply never says it (§5).
 *
 * It never sends a request: `onInvite`, `onResend` and `onRevoke` do.
 */

export type InvitationStatus = "open" | "accepted" | "expired" | "revoked";

/** One row of `GET /admin/invitations` (§5), in the wire's own field names. */
export interface InvitationRow<R extends string = string> {
  id: string | number;
  email: string;
  role?: R | null;
  /** The scope's value — a team's or a company's id, matched against `scopes`. */
  scope?: string | number | null;
  note?: string | null;
  /** The language it was written in. */
  locale?: string | null;
  /** Who sent it: a name, or the person. */
  invited_by?: string | AdminPerson | null;
  created_at: DateInput;
  expires_at?: DateInput;
  status: InvitationStatus;
  /** The one-time link, while mail goes to the console — in the answer that minted it. */
  link?: string | null;
}

/** What the form sends — `POST /admin/invitations {email, role, scope?, note?, locale}`. */
export interface InvitationDraft<R extends string = string> {
  email: string;
  /** Absent when the app offers no role choice (`roles` left out). */
  role?: R;
  scope?: string;
  note?: string;
  locale: KitLanguageCode;
}

/** What `onInvite` / `onResend` may answer, so the panel can keep a shown-once link. */
export interface InvitationSentAnswer {
  /** The invitation the answer is about — `onInvite` needs it for the link to find its
   *  row; `onResend` knows it already. */
  id?: string | number;
  /** The one-time link, while mail goes to the console. */
  link?: string | null;
  /** `false`: the invitation exists but the mail failed — say so, resend it. */
  sent?: boolean;
}

/** A scope an invitation can carry. */
export interface InvitationScope {
  value: string;
  label: string;
}

/** The `invitations` namespace. */
export interface InvitationsLabels {
  /** The form's address field. */
  email: string;
  /** Under it while what was typed is not an address. */
  invalidEmail: string;
  role: string;
  /** The scope select's label — the app's word ("Team", "Company") goes over it. */
  scope: string;
  /** The scope select's empty choice. */
  scopeNone: string;
  /** The language select's label. */
  language: string;
  note: string;
  /** The form's button. */
  invite: string;
  /** Heading over the rows. */
  listTitle: string;
  empty: string;
  loading: string;
  /** The status chip, per status. */
  status: Record<InvitationStatus, string>;
  /** "Sent 6 Oct 2026". */
  sent: (date: string) => string;
  /** "Expires 20 Oct 2026" — on an open invitation. */
  expires: (date: string) => string;
  /** "by Ada Example". */
  invitedBy: (name: string) => string;
  /** The resend button — "Send ben@example.com a new link". */
  resend: (email: string) => string;
  /** The copy button. */
  copyLink: string;
  /** The revoke button — "Revoke the invitation for ben@example.com". */
  revoke: (email: string) => string;
  /** Over everything while mail goes to the console. */
  consoleHint: string;
  /** Beside a link the answer carried with no row to put it on. */
  linkReady: (email: string) => string;
  /** The answer said the mail was not sent. */
  notSent: (email: string) => string;
  /** A rejected callback, unless `describeError` says better. */
  failed: string;
}

export const DEFAULT_INVITATIONS_LABELS: InvitationsLabels = {
  email: "Email address",
  invalidEmail: "Enter a complete email address.",
  role: "Role",
  scope: "Scope",
  scopeNone: "None",
  language: "Language of the invitation",
  note: "Note",
  invite: "Invite",
  listTitle: "Invitations",
  empty: "Nobody has been invited yet.",
  loading: "Loading…",
  status: { open: "Open", accepted: "Accepted", expired: "Expired", revoked: "Revoked" },
  sent: (date) => `Sent ${date}`,
  expires: (date) => `Expires ${date}`,
  invitedBy: (name) => `by ${name}`,
  resend: (email) => `Send ${email} a new link`,
  copyLink: "Copy invitation link",
  revoke: (email) => `Revoke the invitation for ${email}`,
  consoleHint:
    "Mail isn’t sent on this server — it is written to the server log. Copy each invitation link from here and pass it on yourself: it is shown only once.",
  linkReady: (email) => `The invitation link for ${email}, shown only this once:`,
  notSent: (email) => `${email} is invited, but the mail couldn’t be sent. Resend it.`,
  failed: "That didn’t work. Please try again.",
};

/** The tone of each status. */
const STATUS_TONES: Readonly<Record<InvitationStatus, ChipTone>> = {
  open: "info",
  accepted: "success",
  expired: "warning",
  revoked: "neutral",
};

export interface InvitationsPanelProps<R extends string = string> {
  invitations: readonly InvitationRow<R>[];
  /** The app's roles. Left out: no role choice, and no role chip on a row. */
  roles?: RoleVocabulary<R>;
  /** The roles an invitation may carry — Kurvenschmiede's member or customer. Default:
   *  the whole vocabulary. One role: no choice is drawn, and it is sent. */
  invitableRoles?: readonly R[];
  /** The role the form starts with. Default: the first invitable one. */
  defaultRole?: R;
  /** The scopes an invitation may carry — teams, companies. Left out: no scope field. */
  scopes?: readonly InvitationScope[];
  /** A scope must be chosen (no "None"). */
  scopeRequired?: boolean;
  /** The languages offered. Default: all seven of the kit's. */
  languages?: readonly KitLanguageCode[];
  /** The language the form starts with. Default: the page's, resolved to `languages`. */
  defaultLocale?: string;
  /** The server's `mail_backend`. `"console"` draws the hint. */
  mailBackend?: string | null;
  /** Creates one (resolve to clear the form; reject to keep it and say why). Left out:
   *  no form — a list someone may look at but not add to. */
  onInvite?: (draft: InvitationDraft<R>) => MaybePromise<InvitationSentAnswer | void>;
  /** Mints a new link and mails it. Left out: no resend button. */
  onResend?: (invitation: InvitationRow<R>) => MaybePromise<InvitationSentAnswer | void>;
  /** Revokes an open or an expired invitation (level `none`, §4.2: re-inviting undoes
   *  it). An expired row can be resent, and since 0.31 also removed: in an app that
   *  keeps the rows it would otherwise stay listed for good (Kurvenschmiede's 0.30
   *  adoption). Left out: no revoke button. */
  onRevoke?: (invitation: InvitationRow<R>) => MaybePromise;
  /** The list is being fetched. */
  loading?: boolean;
  /** The app's words for a rejected callback. */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** Over the form: who can be invited and what happens, in the app's words. */
  intro?: ReactNode;
  /** The list's visible heading. Default: the `listTitle` label. `null` leaves it out,
   *  for a page whose card is already headed "Invitations" (Kurvenschmiede's 0.30
   *  adoption); the list keeps the label as its accessible name either way. */
  listTitle?: ReactNode | null;
  className?: string;
  labels?: Partial<InvitationsLabels>;
}

// Shape only — whether the address may be invited is the server's question.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALL_CODES: readonly KitLanguageCode[] = KIT_LANGUAGES.map((language) => language.code);

/** A failed run, told apart from an answer of `undefined`. */
const FAILED = Symbol("failed");

export function InvitationsPanel<R extends string = string>({
  invitations,
  roles,
  invitableRoles,
  defaultRole,
  scopes,
  scopeRequired = false,
  languages = ALL_CODES,
  defaultLocale,
  mailBackend,
  onInvite,
  onResend,
  onRevoke,
  loading = false,
  describeError,
  intro,
  listTitle,
  className,
  labels: labelsProp,
}: InvitationsPanelProps<R>) {
  const labels = useKitLabels("invitations", DEFAULT_INVITATIONS_LABELS, labelsProp);
  const kitLocale = useKitLocale();
  const dayText = useDayText();
  const nameOf = usePersonLabel();
  const lock = useWriteLock();
  const offered: readonly R[] = invitableRoles ?? (roles ? (Object.keys(roles) as R[]) : []);
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [role, setRole] = useState<R | undefined>(defaultRole ?? offered[0]);
  const [scope, setScope] = useState("");
  const [locale, setLocale] = useState<KitLanguageCode>(() =>
    resolveLanguage([defaultLocale, kitLocale], languages),
  );
  const [note, setNote] = useState("");
  // One request at a time, for the whole panel; the key says which control spins.
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const [notice, setNotice] = useState<ReactNode>(null);
  // Links the answers carried, by invitation — shown once, kept while mounted.
  const [links, setLinks] = useState<Record<string, string>>({});
  // A link whose answer named no invitation: shown above the list instead.
  const [looseLink, setLooseLink] = useState<{ email: string; link: string } | null>(null);

  const run = async <T,>(key: string, call: () => MaybePromise<T>): Promise<T | void | typeof FAILED> => {
    setBusy(key);
    setFailure(null);
    setNotice(null);
    try {
      return await settle(call);
    } catch (error) {
      const own = describeError?.(error);
      setFailure(hasMessage(own) ? own : labels.failed);
      return FAILED;
    } finally {
      setBusy(null);
    }
  };

  /** Keep what an answer carried: its link, and whether the mail went. */
  const took = (answer: InvitationSentAnswer | void, address: string, id?: string | number) => {
    if (!answer) return;
    const key = answer.id ?? id;
    if (answer.link) {
      if (key !== undefined) setLinks((known) => ({ ...known, [String(key)]: answer.link as string }));
      else setLooseLink({ email: address, link: answer.link });
    }
    if (answer.sent === false) setNotice(labels.notSent(address));
  };

  const address = email.trim();
  const choosesRole = roles !== undefined && offered.length > 1;
  const canInvite = onInvite !== undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // Enter in a field is a commit too — the button's lock does not see it.
    if (!onInvite || busy || lock.locked || address === "") return;
    if (!EMAIL_SHAPE.test(address)) {
      setInvalid(true);
      return;
    }
    if (scopes && scopeRequired && scope === "") return;
    const draft: InvitationDraft<R> = {
      email: address,
      locale,
      ...(role !== undefined && roles !== undefined ? { role } : {}),
      ...(scope !== "" ? { scope } : {}),
      ...(note.trim() !== "" ? { note: note.trim() } : {}),
    };
    const answer = await run("invite", () => onInvite(draft));
    if (answer === FAILED) return;
    took(answer, address);
    setEmail("");
    setNote("");
  };

  const scopeLabel = (value: InvitationRow["scope"]) =>
    value === null || value === undefined || value === ""
      ? null
      : (scopes?.find((s) => s.value === String(value))?.label ?? String(value));

  return (
    <div className={cn("space-y-3", className)}>
      {intro && <div className="text-sm text-[var(--text-secondary)]">{intro}</div>}
      {mailBackend === "console" && (
        <AlertBanner tone="info" size="sm">
          {labels.consoleHint}
        </AlertBanner>
      )}

      {canInvite && (
        <form noValidate onSubmit={submit} className="@container space-y-2">
          <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
            <Input
              label={labels.email}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              error={invalid ? labels.invalidEmail : undefined}
              data-private
              onChange={(event) => {
                setInvalid(false);
                setEmail(event.target.value);
              }}
            />
            {choosesRole && (
              <RoleSelect<R>
                label={labels.role}
                value={role}
                roles={roles}
                offered={offered}
                onChange={setRole}
              />
            )}
            {scopes && scopes.length > 0 && (
              <Select
                label={labels.scope}
                value={scope}
                required={scopeRequired}
                onChange={(event) => setScope(event.target.value)}
              >
                <option value="" disabled={scopeRequired}>
                  {labels.scopeNone}
                </option>
                {scopes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
            {languages.length > 1 && (
              <LanguageSelect label={labels.language} codes={languages} value={locale} onChange={setLocale} />
            )}
            <Input
              label={labels.note}
              value={note}
              maxLength={255}
              onChange={(event) => setNote(event.target.value)}
              className="@md:col-span-2"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="brand"
              commit
              pending={busy === "invite"}
              disabled={busy !== null || address === "" || (scopeRequired && scopes !== undefined && scope === "")}
            >
              <UserPlus className="size-4" aria-hidden />
              {labels.invite}
            </Button>
          </div>
        </form>
      )}

      {failure && (
        <AlertBanner tone="danger" size="sm">
          {failure}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner tone="warning" size="sm" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}
      {looseLink && (
        <AlertBanner tone="info" size="sm" onDismiss={() => setLooseLink(null)}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span data-private>{labels.linkReady(looseLink.email)}</span>
            <code className="min-w-0 break-all text-xs">{looseLink.link}</code>
            <CopyButton size="xs" text={looseLink.link} label={labels.copyLink} />
          </div>
        </AlertBanner>
      )}

      <div className="space-y-2">
        {listTitle !== null && <SectionLabel as="h4">{listTitle ?? labels.listTitle}</SectionLabel>}
        {loading && invitations.length === 0 ? (
          <div className="flex justify-center py-3">
            <Spinner label={labels.loading} />
          </div>
        ) : invitations.length === 0 ? (
          <Caption>{labels.empty}</Caption>
        ) : (
          <ul aria-label={labels.listTitle} className="divide-y divide-[var(--border)]">
            {invitations.map((invitation) => {
              const key = String(invitation.id);
              const link = invitation.link ?? links[key];
              const open = invitation.status === "open";
              const resendable = onResend && (open || invitation.status === "expired");
              const revocable = onRevoke && (open || invitation.status === "expired");
              const scopeText = scopeLabel(invitation.scope);
              const by =
                typeof invitation.invited_by === "string" ? invitation.invited_by : nameOf(invitation.invited_by);
              const facts = [
                dayText(invitation.created_at) && labels.sent(dayText(invitation.created_at)),
                open && dayText(invitation.expires_at ?? null) && labels.expires(dayText(invitation.expires_at ?? null)),
                by && labels.invitedBy(by),
              ].filter(Boolean);
              return (
                <li key={key} data-status={invitation.status} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1 basis-48 space-y-1">
                      <div data-private className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {invitation.email}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Chip size="xs" shape="square" caps tone={STATUS_TONES[invitation.status]}>
                          {labels.status[invitation.status]}
                        </Chip>
                        {roles && invitation.role && <RoleChip<R> value={invitation.role} roles={roles} size="xs" />}
                        {scopeText && (
                          <Chip size="xs" shape="square">
                            {scopeText}
                          </Chip>
                        )}
                      </div>
                      {(facts.length > 0 || invitation.note) && (
                        <div className="text-xs text-[var(--text-muted)]">
                          {facts.join(" · ")}
                          {invitation.note && (
                            <>
                              {facts.length > 0 && " · "}
                              <span data-private>{invitation.note}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {(link || resendable || revocable) && (
                      <div className="ms-auto flex shrink-0 items-center gap-1">
                        {link && open && <CopyButton size="xs" tone="muted" text={link} label={labels.copyLink} />}
                        {resendable && (
                          <IconButton
                            size="xs"
                            commit
                            label={labels.resend(invitation.email)}
                            pending={busy === `resend:${key}`}
                            disabled={busy !== null}
                            onClick={async () => {
                              const answer = await run(`resend:${key}`, () => onResend(invitation));
                              if (answer !== FAILED) took(answer, invitation.email, invitation.id);
                            }}
                          >
                            <RefreshCw />
                          </IconButton>
                        )}
                        {revocable && (
                          <IconButton
                            size="xs"
                            tone="danger"
                            commit
                            label={labels.revoke(invitation.email)}
                            pending={busy === `revoke:${key}`}
                            disabled={busy !== null}
                            onClick={() => void run(`revoke:${key}`, () => onRevoke(invitation))}
                          >
                            <Trash2 />
                          </IconButton>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
