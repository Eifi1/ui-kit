import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Check, Cloud, CloudAlert, CloudOff, RefreshCw, UploadCloud } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { cn } from "../lib/cn";
import { IconButton } from "../components/icon-button";
import { Tooltip } from "../components/tooltip";
import { useBillingLabels } from "../billing/billing-labels";
import { useKitLocale, type LabelOverride } from "../i18n/kit-labels";
import { useTopBarPartsLabels, type SyncStatusLabels } from "./top-bar-parts-labels";

/**
 * What the indicator shows, fed by the app's sync engine (docs/top-bar-harmonization.md
 * §2.6). Small on purpose: keksdose's sync-status store, kastlan's handover controller and
 * Kurvenschmiede's online state + `useIsMutating` all fill it.
 */
export interface SyncStatus {
  /** What the engine is doing. `offline` is the engine's own verdict; `online: false` is
   *  the browser's — either shows the offline state. */
  phase: "idle" | "syncing" | "offline" | "error";
  /** The browser's `navigator.onLine` (or the app's better guess). */
  online: boolean;
  /** Writes kept on this device and not yet sent. */
  pending: number;
  /** Writes this device cannot send at all (keksdose: no key for the budget). Ranked first. */
  blocked?: number;
  /** Writes the server refused as read-only and keeps until a plan (billing §12.5). */
  waitingForPlan?: number;
  /** When the last good round ended — epoch ms, an ISO string or a `Date`. */
  lastSyncedAt?: number | string | Date | null;
}

/** The seven states, in their ranking: the first that holds wins. */
export type SyncState = "blocked" | "waitingForPlan" | "offline" | "error" | "syncing" | "pending" | "synced";

/**
 * Which of the seven states a {@link SyncStatus} is in — keksdose's ranking
 * (sync-status-indicator.tsx): a write that cannot be sent at all ranks above everything,
 * because waiting cannot help it; then one waiting for a plan; then offline; then a refused
 * round; then a round under way; then writes waiting; else in sync. `syncing` also holds
 * while a tap's own round runs (`refreshing`), before the engine publishes its phase.
 */
export function syncState(status: SyncStatus, refreshing = false): SyncState {
  if ((status.blocked ?? 0) > 0) return "blocked";
  if ((status.waitingForPlan ?? 0) > 0) return "waitingForPlan";
  if (!status.online || status.phase === "offline") return "offline";
  if (status.phase === "error") return "error";
  if (status.phase === "syncing" || refreshing) return "syncing";
  if (status.pending > 0) return "pending";
  return "synced";
}

type Tone = "danger" | "warning" | "info" | "success";

const LOOK: Record<SyncState, { Icon: ComponentType<LucideProps>; tone: Tone }> = {
  // The one the user must act on: the kit's danger, where keksdose had rose.
  blocked: { Icon: CloudAlert, tone: "danger" },
  // Safe, and a payment sends them: amber, the kit's warning.
  waitingForPlan: { Icon: CloudAlert, tone: "warning" },
  offline: { Icon: CloudOff, tone: "warning" },
  // Usually resolves by itself (a deploy, a read-only view): amber, not danger.
  error: { Icon: CloudAlert, tone: "warning" },
  syncing: { Icon: RefreshCw, tone: "info" },
  pending: { Icon: UploadCloud, tone: "warning" },
  synced: { Icon: Cloud, tone: "success" },
};

const TEXT_TONE: Record<Tone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

/** The scope words of an indicator that covers only part of the app (§6.10). */
export interface SyncStatusScope {
  /** Put before every state in the tooltip: "Handovers on this device" →
   *  "Handovers on this device: 3 changes waiting to sync". */
  name: string;
  /** The whole offline sentence instead of the kit's, when offline means something
   *  narrower: "Offline: handovers keep working on this device; everything else needs a
   *  connection". */
  offline?: string;
}

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  /**
   * Run a round now (push, then pull, then re-read what is on screen). With it the
   * indicator is a "sync now" button, disabled offline and mid-round but keeping its
   * colour; a returned promise keeps the spin until it settles. Without it, a status only
   * (§6.9).
   */
  onSync?: () => void | Promise<unknown>;
  /** Render nothing while in sync — kastlan and Kurvenschmiede show it only while offline,
   *  syncing or with changes waiting, held or refused (§2.6). */
  hideWhenIdle?: boolean;
  /** The app's words for its part of the app (§6.10). */
  scope?: SyncStatusScope;
  /**
   * Where the app keeps a change before the server has it. `"device"` (the default): an
   * offline-first app (keksdose, kastlan's handovers) — offline means "kept here, sent
   * later". `"none"`: an online-only app that keeps nothing on the device (Kurvenschmiede,
   * build review B1) — offline reads "changes can't be saved until you reconnect", a
   * round reads "Saving…", and `pending`, `blocked` and `waitingForPlan` are ignored,
   * since there is nowhere for a change to wait. "Up to date" when settled.
   */
  storage?: "device" | "none";
  /** Short words beside the cloud ("Offline", "Syncing…", "3 waiting") while not in sync. */
  showLabel?: boolean;
  /** Prop > `<UiKitProvider labels={{ topBarParts: { sync } }}>` > English. */
  labels?: LabelOverride<SyncStatusLabels>;
  /** The clock's language for "Synced at 14:05". Default: the provider's locale. */
  locale?: string;
  className?: string;
  /** `data-*` attributes go on the trigger — a tour's anchor (`data-tour="sync-status"`). */
  [key: `data-${string}`]: string | number | boolean | undefined;
}

/** The `data-*` attributes of a rest object, for a trigger. */
function dataAttributes(rest: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith("data-")));
}

/**
 * The top bar's sync status (docs/top-bar-harmonization.md §2.6), lifted from keksdose's
 * `SyncStatusIndicator`: the seven states and their ranking ({@link syncState}), one cloud
 * per state, a ✓ badge when in sync and a spin while syncing. With `onSync` it is also the
 * "sync now" button, and its name says both what it is and what a tap does.
 *
 * Colours are the kit's roles — danger for a write that cannot be sent, warning for
 * anything waiting, info while syncing, success when in sync — where keksdose had raw
 * rose/amber/sky/emerald pairs.
 */
export function SyncStatusIndicator({
  status,
  onSync,
  hideWhenIdle = false,
  scope,
  showLabel = false,
  labels: labelsProp,
  locale: localeProp,
  className,
  storage = "device",
  ...rest
}: SyncStatusIndicatorProps) {
  const words = useTopBarPartsLabels(labelsProp ? { sync: labelsProp } : undefined).sync;
  const billing = useBillingLabels();
  const locale = useKitLocale(localeProp);
  // The tap's own round, local rather than in the app's store: the store's phase belongs
  // to the sync engine, and a second writer would race the round itself.
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onlineOnly = storage === "none";
  // Online-only: nothing waits on the device, so only offline, error, saving and settled.
  const state = syncState(onlineOnly ? { ...status, pending: 0, blocked: 0, waitingForPlan: 0 } : status, refreshing);
  const data = dataAttributes(rest);
  if (hideWhenIdle && state === "synced") return null;

  const { Icon, tone } = LOOK[state];
  const spin = state === "syncing";
  let text: string;
  switch (state) {
    case "blocked":
      text = words.blocked(status.blocked ?? 0);
      break;
    case "waitingForPlan":
      text = billing.waitingChanges(status.waitingForPlan ?? 0);
      break;
    case "offline":
      text = onlineOnly ? words.offlineUnsaved : words.offline;
      break;
    case "error":
      text = words.refused;
      break;
    case "syncing":
      text = onlineOnly ? words.saving : words.syncing;
      break;
    case "pending":
      text = words.pending(status.pending);
      break;
    default:
      text =
        !onlineOnly && status.lastSyncedAt
          ? words.syncedAt(
              // A clock time in the UI's language, never the browser's (keksdose live #246).
              new Date(status.lastSyncedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
            )
          : words.idle;
  }
  if (scope) {
    text = state === "offline" && scope.offline ? scope.offline : words.scoped(scope.name, text);
  }

  const short =
    state === "offline"
      ? words.offlineShort
      : state === "syncing"
        ? onlineOnly
          ? words.saving
          : words.syncingShort
        : state === "error"
          ? words.refusedShort
          : state === "pending" || state === "blocked" || state === "waitingForPlan"
            ? words.waitingShort(
                state === "pending"
                  ? status.pending
                  : state === "blocked"
                    ? (status.blocked ?? 0)
                    : (status.waitingForPlan ?? 0),
              )
            : null;

  const offline = state === "offline";
  const canSync = !!onSync && status.online && status.phase !== "offline" && !spin;
  const name = onSync
    ? canSync
      ? words.withHint(text, words.syncHint)
      : offline
        ? words.withHint(text, words.offlineHint)
        : text
    : text;
  const badge = state === "synced" ? <Check className="stroke-[3]" /> : undefined;
  const glyph = <Icon aria-hidden className={spin ? "animate-spin" : undefined} />;

  const sync = async () => {
    if (!canSync || !onSync) return;
    setRefreshing(true);
    try {
      await onSync();
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  };

  const control = onSync ? (
    <IconButton
      {...data}
      data-sync-state={state}
      size="2xs"
      glyphSize={20}
      shape="round"
      // A status that is also an action: disabled (offline, mid-round) is exactly when
      // the state matters most, so it keeps its colour.
      disabledStyle="keep"
      tone={tone}
      quiet={false}
      label={name}
      labelVisible={false}
      // Below: the bar is at the top edge, where a bubble above has no room.
      tooltipSide="bottom"
      onClick={() => void sync()}
      disabled={!canSync}
      // It announces itself as a status: a reader hears the state change.
      aria-live="polite"
      badge={badge}
    >
      {glyph}
    </IconButton>
  ) : (
    <Tooltip label={name} side="bottom">
      <span
        {...data}
        role="status"
        data-sync-state={state}
        className={cn(
          "relative inline-flex size-9 shrink-0 items-center justify-center [&>svg]:size-5",
          TEXT_TONE[tone],
        )}
      >
        {glyph}
        <span className="sr-only">{name}</span>
        {badge && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 end-1.5 inline-flex rounded-full bg-surface [&_svg]:size-3"
          >
            {badge}
          </span>
        )}
      </span>
    </Tooltip>
  );

  if (!showLabel || !short)
    return className ? <span className={cn("inline-flex", className)}>{control}</span> : control;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {control}
      {/* The eye's short words; the name above already says it in full. */}
      <span aria-hidden className={cn("whitespace-nowrap text-xs font-medium", TEXT_TONE[tone])}>
        {short}
      </span>
    </span>
  );
}
