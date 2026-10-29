import type { ReactNode } from "react";
import { AlertBanner } from "../components/alert-banner";
import { Button } from "../components/button";
import { StatTile, StatTileGrid } from "../components/stat-tile";
import type { StatTileProps } from "../components/stat-tile";
import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { useAdminAreaLabels } from "./admin-area-labels";
import type { AdminAreaLabels } from "./admin-area-labels";

/**
 * The admin's start page (0.42.0, docs/admin-harmonization.md §2.4, §6.1–§6.5): a grid
 * of tiles, each a count of what is waiting and a link to where the work is, fed by one
 * server answer.
 */

/**
 * `GET /admin/attention` (§2.4 decision 14, §6.4) — server-kit's `AdminAttention`
 * (`eifi1_server_kit.user_admin.attention`), as the API sends it.
 *
 * Each count is `null` where the app has no such thing or this viewer cannot act on it,
 * and every count is `null` in a demo session. Demo accounts never count. `extra` holds
 * the app's own counts, keyed as its overview names them (keksdose `support_waiting`,
 * Kurvenschmiede `released_for_work`).
 */
export interface AdminAttention {
  /** "To triage": OPEN reports, crash reports included (§6.1). */
  feedback_waiting: number | null;
  /** Accounts that asked to be deleted — only where this viewer acts on them (§6.2). */
  deletion_requests: number | null;
  invitations_pending: number | null;
  users_total: number | null;
  /** Accounts made in the last seven days. */
  users_new_7d: number | null;
  extra: Record<string, number | null>;
}

/** The shared counts that are a tile of their own (`users_new_7d` is the users tile's line). */
export type AdminAttentionTile = "feedback_waiting" | "deletion_requests" | "invitations_pending" | "users_total";

/** Where each shared tile links when the app names nothing else (§2.4 decision 13). */
export const DEFAULT_ADMIN_ATTENTION_HREFS: Readonly<Record<AdminAttentionTile, string>> = Object.freeze({
  feedback_waiting: "/feedback",
  deletion_requests: "/admin/users?state=deletion_requested",
  invitations_pending: "/admin/invitations",
  users_total: "/admin/users",
});

/**
 * The account menu's badge (§2.4 decision 15, §6.3): the sum of the counts that are work
 * waiting on THIS admin — each app names its own (keksdose `["feedback_waiting",
 * "support_waiting", "awaiting_verdict"]`, kastlan `["feedback_waiting"]`, Kurvenschmiede
 * `["feedback_waiting", "deletion_requests"]`). A name is a shared count or an `extra`
 * key; a `null` or missing count adds nothing. Invitations and users never belong in it.
 * `null` while there is no answer yet, so the badge shows nothing rather than a 0.
 */
export function adminWaitingCount(
  attention: AdminAttention | null | undefined,
  counts: readonly (AdminAttentionTile | (string & {}))[],
): number | null {
  if (!attention) return null;
  let sum = 0;
  for (const key of counts) {
    const shared = (attention as unknown as Record<string, unknown>)[key];
    const value = typeof shared === "number" ? shared : attention.extra?.[key];
    if (typeof value === "number" && value > 0) sum += value;
  }
  return sum;
}

export interface AttentionTileProps extends Omit<StatTileProps, "href" | "onClick" | "value"> {
  /** The count. `null` shows the tile's dash; {@link AdminOverview} leaves such a tile out. */
  count: number | null | undefined;
  /** Where the work is — the tile is a link to it. Since 0.43 it may be left out: a
   *  quiet count, no link (Kurvenschmiede). */
  href?: string;
}

/**
 * One tile of the overview: a {@link StatTile} that is a LINK to where the work is, its
 * count the headline. The whole tile is the link, named by its label; route it through
 * `renderLink` or the provider's link component, as any StatTile. Without `href` (0.43) it
 * is a quiet count, no link.
 */
export function AttentionTile({ count, href, ...tile }: AttentionTileProps) {
  return <StatTile data-slot="attention-tile" {...tile} value={count ?? null} href={href} />;
}

/**
 * 0.46 (Kurvenschmiede 1, admin §9.5): the `extra` keys server-kit's
 * `feedback_attention` fills, whose tiles have the kit's words
 * (`adminArea.tiles.awaitingVerdict`, `releasedForWork`, with a line each).
 */
export type AdminFeedbackTileKey = "awaiting_verdict" | "released_for_work";

/** One of the app's own tiles (§2.4 decision 13: keksdose's "Support waiting"). */
export type AdminExtraTile = AdminOwnTile | AdminFeedbackTile;

/** A tile of the app's own: it brings its words. */
export interface AdminOwnTile {
  /** Unique among the tiles; usually the `extra` key it shows. */
  key: string;
  label: ReactNode;
  /** `null` or `undefined` leaves the tile out, as for a shared one. */
  count: number | null | undefined;
  /** Where the work is. Left out (0.43, Kurvenschmiede): a quiet count with no link —
   *  a number worth seeing that has no page of its own. */
  href?: string;
  /** A line under the count. */
  description?: ReactNode;
}

/** 0.46: a tile of server-kit's feedback counts — `label` and `description` default to
 *  the kit's words; an app's own still win. The kit's `description` fills in only when
 *  `label` is left out too: an app that names the tile gets no hint line it did not ask for. */
export interface AdminFeedbackTile extends Omit<AdminOwnTile, "key" | "label"> {
  key: AdminFeedbackTileKey;
  label?: ReactNode;
}

export interface AdminOverviewProps {
  /** The server's answer; `undefined` while it loads (the grid shows its skeletons). */
  attention: AdminAttention | null | undefined;
  /**
   * Where the shared tiles link, over {@link DEFAULT_ADMIN_ATTENTION_HREFS} — the
   * inbox's address filtered to OPEN (§6.1) is the app's own:
   * `{ feedback_waiting: "/feedback?status=OPEN" }`.
   */
  hrefs?: Partial<Record<AdminAttentionTile, string>>;
  /** The app's own tiles, after the shared ones, in this order. */
  extraTiles?: readonly AdminExtraTile[];
  /** Passed to every tile — `renderLink` for the router, `size`, `variant`. */
  tileProps?: Pick<StatTileProps, "renderLink" | "size" | "variant" | "locale">;
  /**
   * 0.43 (keksdose): the answer failed — the query's `error`, or `true`. Anything truthy
   * shows `adminArea.overviewError` in a danger box, with "Try again" when
   * {@link onRetry} is given. A failed poll keeps the last good tiles: with `attention`
   * still there (a query keeps its last data), the box shows ALONGSIDE them, above, not
   * instead (build review 0.43, keksdose N7) — pass `attention.data` as it is. Without
   * an answer yet, the box alone. Without `error`: `undefined` is the skeletons and
   * `null` nothing, as before.
   */
  error?: unknown;
  /** "Try again" in the error box — the query's `refetch`. */
  onRetry?: () => void;
  /** Prop > `<UiKitProvider labels={{ adminArea }}>` > English. */
  labels?: LabelOverride<AdminAreaLabels>;
  className?: string;
}

/**
 * The overview section (§2.4): the shared tiles in their order — To triage, Deletion
 * requests, Pending invitations, Users (with the new accounts of the last 7 days under
 * the total) — then the app's `extraTiles`. A tile whose count is `null` is left out,
 * so each app shows only what it has; a `0` is a quiet tile, "nothing waiting".
 *
 * The overview is the admin area's landing page, standalone: it is NOT wrapped in a
 * `SettingsSection` (`adminSections` gives it no entry; render it as the page's body, as
 * Kurvenschmiede's `OverviewPanel` does). keksdose links its metrics from here with at
 * most two tiles (§6.5).
 */
export function AdminOverview({
  attention,
  hrefs,
  extraTiles = [],
  tileProps,
  error,
  onRetry,
  labels: labelsProp,
  className,
}: AdminOverviewProps) {
  const labels = useAdminAreaLabels(labelsProp);
  /** The error box: on its own (`alone`) it is the overview's root. */
  const errorBox = (alone: boolean) => (
    <AlertBanner
      data-slot={alone ? "admin-overview" : undefined}
      data-state={alone ? "error" : undefined}
      variant="box"
      tone="danger"
      className={alone ? className : undefined}
      action={
        onRetry ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onRetry()}>
            {labels.retry}
          </Button>
        ) : undefined
      }
    >
      {labels.overviewError}
    </AlertBanner>
  );
  // Nothing good to keep: the box alone.
  if (error && !attention) return errorBox(true);
  const href = { ...DEFAULT_ADMIN_ATTENTION_HREFS, ...hrefs };
  const loading = attention === undefined;
  const shared: { key: AdminAttentionTile; label: string; description?: ReactNode }[] = [
    { key: "feedback_waiting", label: labels.tiles.feedbackWaiting },
    { key: "deletion_requests", label: labels.tiles.deletionRequests },
    { key: "invitations_pending", label: labels.tiles.invitationsPending },
    {
      key: "users_total",
      label: labels.tiles.users,
      description:
        attention && typeof attention.users_new_7d === "number"
          ? labels.tiles.usersNew(attention.users_new_7d)
          : undefined,
    },
  ];
  const feedbackWords: Record<AdminFeedbackTileKey, { label: string; description: string }> = {
    awaiting_verdict: { label: labels.tiles.awaitingVerdict, description: labels.tiles.awaitingVerdictHint },
    released_for_work: { label: labels.tiles.releasedForWork, description: labels.tiles.releasedForWorkHint },
  };
  const tiles = [
    ...shared.map((t) => ({ ...t, count: attention ? attention[t.key] : undefined, href: href[t.key] })),
    ...extraTiles.map((t) => {
      const words = Object.prototype.hasOwnProperty.call(feedbackWords, t.key)
        ? feedbackWords[t.key as AdminFeedbackTileKey]
        : undefined;
      // The kit's hint comes with the kit's label only: an app that names the tile
      // itself gets no line it did not ask for (keksdose S5, round 0.46).
      return words
        ? {
            ...t,
            label: t.label ?? words.label,
            description: t.description ?? (t.label === undefined ? words.description : undefined),
          }
        : t;
    }),
  ].filter((t) => loading || (t.count !== null && t.count !== undefined));
  if (!loading && tiles.length === 0) return error ? errorBox(true) : null;
  const grid = (
    <StatTileGrid
      data-slot={error ? undefined : "admin-overview"}
      loading={loading}
      className={error ? undefined : className}
    >
      {tiles.map((t) => (
        <AttentionTile
          key={t.key}
          {...tileProps}
          data-attention={t.key}
          label={t.label}
          count={t.count}
          href={t.href}
          description={t.description}
        />
      ))}
    </StatTileGrid>
  );
  if (!error) return grid;
  // A failed poll: the error above the last good tiles.
  return (
    <div data-slot="admin-overview" data-state="error" className={cn("space-y-4", className)}>
      {errorBox(false)}
      {grid}
    </div>
  );
}
