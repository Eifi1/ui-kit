import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { cn } from "../lib/cn";
import { useDayFormatter } from "../lib/day-format";
import { toDate } from "../lib/format";
import type { LabelOverride } from "../i18n/kit-labels";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { InlineConfirm } from "../components/inline-confirm";
import { Input } from "../components/input";
import { Skeleton } from "../components/skeleton";
import { COMMIT_EXCEPT_BILLING, useWriteLock } from "../components/write-lock";
import { useAccountSettingsLabels } from "./account-settings-labels";
import { SettingsCardTitle } from "../settings/settings-heading";
import type { PasskeysSettingLabels } from "./account-settings-labels";

/** What a passkey's `id` may be: the app's own key type, string or numeric. */
export type PasskeyId = string | number;

/**
 * One registered passkey, as the app's API lists it.
 *
 * Generic in its `id` (0.16.0): `PasskeysSetting` infers `Id` from `passkeys`, so an
 * app whose ids are numbers gets numbers back in `onRename` / `onDelete` — keksdose
 * cast `id as number` in both. Left unparameterised it is the old `string | number`.
 */
export interface PasskeyItem<Id extends PasskeyId = PasskeyId> {
  id: Id;
  name: string;
  /** A `Date`, an ISO string or epoch ms. */
  createdAt?: Date | string | number | null;
  /** Null (or left out) reads as "Never used". */
  lastUsedAt?: Date | string | number | null;
}

/** `data-*` attributes, passed through to the element they are given for. */
export type PasskeyDataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

export interface PasskeysSettingProps<Id extends PasskeyId = PasskeyId> extends PasskeyDataAttributes {
  /** `undefined` while the first load is in flight (or pass `loading`). */
  passkeys: readonly PasskeyItem<Id>[] | undefined;
  loading?: boolean;
  /**
   * Run the WebAuthn ceremony and register the passkey — app-side, since the options
   * and the attestation are the app's server's business. Called with the trimmed name
   * field, which may be EMPTY: pick your own default ("Passkey", the device name).
   * Return the promise and the field clears when it resolves; a rejection (including
   * the user cancelling the OS prompt) keeps what was typed.
   */
  onAdd: (name: string) => void | Promise<unknown>;
  /**
   * A step the app runs BEFORE `onAdd` (0.18.0) — re-asking for the current password,
   * a policy notice, anything that may stop the add. Called with the same trimmed name;
   * resolve `true` to go on to `onAdd`, `false` to stop quietly (nothing is said, the
   * typed name stays). A rejection, or a throw, stops the same way: the app reports
   * its own errors. While it runs the add button is disabled and busy, so a second
   * click cannot start a second check.
   *
   * Kurvenschmiede asked for the password in its own dialog by handing `onAdd` a
   * promise it kept open across that dialog (passkeys-card.tsx) — which still works.
   * This is the documented place for it: open the dialog here, resolve with whether it
   * was confirmed, and keep what it produced (the server's registration options) for
   * `onAdd` in a ref. The ceremony then starts from the dialog's click rather than the
   * card's, which is the user activation `navigator.credentials.create` wants.
   *
   * Left out, `onAdd` is called synchronously in the click, exactly as before.
   */
  beforeAdd?: (name: string) => boolean | Promise<boolean>;
  /**
   * What a passkey does to the password, which picks the line under the title (0.18.0).
   * `"instead"` (default): it replaces it — `labels.description`, kastlan's promise.
   * `"alongside"`: the password stays and the passkey is a second way in —
   * `labels.descriptionAlongside`. Kurvenschmiede overrode `description` for exactly
   * this; an app that sets `mode` needs no override.
   */
  mode?: "instead" | "alongside";
  /** The ceremony is running. The add button says so and does not start a second one. */
  adding?: boolean;
  /** Offer "Rename" on each row. Return a promise to leave edit mode only on success. */
  onRename?: (id: Id, name: string) => void | Promise<unknown>;
  /** Offer "Delete" on each row — always behind an inline confirmation. */
  onDelete?: (id: Id) => void | Promise<unknown>;
  /** A row whose rename or delete is in flight; its buttons are disabled. */
  busyId?: Id | null;
  /** Show the name field above the add button. Default true. */
  nameField?: boolean;
  /**
   * Shown INSTEAD of the list and the add button — passkeys are not supported by this
   * browser, or the page is not a secure context. Its wording is the app's: only the
   * app knows which of those it detected.
   */
  unavailable?: ReactNode;
  /** A date for the "Added …" / "Last used …" lines. Default: the provider's `formatDate`
   *  (the app's date preference), else a medium date in the provider's locale and
   *  `timeZone`. */
  formatDate?: (date: Date) => string;
  /** Overrides the provider's locale for the default date format. */
  locale?: string;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { passkeys } }}>` > English. */
  labels?: LabelOverride<PasskeysSettingLabels>;
  className?: string;
  /** On the card (0.16.0), for an in-page link (`#passkeys`) or a test hook. `data-*`
   *  attributes go there too. */
  id?: string;
  /** Extra attributes for one row's `<li>` (0.16.0) — an `id` to scroll a just-added
   *  key into view, `data-*` for a test. Every row also carries `data-passkey-id`. */
  rowProps?: (item: PasskeyItem<Id>) => ({ id?: string } & PasskeyDataAttributes) | undefined;
}

/**
 * The passkeys section of an account page: what is registered, when it was last used,
 * rename and delete, and "Add passkey" — the fourth card beside `ProfileSetting`,
 * `PasswordSetting` and `TwoFactorSetting`, and built the same way (a self-contained
 * `<Card>` owning its transient form state; the app owns the data and the API).
 *
 * Lifted from kastlan's passkeys-card. **The WebAuthn ceremony stays app-side**:
 * `navigator.credentials.create` needs options minted by the app's server and hands
 * back an attestation only that server can verify, so the kit calls `onAdd` and waits.
 *
 * **Delete confirms inline**, in the row, rather than through `useConfirm`: this card
 * must work in an app without a `ConfirmProvider`, and the question belongs next to
 * the passkey it names. Focus moves to Cancel, as in every destructive confirm in the
 * kit, so the Enter that pressed Delete cannot also answer it.
 *
 * **Under a write lock** (0.52) Add, Rename, Delete and the confirm are `commit` controls
 * exempt from billing — a lapsed plan still lets the account manage how it signs in, the
 * demo does not. Until 0.52 the passkeys' confirm was the one inline confirm without it,
 * so the demo could delete, rename and add (refactor audit 2026-10-30, DUP-10).
 */
export function PasskeysSetting<Id extends PasskeyId = PasskeyId>({
  passkeys,
  loading,
  onAdd,
  beforeAdd,
  mode = "instead",
  adding = false,
  onRename,
  onDelete,
  busyId,
  nameField = true,
  unavailable,
  formatDate,
  locale: localeProp,
  labels: labelsProp,
  className,
  rowProps,
  ...rest
}: PasskeysSettingProps<Id>) {
  const labels = useAccountSettingsLabels("passkeys", labelsProp);
  // The prop, else the provider's `formatDate`, else the kit's in the provider's locale and
  // `timeZone`; a bare "YYYY-MM-DD" is read on its calendar (refactor audit 2026-10-30,
  // DUP-2: this card parsed with `new Date` and built its own `Intl` formatter).
  // The raw value goes in, so a bare day keeps its calendar; the prop still gets a Date.
  const own = useMemo(
    () =>
      formatDate &&
      ((value: PasskeyItem["createdAt"]) => {
        const date = toDate(value);
        return date ? formatDate(date) : "";
      }),
    [formatDate],
  );
  const day = useDayFormatter(own, localeProp);
  const lock = useWriteLock(COMMIT_EXCEPT_BILLING);
  const [name, setName] = useState("");
  // `beforeAdd` is running. State for the button, and a ref for the guard: two clicks
  // in one frame both read the state from before either set it.
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);

  const date = (value: PasskeyItem["createdAt"]): string | null => {
    return toDate(value) ? day(value) : null;
  };

  const add = () => {
    // The name field's Enter reaches here too, past the locked button.
    if (adding || checkingRef.current || lock.locked) return;
    const typed = name;
    const value = typed.trim();
    const send = () =>
      Promise.resolve(onAdd(value))
        // Clear only what was sent: the field stays editable while the OS prompt is up.
        .then(() => setName((current) => (current === typed ? "" : current)));
    if (!beforeAdd) {
      send().catch(() => {});
      return;
    }
    const done = () => {
      checkingRef.current = false;
      setChecking(false);
    };
    checkingRef.current = true;
    setChecking(true);
    let gate: Promise<boolean>;
    // Called in the click, not a microtask later, so a step that itself needs the
    // user's activation (a popup, the clipboard) still has it; a throw is a "no".
    try {
      gate = Promise.resolve(beforeAdd(value));
    } catch (error) {
      gate = Promise.reject(error);
    }
    gate
      .then((go) => {
        done();
        // Strictly `true`: an app whose step resolves `undefined` meant nothing.
        if (go === true) return send();
      })
      .catch(done);
  };
  const busy = adding || checking;

  const isLoading = loading || passkeys === undefined;
  const items = passkeys ?? [];

  const body = (() => {
    if (unavailable != null && unavailable !== false) {
      return <EmptyState variant="inline" size="sm" icon={<KeyRound />} title={unavailable} />;
    }
    return (
      <>
        {isLoading ? (
          <Skeleton lines={2} label={labels.loading} />
        ) : items.length === 0 ? (
          <EmptyState variant="inline" size="sm" icon={<KeyRound />} title={labels.empty} />
        ) : (
          <ul aria-label={labels.list} className="divide-y divide-subtle">
            {items.map((item) => (
              <PasskeyRow
                key={item.id}
                item={item}
                created={date(item.createdAt)}
                lastUsed={date(item.lastUsedAt)}
                attributes={rowProps?.(item)}
                busy={busyId !== undefined && busyId !== null && busyId === item.id}
                locked={lock.locked}
                onRename={onRename}
                onDelete={onDelete}
                labels={labels}
              />
            ))}
          </ul>
        )}
        <div className="space-y-2 pt-1">
          {nameField && (
            <Input
              label={labels.nameLabel}
              placeholder={labels.namePlaceholder}
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
          )}
          <Button onClick={add} commit={COMMIT_EXCEPT_BILLING} disabled={busy} aria-busy={busy || undefined}>
            <KeyRound className="size-4" aria-hidden />
            {adding ? labels.adding : labels.add}
          </Button>
        </div>
      </>
    );
  })();

  return (
    // `rest` is only `id` and `data-*`: everything else the props name is destructured.
    <Card {...rest} className={cn("p-4 space-y-3", className)}>
      <div>
        <SettingsCardTitle>{labels.title}</SettingsCardTitle>
        <div className="text-xs text-muted">
          {mode === "alongside" ? labels.descriptionAlongside : labels.description}
        </div>
      </div>
      {body}
    </Card>
  );
}

type RowMode = "view" | "rename" | "delete";

function PasskeyRow<Id extends PasskeyId>({
  item,
  created,
  lastUsed,
  attributes,
  busy,
  locked,
  onRename,
  onDelete,
  labels,
}: {
  item: PasskeyItem<Id>;
  created: string | null;
  lastUsed: string | null;
  attributes?: { id?: string } & PasskeyDataAttributes;
  busy: boolean;
  /** A write lock holds: the rename field's Enter saves nothing. */
  locked: boolean;
  onRename?: PasskeysSettingProps<Id>["onRename"];
  onDelete?: PasskeysSettingProps<Id>["onDelete"];
  labels: PasskeysSettingLabels;
}) {
  const [mode, setMode] = useState<RowMode>("view");
  const [draft, setDraft] = useState(item.name);
  // Which button opened the sub-mode, so leaving it puts focus back there — the field or
  // the confirm unmounts under the focus, which otherwise falls to <body>. InlineConfirm
  // returns it on Cancel and Escape; this also covers a delete that succeeded while the
  // row stayed (the list not refreshed yet) and a rename.
  const [returnTo, setReturnTo] = useState<"rename" | "delete" | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const renameButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode === "rename") renameRef.current?.select();
    else if (mode === "view" && returnTo) (returnTo === "rename" ? renameButtonRef : deleteButtonRef).current?.focus();
  }, [mode, returnTo]);

  const open = (next: "rename" | "delete") => {
    setReturnTo(next);
    setDraft(item.name);
    setMode(next);
  };
  const leave = () => setMode("view");

  const saveRename = () => {
    const next = draft.trim();
    if (!onRename || !next || busy || locked) return;
    if (next === item.name) {
      leave();
      return;
    }
    Promise.resolve(onRename(item.id, next))
      .then(leave)
      .catch(() => {});
  };

  const confirmDelete = () => {
    if (!onDelete || busy) return;
    // The row unmounts once the list refreshes; on a failure it stays, confirm open.
    Promise.resolve(onDelete(item.id))
      .then(() => setMode("view"))
      .catch(() => {});
  };

  // On every mode's <li>, so an id the app scrolls to survives a rename or a confirm.
  const li = { ...attributes, "data-passkey-id": String(item.id) };

  const meta = [created && labels.created(created), lastUsed ? labels.lastUsed(lastUsed) : labels.neverUsed]
    .filter(Boolean)
    .join(" · ");

  if (mode === "rename") {
    return (
      <li {...li} className="flex flex-wrap items-center gap-2 py-2">
        <Input
          ref={renameRef}
          aria-label={labels.renameField(item.name)}
          className="min-w-0 flex-1"
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              leave();
            }
          }}
        />
        <Button size="sm" onClick={saveRename} commit={COMMIT_EXCEPT_BILLING} disabled={busy || !draft.trim()}>
          {labels.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={leave}>
          {labels.cancel}
        </Button>
      </li>
    );
  }

  if (mode === "delete") {
    return (
      <InlineConfirm
        as="li"
        {...li}
        className="py-2"
        prompt={labels.deleteConfirm(item.name)}
        confirmLabel={labels.confirmDelete}
        cancelLabel={labels.cancel}
        onConfirm={confirmDelete}
        onLeave={leave}
        busy={busy}
        commit={COMMIT_EXCEPT_BILLING}
        returnFocusRef={deleteButtonRef}
      />
    );
  }

  return (
    <li {...li} className="flex items-center gap-3 py-2">
      <KeyRound className="size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        {/* The passkey's own name, which its owner typed: cut at Normal, wrapped from
            Large up (text size §10.17; round 0.34 T1: the sweep read "MacBook To…"). */}
        <div className="truncate-until-large text-sm font-medium">{item.name}</div>
        <div className="text-xs text-muted">{meta}</div>
      </div>
      {onRename && (
        <Button
          ref={renameButtonRef}
          size="sm"
          variant="ghost"
          commit={COMMIT_EXCEPT_BILLING}
          disabled={busy}
          onClick={() => open("rename")}
          aria-label={labels.renameItem(item.name)}
        >
          {labels.rename}
        </Button>
      )}
      {onDelete && (
        <Button
          ref={deleteButtonRef}
          size="sm"
          variant="ghost"
          tone="danger"
          commit={COMMIT_EXCEPT_BILLING}
          disabled={busy}
          onClick={() => open("delete")}
          aria-label={labels.deleteItem(item.name)}
        >
          {labels.delete}
        </Button>
      )}
    </li>
  );
}
