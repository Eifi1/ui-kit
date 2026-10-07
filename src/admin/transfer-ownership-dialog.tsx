import { useState } from "react";
import type { ReactNode } from "react";
import { useKitLabels } from "../i18n/kit-labels";
import { Select } from "../components/ui";
import { Caption } from "../components/text";
import { AdminActionConfirm } from "./admin-action-confirm";
import type { AdminActionTarget, AdminConfirmLevel } from "./admin-action-confirm";
import { usePersonLabel } from "./admin-parts";
import type { AdminPerson, MaybePromise } from "./admin-parts";

/**
 * Hand an account's owned work to another account — Kurvenschmiede's `TypedConfirm`
 * with its recipient select (features/admin/typed-confirm.tsx, users-panel.tsx;
 * docs/user-admin-harmonization.md §4.1 `POST /admin/users/{id}/transfer {to,
 * confirm_email}`, §4.2: `type_email`).
 *
 * It is {@link AdminActionConfirm} with the recipient as the action's own field: the
 * typed address is the SOURCE account's — the one whose work moves, which is the row the
 * admin must prove they are on — and the confirm waits for a recipient too.
 *
 * WHO MAY RECEIVE IT (§9.6): never a customer, never a deactivated account, never the
 * account itself. The APP decides — it knows its roles and states — and marks each
 * candidate with why it cannot (`unavailable`); the kit shows those accounts, unavailable,
 * with the reason, rather than leaving the admin to wonder where somebody went. The
 * source account is marked `self` here whether or not the app did.
 */

/** Why a candidate cannot receive the work: the kit's three, or the app's own words. */
export type TransferUnavailable = "customer" | "deactivated" | "self";

/** An account that might receive the work. */
export interface TransferCandidate extends AdminPerson {
  id: string | number;
  email: string;
  /** Why it cannot: `"customer"`, `"deactivated"`, `"self"`, or the app's own words. */
  unavailable?: TransferUnavailable | (string & {});
}

/** What {@link TransferOwnershipDialogProps.onTransfer} receives — the request body. */
export interface TransferValues {
  toUserId: string | number;
  /** The source account's address as typed (at `type_email`). */
  confirmEmail?: string;
}

/** The `transferOwnership` namespace. The guard and the refusals are `adminAction`'s
 *  and `dangerConfirm`'s. */
export interface TransferOwnershipLabels {
  /** The heading — "Hand on Ada Example’s work". */
  title: (name: string) => string;
  /** What happens. */
  body: string;
  /** The recipient select's label. */
  recipient: string;
  /** Its empty first option. */
  choose: string;
  /** Why the confirm is held while nobody is chosen. */
  chooseFirst: string;
  /** The confirm button. */
  confirm: string;
  /** Reasons, said after the account's name inside its option. */
  customer: string;
  deactivated: string;
  self: string;
  /** An unavailable option's text: the account and why. */
  unavailable: (account: string, reason: string) => string;
  /** No account can receive it. */
  noCandidates: string;
}

export const DEFAULT_TRANSFER_OWNERSHIP_LABELS: TransferOwnershipLabels = {
  title: (name) => `Hand on ${name}’s work`,
  body: "Everything this account owns moves to the account you choose, in one step.",
  recipient: "Hand it to",
  choose: "Choose an account…",
  chooseFirst: "Choose who receives the work",
  confirm: "Hand it on",
  customer: "a customer",
  deactivated: "deactivated",
  self: "the same account",
  unavailable: (account, reason) => `${account} (${reason})`,
  noCandidates: "No other account can receive it.",
};

export interface TransferOwnershipDialogProps {
  /** The account whose work moves — its address is what the admin types. */
  from: AdminActionTarget;
  /** Who might receive it, each marked with why not where it cannot. */
  candidates: readonly TransferCandidate[];
  /** What moves, in the app's words — "3 sessions · 1 gear · 2 projects" (counts, never
   *  content). Under the sentence. */
  summary?: ReactNode;
  /** Sends it. Promise handling as {@link AdminActionConfirm}'s `onConfirm`. */
  onTransfer: (values: TransferValues) => MaybePromise;
  onClose: (done: boolean) => void;
  /** The server's level for `transfer` — `type_email` (§4.2), the default. A transfer
   *  always has a recipient to choose, so `none` asks as `acknowledge` does. */
  level?: AdminConfirmLevel;
  describeError?: (error: unknown) => ReactNode | undefined;
  /** Kept-mounted mode. */
  open?: boolean;
  labels?: Partial<TransferOwnershipLabels>;
}

export function TransferOwnershipDialog({
  from,
  candidates,
  summary,
  onTransfer,
  onClose,
  level = "type_email",
  describeError,
  open,
  labels: labelsProp,
}: TransferOwnershipDialogProps) {
  const labels = useKitLabels("transferOwnership", DEFAULT_TRANSFER_OWNERSHIP_LABELS, labelsProp);
  const nameOf = usePersonLabel();
  const [chosen, setChosen] = useState("");

  const reasonOf = (candidate: TransferCandidate): string | undefined => {
    const own = candidate.unavailable;
    const isSource =
      (from.id !== undefined && from.id !== null && candidate.id === from.id) ||
      candidate.email.trim().toLowerCase() === from.email.trim().toLowerCase();
    const code = isSource ? "self" : own;
    if (!code) return undefined;
    if (code === "customer") return labels.customer;
    if (code === "deactivated") return labels.deactivated;
    if (code === "self") return labels.self;
    return code;
  };

  const rows = candidates.map((candidate) => {
    const name = nameOf(candidate);
    const shown = name && name !== candidate.email ? `${name} — ${candidate.email}` : candidate.email;
    const reason = reasonOf(candidate);
    return { candidate, value: String(candidate.id), text: reason ? labels.unavailable(shown, reason) : shown, reason };
  });
  const available = rows.filter((row) => !row.reason);
  const recipient = available.find((row) => row.value === chosen)?.candidate;

  return (
    <AdminActionConfirm
      open={open}
      level={level === "none" ? "acknowledge" : level}
      target={from}
      title={labels.title(nameOf(from))}
      consequence={labels.body}
      confirmLabel={labels.confirm}
      tone="danger"
      confirmDisabledReason={
        available.length === 0 ? labels.noCandidates : recipient === undefined ? labels.chooseFirst : undefined
      }
      onConfirm={(values) =>
        recipient === undefined ? undefined : onTransfer({ toUserId: recipient.id, confirmEmail: values.confirmEmail })
      }
      onClose={onClose}
      describeError={describeError}
    >
      {summary && <div className="text-sm text-[var(--text-secondary)]">{summary}</div>}
      <Select label={labels.recipient} value={chosen} onChange={(event) => setChosen(event.target.value)}>
        <option value="">{labels.choose}</option>
        {rows.map((row) => (
          <option key={row.value} value={row.value} disabled={Boolean(row.reason)}>
            {row.text}
          </option>
        ))}
      </Select>
      {available.length === 0 && <Caption>{labels.noCandidates}</Caption>}
    </AdminActionConfirm>
  );
}
