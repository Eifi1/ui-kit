import { useId, type ReactNode } from "react";
import { Circle, CircleCheck, Clock, Play } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitFormat } from "../lib/format";
import { foldForSearch } from "../lib/text-match";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { Chip } from "../components/chip";
import { Caption } from "../components/text";
import { EmptyState } from "../components/empty-state";
import { SearchField } from "../components/search-field";
import { Select } from "../components/select";
import { ToggleGroup } from "../components/toggle-group";
import { DEFAULT_TOUR_CATALOGUE_LABELS, type TourCatalogueLabels } from "./tour-catalogue-labels";
import { isTourDone, isTourNew, isTourReset, type TourCompletions, type TourGroup, type TourInfo } from "./tour-info";
import type { TourCatalogueFilter, TourStateFilter } from "./use-tour-url-sync";

export { DEFAULT_TOUR_CATALOGUE_LABELS };
export type { TourCatalogueLabels };

/* ── The card ───────────────────────────────────────────────────────────────── */

export interface TourCatalogueCardProps {
  tour: TourInfo;
  /** The completion's ISO timestamp, `null` for one without a date; absent while untaken. */
  completedAt?: string | null;
  /** NEW — `isTourNew`. The catalogue works it out; a card on its own is told. */
  isNew?: boolean;
  onLaunch: (id: string) => void;
  /** "Mark as not done". Without it, the link is not drawn. */
  onReset?: (id: string) => void;
  /**
   * Formats the completion and update days. Default: the kit's medium date in the provider's locale.
   * It gets the completion's ISO instant and the update's bare `"YYYY-MM-DD"` (`updated.date`): read
   * the bare day on its calendar (the kit's `formatDate`, `parseIsoDate`), never `new Date(day)`,
   * which is UTC midnight and the day before west of UTC (round 0.45, N9).
   */
  formatDate?: (iso: string) => string;
  labels?: LabelOverride<TourCatalogueLabels>;
  className?: string;
}

/**
 * One tour's card — keksdose's (tours-page.tsx `TourCard`, dev#557), laid out top to
 * bottom so the cards sit side by side: the state icon beside a column holding the tour's
 * icon, title, NEW (or "Updated", §8) and the app's `badge`, the one-liner and, from `sm`,
 * the longer account. The foot is pinned to the bottom edge, so every Start in a row of
 * cards lands on one line: the points chip, the step count and the duration, the
 * completion (or reset) line, "Mark as not done" and Start / Replay. Points, steps and
 * duration are each left out when the tour has none — no gap, no "0 points" (KS).
 */
export function TourCatalogueCard({
  tour,
  completedAt,
  isNew = false,
  onLaunch,
  onReset,
  formatDate: formatDateProp,
  labels: labelsProp,
  className,
}: TourCatalogueCardProps) {
  const words = useKitLabels("tourCatalogue", DEFAULT_TOUR_CATALOGUE_LABELS, labelsProp);
  const { formatDate } = useKitFormat();
  const day = formatDateProp ?? ((iso: string) => formatDate(iso, "medium"));
  const titleId = useId();
  const done = isTourDone(tour, completedAt);
  const reset = isTourReset(tour, completedAt);
  const hasFacts = tour.points != null || tour.steps != null || tour.duration != null;
  const note = done
    ? completedAt
      ? words.completedOn(day(completedAt))
      : words.completed
    : reset && tour.updated
      ? words.resetOn(day(tour.updated.date), tour.updated.reason)
      : null;

  return (
    <Card className={cn("flex h-full flex-col p-4", className)}>
      {/* Title, one-liner and the long body share ONE left edge, in the column beside the
          state icon. */}
      <div className="flex flex-1 items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", done ? "text-success" : "text-muted")}>
          {done ? <CircleCheck aria-hidden className="size-5" /> : <Circle aria-hidden className="size-5" />}
          <span className="sr-only">{done ? words.completed : words.notCompleted}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {tour.icon != null && (
              <span aria-hidden className="inline-flex shrink-0 text-brand [&_svg]:size-4">
                {tour.icon}
              </span>
            )}
            {/* The id on the words, not the heading: the Start button is described by them. */}
            <h3 className="font-medium">
              <span id={titleId}>{tour.title}</span>
            </h3>
            {/* It retires itself the moment the tour is taken — nothing to dismiss. */}
            {isNew && !reset && (
              <Chip size="sm" tone="brand" caps className="px-1.5">
                {words.badgeNew}
              </Chip>
            )}
            {reset && (
              <Chip size="sm" tone="brand" caps className="px-1.5">
                {words.badgeUpdated}
              </Chip>
            )}
            {tour.badge}
          </div>
          {tour.description && <p className="mt-1 text-sm text-muted">{tour.description}</p>}
          {/* `hidden sm:block`: one card per row is the phone, where these paragraphs
              would turn the page into a scroll; the search still reads them. */}
          {tour.about && <p className="mt-2 hidden text-sm leading-relaxed text-secondary sm:block">{tour.about}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          {hasFacts && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tour.points != null && (
                <Chip size="sm" tone="brand">
                  {words.points(tour.points)}
                </Chip>
              )}
              {tour.steps != null && <Caption as="span">{words.steps(tour.steps)}</Caption>}
              {tour.duration != null && (
                <Caption as="span" className="inline-flex items-center gap-1">
                  <Clock aria-hidden className="size-3" />
                  {words.duration(tour.duration)}
                </Caption>
              )}
            </div>
          )}
          {note && <p className={cn("text-xs text-muted", hasFacts && "mt-1")}>{note}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {done && onReset && (
            <Button variant="link" tone="muted" size="sm" aria-describedby={titleId} onClick={() => onReset(tour.id)}>
              {words.markUndone}
            </Button>
          )}
          <Button aria-describedby={titleId} onClick={() => onLaunch(tour.id)}>
            <Play aria-hidden className="size-4" /> {done ? words.replay : words.start}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── The page body ─────────────────────────────────────────────────────────── */

export interface TourCatalogueProps extends TourCatalogueFilter {
  /** The tours this person may take, already filtered by role and data (§6.3). */
  tours: readonly TourInfo[];
  /** The sections, in the app's order. A tour whose group is not here is not listed. */
  groups: readonly TourGroup[];
  completed: TourCompletions;
  /** The account's `created_at`: a tour shipped after it, untaken, is NEW. Unknown → none is. */
  joined?: string | null;
  /** A filter changed — `{query}`, `{group}`, `{state}`, or all three for "Clear filters". */
  onChange: (patch: Partial<TourCatalogueFilter>) => void;
  onLaunch: (id: string) => void;
  /** "Mark as not done" — `useTourProgress().reset`. */
  onReset?: (id: string) => void;
  /** Above the filter bar: the app's page header with its points tile (§6.1). */
  header?: ReactNode;
  /** Each card's `formatDate`: see {@link TourCatalogueCardProps.formatDate} (a bare day for the update). */
  formatDate?: (iso: string) => string;
  /** The search's locale (case folding). Default: the provider's. */
  locale?: string;
  labels?: LabelOverride<TourCatalogueLabels>;
  className?: string;
}

const STATE_FILTERS: readonly TourStateFilter[] = ["all", "todo", "done"];

/**
 * The tours page's body (docs/tours-harmonization.md §2.1, §3) — keksdose's /tours:
 *
 * - **The filter bar**: a search, a group select and an all / to do / done toggle,
 *   stacked below `lg` and side by side from it. Each count is what the OTHER filters
 *   leave: the toggle counts the search and the group, each group the search and the
 *   state. Under it, while a filter is on, "Showing X of Y tours".
 * - **The sections**: one per group, in the app's order — an h2 with its icon and help
 *   line over a `sm:2 / xl:3` grid of `TourCatalogueCard`s. A group the filters empty is
 *   hidden; when nothing is left, an empty state with "Clear filters".
 * - **Controlled**: `query`, `group`, `state` and `onChange`, so the app keeps them in its
 *   URL (`useTourCatalogueUrlState`).
 *
 * A tour reset by an update (§8) is "to do" for the toggle and the counts.
 */
export function TourCatalogue({
  tours,
  groups,
  completed,
  joined,
  query,
  group: groupProp,
  state: stateProp,
  onChange,
  onLaunch,
  onReset,
  header,
  formatDate,
  locale: localeProp,
  labels: labelsProp,
  className,
}: TourCatalogueProps) {
  const words = useKitLabels("tourCatalogue", DEFAULT_TOUR_CATALOGUE_LABELS, labelsProp);
  const uid = useId();
  const { locale: kitLocale } = useKitFormat();
  const locale = localeProp ?? kitLocale;
  // A group or state the list does not have is no filter at all (an old link).
  const group = groups.some((g) => g.id === groupProp) ? groupProp : null;
  const state = STATE_FILTERS.includes(stateProp) ? stateProp : "all";

  const listed = tours.filter((t) => groups.some((g) => g.id === t.group));
  const done = (tour: TourInfo) => isTourDone(tour, completed[tour.id]);
  const needle = foldForSearch(query.trim(), locale);
  const matchesQuery = (tour: TourInfo) =>
    !needle ||
    [tour.title, tour.description, tour.about].some((text) => !!text && foldForSearch(text, locale).includes(needle));
  const inState = (tour: TourInfo) => (state === "all" ? true : state === "done" ? done(tour) : !done(tour));
  const inGroup = (tour: TourInfo, id: string | null = group) => id === null || tour.group === id;

  const found = listed.filter((t) => matchesQuery(t) && inGroup(t));
  const foundDone = found.filter(done).length;
  const visible = found.filter(inState);
  const groupCount = (id: string | null) =>
    listed.filter((t) => matchesQuery(t) && inState(t) && inGroup(t, id)).length;
  const filtering = needle.length > 0 || state !== "all" || group !== null;
  const sections = groups
    .map((g) => ({ ...g, tours: visible.filter((t) => t.group === g.id) }))
    .filter((g) => g.tours.length > 0);

  return (
    <div className={cn("space-y-4", className)}>
      {header}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchField
          className="lg:max-w-xs lg:flex-1"
          value={query}
          onChange={(value) => onChange({ query: value })}
          aria-label={words.searchLabel}
          placeholder={words.searchPlaceholder}
        />
        {/* A select, not a chip per group: on a phone those wrap into rows above the list
            they filter, and an app may have ten groups (ka F8). Named, not labelled: a
            floating label makes it taller than the search box beside it (dev #589). */}
        <Select
          className="lg:w-60"
          aria-label={words.groupLabel}
          value={group ?? ""}
          onChange={(event) => onChange({ group: event.target.value || null })}
        >
          <option value="">{words.groupAll(groupCount(null))}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {words.groupOption(g.title, groupCount(g.id))}
            </option>
          ))}
        </Select>
        <ToggleGroup
          value={state}
          onChange={(value: TourStateFilter) => onChange({ state: value })}
          aria-label={words.stateLabel}
          className="lg:w-auto"
          options={[
            { value: "all", label: words.stateAll(found.length) },
            { value: "todo", label: words.stateTodo(found.length - foundDone) },
            { value: "done", label: words.stateDone(foundDone) },
          ]}
        />
      </div>
      {filtering && (
        <p role="status" className="-mt-2 text-xs text-muted">
          {words.showing(visible.length, listed.length)}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title={words.noMatches} hint={words.noMatchesHint} />
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => onChange({ query: "", group: null, state: "all" })}>
              {words.clearFilters}
            </Button>
          </div>
        </div>
      ) : (
        // A GRID, never columns: a section holding one card keeps a cell's width.
        sections.map((section) => (
          <section key={section.id} aria-labelledby={`${uid}-${section.id}`} className="space-y-3">
            <h2 id={`${uid}-${section.id}`} className="flex items-center gap-1.5 text-sm font-semibold text-muted">
              {section.icon != null && (
                <span aria-hidden className="inline-flex shrink-0 [&_svg]:size-4">
                  {section.icon}
                </span>
              )}
              {section.title}
            </h2>
            {section.help && <p className="-mt-2 text-xs text-muted">{section.help}</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {section.tours.map((tour) => (
                <TourCatalogueCard
                  key={tour.id}
                  tour={tour}
                  completedAt={completed[tour.id]}
                  isNew={isTourNew({ since: tour.since, joined, completed: completed[tour.id] !== undefined })}
                  onLaunch={onLaunch}
                  onReset={onReset}
                  formatDate={formatDate}
                  labels={labelsProp}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
