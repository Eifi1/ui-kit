import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Button, Card, Input } from "./ui";
import { UserAvatar } from "./user-avatar";

/**
 * App-agnostic account-settings SECTIONS (feedback #333). The presentation lives
 * in @hb/ui; each app injects its own auth-API handlers + translated labels and
 * arranges these next to its own app-specific cards (appearance, budgets, …).
 * Every section is a self-contained <Card> owning its transient form state.
 */

export interface ProfileSettingLabels {
  title: string;
  email: string;
  role: string;
  memberSince: string;
  displayName: string;
  save: string;
}

export function ProfileSetting({
  name,
  email,
  role,
  memberSince,
  value,
  onChange,
  onSave,
  saving,
  labels,
}: {
  name?: string | null;
  email?: string | null;
  role?: ReactNode;
  memberSince?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
  labels: ProfileSettingLabels;
}) {
  const dirty = value.trim().length > 0 && value.trim() !== (name ?? "");
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar name={name} email={email} size="lg" />
        <div className="min-w-0">
          <div className="text-sm font-medium">{labels.title}</div>
          <div className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{email ?? "—"}</div>
        </div>
      </div>
      <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        <span className="text-slate-500">{labels.role}</span>
        <span>{role ?? "—"}</span>
        <span className="text-slate-500">{labels.memberSince}</span>
        <span>{memberSince ?? "—"}</span>
      </div>
      <Input
        id="display-name"
        label={labels.displayName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
      />
      <Button onClick={onSave} disabled={!dirty || saving}>
        {labels.save}
      </Button>
    </Card>
  );
}

export interface PasswordSettingLabels {
  title: string;
  current: string;
  next: string;
  confirm: string;
  submit: string;
  tooShort: string;
  mismatch: string;
}

export function PasswordSetting({
  onSubmit,
  pending,
  minLength = 8,
  labels,
}: {
  /** Called with the validated (current, new) pair; return a promise to auto-clear on success. */
  onSubmit: (currentPassword: string, newPassword: string) => void | Promise<unknown>;
  pending?: boolean;
  minLength?: number;
  labels: PasswordSettingLabels;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (next.length < minLength) {
      setError(labels.tooShort);
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

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">{labels.title}</div>
      <Input type="password" autoComplete="current-password" label={labels.current} value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Input type="password" autoComplete="new-password" label={labels.next} value={next} onChange={(e) => setNext(e.target.value)} />
      <Input type="password" autoComplete="new-password" label={labels.confirm} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      <Button onClick={() => void submit()} disabled={!current || !next || !confirm || pending}>
        {labels.submit}
      </Button>
    </Card>
  );
}

export interface TwoFactorSettingLabels {
  status: string;
  enabledText: string;
  disabledText: string;
  enable: string;
  scanHint: string;
  codeLabel: string;
  verify: string;
  disableSection: string;
  password: string;
  disable: string;
}

export function TwoFactorSetting({
  enabled,
  setup,
  onStartSetup,
  onEnable,
  onDisable,
  busy,
  labels,
}: {
  enabled: boolean;
  /** QR + secret returned by the app's setup call; null before setup starts. */
  setup: { qrSvg: string; secret: string } | null;
  onStartSetup: () => void;
  onEnable: (code: string) => void;
  onDisable: (password: string, code: string) => void;
  busy?: boolean;
  labels: TwoFactorSettingLabels;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  // Browsers autofill one-time-code fields with the saved username; keep the
  // field readOnly until focus to block that.
  const [otpReadonly, setOtpReadonly] = useState(true);
  const onOtpFocus = () => setOtpReadonly(false);

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm">
        {labels.status}: {enabled ? labels.enabledText : labels.disabledText}
      </div>

      {!enabled && !setup && (
        <Button onClick={onStartSetup} disabled={busy}>
          {labels.enable}
        </Button>
      )}

      {setup && (
        <div className="space-y-2">
          <div className="text-xs text-slate-600 dark:text-slate-400">{labels.scanHint}</div>
          <div className="inline-block rounded-md bg-white p-2">
            <img alt="QR" src={`data:image/svg+xml;base64,${setup.qrSvg}`} className="h-48 w-48" />
          </div>
          <div className="break-all font-mono text-xs">{setup.secret}</div>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            readOnly={otpReadonly}
            onFocus={onOtpFocus}
            maxLength={8}
            label={labels.codeLabel}
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
        <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="text-sm font-medium">{labels.disableSection}</div>
          <Input type="password" autoComplete="current-password" label={labels.password} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            readOnly={otpReadonly}
            onFocus={onOtpFocus}
            maxLength={8}
            label={labels.codeLabel}
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
