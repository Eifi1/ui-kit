import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { Check, Compass } from "lucide-react";
import { Chip } from "../components/chip";
import type { LabelOverride } from "../i18n/kit-labels";
import { TopBarActionMenu, type TopBarMenuEntry } from "./topbar-action-menu";
import { useTopBarPartsLabels, type TourMenuLabels } from "./top-bar-parts-labels";

/**
 * One tour as the menu needs it — data, so the menu depends on no app's tour registry.
 * The kit's tour engine (`TourProvider`) runs steps and keeps none; which tours exist,
 * which are new and which are taken is the app's (keksdose: `useTours`, `useIsNewTour`,
 * its progress store).
 */
export interface TourMenuTour {
  id: string;
  title: ReactNode;
  /** The page the tour starts on. Its first segment decides "On this page":
   *  "/reports/spending" belongs to "/reports". */
  route?: string;
  /** Shipped after this account was opened and not yet taken: a NEW chip on the row,
   *  and the dot on the compass. */
  isNew?: boolean;
  /** Taken: a ✓ on the row. */
  completed?: boolean;
  /** The row's icon, drawn at 16px. */
  icon?: ReactNode;
  /** When the tour shipped, as an ISO date: the newest of the new come first. */
  since?: string;
}

export interface TourMenuProps {
  tours: readonly TourMenuTour[];
  /** Start a tour — `useTour().start(steps, { id })` with the app's steps. */
  onLaunch: (id: string) => void;
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

const isFresh = (t: TourMenuTour) => !!t.isNew && !t.completed;

/**
 * The top bar's guided-tours control (docs/top-bar-harmonization.md §2.4, §6.7), lifted
 * from keksdose's: the lucide `Compass`, with a NEW dot while a tour is new, and a short
 * list — the tours that start on this page, up to three new ones (newest first), a rule,
 * and "All tours…". A taken tour's row carries a ✓, a new one a NEW chip.
 */
export function TourMenu({
  tours,
  onLaunch,
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

  const forThisPage = tours.filter((t) => t.route !== undefined && pageOf(t.route) === here);
  const fresh = tours.filter(isFresh);
  // ISO dates sort as text; a stable sort keeps one day's tours in the app's order.
  const newRows = fresh
    .filter((t) => !forThisPage.includes(t))
    .sort((a, b) => (b.since ?? "").localeCompare(a.since ?? ""))
    .slice(0, maxNew);
  const rest = href && list !== "all" ? [] : tours.filter((t) => !forThisPage.includes(t) && !newRows.includes(t));

  if (tours.length === 0 && !href) return null;

  const entryFor = (tour: TourMenuTour): TopBarMenuEntry => ({
    key: tour.id,
    icon: tour.icon,
    label: tour.title,
    trailing: tour.completed ? (
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
    { key: "new", label: words.newTours, tours: newRows },
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
      iconBadge={fresh.length > 0 ? { label: words.newDot, tone: "brand" } : null}
      aria-label={words.menu}
      href={href}
      panelClassName="w-72 max-h-[70vh] overflow-y-auto"
      entries={entries}
      triggerAttributes={Object.fromEntries(Object.entries(attributes).filter(([k]) => k.startsWith("data-")))}
    />
  );
}
