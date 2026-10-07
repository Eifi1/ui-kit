import type { ReactElement, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { formatDate, formatRelativeTime, toDate, EMPTY_FORMATTED_VALUE } from "../lib/format";
import type { DateInput, FormatDateStyle, FormatRelativeTimeOptions } from "../lib/format";
import { useKitDateFormatter, useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { toLocalIso } from "../lib/dates";
import { Chip } from "./chip";
import type { ChipShape, ChipSize, ChipTone, ChipVariant } from "./chip";
import { Tooltip } from "./tooltip";
import type { DataTableColumn } from "./data-table";

/**
 * The parts an admin roster repeats (0.18.0) — and only those.
 *
 * Kurvenschmiede (features/admin/users-panel.tsx, allowlist-panel.tsx) and keksdose
 * (features/admin/users-panel.tsx, the allowlist card in admin-page.tsx) each built the
 * same table: name over email, a role, whether the account is active, created, last
 * login, a row of actions, and an allowlist with a note. What they share is not the
 * table — the columns around it (keksdose's plan and privacy mode, Kurvenschmiede's
 * owned-work counts and its role SELECT), the actions and every rule about who may do
 * what are each app's own. What they share is the vocabulary: both spelled the same
 * square, uppercase status chip by hand (keksdose's `Badge` with its own tone map,
 * Kurvenschmiede's inline `<Chip size="xs" shape="square" caps>`), and both formatted
 * their two date columns by hand (`toLocaleDateString` in one, a "3 days ago" helper
 * in the other). So: {@link RoleChip}, {@link AccountStateChip} and
 * {@link dateColumn}, and the roster stays the app's `DataTable`.
 */

/** The chip look both rosters use: a square, uppercase status tag. Each can be changed. */
interface AccountChipLook {
  /** Default `sm` — keksdose's roster; Kurvenschmiede's denser lists pass `xs`. */
  size?: ChipSize;
  /** Default `soft`. `dot` for a column of them that should not outshout the names. */
  variant?: ChipVariant;
  /** Default `square`: a chip in a table cell, beside square controls. */
  shape?: ChipShape;
  /** Default true — the status-badge type. */
  caps?: boolean;
  className?: string;
  [key: `data-${string}`]: string | number | boolean | undefined;
}

/* ── RoleChip ──────────────────────────────────────────────────────────────── */

/** How one role is drawn. `label` is the app's, translated. */
export interface RoleDefinition {
  label: string;
  tone?: ChipTone;
  /** A lucide component or an element — Kurvenschmiede marks its admins with a shield. */
  icon?: LucideIcon | ReactElement;
}

/**
 * Every role an app has, keyed by the value its API sends. Annotate the app's table
 * with it (`const ROLES: RoleVocabulary<UserRole> = {…}`) and TypeScript asks for a
 * label when a role is added.
 */
export type RoleVocabulary<R extends string = string> = Readonly<Record<R, RoleDefinition>>;

export interface RoleChipProps<R extends string = string> extends AccountChipLook {
  /**
   * The role key as the API sends it. `null` / `undefined` renders nothing. Named
   * `value`, not `role`, because `role` on a JSX element is the ARIA role — the lint
   * rule and every reader would take it for one.
   */
  value: R | null | undefined;
  /** What each key is called and how it is toned. A key missing here is shown as the
   *  key itself, in `neutral`: an unknown role is still a fact the admin should see. */
  roles: Readonly<Partial<Record<R, RoleDefinition>>>;
}

/**
 * A role as a chip: the API's key looked up in the app's {@link RoleVocabulary}.
 *
 * The vocabulary is a prop and not kit English, because the roles are the app's —
 * Kurvenschmiede has admin, member and customer, keksdose admin and user, kastlan its
 * own — and so are their names. Carries `data-role` with the key, for a test or a
 * style hook.
 */
export function RoleChip<R extends string = string>({
  value: role,
  roles,
  size = "sm",
  variant,
  shape = "square",
  caps = true,
  className,
  ...rest
}: RoleChipProps<R>) {
  if (role === null || role === undefined || role === "") return null;
  const def = roles[role];
  return (
    <Chip
      {...rest}
      data-role={role}
      tone={def?.tone ?? "neutral"}
      icon={def?.icon}
      size={size}
      variant={variant}
      shape={shape}
      caps={caps}
      className={className}
    >
      {def?.label ?? role}
    </Chip>
  );
}

/* ── AccountStateChip ──────────────────────────────────────────────────────── */

/**
 * The states both rosters show, each as the app's own flag maps onto it:
 *
 * - `active` / `inactive` — the account may sign in, or an admin switched it off
 *   (both apps' `is_active`).
 * - `invited` — on the allowlist and mailed, not registered yet (an allowlist row).
 * - `registered` — an allowlist row whose address has an account now (Kurvenschmiede).
 * - `unverified` — the email address is not confirmed (keksdose).
 * - `passwordChange` — must set a new password at the next sign-in (keksdose).
 * - `deletion` — 0.30.0: the user asked for the account to be deleted
 *   (docs/user-admin-harmonization.md §2.1, §6.4). It is deactivated at once and erased
 *   on a date (`after_days`: keksdose, Kurvenschmiede) or by an operator (kastlan). The
 *   chip says the date when there is one ({@link AccountStateChipProps.date}), and
 *   "Deletion requested" when there is none. It stands IN PLACE of `inactive`: an
 *   account marked for deletion is always deactivated, and two chips would say it twice.
 *
 * An account can be several at once (inactive AND unverified): render one chip per
 * state, as keksdose's state column does.
 */
export type AccountState =
  | "active"
  | "inactive"
  | "invited"
  | "registered"
  | "unverified"
  | "passwordChange"
  | "deletion";

/**
 * The `accountState` namespace. One word per state, plus the two forms of `deletion`.
 *
 * The 0.30 keys are OPTIONAL, like every key added to a namespace an app annotates
 * (`const L: AccountStateLabels = {…}`): a new required key would be a compile error in
 * each app on its next update. Left out, they fall back to the provider's, then English.
 */
export interface AccountStateLabels extends Record<Exclude<AccountState, "deletion">, string> {
  /** 0.30.0: an account marked for deletion with no date — kastlan's `operator` mode,
   *  where an operator erases it (§6.4). "Deletion requested". */
  deletion?: string;
  /** 0.30.0: an account that will be erased on `date`, already formatted in the
   *  reader's locale — the `after_days` mode. "Deletion on 6 Nov 2026". */
  deletionOn?: (date: string) => string;
}

export const DEFAULT_ACCOUNT_STATE_LABELS = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
  registered: "Registered",
  unverified: "Unverified",
  passwordChange: "Must change password",
  deletion: "Deletion requested",
  deletionOn: (date: string) => `Deletion on ${date}`,
} satisfies Required<AccountStateLabels>;

/** The default tone of each state: green for the normal case, red for switched off
 *  (and for going, `deletion`), amber for something the user still has to do, blue for
 *  an open invitation. */
export const ACCOUNT_STATE_TONES: Readonly<Record<AccountState, ChipTone>> = {
  active: "success",
  inactive: "danger",
  invited: "info",
  registered: "neutral",
  unverified: "warning",
  passwordChange: "warning",
  // Red like `inactive`, which it replaces: the account cannot sign in, and it is going.
  deletion: "danger",
};

export interface AccountStateChipProps extends AccountChipLook {
  state: AccountState;
  /**
   * 0.30.0, `state="deletion"` only: the day the account will be erased — the row's
   * `deletion_scheduled_at` (§3.2, §6.4). Formatted as a date in the reader's locale
   * ("Deletion on 6 Nov 2026"), through the provider's `formatDate` when the app set
   * one, as {@link DateMark} does. Missing or `null` — an operator erases it, so there
   * is no date — the chip says "Deletion requested". Ignored for every other state.
   */
  date?: DateInput;
  /** Over the provider's locale, for the `deletion` date. */
  locale?: string;
  /** Over {@link ACCOUNT_STATE_TONES} — Kurvenschmiede draws `inactive` neutral. */
  tone?: ChipTone;
  /** Over the label, for an app whose word for the state is its own ("Deactivated"). */
  children?: ReactNode;
  /** Prop > `<UiKitProvider labels={{ accountState }}>` > English. */
  labels?: Partial<AccountStateLabels>;
}

/**
 * An account's state as a chip, in the kit's words and tones. Carries `data-state`
 * with the key.
 */
export function AccountStateChip({
  state,
  date,
  locale: localeProp,
  tone,
  children,
  labels: labelsProp,
  size = "sm",
  variant,
  shape = "square",
  caps = true,
  className,
  ...rest
}: AccountStateChipProps) {
  // An `undefined` in the prop is skipped (the provider's merge does that), so an
  // optional value cannot blank a default.
  const labels = useKitLabels("accountState", DEFAULT_ACCOUNT_STATE_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const fromProvider = useKitDateFormatter();
  const when = state === "deletion" ? toDate(date ?? null) : null;
  let text: ReactNode;
  if (state !== "deletion") text = labels[state];
  else if (when) {
    // A date in a SENTENCE, so no weekday (keksdose's rule, KitDateFormatContext).
    const day =
      (fromProvider && fromProvider(toLocalIso(when), { unit: "day", source: "dateMark", locale, weekday: false })) ||
      formatDate(when, "medium", { locale });
    text = (labels.deletionOn ?? DEFAULT_ACCOUNT_STATE_LABELS.deletionOn)(day);
  } else text = labels.deletion ?? DEFAULT_ACCOUNT_STATE_LABELS.deletion;
  return (
    <Chip
      {...rest}
      data-state={state}
      data-date={when ? toLocalIso(when) : undefined}
      tone={tone ?? ACCOUNT_STATE_TONES[state]}
      size={size}
      variant={variant}
      shape={shape}
      caps={caps}
      className={className}
    >
      {children ?? text}
    </Chip>
  );
}

/* ── Date columns ──────────────────────────────────────────────────────────── */

export interface DateMarkProps {
  value: DateInput;
  /**
   * `"date"` (default): the date in `dateStyle` — "Created". `"relative"`: how long
   * ago — "Last login", where the question is "recently?" — with the full date and
   * time in a tooltip (keksdose's last-seen column).
   */
  display?: "date" | "relative";
  /** Default `medium`. Under `"relative"`, the style of the tooltip's date (default
   *  `dateTime`) and of the date `relative.absoluteAfterDays` switches to. Given, it wins
   *  over the provider's `formatDate`. */
  dateStyle?: FormatDateStyle | Intl.DateTimeFormatOptions;
  /** `formatRelativeTime` options: `numeric`, `style`, `absoluteAfterDays`, `now`. */
  relative?: Omit<FormatRelativeTimeOptions, "locale" | "empty" | "absoluteStyle">;
  /** What a missing value reads as. Default "—"; a last-login column passes its
   *  translated "Never". */
  empty?: ReactNode;
  /** Over the provider's locale. */
  locale?: string;
  className?: string;
}

/**
 * A date in a table cell: a `<time>` with a machine-readable `dateTime`, nowrap and
 * tabular figures, in the provider's locale — or `empty` when there is none.
 *
 * `display="date"` without a `dateStyle` is written by `<UiKitProvider formatDate>` when
 * the app set one (keksdose K12: its `DateCell` exists to put every column's date in the
 * app's date-format preference, weekday and all — dev#546), called with the LOCAL
 * calendar day of the value as `"YYYY-MM-DD"` and `weekday: true`. Without one, or for
 * an empty answer, it is `Intl`'s `medium` date as before. The relative display is not
 * a calendar day and keeps `formatRelativeTime`.
 */
export function DateMark({
  value,
  display = "date",
  dateStyle,
  relative,
  empty = EMPTY_FORMATTED_VALUE,
  locale: localeProp,
  className,
}: DateMarkProps) {
  const locale = useKitLocale(localeProp);
  const fromProvider = useKitDateFormatter();
  const date = toDate(value);
  const cls = cn("whitespace-nowrap tabular-nums", className);
  if (!date) return <span className={cn(cls, "text-[var(--text-muted)]")}>{empty}</span>;
  if (display === "date") {
    const own =
      dateStyle === undefined && fromProvider
        ? fromProvider(toLocalIso(date), { unit: "day", source: "dateMark", locale, weekday: true })
        : "";
    return (
      <time dateTime={date.toISOString()} className={cls}>
        {own || formatDate(date, dateStyle ?? "medium", { locale })}
      </time>
    );
  }
  const text = formatRelativeTime(date, { ...relative, locale, absoluteStyle: dateStyle ?? "medium" });
  return (
    <Tooltip label={formatDate(date, dateStyle ?? "dateTime", { locale })} lazy>
      {/* Not a tab stop: a roster of fifty rows would be fifty more of them, and the
          relative words already answer the column's question; the exact time is extra. */}
      <time dateTime={date.toISOString()} className={cls}>
        {text}
      </time>
    </Tooltip>
  );
}

export interface DateColumnOptions<T> extends Omit<DateMarkProps, "value" | "className"> {
  key: string;
  header: ReactNode;
  /** The value of this row: an ISO string, epoch ms, a Date, or null for none. */
  value: (row: T) => DateInput;
  /** Sortable by the instant; rows with no date sort last either way. Default true. */
  sortable?: boolean;
  /** Default `desc` — a date column is sorted to find the newest. */
  firstSort?: "asc" | "desc";
  /** Add the table's from–to date filter over the column. Default false. */
  filter?: boolean;
  /** Further column settings (`mobileHidden`, `headClassName`, …), merged over. */
  column?: Partial<DataTableColumn<T>>;
}

/**
 * A {@link DataTableColumn} for a date: {@link DateMark} cells, sorted by the instant
 * (newest first on the first click), optionally the date filter. The roster's
 * "Created" is `dateColumn({ key, header, value })`; its "Last login" adds
 * `display: "relative", empty: t("never")`.
 */
export function dateColumn<T>({
  key,
  header,
  value,
  sortable = true,
  firstSort = "desc",
  filter = false,
  column,
  ...mark
}: DateColumnOptions<T>): DataTableColumn<T> {
  return {
    key,
    header,
    cell: (row) => <DateMark value={value(row)} {...mark} />,
    sortBy: sortable ? (row) => toDate(value(row))?.getTime() ?? null : undefined,
    firstSort: sortable ? firstSort : undefined,
    filter: filter
      ? {
          type: "date",
          // The filter compares the first ten characters, so hand it an ISO string.
          getValue: (row) => {
            const raw = value(row);
            if (typeof raw === "string") return raw;
            return toDate(raw)?.toISOString() ?? null;
          },
        }
      : undefined,
    ...column,
  };
}
