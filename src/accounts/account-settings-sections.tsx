import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { DataExportSetting } from "../account/data-export-setting";
import {
  DeleteAccountSetting,
  type DeleteAccountConsequence,
  type DeleteAccountLabels,
} from "../account/delete-account-setting";
import { EmailChangeSetting } from "../account/email-change-setting";
import { PasskeysSetting, type PasskeyItem } from "../account/passkeys-setting";
import { PasswordSetting, ProfileSetting, TwoFactorSetting } from "../account/account-settings";
import { SessionsSetting, type SessionItem } from "../account/sessions-setting";
import { InvitationsPanel, type InvitationRow, type InvitationsPanelProps } from "../admin/invitations-panel";
import { formatPersonName } from "../lib/person-name";
import { useKitFormat } from "../lib/format";
import { ReauthDialog, type ReauthDialogLabels } from "../components/reauth-dialog";
import type { LabelOverride } from "../i18n/kit-labels";
import { useAccountSettingsLabels } from "../account/account-settings-labels";
import type {
  PasskeysSettingLabels,
  PasswordSettingLabels,
  TwoFactorSettingLabels,
} from "../account/account-settings-labels";
import { toast } from "../components/toast";
import { useDescribeAccountFailure, useFailureBeside } from "./account-failure";
import type { DescribeAccountFailureOptions } from "./account-failure";
import type { AccountMe, AccountPasskeyOptions, AccountTwoFactorSetup } from "./accounts-api";
import { useAccountsClient } from "./accounts-context";
import {
  useAccountDeletion,
  useAccountExport,
  useAccountSessions,
  useAdminMail,
  useChangePassword,
  useCurrentUser,
  useEmailChange,
  useInvitationsAdmin,
  usePasskeys,
  useTwoFactor,
  useUpdateProfile,
} from "./accounts-hooks";
import { passkeysAvailable } from "./passkey-ceremony";

/**
 * The account's settings, wired (docs/auth-harmonization.md §12.9 "The account's settings"):
 * the kit's cards on server-kit 0.29's routes, as sections an app puts into its own
 * `SettingsLayout` beside its own — Kurvenschmiede's `account-cards.tsx` and `passkeys-card.tsx`,
 * about 410 lines, for every app. Each reads the client from `<AccountsProvider>` and keeps an
 * answer where the hooks keep it; a refusal is the card's to word where it knows the code, and
 * `describeAccountFailure`'s otherwise. Each takes the anchor its settings entry points at
 * (`id`), defaulting to the card's own name.
 *
 * Not here: the language card. The kit's `useAccountLanguage` is that wiring already — its
 * `save` is `useUpdateProfile().mutateAsync({ locale })` — and the language list is the app's.
 */

/** The account's own settings sections, signed-in only: each draws nothing without a session. */
function useAccount(): AccountMe | null {
  return useAccountsClient<AccountMe>().useSession((state) => state.user);
}

/** What {@link AccountProfileSection} takes. */
export interface AccountProfileSectionProps {
  id?: string;
  /** The role in the app's words (its role vocabulary); left out, no role line. */
  roleLabel?: (role: string) => ReactNode;
}

/** The name, the address, the role and since when — and the two an account may change about
 *  itself, its first and last name (`PATCH /auth/me`, user-admin §6.1). */
export function AccountProfileSection({ id = "profile", roleLabel }: AccountProfileSectionProps) {
  const user = useAccount();
  const save = useUpdateProfile<AccountMe>();
  const { formatDate } = useKitFormat();
  if (!user) return null;
  return (
    <ProfileSetting
      id={id}
      name={formatPersonName({ first: user.first_name, last: user.last_name })}
      email={user.email}
      role={user.role && roleLabel ? roleLabel(user.role) : undefined}
      memberSince={user.created_at ? formatDate(user.created_at, "medium") : undefined}
      firstName={user.first_name}
      lastName={user.last_name}
      saving={save.isPending}
      onSave={(values) => save.mutateAsync({ first_name: values.firstName, last_name: values.lastName })}
    />
  );
}

/** A new password (`POST /auth/me/password`): every other session ends, and this one goes on
 *  with the fresh pair the answer brings (§6.3). A wrong current password is said under its
 *  field, by the card. */
export function AccountPasswordSection({
  id = "password",
  minLength,
  labels,
}: {
  id?: string;
  minLength?: number;
  /** The card's words over the provider's `accountSettings.password` (0.64, Kurvenschmiede's U8). */
  labels?: LabelOverride<PasswordSettingLabels>;
}) {
  const change = useChangePassword();
  const describe = useFailureBeside(["password_incorrect", "invalid_credentials"]);
  return (
    <PasswordSetting
      id={id}
      minLength={minLength}
      labels={labels}
      pending={change.isPending}
      describeError={describe}
      onSubmit={(current, next) => change.mutateAsync({ current_password: current, new_password: next })}
    />
  );
}

/** The address, changed the contract's way (user-admin §6.2): the new address and the
 *  password, then a link to the new mailbox. The pending change is the server's, so a reload
 *  or another tab shows it. The app's address tag is offered, as at sign-up (§4.5). */
export function AccountEmailSection({ id = "email", emailTag }: { id?: string; emailTag?: string }) {
  const user = useAccount();
  const { state, request, resend, cancel } = useEmailChange();
  const passkeys = usePasskeys();
  const describe = useFailureBeside(["email_taken", "password_incorrect", "invalid_credentials"]);
  if (!user) return null;
  return (
    <EmailChangeSetting
      id={id}
      currentEmail={user.email}
      pendingEmail={state.data ? (state.data.pending_email ?? null) : undefined}
      emailTag={emailTag}
      passkeyNote={(passkeys.list.data?.length ?? 0) > 0}
      describeError={describe}
      onRequest={({ newEmail, password }) => request.mutateAsync({ new_email: newEmail, password })}
      onResend={() => resend.mutateAsync()}
      onCancel={() => cancel.mutateAsync()}
    />
  );
}

/** The current session first, then the most recently active (§12.5 item 1). */
function sessionItems(
  rows: readonly {
    id: string;
    device?: string | null;
    ip_address?: string | null;
    last_active: string;
    current?: boolean;
  }[],
): SessionItem<string>[] {
  return [...rows]
    .sort(
      (a, b) => Number(Boolean(b.current)) - Number(Boolean(a.current)) || b.last_active.localeCompare(a.last_active),
    )
    .map((row) => ({
      id: row.id,
      device: row.device,
      ip: row.ip_address,
      lastActiveAt: row.last_active,
      current: row.current === true,
    }));
}

/**
 * The account's sessions (§6.3, user-admin §6.3): the device list with this one marked
 * `current` (and first) and never offered to end — that is the sign-out — the others each
 * ended on their own, and "Sign out everywhere", a sign-out in the contract's order.
 */
export function AccountSessionsSection({ id = "sessions" }: { id?: string }) {
  const { list, revoke, signOutEverywhere } = useAccountSessions();
  const describe = useFailureBeside([]);
  return (
    <SessionsSetting<string>
      id={id}
      sessions={list.data ? sessionItems(list.data) : list.isError ? [] : undefined}
      loading={list.isPending && list.fetchStatus !== "idle"}
      onRevoke={(sid) => revoke.mutateAsync(sid)}
      onSignOutEverywhere={signOutEverywhere}
      describeError={describe}
    />
  );
}

/** What {@link AccountTwoFactorSection} takes. */
export interface AccountTwoFactorSectionProps {
  id?: string;
  /** The card's words over the provider's `accountSettings.twoFactor`. */
  labels?: LabelOverride<TwoFactorSettingLabels>;
  /** The password question's words over the provider's `reauthDialog` (its field, Cancel). */
  reauthLabels?: LabelOverride<ReauthDialogLabels>;
  /** Draw the QR code yourself; the kit's own otherwise (`TwoFactorSetting`'s `renderQr`). */
  renderQr?: (otpauthUri: string) => ReactNode;
}

/**
 * Two-factor sign-in (0.64, server-kit 0.32's `/auth/me/2fa/*`, keksdose's card): setting it up,
 * switching it on with a code, replacing a lost authenticator and switching it off. Every setup
 * asks for the password first (`ReauthDialog`: the server refuses one without it, and a wrong
 * password is said there); the new secret is PENDING until its code confirms it, so a setup
 * walked away from changes nothing. Switching off takes the password and a live code. A
 * refusal is said in the account words; the card reads `totp_enabled` off `/auth/me`.
 */
export function AccountTwoFactorSection({
  id = "two-factor",
  labels,
  reauthLabels,
  renderQr,
}: AccountTwoFactorSectionProps) {
  const me = useCurrentUser<AccountMe>();
  const enabled = me.data?.totp_enabled === true;
  const { status, setup, enable, disable, renew } = useTwoFactor({ enabled });
  const describe = useDescribeAccountFailure();
  const words = useAccountSettingsLabels("twoFactor", labels);
  const [asking, setAsking] = useState<"setup" | "replace" | "backup" | null>(null);
  const [passwordError, setPasswordError] = useState<string>();
  const [pending, setPending] = useState<AccountTwoFactorSetup | null>(null);
  // 0.64 (server-kit 0.32): a set of backup codes just made, shown once.
  const [fresh, setFresh] = useState<readonly string[] | null>(null);
  if (!me.data) return null;
  const ask = (why: "setup" | "replace" | "backup") => {
    setPasswordError(undefined);
    setAsking(why);
  };
  const replacing = asking === "replace";
  const renewing = asking === "backup";

  return (
    <>
      <TwoFactorSetting
        id={id}
        enabled={enabled}
        setup={pending ? { otpauthUri: pending.otpauth_url, secret: pending.secret } : null}
        onStartSetup={() => ask("setup")}
        onReplace={() => ask("replace")}
        onEnable={(code) =>
          enable.mutate(code, {
            onSuccess: (answer) => {
              setPending(null);
              setFresh(answer.backup_codes);
              toast.success(words.turnedOn);
            },
            onError: (error) => toast.error(describe(error)),
          })
        }
        onDisable={(password, code) =>
          disable.mutate(
            { password, code },
            {
              onSuccess: () => {
                setPending(null);
                setFresh(null);
                toast.success(words.turnedOff);
              },
              onError: (error) => toast.error(describe(error)),
            },
          )
        }
        backupCodes={{
          fresh,
          left: status.data?.backup_codes_left,
          onRenew: () => ask("backup"),
          onDismiss: () => setFresh(null),
        }}
        busy={setup.isPending || enable.isPending || disable.isPending || renew.isPending}
        renderQr={renderQr}
        labels={labels}
      />
      {asking !== null && (
        <ReauthDialog
          labels={reauthLabels}
          title={renewing ? words.backupRenew : replacing ? words.replaceTitle : words.enable}
          description={renewing ? words.backupRenewHint : replacing ? words.replaceHint : words.setupReauth}
          // A first setup keeps the dialog's "Continue": the next step is the QR code.
          submitLabel={renewing ? words.backupRenew : replacing ? words.replace : undefined}
          error={passwordError}
          busy={setup.isPending || renew.isPending}
          onSubmit={async (password) => {
            try {
              if (renewing) setFresh((await renew.mutateAsync(password)).backup_codes);
              else setPending(await setup.mutateAsync(password));
            } catch (error) {
              setPasswordError(describe(error));
              throw error;
            }
          }}
          onClose={() => setAsking(null)}
        />
      )}
    </>
  );
}

/** What {@link AccountPasskeysSection} takes. */
export interface AccountPasskeysSectionProps {
  id?: string;
  /** What the card says where passkeys cannot run (no WebAuthn, or not a secure context).
   *  Left out, the section draws nothing there. */
  unavailable?: ReactNode;
  /** `"alongside"` (the default): the password stays and a passkey is a second way in. */
  mode?: "instead" | "alongside";
  /** The card's words over the provider's `passkeys` namespace. */
  labels?: LabelOverride<PasskeysSettingLabels>;
  /** The password question's words before a passkey is added, over the provider's
   *  `reauthDialog` — an app that says why it asks ("to add a passkey"). */
  reauthLabels?: LabelOverride<ReauthDialogLabels>;
}

/**
 * The account's passkeys: the list, adding one, renaming and removing. Adding asks for the
 * password first (`ReauthDialog`; server-kit's begin checks it before it mints a challenge),
 * so a wrong password is said there, before any browser prompt — then the browser's ceremony
 * and the finish. Closing the browser's prompt is no failure and says nothing.
 */
export function AccountPasskeysSection({
  id = "passkeys",
  unavailable,
  mode = "alongside",
  labels,
  reauthLabels,
}: AccountPasskeysSectionProps) {
  const { list, begin, register, rename, remove } = usePasskeys();
  const describe = useDescribeAccountFailure();
  const [asking, setAsking] = useState<((confirmed: boolean) => void) | null>(null);
  const [passwordError, setPasswordError] = useState<string>();
  const begun = useRef<AccountPasskeyOptions | null>(null);
  const available = passkeysAvailable();
  if (!available && unavailable === undefined) return null;

  const fail = (error: unknown) => {
    if (error instanceof Error && error.name === "AbortError") return;
    toast.error(describe(error));
  };
  const items: PasskeyItem<number>[] | undefined = list.data
    ? list.data.map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at }))
    : list.isError
      ? []
      : undefined;
  const busyId = rename.isPending
    ? (rename.variables?.id ?? null)
    : remove.isPending
      ? (remove.variables ?? null)
      : null;

  return (
    <>
      <PasskeysSetting<number>
        id={id}
        mode={mode}
        labels={labels}
        passkeys={available ? items : []}
        loading={list.isPending && list.fetchStatus !== "idle"}
        unavailable={available ? undefined : unavailable}
        beforeAdd={() =>
          new Promise<boolean>((answer) => {
            begun.current = null;
            setPasswordError(undefined);
            setAsking(() => answer);
          })
        }
        onAdd={(name) => {
          const options = begun.current;
          begun.current = null;
          if (!options) return Promise.reject(new Error("No passkey challenge was begun"));
          return register.mutateAsync({ options, name }).catch((error: unknown) => {
            fail(error);
            throw error;
          });
        }}
        adding={register.isPending}
        onRename={(passkey, name) => rename.mutateAsync({ id: passkey, name }).catch(fail)}
        onDelete={(passkey) => remove.mutateAsync(passkey).catch(fail)}
        busyId={busyId}
      />
      {asking !== null && (
        <ReauthDialog
          labels={reauthLabels}
          error={passwordError}
          busy={begin.isPending}
          onSubmit={async (password) => {
            try {
              begun.current = await begin.mutateAsync(password);
            } catch (error) {
              setPasswordError(describe(error));
              throw error;
            }
          }}
          onClose={(confirmed) => {
            asking(confirmed);
            setAsking(null);
          }}
        />
      )}
    </>
  );
}

/** The account's data as one JSON file (user-admin §6.5): server-kit's envelope, once a minute
 *  (a 429 is said as such). `description` is the app's line on what it holds. */
export function AccountExportSection({ id = "export", description }: { id?: string; description?: ReactNode }) {
  const exportData = useAccountExport();
  const describe = useFailureBeside([]);
  return (
    <DataExportSetting
      id={id}
      description={description}
      describeError={describe}
      onExport={() => exportData.mutateAsync()}
    />
  );
}

/** What {@link AccountDeletionSection} takes. */
export interface AccountDeletionSectionProps {
  id?: string;
  /** What goes, in the app's words (user-admin §6.4). */
  consequences?: readonly DeleteAccountConsequence[];
  /** The field of the server's terms (`deletion_terms`' extras) that counts what passes to
   *  someone else instead (Kurvenschmiede's `hand_over_count`). */
  handOverField?: string;
  /** The card's words over the provider's `deleteAccount` namespace. */
  labels?: LabelOverride<DeleteAccountLabels>;
}

/**
 * Deleting the account (user-admin §6.4): the server's terms first (`GET /auth/me/deletion`:
 * after N days, or by an operator), the password and the address typed, then the request — and
 * the server ends every session with it, so the tab signs out in the contract's order.
 */
export function AccountDeletionSection({
  id = "delete",
  consequences,
  handOverField,
  labels,
}: AccountDeletionSectionProps) {
  const user = useAccount();
  const { terms, request } = useAccountDeletion();
  const describe = useFailureBeside([
    "password_incorrect",
    "invalid_credentials",
    "confirmation_mismatch",
    "last_admin",
    "household_has_members",
  ]);
  if (!user || !terms.data) return null;
  const handOver = handOverField !== undefined ? terms.data[handOverField] : undefined;
  return (
    <DeleteAccountSetting
      id={id}
      email={user.email}
      mode={terms.data.mode}
      days={terms.data.days ?? undefined}
      consequences={consequences}
      handOverCount={typeof handOver === "number" ? handOver : undefined}
      describeError={describe}
      labels={labels}
      onRequest={({ password, confirmEmail }) => request.mutateAsync({ password, confirm_email: confirmEmail })}
    />
  );
}

/** What {@link AccountInvitationsSection} takes: `InvitationsPanel`'s vocabulary and words, the
 *  app's; the transport, the refusals and a change, the app's to add to. */
export type AccountInvitationsSectionProps<R extends string = string> = Pick<
  InvitationsPanelProps<R>,
  | "roles"
  | "invitableRoles"
  | "defaultRole"
  | "scopes"
  | "scopeRequired"
  | "languages"
  | "defaultLocale"
  | "labels"
  | "intro"
  | "listTitle"
  | "className"
> & {
  /** The server's transport, where the app knows it already. Left out, it is read on load
   *  (`GET /admin/mail`, server-kit 0.30's `user_admin_router`), so the console's hint is
   *  there before the first invitation; then the last answer's. */
  mailBackend?: string | null;
  /** The app's words for a refusal, asked before the kit's `accountFailure`: beside the row
   *  and in the toast. */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** The app's own coded refusals, as `useDescribeAccountFailure` takes them. */
  appCode?: DescribeAccountFailureOptions["appCode"];
  /** An invitation was made, sent again or revoked: what the app shows beside the panel
   *  (Kurvenschmiede's pending count) is the app's to refresh. */
  onChanged?: () => void;
};

/**
 * The admin's invitations (`invitations_admin_router`, user-admin §5): the list, inviting,
 * re-sending and revoking, on the kit's `InvitationsPanel`. On the console mail transport the
 * answer carries the link once (§12.5 item 11), and the panel shows it. The transport is read on
 * load where the server has `GET /admin/mail`, and from each answer after it.
 */
export function AccountInvitationsSection<R extends string = string>({
  mailBackend: mailBackendProp,
  describeError,
  appCode,
  onChanged,
  ...props
}: AccountInvitationsSectionProps<R>) {
  const { list, invite, resend, revoke } = useInvitationsAdmin();
  const describe = useDescribeAccountFailure({ appCode });
  const say = (error: unknown) => describeError?.(error) ?? describe(error);
  // The app's word wins; without one, the server's, read once per sign-in.
  const mail = useAdminMail({ enabled: mailBackendProp === undefined });
  const [answered, setAnswered] = useState<string | null>(null);
  const mailBackend = answered ?? mailBackendProp ?? mail.data?.mail_backend ?? null;
  const said = <T extends { mail_backend: string; link?: string | null; sent: boolean; resent?: boolean; id: number }>(
    answer: T,
  ) => {
    setAnswered(answer.mail_backend);
    onChanged?.();
    return { id: answer.id, link: answer.link ?? null, sent: answer.sent, resent: answer.resent === true };
  };
  const rows: InvitationRow<R>[] = (list.data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: (row.role ?? null) as R | null,
    scope: row.scope ?? null,
    note: row.note ?? null,
    locale: row.locale,
    status: row.status,
    link: row.link ?? null,
    invited_by: row.invited_by ?? null,
    created_at: row.created_at,
    expires_at: row.expires_at,
  }));
  return (
    <InvitationsPanel<R>
      {...props}
      invitations={rows}
      loading={list.isPending && list.fetchStatus !== "idle"}
      mailBackend={mailBackend}
      // The panel says a refusal beside its form — a closed invitation, a scope the app does
      // not take — in the app's words first, else the account words; no toast says it twice.
      describeError={say}
      onInvite={(draft) =>
        invite
          .mutateAsync({
            email: draft.email,
            // The panel names a role only with a role vocabulary; an app with one invitable
            // role passes none, and server-kit's InvitationCreate requires one.
            role: draft.role ?? props.defaultRole ?? props.invitableRoles?.[0] ?? "",
            scope: draft.scope ?? null,
            note: draft.note ?? null,
            locale: draft.locale,
          })
          .then(said)
      }
      onResend={(row) => resend.mutateAsync(Number(row.id)).then(said)}
      onRevoke={(row) => revoke.mutateAsync(Number(row.id)).then(() => onChanged?.())}
    />
  );
}
