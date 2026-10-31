import { useId, useRef, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_COMMON_LABELS } from "../i18n/shared-labels";
import { cn } from "../lib/cn";
import { useDayFormatter } from "../lib/day-format";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { IconButton } from "../components/icon-button";
import { InlineConfirm } from "../components/inline-confirm";
import { List, ListItem } from "../components/list";
import { Skeleton } from "../components/skeleton";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { SettingsCardTitle } from "../settings/settings-heading";
import { safeNextPath } from "../landing/routing";
import { settle, useMounted } from "../hooks/use-mounted";
import { describeFailure, FailureLine, useNotificationsLabels } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";

/**
 * One inbox row as `GET /notifications/inbox` answers it (server-kit `InboxItem`, §3.7):
 * the title and body already in the recipient's language.
 */
export interface NotificationInboxItem<Id extends string | number = string | number> {
  id: Id;
  /** The type id, for the row's icon. */
  notification_type: string;
  title: string;
  body: string;
  /** A path in the app, or `null` (nothing to open). Never `//` or a scheme (§3.7): a url
   *  that does not resolve to this origin is drawn as a row with nothing to open. */
  url: string | null;
  /** ISO date-time. */
  created_at: string;
  /** ISO date-time, or `null` while unread. */
  read_at: string | null;
  /** 0.46 (server-kit 0.16 `InboxItem.company`): the company the row is about, named on
   *  the row — kastlan's inbox holds every company's rows. */
  company?: string | null;
  /** 0.46.1 (server-kit 0.16.1 `InboxItem.company_id`): the same company by its id, so
   *  `onOpen` switches to it exactly (two companies may share a name). */
  company_id?: number | string | null;
}

/** The inbox request that failed, as `describeError` gets it (0.46.1): one row marked read,
 *  "Mark all as read", or "Clear all". */
export type NotificationInboxAction = "read" | "readAll" | "clear";

export interface NotificationInboxProps<Id extends string | number = string | number> extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "title"
> {
  /** The rows, newest first; `undefined` while the first page loads. */
  items: readonly NotificationInboxItem<Id>[] | undefined;
  /** Every unread row of the account (`unread_count`), not only this page's. */
  unreadCount: number;
  loading?: boolean;
  /** `POST /notifications/inbox/read {ids}` — these rows, or `null` for all. */
  onMarkRead: (ids: Id[] | null) => Promise<unknown> | void;
  /** `DELETE /notifications/inbox`. Asked first, in the header. */
  onClear: () => Promise<unknown> | void;
  /**
   * Open a row: the kit marks it read first, then calls this, and the app routes to
   * `item.url` (kastlan switches the acting company, `item.company_id`, first) — through
   * `safeNextPath`, as the kit does. Every row is a button then.
   * Left out, a row with a `url` is a real link through the provider's router link — the
   * url as a same-origin path (`safeNextPath`) — that marks itself read on a click or a
   * middle click (keksdose #451). A row without one, or with one that leaves the origin
   * (`//host`, a scheme), marks itself read and opens nothing.
   */
  onOpen?: (item: NotificationInboxItem<Id>) => void;
  /** The row's glyph for a type — the app's map (keksdose's `TYPE_ICONS`). `undefined`,
   *  or a type it does not know (a retired one), is the `Bell`. */
  icon?: (type: string) => LucideIcon | undefined;
  /** More rows than shown: a "Show more" row calls `onLoadMore` (the API pages by
   *  `offset`). */
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** The next page is loading. */
  loadingMore?: boolean;
  /** A row's time. Default: the provider's `formatDate` (the app's date preference) with
   *  the language's clock, else date and time in the provider's locale and `timeZone`. */
  formatDate?: (iso: string) => string;
  /** The heading. Default `labels.inboxTitle` ("Inbox"). */
  title?: ReactNode;
  /** The app's own words for a failed request, or `undefined` for the kit's `failed`.
   *  `action` (0.46.1) says which request failed: `"read"` (one row), `"readAll"` ("Mark
   *  all as read") or `"clear"` ("Clear all") — so a failed mark-read is not worded as a
   *  failed clear. */
  describeError?: (error: unknown, action: NotificationInboxAction) => ReactNode | undefined;
  labels?: LabelOverride<NotificationsLabels>;
}

/**
 * The in-app inbox (0.46, docs/notifications-harmonization.md §10.1), keksdose's list
 * lifted: newest first, an icon per type (`Bell` for one the app does not map), the
 * title and two lines of body, the time, and — kastlan — the company the row is about.
 * Unread rows are bold with a dot. Props only: the app keeps the data (poll the badge
 * every {@link INBOX_BADGE_INTERVAL}, invalidate on its worker's push message).
 *
 * - **Opening a row marks it read** (see `onOpen`).
 * - **"Mark all as read"** while anything is unread; **"Clear all"** asks first, in the
 *   header — no `ConfirmProvider` needed — with focus on Cancel.
 * - **"Show more"** with `hasMore`; the list scrolls inside a box of at most
 *   `min(24rem, 70vh)`, so it never pushes the settings below it off the page.
 *
 * Under a write lock the header's actions are `commit` controls exempt from billing.
 */
export function NotificationInbox<Id extends string | number = string | number>({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onClear,
  onOpen,
  icon,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  formatDate: formatDateProp,
  title,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: NotificationInboxProps<Id>) {
  const labels = useNotificationsLabels(labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  // The prop, else the provider's `formatDate` with the language's clock, else the kit's
  // date and time in the provider's locale and `timeZone` (refactor audit 2026-10-30, DUP-2).
  const day = useDayFormatter(formatDateProp);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState<"read" | "clear" | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();
  const headingId = useId();
  // Back to "Clear all" when the confirm leaves, so focus does not fall to <body>.
  const clearRef = useRef<HTMLButtonElement>(null);

  const timeOf = (iso: string) => day(iso, { time: true });
  const iconOf = (type: string): LucideIcon => icon?.(type) ?? Bell;

  const run = (which: "read" | "clear", call: () => unknown, after?: () => void) => {
    setBusy(which);
    setFailure(null);
    settle(call).then(
      () => {
        if (!mounted.current) return;
        setBusy(null);
        after?.();
      },
      (error: unknown) => {
        if (!mounted.current) return;
        setBusy(null);
        setFailure(describeFailure(describeError?.(error, which === "read" ? "readAll" : "clear"), labels.failed));
      },
    );
  };

  /** Mark one row read; a failure is said under the list, the row stays as it is. */
  const markOne = (item: NotificationInboxItem<Id>) => {
    if (item.read_at !== null) return;
    settle(() => onMarkRead([item.id])).catch((error: unknown) => {
      if (mounted.current) setFailure(describeFailure(describeError?.(error, "read"), labels.failed));
    });
  };

  const count = items?.length ?? 0;

  const header = asking ? (
    <InlineConfirm
      className="border-b border-subtle px-3 py-2"
      data-inbox-confirm=""
      prompt={labels.clearPrompt}
      confirmLabel={labels.clearAll}
      cancelLabel={common.cancel}
      onConfirm={() => run("clear", onClear, () => setAsking(false))}
      onLeave={() => setAsking(false)}
      busy={busy === "clear"}
      commit={COMMIT_EXCEPT_BILLING}
      returnFocusRef={clearRef}
    />
  ) : (
    <div className="flex items-center justify-between gap-2 border-b border-subtle px-3 py-2">
      <SettingsCardTitle id={headingId}>{title ?? labels.inboxTitle}</SettingsCardTitle>
      <div className="flex items-center gap-0.5">
        <IconButton
          type="button"
          size="xs"
          tone="muted"
          commit={COMMIT_EXCEPT_BILLING}
          onClick={() => run("read", () => onMarkRead(null))}
          disabled={unreadCount === 0 || busy !== null}
          label={labels.markAllRead}
        >
          <CheckCheck />
        </IconButton>
        <IconButton
          ref={clearRef}
          type="button"
          size="xs"
          tone="danger"
          commit={COMMIT_EXCEPT_BILLING}
          onClick={() => setAsking(true)}
          disabled={count === 0 || busy !== null}
          label={labels.clearAll}
        >
          <Trash2 />
        </IconButton>
      </div>
    </div>
  );

  let body: ReactNode;
  if (loading || items === undefined) {
    body = <Skeleton lines={3} label={labels.inboxLoading} className="p-3" />;
  } else if (items.length === 0) {
    body = <EmptyState variant="inline" title={labels.inboxEmpty} className="px-3 py-2" />;
  } else {
    body = (
      // Named by the heading — except while "Clear all" asks, when the heading is away.
      <List
        className="p-1"
        aria-labelledby={asking ? undefined : headingId}
        aria-label={asking ? labels.inboxTitle : undefined}
      >
        {items.map((item) => {
          const row = {
            title: item.title,
            subtitle: item.body,
            subtitleLines: 2 as const,
            overline: item.company ?? undefined,
            meta: timeOf(item.created_at),
            icon: iconOf(item.notification_type),
            unread: item.read_at === null,
            align: "start" as const,
          };
          if (onOpen) {
            return (
              <ListItem
                key={item.id}
                {...row}
                data-inbox-item={String(item.id)}
                onClick={() => {
                  markOne(item);
                  onOpen(item);
                }}
              />
            );
          }
          // A same-origin path or nothing (refactor audit 2026-10-30, FLW-8): `//host` starts
          // with "/" and went through the router link off the origin, and any scheme opened
          // as an external link. The urls are server-written; this is defence in depth.
          const path = safeNextPath(item.url);
          if (!path) {
            return <ListItem key={item.id} {...row} data-inbox-item={String(item.id)} onClick={() => markOne(item)} />;
          }
          // A real link, so a middle click opens a background tab; a middle click fires no
          // `click`, hence `onAuxClick` (keksdose #451).
          return (
            <ListItem
              key={item.id}
              {...row}
              data-inbox-item={String(item.id)}
              href={path}
              onClick={() => markOne(item)}
              onAuxClick={(event) => {
                if (event.button === 1) markOne(item);
              }}
            />
          );
        })}
        {hasMore && onLoadMore && (
          <li className="px-2 py-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              pending={loadingMore}
              onClick={onLoadMore}
              className="w-full"
            >
              {labels.showMore}
            </Button>
          </li>
        )}
      </List>
    );
  }

  return (
    <Card {...rest} className={cn("overflow-hidden p-0", className)}>
      {header}
      <div className="max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain">{body}</div>
      {failure !== null && (
        <div className="px-3 pb-3">
          <FailureLine>{failure}</FailureLine>
        </div>
      )}
    </Card>
  );
}

/** How often an app polls the unread count for the badge (keksdose's 60 s, `limit:1`). */
export const INBOX_BADGE_INTERVAL = 60_000;
