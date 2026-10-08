import { useState } from "react";
import type { ReactNode } from "react";
import { Trash2, UserPlus, UsersRound } from "lucide-react";

import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { AlertBanner } from "./alert-banner";
import { Autocomplete } from "./autocomplete";
import type { ComboOption } from "./combobox-core";
import { Chip } from "./chip";
import { RoleChip } from "./account-chips";
import type { RoleDefinition } from "./account-chips";
import { useConfirm } from "./confirm-dialog";
import { CopyButton } from "./copy-button";
import { DialogFrame } from "./dialog-frame";
import type { DialogFrameProps } from "./dialog-frame";
import { Caption, SectionLabel } from "./text";
import { ToggleGroup } from "./toggle-group";
import { Tooltip } from "./tooltip";
import { Button, Card, IconButton, Spinner } from "./ui";
import { useWriteLock } from "./write-lock";
import type { CardProps } from "./ui";
import type { DisabledReasonDisplay } from "./field-parts";

/**
 * Who holds one record, and the owner's every way of changing that — Kurvenschmiede's
 * `features/sharing/share-dialog.tsx` and keksdose's `features/budgets/budget-share-card.tsx`,
 * which are the same component twice (Kurvenschmiede's own doc comment says so).
 *
 * Presentational: the kit draws the rows, asks before a removal (the kit's
 * {@link useConfirm}), keeps the field and the busy state, and checks only that an
 * address is SHAPED like one. Everything that is policy stays with the app — who may
 * share, whether an address has an account (that is what makes a grant pending), what
 * a role permits, every request — through the callbacks, which may return a promise.
 */

// ── Labels ────────────────────────────────────────────────────────────────────

export interface ShareCardLabels {
  /** ShareDialog's heading. */
  dialogTitle: string;
  /** ShareDialog's close button. */
  close: string;
  /** The add field's label. */
  email: string;
  /** The add field's label when `addWithoutEmail` lets it stay empty. */
  emailOptional: string;
  emailPlaceholder: string;
  /** Under the field when what was typed is not an address. */
  invalidEmail: string;
  /** Accessible name of the role choice beside the field. */
  role: string;
  /** Accessible name of one grantee's role choice. */
  roleOf: (name: string) => string;
  /** The add button. */
  add: string;
  /** Heading over the list. */
  whoHasAccess: string;
  /** The list is empty. */
  nobodyYet: string;
  /** Chip on a grant whose address has no account yet. */
  pending: string;
  /** A pending grant with no address — a link anybody holding it can redeem. */
  openInvite: string;
  copyLink: string;
  /** A candidate that is a team (its sublabel, and the line under a team row). */
  team: string;
  /** Under the field while a team is the one named. */
  teamHint: (name: string) => string;
  /** The remove button on a grantee. */
  remove: string;
  removeConfirm: (name: string) => string;
  /** The remove button on a pending grant. */
  revokePending: string;
  revokePendingConfirm: (name: string) => string;
  /** A callback rejected and no `formatError` says better. */
  failed: string;
  /** Shown while `loading`. */
  loading: string;
}

export const DEFAULT_SHARE_CARD_LABELS: ShareCardLabels = {
  dialogTitle: "Share",
  close: "Close",
  email: "Email address",
  emailOptional: "Email address (optional)",
  emailPlaceholder: "name@example.com",
  invalidEmail: "Enter a complete email address.",
  role: "Role",
  roleOf: (name) => `Role of ${name}`,
  add: "Share",
  whoHasAccess: "Who has access",
  nobodyYet: "Nobody else has access yet.",
  pending: "Pending",
  openInvite: "Open invite link",
  copyLink: "Copy link",
  team: "Team",
  teamHint: (name) => `Everyone in ${name} gets access.`,
  remove: "Remove access",
  removeConfirm: (name) => `Remove access for ${name}?`,
  revokePending: "Withdraw invitation",
  revokePendingConfirm: (name) => `Withdraw the invitation for ${name}?`,
  failed: "That did not work. Please try again.",
  loading: "Loading…",
};

// ── Data shapes ───────────────────────────────────────────────────────────────

/**
 * One role of the app's vocabulary: Kurvenschmiede's viewer/editor, keksdose's guest.
 *
 * The admin roster's {@link RoleDefinition} (label, tone, icon) plus the key it is
 * filed under — an ARRAY here rather than the keyed `RoleVocabulary` record,
 * because the order is the order of the role choice's segments.
 */
export type ShareRole = RoleDefinition & {
  key: string;
  /** What the role allows — under the role choice once chosen, and the chip's tooltip. */
  description?: string;
};

/** Somebody (or a team) who holds the record now. */
export interface ShareGrantee {
  id: string | number;
  name: string;
  /** The second line. A team row says {@link ShareCardLabels.team} instead. */
  email?: string | null;
  /** A {@link ShareRole.key}. */
  role: string;
  /** `team`: the grant reaches everybody in it (Kurvenschmiede). Default `person`. */
  kind?: "person" | "team";
  /** Shown, but neither its role nor its access can be changed here (an owner row). */
  locked?: boolean;
  /** The app's own line under the row — keksdose's per-guest key delivery. */
  extra?: ReactNode;
}

/** A grant waiting for its address to have an account — or, with no address, an
 *  open invite link (keksdose). */
export interface SharePendingGrant {
  id: string | number;
  email?: string | null;
  /** A {@link ShareRole.key}; left out when the app has only one role. */
  role?: string;
  /** The invite link, offered with a copy button. */
  link?: string;
}

/** A completion offered while typing: a past grantee, or one of the sharer's teams. */
export interface ShareCandidate {
  id: string | number;
  name: string;
  /** A person's address: taking the row fills the field with it, and the grant is
   *  then an ordinary address grant. */
  email?: string | null;
  /** `team` (or a person with no address): taking the row names THIS candidate, and
   *  `onAdd` receives it instead of an address. */
  kind?: "person" | "team";
  icon?: ReactNode;
}

/** What the add button asks for. Exactly one of `email` / `candidate` is set, except
 *  under `addWithoutEmail`, where both may be null (an open invite). */
export interface ShareAddRequest {
  email: string | null;
  candidate: ShareCandidate | null;
  /** A {@link ShareRole.key}. */
  role: string;
}

type MaybePromise = void | Promise<unknown>;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SharePanelProps {
  grantees: ShareGrantee[];
  /** The role vocabulary, in display order. One role: no choice is offered and each
   *  row shows its chip. */
  roles: ShareRole[];
  pending?: SharePendingGrant[];
  /** Completions for the field. Left out: the field is a plain address field. */
  candidates?: ShareCandidate[];
  /** The role a new grant starts with. Default: the first of `roles`. */
  defaultRole?: string;
  /** Resolve to clear the field; reject to keep it and show the error. Left out (or
   *  `readOnly`): no add form. */
  onAdd?: (request: ShareAddRequest) => MaybePromise;
  /** Left out: roles are shown as chips. */
  onRoleChange?: (grantee: ShareGrantee, role: string) => MaybePromise;
  /** Called after the kit's confirm. Left out: no remove button. */
  onRemove?: (grantee: ShareGrantee) => MaybePromise;
  /** Called after the kit's confirm. Left out: no withdraw button. */
  onRevokePending?: (grant: SharePendingGrant) => MaybePromise;
  /** keksdose: an empty field is a request too — an invite link with no address. */
  addWithoutEmail?: boolean;
  /** Under the add field: whatever the app needs said there (Kurvenschmiede's "your
   *  pending grant does not let anybody register"). A function receives the taken
   *  candidate, so it can say something else while a team is named. */
  caption?: ReactNode | ((candidate: ShareCandidate | null) => ReactNode);
  /** Above everything — what sharing means here (keksdose's guest explanation). */
  intro?: ReactNode;
  /** The list is being fetched: a spinner instead of the rows. */
  loading?: boolean;
  /** The app's own error, shown in the error box (wins over a caught rejection). */
  error?: ReactNode;
  /** Turns a callback's rejection into words. Default {@link ShareCardLabels.failed}. */
  formatError?: (error: unknown) => ReactNode;
  /** Look, do not touch: no form, chips for roles, no remove buttons. Copying an
   *  invite link still works. */
  readOnly?: boolean;
  /** Focus the field on mount — a dialog that exists to add somebody. */
  autoFocus?: boolean;
  labels?: Partial<ShareCardLabels>;
}

// Shape only. Whether the address exists, is allowed, or is the sharer's own is the
// app's question — the field must never become a way to probe for accounts.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The kit's {@link RoleChip}, so a role looks the same here as in the admin roster,
 *  with the role's description in a tooltip. */
function ShareRoleChip({ role }: { role: ShareRole | undefined }) {
  if (!role) return null;
  const chip = <RoleChip value={role.key} roles={{ [role.key]: role }} />;
  return role.description ? <Tooltip label={role.description}>{chip}</Tooltip> : chip;
}

/**
 * A row's controls: the role toggle and the remove icon, or a pending grant's copy and
 * revoke. Held to the row and wrapping inside it (0.32.1, the 360 px Extra-large sweep;
 * docs/text-size-harmonization.md §4 "nothing overflows"): under a write lock on a touch
 * screen or at Large the remove icon gives its reason as a line under it, up to 20rem
 * wide, and a `shrink-0` box ran 31 px past a 390 px phone at Normal and 269 px past a
 * 360 px one at Extra large. Where the controls fit in one row, nothing changes.
 */
const ROW_CONTROLS = "ms-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1";

/**
 * A row's role choice saves on change, so it is a commit that cannot take `commit`:
 * under a write lock it is disabled, and the lock's reason is put in the kit Tooltip
 * around it — the same sentence the locked buttons beside it give.
 */
function LockedRoleChoice({ reason, children }: { reason: ReactNode; children: ReactNode }) {
  return reason === undefined ? children : <Tooltip label={reason}>{children}</Tooltip>;
}

/**
 * The body both forms share: the add form, then the list. Exported for an app that
 * frames it itself (a settings section, a sheet).
 */
export function SharePanel({
  grantees,
  roles,
  pending = [],
  candidates,
  defaultRole,
  onAdd,
  onRoleChange,
  onRemove,
  onRevokePending,
  addWithoutEmail = false,
  caption,
  intro,
  loading = false,
  error,
  formatError,
  readOnly = false,
  autoFocus,
  labels: labelsProp,
}: SharePanelProps) {
  // The `shareCard` namespace: prop > `<UiKitProvider labels>` > English.
  const labels = useKitLabels("shareCard", DEFAULT_SHARE_CARD_LABELS, labelsProp);
  const confirm = useConfirm();
  // Every commit below opts into the surrounding WriteLockProvider with `commit`; the
  // role choices save on change, cannot take it, and read the lock themselves.
  const lock = useWriteLock();
  const [email, setEmail] = useState("");
  // A candidate taken from the completion. Typing again lets it go: the field then
  // names an address again, and a chosen team beside free text would be two answers
  // to "who" (Kurvenschmiede's rule).
  const [target, setTarget] = useState<ShareCandidate | null>(null);
  const [newRole, setNewRole] = useState(defaultRole ?? roles[0]?.key ?? "");
  const [invalid, setInvalid] = useState(false);
  // One action at a time, for the whole panel: two in flight against one record's
  // grants can answer out of order. The key says which control draws the spinner.
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);

  const roleOf = (key: string | undefined) => roles.find((r) => r.key === key);
  const choosable = roles.length > 1;
  const canAdd = !readOnly && onAdd !== undefined;
  // Under a write lock the form's Share button gives the lock's sentence as a line (on
  // touch and at Large). A row's remove or revoke icon then keeps it in its tooltip, as
  // the role toggle beside it does, rather than repeat the same line under every row
  // (0.32.1, the 360 px Extra-large sweep). Without the form the rows' lines are the
  // only place it is said, so they stay — and ROW_CONTROLS wraps them.
  const rowReason: DisabledReasonDisplay = canAdd ? "tooltip" : "auto";

  const run = async (key: string, action: () => MaybePromise): Promise<boolean> => {
    setBusy(key);
    setFailure(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setFailure(formatError ? formatError(caught) : labels.failed);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const address = email.trim();
  const empty = !target && address === "";

  const submit = async () => {
    // Enter in the field is a commit too — the button's lock does not see it.
    if (!onAdd || busy || lock.locked) return;
    if (empty && !addWithoutEmail) return;
    if (!target && address !== "" && !EMAIL_SHAPE.test(address)) {
      setInvalid(true);
      return;
    }
    const request: ShareAddRequest = {
      email: target ? null : address || null,
      candidate: target,
      role: newRole,
    };
    if (await run("add", () => onAdd(request))) {
      setEmail("");
      setTarget(null);
    }
  };

  const options: ComboOption<string>[] = (candidates ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
    sublabel: c.kind === "team" ? labels.team : (c.email ?? undefined),
    icon: c.icon ?? (c.kind === "team" ? <UsersRound className="size-4" /> : undefined),
  }));

  // The completion is a convenience, not a search: an address that matches nobody is
  // the ordinary case (somebody new), so no "No results" box opens over the field —
  // and over its error. The same narrowing Autocomplete applies, asked first.
  const needle = (target ? "" : email).trim().toLowerCase();
  const offers =
    needle !== "" &&
    options.some((o) => o.label.toLowerCase().includes(needle) || (o.sublabel ?? "").toLowerCase().includes(needle));

  const captionNode = typeof caption === "function" ? caption(target) : caption;
  const shownError = error ?? failure;
  const nobody = grantees.length === 0 && pending.length === 0;

  return (
    <div className="space-y-3">
      {intro && <div className="text-xs text-[var(--text-muted)]">{intro}</div>}

      {canAdd && (
        <div className="space-y-2">
          <div
            className={cn(
              "grid grid-cols-1 gap-2",
              choosable && "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start",
            )}
          >
            <Autocomplete<string>
              label={addWithoutEmail ? labels.emailOptional : labels.email}
              placeholder={labels.emailPlaceholder}
              value={target ? target.name : email}
              options={options}
              open={offers ? undefined : false}
              fillOnSelect={false}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- a documented prop the caller opts into (off by default); the field never takes focus on its own.
              autoFocus={autoFocus}
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy !== null}
              error={invalid ? labels.invalidEmail : undefined}
              onChange={(text) => {
                setTarget(null);
                setInvalid(false);
                setFailure(null);
                setEmail(text);
              }}
              onSelect={(option) => {
                const chosen = (candidates ?? []).find((c) => String(c.id) === option.value);
                if (!chosen) return;
                setInvalid(false);
                if (chosen.kind !== "team" && chosen.email) {
                  setTarget(null);
                  setEmail(chosen.email);
                } else {
                  setTarget(chosen);
                  setEmail("");
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
            />
            {choosable && (
              <ToggleGroup<string>
                aria-label={labels.role}
                options={roles.map((r) => ({ value: r.key, label: r.label }))}
                value={newRole}
                onChange={setNewRole}
                disabled={busy !== null}
                caption={
                  roles.some((r) => r.description) ? (key: string) => roleOf(key)?.description : undefined
                }
                // Level with the floating field beside it, as the two apps do by hand.
                optionClassName="sm:min-h-10"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1 basis-48 space-y-1">
              {target?.kind === "team" && <Caption>{labels.teamHint(target.name)}</Caption>}
              {captionNode && <Caption as="div">{captionNode}</Caption>}
            </div>
            <Button
              variant="brand"
              commit
              pending={busy === "add"}
              disabled={busy !== null || (empty && !addWithoutEmail)}
              onClick={() => void submit()}
              className="ms-auto"
            >
              <UserPlus className="size-4" aria-hidden />
              {labels.add}
            </Button>
          </div>
        </div>
      )}

      {shownError && (
        <AlertBanner tone="danger" size="sm">
          {shownError}
        </AlertBanner>
      )}

      {loading ? (
        <div className="flex justify-center py-3">
          <Spinner label={labels.loading} />
        </div>
      ) : (
        <div className="space-y-2">
          <SectionLabel as="h4">{labels.whoHasAccess}</SectionLabel>
          {nobody && <Caption>{labels.nobodyYet}</Caption>}
          <ul className="divide-y divide-[var(--border)]">
            {grantees.map((g) => {
              const editable = !readOnly && !g.locked;
              const changeable = editable && onRoleChange !== undefined && choosable;
              const key = `grantee:${g.id}`;
              return (
                <li key={key} className="space-y-1.5 py-2 first:pt-0 last:pb-0">
                  {/* Wraps rather than squeezes: on a phone the controls drop under
                      the name, full row, instead of truncating it to a letter. */}
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1 basis-40">
                      <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                        {g.kind === "team" && <UsersRound className="size-4 shrink-0" aria-hidden />}
                        <span data-private className="truncate">
                          {g.name}
                        </span>
                        {!changeable && <ShareRoleChip role={roleOf(g.role)} />}
                      </div>
                      {(g.kind === "team" || g.email) && (
                        <div data-private className="truncate text-xs text-[var(--text-muted)]">
                          {g.kind === "team" ? labels.team : g.email}
                        </div>
                      )}
                    </div>
                    {(changeable || (editable && onRemove)) && (
                      <div className={ROW_CONTROLS}>
                        {changeable && (
                          <LockedRoleChoice reason={lock.locked ? lock.reason : undefined}>
                            <ToggleGroup<string>
                              size="sm"
                              aria-label={labels.roleOf(g.name)}
                              options={roles.map((r) => ({ value: r.key, label: r.label }))}
                              value={g.role}
                              disabled={busy !== null || lock.locked}
                              onChange={(next) => {
                                if (next !== g.role) void run(`role:${g.id}`, () => onRoleChange(g, next));
                              }}
                            />
                          </LockedRoleChoice>
                        )}
                        {editable && onRemove && (
                          <IconButton
                            tone="danger"
                            size="xs"
                            commit
                            label={labels.remove}
                            // The icon alone at every text size (§10.8): the row's one
                            // control beside its role toggle, where "Remove access" as
                            // text at Large would not fit a 240 px row. It carries a
                            // spinner and the write lock, which a "⋯" menu entry
                            // cannot, and its confirmation names the action in words.
                            labelVisible={false}
                            disabledReasonDisplay={rowReason}
                            pending={busy === key}
                            disabled={busy !== null}
                            onClick={async () => {
                              const yes = await confirm({
                                title: labels.removeConfirm(g.name),
                                confirmLabel: labels.remove,
                                tone: "danger",
                              });
                              if (yes) await run(key, () => onRemove(g));
                            }}
                          >
                            <Trash2 />
                          </IconButton>
                        )}
                      </div>
                    )}
                  </div>
                  {g.extra}
                </li>
              );
            })}
            {pending.map((p) => {
              const key = `pending:${p.id}`;
              const name = p.email || labels.openInvite;
              return (
                <li key={key} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1 basis-40">
                      <div
                        data-private={p.email ? true : undefined}
                        className={cn(
                          "truncate text-sm",
                          p.email ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                        )}
                      >
                        {name}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <Chip size="sm" shape="square" tone="warning" caps>
                          {labels.pending}
                        </Chip>
                        <ShareRoleChip role={roleOf(p.role)} />
                      </div>
                    </div>
                    {(p.link || (!readOnly && onRevokePending)) && (
                      <div className={ROW_CONTROLS}>
                        {p.link && <CopyButton size="xs" tone="muted" text={p.link} label={labels.copyLink} />}
                        {!readOnly && onRevokePending && (
                          <IconButton
                            tone="danger"
                            size="xs"
                            commit
                            label={labels.revokePending}
                            // As the grantee's remove above: one action beside the
                            // copy icon (which is an icon at every size), and the
                            // confirmation says it in words.
                            labelVisible={false}
                            disabledReasonDisplay={rowReason}
                            pending={busy === key}
                            disabled={busy !== null}
                            onClick={async () => {
                              const yes = await confirm({
                                title: labels.revokePendingConfirm(name),
                                confirmLabel: labels.revokePending,
                                tone: "danger",
                              });
                              if (yes) await run(key, () => onRevokePending(p));
                            }}
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
        </div>
      )}
    </div>
  );
}

// ── The two frames ────────────────────────────────────────────────────────────

export interface ShareCardProps extends SharePanelProps {
  /** A heading over the card. */
  title?: ReactNode;
  /** The Card's variant. Default `outline` — a block inside a section, as keksdose's
   *  card under a budget row is. */
  variant?: CardProps["variant"];
  className?: string;
}

/** {@link SharePanel} in a card — keksdose's inline form, under the row it shares. */
export function ShareCard({ title, variant = "outline", className, ...panel }: ShareCardProps) {
  return (
    <Card variant={variant} padding="sm" className={cn("space-y-3", className)}>
      {title && <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>}
      <SharePanel {...panel} />
    </Card>
  );
}

export interface ShareDialogProps
  extends SharePanelProps,
    Pick<DialogFrameProps, "open" | "onClose" | "size" | "className"> {
  /** The heading. Default {@link ShareCardLabels.dialogTitle}. */
  title?: ReactNode;
  /** Under the heading — what is being shared (Kurvenschmiede passes its name). */
  description?: ReactNode;
}

/**
 * {@link SharePanel} in the kit's {@link DialogFrame} with a Close button —
 * Kurvenschmiede's form. Sharing commits as it goes, so there is nothing to save or
 * cancel: Close is the only action.
 */
export function ShareDialog({ open, onClose, size, className, title, description, ...panel }: ShareDialogProps) {
  const labels = useKitLabels("shareCard", DEFAULT_SHARE_CARD_LABELS, panel.labels);
  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      size={size}
      className={className}
      title={title ?? labels.dialogTitle}
      description={description}
      actions={(close) => (
        <Button variant="secondary" onClick={close}>
          {labels.close}
        </Button>
      )}
    >
      <SharePanel {...panel} />
    </DialogFrame>
  );
}
