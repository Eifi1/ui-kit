import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { Check, Compass } from "lucide-react";
import { Chip } from "../components/chip";
import { isTourDone, isTourNew, isTourReset, type TourCompletions, type TourInfo } from "../tour/tour-info";
import type { LabelOverride } from "../i18n/kit-labels";
import { TopBarActionMenu, type TopBarMenuEntry } from "./topbar-action-menu";
import { useTopBarPartsLabels, type TourMenuLabels } from "./top-bar-parts-labels";

/**
 * One tour as the menu needs it — data, so the menu depends on no app's tour registry.
 * The kit's tour engine (`TourProvider`) runs steps and keeps none; which tours exist,
 * which are new and which are taken is the app's (keksdose: `useTours`, `useIsNewTour`,
 * its progress store).
 *
 * Since 0.43 it is a subset of the catalogue's `TourInfo` (docs/tours-harmonization.md
 * §3), so an app keeps ONE list: hand the menu the catalogue's tours with `completed`
 * and `joined`, and it works out ✓, NEW and "Updated" itself. Given the record, the kit's
 * ✓ and "Updated" win over a row's `completed` and `reset`; given `joined`, its NEW wins
 * over `isNew` — so a row built from an app's own booleans cannot hide an update (§8,
 * build review kastlan A3, keksdose K-S6). The booleans are for a menu with neither.
 */
export type TourMenuTour = Partial<Pick<TourInfo, "route" | "since" | "updated">> & {
  id: string;
  title: ReactNode;
  /** The row's icon, drawn at 16px. */
  icon?: ReactNode;
  /** Shipped after this account was opened and not yet taken: a NEW chip on the row,
   *  and the dot on the compass. */
  isNew?: boolean;
  /** Taken: a ✓ on the row. */
  completed?: boolean;
  /** Taken before its last update (§8): an "Updated" chip, and the dot, as for NEW. */
  reset?: boolean;
};

export interface TourMenuProps {
  tours: readonly TourMenuTour[];
  /** Start a tour — `useTour().start(steps, { id })` with the app's steps. */
  onLaunch: (id: string) => void;
  /** The device's completions (`useTourProgress().completed`): ✓ and "Updated" from them. */
  completed?: TourCompletions;
  /** The account's `created_at`: NEW from it, by `isTourNew`. */
  joined?: string | null;
  /**
   * The app's tours page (keksdose `/tours`). With it the compass is a LINK there plus a
   * hover menu, and the menu ends in "All tours…". Without it (§6.7, Kurvenschmiede) the
   * compass opens the menu, and the tours on neither list follow below a rule.
   */
  href?: string;
  /** The open page's path. Default: the router's location. */
  pathname?: string;
  /** How many new tours the menu offers beyond the page's own. Default 3. */
  maxNew?: number;
  /**
   * `"all"`: list every tour — this page's and the new ones first, then the rest below a
   * rule — with `href` too, before "All tours…". For an app whose tours carry no `route`,
   * `isNew` or `since` (kastlan, build review A1), where the short list would be empty
   * off the tours' page. Default `"short"`: with `href`, only this page's and the new.
   */
  list?: "short" | "all";
  /** Prop > `<UiKitProvider labels={{ topBarParts: { tours } }}>` > English. */
  labels?: LabelOverride<TourMenuLabels>;
  /** `data-*` attributes go on the compass — a tour's anchor (`data-tour="tours"`). */
  [key: `data-${string}`]: string | number | boolean | undefined;
}

/** A path's first segment — "/reports/spending?g=month" → "/reports". */
const pageOf = (path: string) => `/${path.split(/[?#]/)[0].split("/")[1] ?? ""}`;

const isFresh = (t: TourMenuTour) => (!!t.isNew && !t.completed) || !!t.reset;
/** When it last became news: its update, else its ship date. */
const newsOf = (t: TourMenuTour) => (t.reset ? t.updated?.date : undefined) ?? t.since ?? "";

/**
 * The top bar's guided-tours control (docs/top-bar-harmonization.md §2.4, §6.7), lifted
 * from keksdose's: the lucide `Compass`, with a NEW dot while a tour is new, and a short
 * list — the tours that start on this page, up to three new ones (newest first), a rule,
 * and "All tours…". A taken tour's row carries a ✓, a new one a NEW chip.
 */
export function TourMenu({
  tours: toursProp,
  onLaunch,
  completed: completions,
  joined,
  href,
  pathname: pathnameProp,
  maxNew = 3,
  list = "short",
  labels: labelsProp,
  ...attributes
}: TourMenuProps) {
  const words = useTopBarPartsLabels(labelsProp ? { tours: labelsProp } : undefined).tours;
  const location = useLocation();
  const here = pageOf(pathnameProp ?? location.pathname);
  const tours =
    completions === undefined && joined === undefined
      ? toursProp
      : toursProp.map((t) => {
          const at = completions?.[t.id];
          // Ever completed: the record when there is one, else the row's own word.
          const ever = completions ? at !== undefined : !!t.completed;
          return {
            ...t,
            completed: completions ? isTourDone(t, at) : t.completed,
            reset: completions ? isTourReset(t, at) : t.reset,
            isNew: joined !== undefined ? isTourNew({ since: t.since, joined, completed: ever }) : t.isNew,
          };
        });

  const forThisPage = tours.filter((t) => t.route !== undefined && pageOf(t.route) === here);
  const fresh = tours.filter(isFresh);
  // ISO dates sort as text; a stable sort keeps one day's tours in the app's order.
  const newRows = fresh
    .filter((t) => !forThisPage.includes(t))
    .sort((a, b) => newsOf(b).localeCompare(newsOf(a)))
    .slice(0, maxNew);
  const rest = href && list !== "all" ? [] : tours.filter((t) => !forThisPage.includes(t) && !newRows.includes(t));

  if (tours.length === 0 && !href) return null;

  const entryFor = (tour: TourMenuTour): TopBarMenuEntry => ({
    key: tour.id,
    icon: tour.icon,
    label: tour.title,
    trailing: tour.reset ? (
      <Chip size="sm" tone="brand" caps className="px-1.5">
        {words.badgeUpdated}
      </Chip>
    ) : tour.completed ? (
      <>
        <Check aria-hidden className="size-4 text-success" />
        <span className="sr-only">{words.completed}</span>
      </>
    ) : tour.isNew ? (
      // The kit's inert Chip: a plain <span>, no role of its own inside the menu.
      <Chip size="sm" tone="brand" caps className="px-1.5">
        {words.badgeNew}
      </Chip>
    ) : undefined,
    onSelect: () => onLaunch(tour.id),
  });

  const blocks = [
    { key: "this-page", label: words.thisPage, tours: forThisPage },
    { key: "new", label: newRows.some((t) => t.reset) ? words.newAndUpdated : words.newTours, tours: newRows },
  ].filter((b) => b.tours.length > 0);
  const tail: TopBarMenuEntry[] = [
    ...rest.map(entryFor),
    ...(href
      ? [{ kind: "link" as const, key: "all-tours", icon: <Compass className="size-4" />, label: words.allTours, to: href }]
      : []),
  ];

  const entries: TopBarMenuEntry[] = [
    ...blocks.flatMap((b): TopBarMenuEntry[] => [
      { kind: "heading", key: `head-${b.key}`, label: b.label },
      ...b.tours.map(entryFor),
    ]),
    ...(blocks.length > 0 && tail.length > 0 ? [{ kind: "divider" as const, key: "sep-all" }] : []),
    ...tail,
  ];

  return (
    <TopBarActionMenu
      icon={<Compass className="size-5" />}
      iconBadge={
        fresh.length > 0
          ? { label: fresh.some((t) => !t.reset) ? words.newDot : words.updatedDot, tone: "brand" }
          : null
      }
      aria-label={words.menu}
      href={href}
      panelClassName="w-72 max-h-[70vh] overflow-y-auto"
      entries={entries}
      triggerAttributes={Object.fromEntries(Object.entries(attributes).filter(([k]) => k.startsWith("data-")))}
    />
  );
}
