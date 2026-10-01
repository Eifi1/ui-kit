import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLocale } from "../i18n/kit-labels";
import { Button, Card, EmptyState, Input } from "./ui";
import { Skeleton } from "./skeleton";
import { useAccountSettingsLabels } from "./account-settings-labels";
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
  /** A date for the "Added …" / "Last used …" lines. Default: the locale's medium date. */
  formatDate?: (date: Date) => string;
  /** Overrides the provider's locale for the default date format. */
  locale?: string;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { passkeys } }}>` > English. */
  labels?: Partial<PasskeysSettingLabels>;
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
 */
export function PasskeysSetting<Id extends PasskeyId = PasskeyId>({
  passkeys,
  loading,
  onAdd,
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
  const locale = useKitLocale(localeProp);
  const [name, setName] = useState("");

  const date = (value: PasskeyItem["createdAt"]): string | null => {
    if (value === null || value === undefined || value === "") return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return formatDate ? formatDate(d) : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
  };

  const add = () => {
    if (adding) return;
    const typed = name;
    Promise.resolve(onAdd(typed.trim()))
      // Clear only what was sent: the field stays editable while the OS prompt is up.
      .then(() => setName((current) => (current === typed ? "" : current)))
      .catch(() => {});
  };

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
          <ul aria-label={labels.list} className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <PasskeyRow
                key={item.id}
                item={item}
                created={date(item.createdAt)}
                lastUsed={date(item.lastUsedAt)}
                attributes={rowProps?.(item)}
                busy={busyId !== undefined && busyId !== null && busyId === item.id}
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
          <Button onClick={add} disabled={adding} aria-busy={adding || undefined}>
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
        <div className="text-sm font-medium">{labels.title}</div>
        <div className="text-xs text-[var(--text-muted)]">
          {labels.description}
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
  onRename,
  onDelete,
  labels,
}: {
  item: PasskeyItem<Id>;
  created: string | null;
  lastUsed: string | null;
  attributes?: { id?: string } & PasskeyDataAttributes;
  busy: boolean;
  onRename?: PasskeysSettingProps<Id>["onRename"];
  onDelete?: PasskeysSettingProps<Id>["onDelete"];
  labels: PasskeysSettingLabels;
}) {
  const [mode, setMode] = useState<RowMode>("view");
  const [draft, setDraft] = useState(item.name);
  // Which button opened the sub-mode, so leaving it puts focus back there — the
  // confirm or the field unmounts under the focus, which otherwise falls to <body>.
  const [returnTo, setReturnTo] = useState<"rename" | "delete" | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const renameButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode === "delete") cancelDeleteRef.current?.focus();
    else if (mode === "rename") renameRef.current?.select();
    else if (returnTo) (returnTo === "rename" ? renameButtonRef : deleteButtonRef).current?.focus();
  }, [mode, returnTo]);

  const open = (next: "rename" | "delete") => {
    setReturnTo(next);
    setDraft(item.name);
    setMode(next);
  };
  const leave = () => setMode("view");
  const escapeLeaves = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      leave();
    }
  };

  const saveRename = () => {
    const next = draft.trim();
    if (!onRename || !next || busy) return;
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
        <Button size="sm" onClick={saveRename} disabled={busy || !draft.trim()}>
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
      <li {...li} className="space-y-2 py-2">
        <p role="alert" className="text-sm">
          {labels.deleteConfirm(item.name)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="danger" onClick={confirmDelete} onKeyDown={escapeLeaves} disabled={busy}>
            {labels.confirmDelete}
          </Button>
          <Button ref={cancelDeleteRef} size="sm" variant="ghost" onClick={leave} onKeyDown={escapeLeaves}>
            {labels.cancel}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li {...li} className="flex items-center gap-3 py-2">
      <KeyRound className="size-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.name}</div>
        <div className="text-xs text-[var(--text-muted)]">{meta}</div>
      </div>
      {onRename && (
        <Button
          ref={renameButtonRef}
          size="sm"
          variant="ghost"
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
