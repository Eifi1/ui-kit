import { Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { useDayFormatter } from "../lib/day-format";
import { DEFAULT_LIST_LABELS } from "../components/list-labels";
import { StatusDot } from "../components/status-dot";
import { TopBarActionMenu } from "../shell/topbar-action-menu";
import type { TopBarMenuEntry } from "../shell/topbar-action-menu";
import { useNotificationsLabels } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";
import type { NotificationInboxItem } from "./notification-inbox";

/** How many rows the bell's panel shows: the newest 20 (§10.1). */
const BELL_ROWS = 20;

export interface NotificationBellProps<Id extends string | number = string | number> {
  /** The inbox, newest first (the bell shows the first 20); `undefined` while it loads. */
  items: readonly NotificationInboxItem<Id>[] | undefined;
  /** Every unread row of the account (`unread_count`): the badge. */
  unreadCount: number;
  /** Open a row: the app marks it read and routes to `item.url` (kastlan switches the
   *  acting company first, to `item.company_id`). The panel closes. */
  onOpen: (item: NotificationInboxItem<Id>) => void;
  /** The app's inbox page or card, for "All notifications". */
  href: string;
  /** The row's glyph for a type, as {@link NotificationInbox}'s; `Bell` by default. */
  icon?: (type: string) => LucideIcon | undefined;
  /** A row's time. Default: the provider's `formatDate` (the app's date preference) with
   *  the language's clock, else date and time in the provider's locale and `timeZone`. */
  formatDate?: (iso: string) => string;
  labels?: LabelOverride<NotificationsLabels>;
}

/** The badge's text: "99+" past 99. */
const badgeText = (count: number) => (count > 99 ? "99+" : String(Math.floor(count)));

/**
 * The top bar's bell (0.46, docs/notifications-harmonization.md §10.1), for
 * `TopBarActions`' `notifications` slot, right before the account menu: an icon button
 * with the unread count as a badge ("99+" past 99), opening the newest 20 rows in the
 * kit's top-bar panel (`TopBarActionMenu`) with "All notifications" under them.
 *
 * **Optional per app.** "One badge per signal": an app shows the bell or an unread dot on
 * the avatar, never both — keksdose keeps its avatar dot and no bell; kastlan's inbox
 * lives in the bell. Shown to every signed-in account in an app that keeps an inbox, the
 * demo included. Props only, as the inbox list: poll the count every
 * {@link INBOX_BADGE_INTERVAL}.
 */
export function NotificationBell<Id extends string | number = string | number>({
  items,
  unreadCount,
  onOpen,
  href,
  icon,
  formatDate: formatDateProp,
  labels: labelsProp,
}: NotificationBellProps<Id>) {
  const labels = useNotificationsLabels(labelsProp);
  const list = useKitLabels("list", DEFAULT_LIST_LABELS);
  // As the inbox's rows: the prop, else the provider's `formatDate` with the language's
  // clock, else the kit's in the provider's locale and `timeZone` (refactor audit 2026-10-30, DUP-2).
  const day = useDayFormatter(formatDateProp);
  const timeOf = (iso: string) => day(iso, { time: true });
  const unread = unreadCount > 0;
  const shown = (items ?? []).slice(0, BELL_ROWS);

  const entries: TopBarMenuEntry[] = shown.map((item) => {
    const Icon = icon?.(item.notification_type) ?? Bell;
    const isUnread = item.read_at === null;
    return {
      key: `item-${String(item.id)}`,
      icon: <Icon aria-hidden className="size-4" />,
      label: (
        <span className="block min-w-0" data-bell-item={String(item.id)}>
          {item.company && <span className="block truncate text-caption text-muted">{item.company}</span>}
          <span className={isUnread ? "block font-semibold" : "block"}>{item.title}</span>
          <span className="block line-clamp-2 text-xs text-secondary">{item.body}</span>
          <span className="block text-caption text-muted">{timeOf(item.created_at)}</span>
        </span>
      ),
      trailing: isUnread ? <StatusDot tone="brand" aria-label={list.unread} /> : undefined,
      onSelect: () => onOpen(item),
    };
  });
  if (entries.length > 0) entries.push({ kind: "divider", key: "divider" });
  entries.push({ kind: "link", key: "all", to: href, label: labels.allNotifications });

  return (
    <TopBarActionMenu
      aria-label={labels.bellLabel}
      triggerAttributes={{ "data-notification-bell": "" }}
      trigger={() => (
        <span className="relative inline-flex" data-unread={unread ? unreadCount : undefined}>
          <Bell aria-hidden className="size-5" />
          {unread && (
            <>
              <span
                aria-hidden
                data-badge=""
                className="pointer-events-none absolute -end-2 -top-1.5 h-4 min-w-4 rounded-full bg-danger px-1 text-center text-micro font-semibold leading-4 text-danger-contrast"
              >
                {badgeText(unreadCount)}
              </span>
              <span className="sr-only">{labels.bellUnread(unreadCount)}</span>
            </>
          )}
        </span>
      )}
      header={
        shown.length === 0
          ? { title: labels.inboxTitle, subtitle: items === undefined ? labels.inboxLoading : labels.inboxEmpty }
          : undefined
      }
      entries={entries}
      panelClassName="w-80 max-w-[calc(100vw-2rem)]"
    />
  );
}
