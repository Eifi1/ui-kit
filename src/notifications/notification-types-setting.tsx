import { useId, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { hasContent } from "../lib/presence";
import { Card } from "../components/card";
import { Select } from "../components/select";
import { Skeleton } from "../components/skeleton";
import { Switch } from "../components/switch";
import { SectionLabel } from "../components/text";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { CARD_DESCRIPTION_CLASS } from "../settings/settings-card-classes";
import { SettingsCardTitle } from "../settings/settings-heading";
import { settle, useMounted } from "../account/account-parts";
import { describeFailure, FailureLine, useNotificationsLabels, useWriteOverlay } from "./notification-parts";
import type { WriteOverlay } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";
import type {
  DigestCadence,
  NotificationSettingsPatch,
  NotificationSwitches,
  NotificationTypeEntry,
  NotificationTypeGroup,
  NotificationTypesValue,
} from "./notification-types";

/** Is this a development build? Dead code in a consumer's production bundle; on under
 *  vitest, where a type the card cannot draw is a bug a test should fail on (as
 *  `SettingsSection`'s catalogue check). */
function devChecks(): boolean {
  return Boolean(import.meta.env?.DEV);
}

export interface NotificationTypesSettingProps<Id extends string = string>
  extends Omit<ComponentPropsWithRef<"div">, "children" | "onChange"> {
  /** The app's words for its types, in its order. Where an app types its ids. */
  types: readonly NotificationTypeEntry<Id>[];
  /** The `GET`'s `types` (§3.2); `undefined` while the first load runs. */
  value: NotificationTypesValue | undefined;
  /** The settings are loading. */
  loading?: boolean;
  /**
   * Save one change — `PATCH /notifications/settings` with this body: one switch per
   * call (`{types: {digest: {app: true}}}`), or `{digest_cadence}`. The switch shows its
   * new state while the call runs and goes back if it rejects; hand the card the
   * PATCH's answer (or refetch) when it resolves.
   */
  onChange: (patch: NotificationSettingsPatch<Id>) => Promise<unknown> | void;
  /** Headings over the types, in the app's words (keksdose's three). Without them, one
   *  list in the order of `types`. In development every type the server answered must
   *  be in one. */
  groups?: readonly NotificationTypeGroup<Id>[];
  /** The digest type and the account's cadence: a cadence `Select` under that type
   *  while it is on. */
  digest?: { type: Id; cadence: DigestCadence };
  /** Under a type while it is on — keksdose's low-balance threshold field. */
  renderExtra?: (id: Id) => ReactNode;
  /** The account's address is unverified: every e-mail switch says
   *  `labels.emailUnverified` under it (decision 16). */
  emailUnverified?: boolean;
  /** Nothing can be changed (the switches stay readable). */
  disabled?: boolean;
  /** The app's own words for a failed save, or `undefined` for the kit's `failed`. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: LabelOverride<NotificationsLabels>;
}

/** One drawn type: the app's words and the server's switches. */
interface Row<Id extends string> {
  entry: NotificationTypeEntry<Id>;
  switches: NotificationSwitches;
}

/** A switch's key in the write overlay. */
const switchKey = (id: string, channel: "app" | "email") => `${id}.${channel}`;
const CADENCE_KEY = "digest_cadence";

/**
 * What the person hears about, and how (docs/notifications-harmonization.md §2.1–§2.3,
 * §4.2): one row per type the SERVER answered, the app's words on it, a switch for "in
 * the app" and "By e-mail" under it where the type offers mail. Where the app has no
 * "in the app" channel (Kurvenschmiede), the e-mail switch is the row's own, with the
 * type's label.
 *
 * **The server's list is the only list.** The card keeps no defaults and no list of
 * types: it draws what `value` holds, in the order of `groups`, else of `types`. A type
 * the app names that the server did not answer is not drawn (kastlan's tenant receives
 * neither of its types). In development a type the server answered with no entry in
 * `types`, or in no group when `groups` is given, throws — keksdose's compile-time
 * `_EVERY_TYPE_IS_GROUPED`, now at run time, since the list is the server's.
 *
 * **Each flip saves at once**, one switch per call; the switch shows its new state while
 * the call runs and goes back if it rejects, with the failure said under the card. The
 * digest's cadence and the app's extra field (`renderExtra`) show under their type while
 * it is on.
 *
 * Under a write lock the switches are `commit` controls exempt from billing: a lapsed
 * plan never keeps a person from turning notifications off (billing §12.13).
 */
export function NotificationTypesSetting<Id extends string = string>({
  types,
  value,
  loading,
  onChange,
  groups,
  digest,
  renderExtra,
  emailUnverified = false,
  disabled = false,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: NotificationTypesSettingProps<Id>) {
  const labels = useNotificationsLabels(labelsProp);
  const overlay = useWriteOverlay<boolean>(value);
  const cadenceOverlay = useWriteOverlay<DigestCadence>(digest?.cadence);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();
  const groupId = useId();

  const answered = value ? Object.keys(value) : [];
  const entries = new Map(types.map((entry) => [entry.id as string, entry]));
  if (value && devChecks()) {
    const unnamed = answered.filter((id) => !entries.has(id));
    if (unnamed.length) {
      throw new Error(
        `NotificationTypesSetting: the server answered ${unnamed.map((id) => `"${id}"`).join(", ")} with no entry in \`types\` — give every type the server can send its words.`,
      );
    }
    if (groups) {
      const grouped = new Set<string>(groups.flatMap((group) => group.types));
      const loose = answered.filter((id) => !grouped.has(id));
      if (loose.length) {
        throw new Error(
          `NotificationTypesSetting: ${loose.map((id) => `"${id}"`).join(", ")} is in no group — a type in no group is drawn nowhere, and could not be turned off.`,
        );
      }
    }
  }

  const rowOf = (id: Id): Row<Id> | null => {
    const switches = value?.[id];
    const entry = entries.get(id);
    if (!switches || !entry || (switches.app === null && switches.email === null)) return null;
    return { entry, switches };
  };
  const rowsOf = (ids: readonly Id[]) => ids.map(rowOf).filter((row): row is Row<Id> => row !== null);

  const shown = (id: string, channel: "app" | "email", server: boolean): boolean => {
    const key = switchKey(id, channel);
    return overlay.get(key) ?? server;
  };
  /** The row's own switch: `app`, or `email` where the app has no `app` channel. */
  const rowOn = ({ entry, switches }: Row<Id>) =>
    switches.app !== null
      ? shown(entry.id, "app", switches.app)
      : shown(entry.id, "email", switches.email === true);

  const save = <V,>(key: string, patch: NotificationSettingsPatch<Id>, which: WriteOverlay<V>, next: V) => {
    if (which.pending(key)) return;
    setFailure(null);
    which.set(key, next);
    settle(() => onChange(patch)).then(
      () => {
        if (mounted.current) which.settle(key, true);
      },
      (error: unknown) => {
        if (!mounted.current) return;
        which.settle(key, false);
        setFailure(describeFailure(describeError?.(error), labels.failed));
      },
    );
  };

  const flip = (id: Id, channel: "app" | "email", on: boolean) =>
    save(
      switchKey(id, channel),
      { types: { [id]: { [channel]: on } } as NotificationSettingsPatch<Id>["types"] },
      overlay,
      on,
    );

  const cadence = cadenceOverlay.get(CADENCE_KEY) ?? digest?.cadence;

  const unverifiedLine = emailUnverified ? (
    <span className="block" data-email-unverified="">
      {labels.emailUnverified}
    </span>
  ) : null;

  const renderRow = (row: Row<Id>) => {
    const { entry, switches } = row;
    const on = rowOn(row);
    const emailOnly = switches.app === null;
    const both = !emailOnly && switches.email !== null;
    const cadenceSelect =
      on && digest?.type === entry.id && cadence ? (
        <Select
          label={labels.digestCadence}
          value={cadence}
          disabled={disabled}
          commit={COMMIT_EXCEPT_BILLING}
          onChange={(event) => {
            const next = event.target.value as DigestCadence;
            if (next !== cadence) save(CADENCE_KEY, { digest_cadence: next }, cadenceOverlay, next);
          }}
          className="max-w-44"
        >
          <option value="weekly">{labels.digestWeekly}</option>
          <option value="monthly">{labels.digestMonthly}</option>
        </Select>
      ) : null;
    const extra = on ? renderExtra?.(entry.id) : null;
    const description =
      emailOnly && unverifiedLine ? (
        <>
          {entry.description !== undefined && <span className="block">{entry.description}</span>}
          {unverifiedLine}
        </>
      ) : (
        entry.description
      );
    return (
      <div
        key={entry.id}
        data-notification-type={entry.id}
        // A row with two switches is a group named by its type, so "By e-mail" is heard
        // with the type it belongs to.
        role={both ? "group" : undefined}
        aria-label={both ? entry.label : undefined}
        className="space-y-2"
      >
        <Switch
          label={entry.label}
          description={description}
          checked={on}
          disabled={disabled}
          commit={COMMIT_EXCEPT_BILLING}
          onCheckedChange={(next) => flip(entry.id, emailOnly ? "email" : "app", next)}
        />
        {both && (
          <div className="ps-4">
            <Switch
              size="sm"
              label={labels.byEmail}
              description={unverifiedLine ?? undefined}
              checked={shown(entry.id, "email", switches.email === true)}
              disabled={disabled}
              commit={COMMIT_EXCEPT_BILLING}
              onCheckedChange={(next) => flip(entry.id, "email", next)}
            />
          </div>
        )}
        {(cadenceSelect || hasContent(extra)) && (
          <div className="ps-4 space-y-2">
            {cadenceSelect}
            {extra}
          </div>
        )}
      </div>
    );
  };

  let body: ReactNode;
  if (loading || value === undefined) {
    body = <Skeleton lines={3} label={labels.typesLoading} />;
  } else if (groups) {
    const drawn = groups
      .map((group) => ({ group, rows: rowsOf(group.types) }))
      .filter(({ rows }) => rows.length > 0);
    body =
      drawn.length === 0 ? (
        <p className={CARD_DESCRIPTION_CLASS}>{labels.typesEmpty}</p>
      ) : (
        drawn.map(({ group, rows }) => {
          const headingId = `${groupId}-${group.id}`;
          return (
            <div key={group.id} role="group" aria-labelledby={headingId} className="space-y-3">
              <SectionLabel as="div" size="xs" id={headingId}>
                {group.label}
              </SectionLabel>
              {rows.map(renderRow)}
            </div>
          );
        })
      );
  } else {
    const rows = rowsOf(types.map((entry) => entry.id));
    body =
      rows.length === 0 ? (
        <p className={CARD_DESCRIPTION_CLASS}>{labels.typesEmpty}</p>
      ) : (
        <div className="space-y-3">{rows.map(renderRow)}</div>
      );
  }

  return (
    <Card {...rest} className={cn("p-4 space-y-3", className)}>
      <div>
        <SettingsCardTitle>{labels.typesTitle}</SettingsCardTitle>
        <div className={CARD_DESCRIPTION_CLASS}>{labels.typesDescription}</div>
      </div>
      {body}
      <FailureLine>{failure}</FailureLine>
    </Card>
  );
}
