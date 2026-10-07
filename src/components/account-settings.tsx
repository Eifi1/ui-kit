import { useId, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { Button, Card, Input } from "./ui";
import { UserAvatar } from "./user-avatar";
import { CopyButton } from "./copy-button";
import { QrCode } from "./qr-code";
import { OneTimeCodeInput } from "./one-time-code-input";
import { usePromisePending } from "./danger-confirm";
import { personNameOk, PERSON_NAME_MAX_LENGTH } from "../auth/form-rules";
import {
  DEFAULT_PASSWORD_STRENGTH_LABELS,
  passwordByteLength,
  PasswordStrengthMeter,
} from "./password-strength";
import type { PasswordStrengthMeterProps } from "./password-strength";
import { useKitLabelOverrides, useKitLabels } from "../i18n/kit-labels";
import { Chip } from "./chip";
import { useAccountSettingsLabels } from "./account-settings-labels";
import { SettingsCardTitle } from "../settings/settings-heading";
import type {
  PasswordSettingLabels,
  ProfileSettingLabels,
  TwoFactorSettingLabels,
} from "./account-settings-labels";

// The label types moved beside the namespace's defaults (0.12.0); re-exported here so
// every existing `import type { ProfileSettingLabels }` keeps resolving.
export type {
  AccountSettingsLabels,
  PasskeysSettingLabels,
  PasswordSettingLabels,
  ProfileSettingLabels,
  TwoFactorSettingLabels,
} from "./account-settings-labels";
export { DEFAULT_ACCOUNT_SETTINGS_LABELS } from "./account-settings-labels";

/**
 * App-agnostic account-settings SECTIONS (feedback #333). The presentation lives
 * in @hb/ui; each app injects its own auth-API handlers + translated labels and
 * arranges these next to its own app-specific cards (appearance, budgets, …).
 * Every section is a self-contained <Card> owning its transient form state.
 *
 * Every `labels` prop is optional since 0.12.0: the strings come from the provider's
 * `accountSettings` namespace, then English (see account-settings-labels.ts).
 */

/** What {@link ProfileSetting} hands `onSave` in its two-field form (0.30.0): both
 *  trimmed, 1–120 characters each — the `PATCH /auth/me` body's `first_name` /
 *  `last_name` (docs/user-admin-harmonization.md §6.1). */
export interface ProfileNameValues {
  firstName: string;
  lastName: string;
}

/** What both forms of {@link ProfileSetting} take. */
interface ProfileSettingCommonProps {
  name?: string | null;
  email?: string | null;
  role?: ReactNode;
  memberSince?: ReactNode;
  saving?: boolean;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { profile } }}>` > English. */
  labels?: Partial<ProfileSettingLabels>;
  /** The card's DOM id — a settings catalogue `anchor`, so `?focus=` can ring it (0.31). */
  id?: string;
}

/**
 * The single display name, as before 0.30.0 — controlled through `value` / `onChange`,
 * saved by `onSave()`. Kept unchanged for an app that has not moved to first and last
 * name yet.
 */
export interface ProfileSettingDisplayNameProps extends ProfileSettingCommonProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  firstName?: undefined;
  lastName?: undefined;
}

/**
 * First and last name (0.30.0, docs/user-admin-harmonization.md §6.1): the saved
 * values in, the edited ones out through `onSave`. The card keeps the drafts itself.
 */
export interface ProfileSettingNamesProps extends ProfileSettingCommonProps {
  /** The saved given name — `first_name`. `null` reads as empty. */
  firstName: string | null;
  /** The saved family name — `last_name`. `null` (a migrated account, §3.3) reads as
   *  empty, and Save then waits for one. */
  lastName: string | null;
  /**
   * Save the two names (`PATCH /auth/me`, which also clears `name_incomplete`). Return
   * a promise and Save is busy until it settles. Refresh `firstName` / `lastName` from
   * the answer: the card compares its drafts with them, so Save turns off once the new
   * names come back. A rejection keeps what was typed — the app says why (a toast), as
   * for `PasswordSetting`.
   */
  onSave: (values: ProfileNameValues) => void | Promise<unknown>;
  value?: undefined;
  onChange?: undefined;
}

export type ProfileSettingProps = ProfileSettingDisplayNameProps | ProfileSettingNamesProps;

/**
 * The profile section: avatar, address, role, member since, and the name.
 *
 * **Two forms.** Given `firstName` / `lastName` (0.30.0, §6.1) it edits first and last
 * name in two fields, side by side where the card is wide enough — the order and the
 * 1–120-character rule of `RegisterForm` (auth §3.1), so the name a person signed up
 * with is edited the way it was typed. Without them it is the single `displayName`
 * field it always was, `value` / `onChange` / `onSave()` unchanged, for an app that has
 * not moved yet (kastlan split the one name at its first space on save; Kurvenschmiede
 * built its own card instead).
 *
 * The two-field form owns its drafts, starting from the saved names and following them
 * when they change; Save waits for a change, holds — saying why — while a name is
 * blank, and is a `commit` (a {@link WriteLockProvider} locks it, keksdose's demo).
 */
export function ProfileSetting(props: ProfileSettingProps) {
  const { name, email, role, memberSince, labels: labelsProp, id } = props;
  const labels = useAccountSettingsLabels("profile", labelsProp);
  const names = props.firstName !== undefined || props.lastName !== undefined;
  return (
    <Card id={id} className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar
          name={name}
          email={email}
          person={names ? { first: props.firstName, last: props.lastName } : undefined}
          size="lg"
        />
        <div className="min-w-0">
          {/* A heading inside a SettingsLayout (0.31, docs/settings-harmonization.md
              §3.7), the plain div it always was outside one. */}
          <SettingsCardTitle>{labels.title}</SettingsCardTitle>
          <div className="truncate font-mono text-xs text-[var(--text-muted)]">
            {/* `email` was a required key that nothing rendered; it names the address
                for a screen reader, which otherwise hears a bare string under a title. */}
            <span className="sr-only">{labels.email}: </span>
            {email ?? "—"}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        <span className="text-[var(--text-muted)]">{labels.role}</span>
        <span>{role ?? "—"}</span>
        <span className="text-[var(--text-muted)]">{labels.memberSince}</span>
        <span>{memberSince ?? "—"}</span>
      </div>
      {names ? (
        <PersonNameFields
          firstName={props.firstName ?? ""}
          lastName={props.lastName ?? ""}
          onSave={(props as ProfileSettingNamesProps).onSave}
          saving={props.saving}
          labels={labels}
        />
      ) : (
        <DisplayNameField
          name={name}
          value={(props as ProfileSettingDisplayNameProps).value}
          onChange={(props as ProfileSettingDisplayNameProps).onChange}
          onSave={(props as ProfileSettingDisplayNameProps).onSave}
          saving={props.saving}
          labels={labels}
        />
      )}
    </Card>
  );
}

/** The single-name form — exactly the 0.29 card's field and button. */
function DisplayNameField({
  name,
  value,
  onChange,
  onSave,
  saving,
  labels,
}: {
  name?: string | null;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
  labels: Required<ProfileSettingLabels>;
}) {
  const dirty = value.trim().length > 0 && value.trim() !== (name ?? "");
  // Generated, not the literal "display-name" it was: two of these on one page (an
  // admin editing someone else's profile beside their own) shared an id, and the
  // second label pointed at the first field.
  const inputId = useId();
  return (
    <>
      <Input
        id={inputId}
        label={labels.displayName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
      />
      <Button onClick={onSave} disabled={!dirty || saving}>
        {labels.save}
      </Button>
    </>
  );
}

/** The first-and-last form (0.30.0, §6.1). */
function PersonNameFields({
  firstName,
  lastName,
  onSave,
  saving,
  labels,
}: {
  firstName: string;
  lastName: string;
  onSave: (values: ProfileNameValues) => void | Promise<unknown>;
  saving?: boolean;
  labels: Required<ProfileSettingLabels>;
}) {
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  // The saved names moved (the save came back, another tab renamed): the drafts follow
  // them. During render, as DangerConfirm resets its fields, so no frame shows the old
  // draft beside the new name.
  const [saved, setSaved] = useState({ firstName, lastName });
  if (saved.firstName !== firstName || saved.lastName !== lastName) {
    setSaved({ firstName, lastName });
    setFirst(firstName);
    setLast(lastName);
  }
  const { pending, run } = usePromisePending();
  const busy = Boolean(saving) || pending;
  const valid = personNameOk(first) && personNameOk(last);
  const dirty = first.trim() !== firstName.trim() || last.trim() !== lastName.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || !dirty || busy) return;
    // A rejection keeps the drafts; the app reports it, as PasswordSetting's does.
    run(onSave({ firstName: first.trim(), lastName: last.trim() }), () => {});
  };

  return (
    <form className="@container space-y-3" onSubmit={submit} noValidate>
      {/* The order and the rule of RegisterForm's two fields (auth §3.1). */}
      <div className="grid gap-3 @xs:grid-cols-2">
        <Input
          name="given-name"
          autoComplete="given-name"
          label={labels.firstName}
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          maxLength={PERSON_NAME_MAX_LENGTH}
          readOnly={busy}
          required
        />
        <Input
          name="family-name"
          autoComplete="family-name"
          label={labels.lastName}
          value={last}
          onChange={(e) => setLast(e.target.value)}
          maxLength={PERSON_NAME_MAX_LENGTH}
          readOnly={busy}
          required
        />
      </div>
      <Button
        type="submit"
        commit
        pending={busy}
        // A blank name is a reason the person can act on; an unchanged one is not —
        // there is nothing to save, and the button is simply off.
        disabled={valid && !dirty}
        disabledReason={valid ? undefined : labels.nameRequired}
      >
        {labels.save}
      </Button>
    </form>
  );
}

/**
 * What {@link PasswordSetting}'s `strength` takes besides `true`: the meter's own options,
 * minus the ones the card owns — `value` (the new password), `minLength` (the card's, so
 * the checklist's length rule and the submit's check are one number) and `maxBytes`
 * (the card's own prop, which the submit enforces as well).
 */
export type PasswordSettingStrength = Pick<PasswordStrengthMeterProps, "score" | "showRequirements" | "labels">;

export function PasswordSetting({
  onSubmit,
  pending,
  minLength = 8,
  strength,
  maxBytes,
  labels: labelsProp,
  id,
}: {
  /** Called with the validated (current, new) pair; return a promise to auto-clear on success. */
  onSubmit: (currentPassword: string, newPassword: string) => void | Promise<unknown>;
  pending?: boolean;
  /** The shortest new password the card submits, in characters as a person counts them
   *  (an emoji is one). Keep it in step with the server's own minimum. Default 8. */
  minLength?: number;
  /**
   * Show the {@link PasswordStrengthMeter} under the new-password field (0.22.0,
   * kastlan's input audit): the bar, the level in words and the checklist, with the
   * length rule drawn from `minLength`. `true` for the meter as it comes; an object for
   * its `score` (zxcvbn's, say), `showRequirements` or `labels`.
   *
   * Off by default, so a card that never asked for it does not grow one. The meter is
   * advisory, as everywhere in the kit: it blocks nothing — the card's own checks do
   * (`minLength`, the confirmation, `maxBytes`).
   */
  strength?: boolean | PasswordSettingStrength;
  /**
   * A byte ceiling on the new password — bcrypt reads at most 72 BYTES and ignores the
   * rest, which is kastlan's case: `maxBytes={72}`. A new password over it is refused
   * on submit with the meter's own "too long" sentence (the `passwordStrength`
   * namespace's `tooLong`), and the meter, when shown, warns while it is typed.
   *
   * Unset by default, and leave it unset for a secret with no ceiling: an invented one
   * talks people out of the long passphrase they chose.
   */
  maxBytes?: number;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { password } }}>` > English. */
  labels?: Partial<PasswordSettingLabels>;
  /** The card's DOM id — a settings catalogue `anchor`, so `?focus=` can ring it (0.31). */
  id?: string;
}) {
  const labels = useAccountSettingsLabels("password", labelsProp);
  const strengthOptions = typeof strength === "object" ? strength : undefined;
  // Only for `tooLong`: the sentence the meter shows is the one the refusal says.
  const strengthLabels = useKitLabels("passwordStrength", DEFAULT_PASSWORD_STRENGTH_LABELS, strengthOptions?.labels);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    // Code points, not UTF-16 units — the count the meter's checklist and a server's
    // `len()` use. `next.length` counted an emoji as two, so four of them passed a
    // minimum of eight that the meter beside the field said they missed.
    if ([...next].length < minLength) {
      setError(labels.tooShort);
      return;
    }
    if (maxBytes !== undefined && passwordByteLength(next) > maxBytes) {
      setError(strengthLabels.tooLong(maxBytes));
      return;
    }
    if (next !== confirm) {
      setError(labels.mismatch);
      return;
    }
    setError(null);
    try {
      await onSubmit(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      // The app surfaces the failure (e.g. a toast); keep the fields for a retry.
    }
  };

  const nextField = (
    <Input type="password" autoComplete="new-password" label={labels.next} value={next} onChange={(e) => setNext(e.target.value)} />
  );

  return (
    <Card id={id} className="p-4 space-y-3">
      <SettingsCardTitle>{labels.title}</SettingsCardTitle>
      <Input type="password" autoComplete="current-password" label={labels.current} value={current} onChange={(e) => setCurrent(e.target.value)} />
      {strength ? (
        // One box for the field and its meter, so the card's `space-y-3` spaces the pair
        // from its neighbours and the meter keeps its own small gap under the field.
        <div>
          {nextField}
          <PasswordStrengthMeter
            value={next}
            minLength={minLength}
            maxBytes={maxBytes}
            score={strengthOptions?.score}
            showRequirements={strengthOptions?.showRequirements}
            labels={strengthOptions?.labels}
          />
        </div>
      ) : (
        nextField
      )}
      <Input type="password" autoComplete="new-password" label={labels.confirm} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <Button onClick={() => void submit()} disabled={!current || !next || !confirm || pending}>
        {labels.submit}
      </Button>
    </Card>
  );
}

/**
 * What the app's setup call returned.
 *
 * `otpauthUri` (0.12.0) is what an authenticator backend actually hands out; the kit
 * draws the QR code itself ({@link QrCode}) and reads the manual-entry key out of the
 * URI's `secret` parameter when `secret` is not given. The `qrSvg` shape — a
 * base64-encoded SVG image — is what the section took before, which made every app
 * render a QR library to a static string and base64 it only for the kit to draw it back.
 */
export type TwoFactorSetupData =
  | { qrSvg: string; secret: string }
  | { otpauthUri: string; secret?: string };

/** The `secret` parameter of an `otpauth://` URI, or null. */
function otpauthSecret(uri: string): string | null {
  const match = /[?&]secret=([^&#]*)/i.exec(uri);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]) || null;
  } catch {
    return match[1] || null;
  }
}

/** "JBSW Y3DP EHPK 3PXP": the key in groups of four, which is how an authenticator's
 *  manual-entry screen shows it and how a person copies it by eye. */
function groupSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

export function TwoFactorSetting({
  enabled,
  setup,
  onStartSetup,
  onEnable,
  onDisable,
  busy,
  renderQr,
  labels: labelsProp,
  id,
}: {
  enabled: boolean;
  /** What the app's setup call returned; null before setup starts. */
  setup: TwoFactorSetupData | null;
  onStartSetup: () => void;
  onEnable: (code: string) => void;
  onDisable: (password: string, code: string) => void;
  busy?: boolean;
  /** Draw the code yourself (a branded QR, a library you already ship). Given the
   *  `otpauthUri`; the kit's own {@link QrCode} otherwise. Unused with `qrSvg`. */
  renderQr?: (otpauthUri: string) => ReactNode;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { twoFactor } }}>` > English. */
  labels?: Partial<TwoFactorSettingLabels>;
  /** The card's DOM id — a settings catalogue `anchor`, so `?focus=` can ring it (0.31). */
  id?: string;
}) {
  const labels = useAccountSettingsLabels("twoFactor", labelsProp);
  // The title (0.31, docs/settings-harmonization.md §3.7) is new, and an app that
  // translated this card before it named the setting in `status` — "2FA",
  // "Zwei-Faktor-Authentifizierung". Each source's `title` first, then its `status`, so
  // that app keeps its own word instead of meeting the English title.
  const overrides = useKitLabelOverrides("accountSettings")?.twoFactor;
  const title = labelsProp?.title ?? overrides?.title ?? labelsProp?.status ?? overrides?.status ?? labels.title;
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  // Both code fields are a OneTimeCodeInput (0.22.0) — the field this card wrote by hand
  // twice — and keep what they did:
  //  - `readOnlyUntilFocus`: browsers autofill a one-time-code field with the saved
  //    username (the disable form has a current-password field right above it), and a
  //    read-only field is never autofilled. The guard drops on focus, and the field
  //    keeps the look of an editable one meanwhile (FIELD_WRITABLE_LOOK) — see the prop.
  //  - `length={8}`: the `maxLength={8}` they had, so an authenticator issuing eight
  //    digits still fits. What changed is that they now take digits only: "123 456"
  //    pasted from an authenticator that groups its digits used to reach `onEnable`
  //    with the space in it.
  //  - one `code` state for both, as before.
  const secret = setup
    ? (setup.secret ?? ("otpauthUri" in setup ? otpauthSecret(setup.otpauthUri) : null))
    : null;

  return (
    <Card id={id} className="p-4 space-y-3">
      {/* The card had only "Two-factor authentication: Off". A settings page outlines its
          cards by their titles (§3.7), so the setting's name is the title now, and the
          state stands beside it as a chip instead of repeating the name. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SettingsCardTitle>{title}</SettingsCardTitle>
        <Chip size="sm" tone={enabled ? "success" : "neutral"}>
          {enabled ? labels.enabledText : labels.disabledText}
        </Chip>
      </div>

      {!enabled && !setup && (
        <Button onClick={onStartSetup} disabled={busy}>
          {labels.enable}
        </Button>
      )}

      {setup && (
        <div className="space-y-2">
          <div className="text-xs text-[var(--text-secondary)]">{labels.scanHint}</div>
          {/* `bg-white`, NOT `--bg-surface`, and it must stay that way: a QR code is
              read by a camera looking for maximum contrast between the modules and
              their quiet zone. On the dark theme a surface-coloured backing makes it
              slow to acquire, and on a warm light preset it lowers the contrast ratio
              the spec is written against. This is the one place in the kit where a
              literal colour is the correct answer. `data-private`: the code IS the
              second factor, and demo mode blurs it like any other secret. */}
          {"otpauthUri" in setup ? (
            // No backing of its own: QrCode draws its quiet zone white inside the SVG.
            <div data-private className="inline-block overflow-hidden rounded-md">
              {renderQr ? (
                renderQr(setup.otpauthUri)
              ) : (
                <QrCode value={setup.otpauthUri} label={labels.qrAlt} className="size-48" />
              )}
            </div>
          ) : (
            <div data-private className="inline-block rounded-md bg-white p-2">
              <img
                alt={labels.qrAlt}
                src={`data:image/svg+xml;base64,${setup.qrSvg}`}
                className="h-48 w-48"
              />
            </div>
          )}
          {secret && (
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-secondary)]">{labels.secretHint}</div>
              <div className="flex items-center gap-1">
                {/* `dir="ltr"`: a base32 key is Latin letters and digits in a fixed
                    order, and in an RTL page the groups would otherwise be laid out
                    right to left. */}
                <code data-private dir="ltr" className="break-all font-mono text-xs select-all">
                  {groupSecret(secret)}
                </code>
                <CopyButton text={secret} label={labels.copySecret} size="xs" tone="muted" />
              </div>
            </div>
          )}
          <OneTimeCodeInput
            readOnlyUntilFocus
            length={8}
            label={labels.codeLabel}
            value={code}
            onChange={setCode}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && code && !busy) {
                e.preventDefault();
                onEnable(code);
              }
            }}
          />
          <Button onClick={() => onEnable(code)} disabled={!code || busy}>
            {labels.verify}
          </Button>
        </div>
      )}

      {enabled && (
        <div className="space-y-3 border-t border-[var(--border)] pt-3">
          <div className="text-sm font-medium">{labels.disableSection}</div>
          <Input type="password" autoComplete="current-password" label={labels.password} value={password} onChange={(e) => setPassword(e.target.value)} />
          <OneTimeCodeInput
            readOnlyUntilFocus
            length={8}
            label={labels.codeLabel}
            value={code}
            onChange={setCode}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && password && code && !busy) {
                e.preventDefault();
                onDisable(password, code);
              }
            }}
          />
          <Button variant="danger" onClick={() => onDisable(password, code)} disabled={!password || !code || busy}>
            {labels.disable}
          </Button>
        </div>
      )}
    </Card>
  );
}
