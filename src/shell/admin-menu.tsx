import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { Chip } from "../components/chip";
import { MenuItem } from "../components/menu-item";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_ADMIN_AREA_LABELS } from "../admin/admin-area-labels";
import type { AdminAreaLabels } from "../admin/admin-area-labels";
import type { TopBarMenuEntry } from "./topbar-action-menu";

/**
 * The account menu's "Administration" row (0.42.0, docs/admin-harmonization.md §2.1, §6.6,
 * §7): the way into the admin area everyone finds, in every app, for an admin only. Two
 * forms of one row — {@link adminMenuEntry} for `TopBarActionMenu`'s `entries`, and
 * {@link AdminMenuRow} for a menu built from `HoverMenu` children (Kurvenschmiede's).
 */

/** The badge's text: nothing for none or 0, "99+" past 99. */
function badgeText(badge: number | null | undefined): string | null {
  if (typeof badge !== "number" || !(badge > 0)) return null;
  return badge > 99 ? "99+" : String(Math.floor(badge));
}

/**
 * The waiting count at the row's end: the `solid` count pill of {@link Chip}, in the
 * pending count's tone, with the number for the eye and `adminArea.waiting` for a reader
 * ("Administration, 3 waiting"). `null` for no count.
 */
function WaitingBadge({ badge, labels }: { badge: number | null | undefined; labels: AdminAreaLabels }) {
  const text = badgeText(badge);
  if (text === null) return null;
  return (
    <Chip size="sm" variant="solid" tone="warning" data-slot="admin-badge">
      <span aria-hidden>{text}</span>
      {/* The comma parts it from the row's label in the name: "Administration, 3 waiting". */}
      <span className="sr-only-fixed">, {labels.waiting(badge as number)}</span>
    </Chip>
  );
}

export interface AdminMenuEntryOptions {
  /** The admin area. Default `/admin`. */
  href?: string;
  /**
   * The waiting count (§2.4 decision 15, §6.3): only work that waits on this admin —
   * `adminWaitingCount(attention, […])`. `0`, `null` or none shows no badge.
   */
  badge?: number | null;
  /** The resolved `adminArea` words (`useAdminAreaLabels()`); default English. Builds no
   *  hook, so the entry can be made in the list of entries. */
  labels?: AdminAreaLabels;
  /** The entry's `key`. Default `"administration"`. */
  key?: string;
  /** The page already open: `aria-current` and a check mark. */
  current?: boolean;
}

/**
 * The "Administration" {@link TopBarMenuEntry}: a link row with the `ShieldCheck` icon,
 * the kit's word and the waiting count as its badge. Put it in the entries for an admin
 * only — the menu closes on the way, as any link row:
 *
 *     entries={[…, ...(isAdmin ? [adminMenuEntry({ badge: waiting, labels })] : []), …]}
 */
export function adminMenuEntry({
  href = "/admin",
  badge,
  labels = DEFAULT_ADMIN_AREA_LABELS,
  key = "administration",
  current,
}: AdminMenuEntryOptions = {}): TopBarMenuEntry {
  return {
    kind: "link",
    key,
    to: href,
    icon: <ShieldCheck className="size-4" aria-hidden />,
    label: labels.title,
    trailing: badgeText(badge) === null ? undefined : <WaitingBadge badge={badge} labels={labels} />,
    current,
  };
}

export interface AdminMenuRowProps {
  /** The admin area. Default `/admin`. */
  href?: string;
  /** As {@link AdminMenuEntryOptions.badge}. */
  badge?: number | null;
  /** Runs on the way — `HoverMenu`'s `close`. */
  onNavigate?: () => void;
  current?: boolean;
  /** Prop > `<UiKitProvider labels={{ adminArea }}>` > English. */
  labels?: LabelOverride<AdminAreaLabels>;
}

/**
 * The same row as {@link adminMenuEntry} for a menu drawn from `HoverMenu` children: the
 * `<li>` holding the router-link {@link MenuItem} `TopBarActionMenu` draws for a link
 * entry, so the two menus look alike.
 *
 *     {(close) => <ul>… {isAdmin && <AdminMenuRow badge={waiting} onNavigate={close} />} …</ul>}
 */
export function AdminMenuRow({ href = "/admin", badge, onNavigate, current, labels: labelsProp }: AdminMenuRowProps) {
  const labels = useKitLabels("adminArea", DEFAULT_ADMIN_AREA_LABELS, labelsProp);
  return (
    <li>
      <MenuItem
        href={href}
        renderLink={({ href: to, ...p }) => <Link to={to} {...p} />}
        onClick={onNavigate ? () => onNavigate() : undefined}
        leading={<ShieldCheck className="size-4" aria-hidden />}
        trailing={badgeText(badge) === null ? undefined : <WaitingBadge badge={badge} labels={labels} />}
        current={current}
      >
        {labels.title}
      </MenuItem>
    </li>
  );
}
