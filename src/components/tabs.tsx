import { useLayoutEffect, useMemo, useRef } from "react";
import { Plus, X } from "lucide-react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { FOCUS_RING_WIDTH } from "./focus-ring";
import { scrollIntoStrip, useStripFade } from "../lib/strip-fade";
import { horizontalStep } from "../lib/direction";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { mergeRefs } from "./field-parts";
import { DEFAULT_TABS_LABELS } from "./ui-labels";
import { IconButton } from "./icon-button";

/** One tab of a {@link Tabs} strip. */
export interface TabItem<T extends string> {
  id: T;
  /** A ReactNode so a tab can pair an icon with text. */
  label: ReactNode;
  /** Optional trailing node (e.g. a count pill). */
  badge?: ReactNode;
  /** Marks a tab that IS a route — see {@link TabsProps}. */
  href?: string;
  /** Leading decoration: an icon, or the colour swatches of the lines this tab
   *  draws in a chart above the strip. Hidden from assistive tech — it repeats
   *  what the label says, or it says something the label must say instead. */
  icon?: ReactNode;
  /** A second, smaller line under the label — the one fact that tells two tabs
   *  with similar labels apart ("80 km/h", "Level 3"). Part of the tab's name. */
  detail?: ReactNode;
  /** A tab that exists as a slot with nothing in it yet, drawn with a dashed
   *  outline so a gap in a sequence looks like a gap. Visual only: say "empty" in
   *  the label or `detail` if a screen reader needs to know. */
  empty?: boolean;
  /** `false` keeps this one tab when the strip has `onRemove` — the one sheet a
   *  workbook cannot be without. Default: removable. */
  removable?: boolean;
  /** Plain-text name for the labels the strip composes about this tab ("Remove
   *  …"), for when `label` is not a string. Default: `label` if it is a string,
   *  else the id. */
  name?: string;
}

/** The strings the strip renders on its own behalf — only when it can add or
 *  remove tabs. */
export interface TabsLabels {
  /** The "add" button's visible text when the caller gives no `addLabel`. */
  add: string;
  /** Accessible name of a tab's × — "Remove <tab>". */
  remove: (tab: string) => string;
}

// Defined in ./ui-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_TABS_LABELS };

/**
 * The strip's own props sit on a `<div>`: the tablist IS the root element, so anything
 * a caller hangs on it — a `data-tour` anchor for the kit's guided tour, a test id, an
 * `aria-describedby` — lands there. `onChange` is omitted from the div's props because
 * this component's `onChange` hands over the chosen TAB ID, not a DOM event, and
 * `children` because the strip renders `tabs` — a caller who wants a PANEL wires it up
 * through `panelId`, which is the whole point of that prop.
 */
export interface TabsProps<T extends string>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "children"> {
  /** `label` is a ReactNode so tabs can pair an icon with text; `badge` is an
   *  optional trailing node (e.g. a count pill). `href` marks a tab that IS a route:
   *  it renders as an anchor so it can be middle-/⌘-clicked into a new tab (Keksdose
   *  feedback #451), while a plain click still goes through `onChange` and stays
   *  client-side. Tabs that only flip local state leave it unset — a link to a URL
   *  that does not select the tab would be worse than no link. */
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  /** Let the strip WRAP onto as many rows as it needs below `md`, instead of
   *  scrolling sideways — for a strip carrying more tabs than fit on a phone row.
   *  Keksdose live #262: ten reports on a 406px screen showed about three, and the
   *  round-2 answer (a <select> below `md`) cost a tap to open and a tap to choose.
   *  *"I would rather keep the tabs but have multirow tabs depending on the screen
   *  size, I will not loose the function to see all reports at once and navigate by
   *  single click rather by double click."*
   *
   *  The active MARKER has to change with the layout, which is why this cannot be
   *  done from a call site with a `className`: the default marker is a `border-b-2`
   *  underline riding the container's own bottom rule, and a tab sitting in a row
   *  that does not touch that rule cannot wear it — every row but the last would
   *  show a stray line floating mid-strip, and `-mb-px` would pull each chip a
   *  pixel into the row beneath it. A wrapped strip marks the active tab with a
   *  filled brand chip instead, which is also the only thing findable at a glance
   *  among ten same-weight labels on three rows.
   *
   *  From `md` up NOTHING changes: same single-line underline strip, same paddings,
   *  same colours as every other strip in the app.
   *
   *  Opt-in on purpose. The three-tab strips (invoices, statements, bank imports)
   *  already fit a phone row, and turning those into chips would be an unrequested
   *  redesign of three other pages. */
  wrap?: boolean;
  /**
   * `id` of the element the caller renders the open tab's content into — the missing
   * half of `role="tab"`. A tab that controls nothing is a tab in name only: a screen
   * reader announces "tab, 2 of 5" and then has no way to take the user to what it
   * opened, and no way back.
   *
   * **This component does not render the panel, on purpose.** `Tabs` is the STRIP; the
   * content lives wherever the caller put it — three Keksdose pages render it in a
   * sibling `<Card>`, one renders it through a router outlet, and a tab can BE a route
   * (`href`), in which case the panel is a whole page this component never sees.
   * Wrapping `children` here would mean either moving that content into the strip's
   * subtree — a layout change on every page that uses tabs — or shipping a wrapper
   * that only some callers could use. So the two halves are joined by an id instead.
   *
   * Wire the other end yourself:
   *
   * ```tsx
   * <Tabs tabs={tabs} active={active} onChange={setActive} panelId="report-panel" />
   * <div id="report-panel" role="tabpanel" aria-labelledby="report-panel-tab" tabIndex={-1}>
   * ```
   *
   * `aria-controls` goes on the OPEN tab only, and `${panelId}-tab` is its id — the
   * closed tabs' panels are not in the document, and a dangling `aria-controls`
   * describes a tab as opening something that is not there.
   */
  panelId?: string;
  /**
   * Makes the tabs removable: an × on the OPEN tab, and Delete on a focused tab
   * (only on the open one with `removeOn="active"`).
   *
   * The × is on the open tab only — a row of tabs each carrying one is a row of
   * things to hit by accident, and the tab you can remove should be the one you
   * are looking at — but its room is reserved on every removable tab, so opening a
   * tab never widens it and never pushes the rest of the strip along (lenkbank
   * feedback #72). It is not a tab stop of its own: the strip stays one stop, and the
   * keyboard path is Delete (announced through `aria-keyshortcuts`), which removes
   * whichever tab has focus (see `removeOn`).
   *
   * Assistive tech meets the remove as a "Remove <tab>" button right AFTER the strip,
   * not as the × (0.34): a tablist may own tabs only, so the drawn × is the pointer's
   * and `aria-hidden`, and the named button beside the tablist is visually hidden.
   *
   * The strip only ASKS: it calls this, and the tab goes when the caller drops it
   * from `tabs` — after a confirmation, a request, whatever it needs. When it does,
   * focus that was on the removed tab (or its ×) moves to the open tab if the
   * removed one was open, else to its neighbour, instead of falling to the page.
   */
  onRemove?: (id: T) => void;
  /**
   * Which tabs the Delete key removes.
   *
   * - `"every"` (default): any focused removable tab — the ARIA pattern's reading.
   * - `"active"`: only the OPEN tab, the same one that wears the ×. For a strip whose
   *   remove is immediate and unconfirmed (lenkbank's sheet tabs delete a measurement
   *   sheet at once), so arrowing across the strip and pressing Delete cannot take
   *   out a sheet the user is not looking at. Delete on a closed tab does nothing,
   *   and only the open tab announces the shortcut (`aria-keyshortcuts`).
   *
   * Either way the × is drawn on the open tab only and its room stays reserved on
   * every removable tab, so the strip never relayouts when the selection moves.
   */
  removeOn?: "every" | "active";
  /** Renders an "add" button after the last tab, outside the tablist — it is an
   *  action, not a tab, and a tablist may own only tabs. */
  onAdd?: () => void;
  /** The add button's text. Say what is added — "Add loop", "Add report" says
   *  more than "Add". Default: `tabs.add` from the {@link UiKitProvider}. */
  addLabel?: string;
  /** Overrides for this strip's strings. See {@link TabsLabels}. */
  labels?: LabelOverride<TabsLabels>;
  /** An add or a remove is in flight: the × and the add button are disabled and
   *  Delete is ignored, so a double click cannot remove two tabs. Nothing moves. */
  busy?: boolean;
  /**
   * `"vertical"`: the same strip as a SIDE NAV — one item per row, the open one
   * filled, ↑/↓ walking it (Home/End as before) and `aria-orientation="vertical"` on
   * the tablist. For keksdose's admin page and settings page, which each hand-built
   * the identical sidebar with none of this strip's keyboard, roving tab stop or
   * routed-`href` handling. Everything else — `href` tabs, `badge`, `panelId`,
   * `onRemove`, `onAdd` — means exactly what it means on the horizontal strip; the
   * badge moves to the row's end.
   *
   * **On a phone (`usePhoneLayout()`) it becomes the horizontal strip**, `wrap` and
   * all, rather than staying a column. A side nav only works beside its content; on
   * a phone it has to go ABOVE it, and eight full-width rows there push the panel
   * the user picked below the fold on every visit — the two keksdose pages both
   * collapsed theirs into a scrolling row by hand for exactly that reason. The
   * orientation is switched in JavaScript, not with `md:` classes, so the
   * `aria-orientation` a screen reader hears and the arrow keys that work always
   * match the layout on screen. The caller's own two-column layout has to stack at
   * the same breakpoint (`md:grid-cols-[14rem_1fr]`).
   */
  orientation?: "horizontal" | "vertical";
  /** The `role="tablist"` strip, where the rest of the props go (0.34, API-2, refactor
   *  audit 2026-10). Merged with the strip's own ref, which scrolls the open tab into
   *  view and measures the fade, so neither loses the element. */
  ref?: Ref<HTMLDivElement>;
}

// The two shapes are written out as whole strings rather than as one base plus a
// pile of `md:` overrides. The unwrapped pair is character-for-character what the
// three strips that do not opt in get, so those cannot drift; the wrapped pair is
// authored from scratch, so no unprefixed utility has to be beaten by its own `md:`
// twin through tailwind-merge. The only ordering this relies on is Tailwind's own:
// unprefixed utilities are emitted first, then `md:` — so from 768px up the wrapped
// strip resolves to exactly the paint of the default one. Both themes come free now
// that the colours are tokens: there is no `md:dark:` tier left to keep in step.
const TABLIST_CLASSES =
  "flex gap-1 overflow-x-auto overflow-y-hidden border-b border-subtle";
// The side nav. A column of full-width rows with the open one FILLED rather than
// underlined: an underline under one row of a list reads as a separator, not as a
// selection. `--bg-active` is the kit's own selected-row fill (the sidebar's), so the
// admin page's nav and the app's own sidebar mark "you are here" the same way.
const TABLIST_VERTICAL_CLASSES = "flex flex-col gap-0.5";
const TAB_VERTICAL_CLASSES =
  FOCUS_RING_WIDTH +
  " flex w-full items-center rounded-md px-3 py-2 text-start text-sm font-medium transition-colors focus:outline-none focus-visible:ring-strong";
const TAB_VERTICAL_ACTIVE_CLASSES = "bg-active text-primary";
const TAB_VERTICAL_INACTIVE_CLASSES =
  "text-muted hover:bg-hover hover:text-primary";

const TABLIST_WRAP_CLASSES =
  "flex flex-wrap gap-1.5 md:flex-nowrap md:gap-1 md:overflow-x-auto md:overflow-y-hidden md:border-b md:border-subtle";

// `max-w-full`: no tab outgrows its strip. A sheet's `detail` line ("Spurstangenkraft
// links · … · 31 Punkte") made one tab 448px wide in a 390px strip, and a tab wider
// than the strip cannot be scrolled into view — its end was simply off screen
// (lenkbank L3). The label and detail truncate inside it instead; see `inner`.
const TAB_CLASSES =
  FOCUS_RING_WIDTH +
  " max-w-full whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus-visible:ring-strong";
const TAB_ACTIVE_CLASSES = "border-[var(--text-primary)] text-primary";
const TAB_INACTIVE_CLASSES =
  "border-transparent text-muted hover:text-secondary hover:border-strong";

// Below `md`, a chip: `py-2` on `text-xs` is exactly 32px tall, and ten German
// report labels then land in three rows on a 406px screen (four at `text-sm`). The
// active fill is the app's own selected pair, `--brand` / `--brand-contrast`: the
// palette store writes both halves of it together for every preset and both themes,
// so the contrast holds everywhere (5.1:1 at its worst preset) without a hard-coded
// colour. Inactive chips take the raised card surface with full-strength body text —
// all ten have to stay readable; it is the FILL, not the text weight, that says
// which one is open.
const TAB_WRAP_CLASSES =
  FOCUS_RING_WIDTH +
  " max-w-full whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-strong md:rounded-none md:border-b-2 md:-mb-px md:bg-transparent md:px-3 md:py-2 md:text-sm";
const TAB_WRAP_ACTIVE_CLASSES =
  "bg-brand text-brand-contrast md:border-[var(--text-primary)] md:text-primary";
const TAB_WRAP_INACTIVE_CLASSES =
  "bg-surface text-primary md:border-transparent md:text-muted md:hover:border-strong md:hover:text-secondary";

// The add/remove chrome. The × reserves its gutter on every removable tab (see
// `onRemove`); `md:pe-8` is spelled out because the wrapped chip's `md:px-3` would
// otherwise hand the gutter back from 768px up.
const TAB_REMOVABLE_CLASSES = "pe-8 md:pe-8";
const TAB_EMPTY_CLASSES = "-mx-1.5 rounded border border-dashed border-strong px-1.5";
const TAB_ADD_CLASSES =
  FOCUS_RING_WIDTH +
  " inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-primary focus:outline-none focus-visible:ring-strong disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4";
const TAB_ADD_WRAP_CLASSES = "px-2.5 text-xs md:px-3 md:text-sm";
// `relative`: the phone's visually hidden label needs a positioned ancestor (see the
// sr-only rule in CONTRIBUTING); `max-md:px-2` squares the lone "+".
const TAB_ADD_PHONE_CLASSES = "relative max-md:px-2";

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
  wrap = false,
  panelId,
  onRemove,
  removeOn = "every",
  onAdd,
  addLabel,
  labels,
  busy = false,
  orientation = "horizontal",
  "aria-label": ariaLabel,
  ref,
  ...rest
}: TabsProps<T>) {
  const text = useKitLabels("tabs", DEFAULT_TABS_LABELS, labels);
  // See `orientation`: a vertical strip is the horizontal one on a phone.
  const phone = usePhoneLayout();
  const vertical = orientation === "vertical" && !phone;
  const stripRef = useRef<HTMLDivElement>(null);
  const setStrip = useMemo(() => mergeRefs(stripRef, ref), [ref]);
  const fade = useStripFade(stripRef);
  // The OPEN tab is scrolled into the strip whenever it changes — on mount too, for a
  // deep link to the seventh report. A selection behind the cut edge was the worst
  // case of the overflow above: the one tab the panel below belongs to, sliced to
  // "80 km," under the add button. Only the strip scrolls (`scrollBy` on it, not
  // `scrollIntoView`, which would scroll the page as well), and only as far as needed
  // to clear the fade.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (strip && tab) scrollIntoStrip(strip, tab);
  }, [active]);
  const isRemovable = (tab: TabItem<T>) => onRemove !== undefined && tab.removable !== false;
  // Whether Delete reaches this tab: every removable tab, or only the open one.
  const deletesOnKey = (tab: TabItem<T>) =>
    isRemovable(tab) && (removeOn === "every" || tab.id === active);
  const nameOf = (tab: TabItem<T>) =>
    tab.name ?? (typeof tab.label === "string" ? tab.label : tab.id);

  // Where focus goes once a removal the strip asked for has happened. The caller
  // owns `tabs` and may take its time (a confirmation, a request), so this waits
  // for the id to actually leave the list rather than guessing at the moment.
  const pendingFocus = useRef<{ removed: T; wasActive: boolean; neighbour?: T } | null>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const requestRemove = (id: T) => {
    const index = tabs.findIndex((t) => t.id === id);
    pendingFocus.current = {
      removed: id,
      wasActive: id === active,
      neighbour: (tabs[index + 1] ?? tabs[index - 1])?.id,
    };
    onRemove?.(id);
  };
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || tabs.some((t) => t.id === pending.removed)) return;
    pendingFocus.current = null;
    const strip = stripRef.current;
    if (!strip) return;
    // Only focus that fell out of the strip with the removed tab is ours to place —
    // or that sits on the remove button after it, which a pick removed through.
    // If the user has moved on — into the panel, into a dialog — leave it there.
    const focused = document.activeElement;
    if (focused && focused !== document.body && !strip.contains(focused) && focused !== removeRef.current) return;
    // The removed tab was open: focus follows the caller's new selection, which is
    // also the strip's tab stop. It was not: its neighbour, as the ARIA pattern has it.
    const target =
      !pending.wasActive && tabs.some((t) => t.id === pending.neighbour)
        ? pending.neighbour
        : active;
    const index = tabs.findIndex((t) => t.id === target);
    strip.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
  }, [tabs, active]);

  // Arrow keys walk the strip in DOM order (ARIA tabs pattern), which is what keeps
  // a WRAPPED strip navigable: the rows flow in DOM order too, so Right off the end
  // of row one lands on the first chip of row two rather than nowhere. Home/End jump
  // to the ends. Focus only — activation stays on click/Enter/Space, because a tab
  // here can be a real route and moving focus must not navigate.
  //
  // On the TABS, not on the tablist. The container carried it, which left a `<div>`
  // wearing an interactive role and a key handler while being unfocusable —
  // `jsx-a11y/interactive-supports-focus`, and the only instance of it left in `src/`.
  // The fix that rule wants is `tabIndex` on the div; the fix the pattern wants is
  // the handler on the elements that are natively focusable and actually receive the
  // keystroke. Those are the tabs, so the warning goes away by being right rather
  // than by being satisfied.
  const onTabKeyDown = (e: KeyboardEvent<HTMLElement>, tab: TabItem<T>) => {
    // Delete removes the FOCUSED tab (the ARIA pattern's optional key for deletable
    // tabs) — the keyboard's way to the × that is not a tab stop. `busy` swallows it
    // rather than letting it fall through to the page. With `removeOn="active"` only
    // the open tab answers; a closed one lets the key pass untouched.
    if (e.key === "Delete" && deletesOnKey(tab)) {
      e.preventDefault();
      if (!busy) requestRemove(tab.id);
      return;
    }
    // Along the reading direction: the strip is a flex row, so in RTL the NEXT tab sits
    // to the left, and ArrowLeft has to reach it. A vertical strip answers ↑/↓ instead
    // — and ONLY those, as the pattern has it: ←/→ are left to the page, where a side
    // nav's neighbour (the panel) may well want them.
    const step: 1 | -1 | 0 = vertical
      ? e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowUp"
          ? -1
          : 0
      : horizontalStep(e.key, e.currentTarget);
    if (step === 0 && e.key !== "Home" && e.key !== "End") return;
    const strip = e.currentTarget.closest('[role="tablist"]');
    if (!strip) return;
    const items = Array.from(strip.querySelectorAll<HTMLElement>('[role="tab"]'));
    const from = items.indexOf(e.currentTarget);
    if (from === -1) return;
    e.preventDefault();
    const to =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? items.length - 1
          : (from + step + items.length) % items.length;
    items[to]?.focus();
  };
  const tablist = (
    <div
      // Before the role and the name: a caller's arbitrary attribute is welcome on the
      // strip, but a `role` or an `aria-label` arriving through a spread props object
      // must not be able to unmake the tablist the tabs below are registered against.
      {...rest}
      ref={setStrip}
      role="tablist"
      // Names the GROUP — every tab carries its own text — so a strip under a visible
      // heading that already says it can leave it unset.
      aria-label={ariaLabel}
      // Only when vertical: `horizontal` is the tablist's implicit value, and the
      // attribute on every existing strip would be noise in every snapshot of them.
      aria-orientation={vertical ? "vertical" : undefined}
      // Merged over a caller's own style rather than replacing it; see useStripFade.
      // `data-overflow` names the cut ends in reading-direction terms, for a caller's
      // own affordance (a scroll button) and for tests, which cannot read the mask.
      style={fade.mask ? { ...rest.style, maskImage: fade.mask, WebkitMaskImage: fade.mask } : rest.style}
      data-overflow={fade.overflow}
      // With an add button the strip gains an outer box, and `className` goes there
      // — it is the box a caller's margin or width is meant for.
      className={cn(
        vertical ? TABLIST_VERTICAL_CLASSES : wrap ? TABLIST_WRAP_CLASSES : TABLIST_CLASSES,
        onAdd ? "min-w-0" : className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const removable = isRemovable(tab);
        // Written once and worn by either tag below, so a routed tab and a
        // state-only tab stay indistinguishable to the eye and to a screen reader.
        const shared = {
          role: "tab" as const,
          "aria-selected": isActive,
          // Roving tabindex: the whole strip is ONE stop in the page's tab order, and
          // it is the open tab. Ten report tabs otherwise cost ten Tab presses to step
          // over on the way to the table below them (live #262's strip is the extreme
          // case, but every strip in the app paid it).
          //
          // The stop follows the SELECTION, not the focus. Arrowing is a look around —
          // activation here is manual, because a tab can be a real route — so re-
          // pointing the stop at a report the user only arrowed past would hand the
          // strip back on the next visit in a state they never chose. The cost is that
          // Tab out and back returns to the open tab rather than to the last one
          // looked at; the ARIA pattern allows either, and this one needs no second
          // piece of state shadowing `active`.
          tabIndex: isActive ? 0 : -1,
          // Only the open tab: see `panelId`.
          "aria-controls": isActive ? panelId : undefined,
          id: isActive && panelId ? `${panelId}-tab` : undefined,
          "aria-keyshortcuts": deletesOnKey(tab) ? "Delete" : undefined,
          onKeyDown: (e: KeyboardEvent<HTMLElement>) => onTabKeyDown(e, tab),
          className: vertical
            ? cn(
                TAB_VERTICAL_CLASSES,
                isActive ? TAB_VERTICAL_ACTIVE_CLASSES : TAB_VERTICAL_INACTIVE_CLASSES,
                removable && "pe-8",
              )
            : cn(
                wrap ? TAB_WRAP_CLASSES : TAB_CLASSES,
                wrap
                  ? isActive
                    ? TAB_WRAP_ACTIVE_CLASSES
                    : TAB_WRAP_INACTIVE_CLASSES
                  : isActive
                    ? TAB_ACTIVE_CLASSES
                    : TAB_INACTIVE_CLASSES,
                removable && TAB_REMOVABLE_CLASSES,
              ),
        };
        const inner = (
          <span
            className={cn(
              // In a side nav the row is the full width, so the label takes it and a
              // badge lands at the row's end, where a column of counts lines up.
              vertical ? "flex min-w-0 flex-1 items-center gap-1.5" : "inline-flex max-w-full min-w-0 items-center gap-1.5",
              tab.empty && TAB_EMPTY_CLASSES,
            )}
          >
            {tab.icon != null && (
              <span aria-hidden className="inline-flex shrink-0 items-center gap-0.5">
                {tab.icon}
              </span>
            )}
            {tab.detail != null ? (
              // `min-w-0` + `truncate-until-large` on each line: capped by the tab's
              // `max-w-full`, a long detail ends in an ellipsis at Normal and wraps from
              // Large up (text size §10.17; round 0.34 T1), where the tab grows a line
              // rather than cut the words. The whole text stays the tab's name.
              <span className="flex min-w-0 flex-col items-start text-start">
                <span className="max-w-full truncate-until-large">{tab.label}</span>
                {/* A separator for the NAME only — whitespace between flex items is
                    not drawn, and without it the two lines ran together into one
                    word for a screen reader ("80 km/hloop 2"). */}{" "}
                <span
                  className={cn(
                    "max-w-full truncate-until-large text-caption font-normal leading-tight text-muted",
                    // On a wrapped strip's filled chip (below `md`) the muted grey
                    // was dark text on the brand fill — "loop 2" all but vanished
                    // under the one label that most needed reading. It takes the
                    // chip's own ink instead, as the label and the × already do.
                    wrap && isActive && !vertical && "text-brand-contrast md:text-muted",
                  )}
                >
                  {tab.detail}
                </span>
              </span>
            ) : (
              tab.label
            )}
            {tab.badge != null ? (
              vertical ? <span className="ms-auto flex shrink-0 items-center">{tab.badge}</span> : tab.badge
            ) : null}
          </span>
        );
        const element = tab.href ? (
          <a
            key={tab.id}
            {...shared}
            href={tab.href}
            draggable={false}
            onClick={(e) => {
              // Middle-, ⌘/Ctrl-, Shift- and Alt-click belong to the browser
              // (feedback #451); only the plain left click is ours to cancel and
              // route through `onChange`, which keeps the switch client-side.
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onChange(tab.id);
            }}
            // A <button> tab activated on Space; an anchor does not, so becoming a
            // link (feedback #451) would have quietly cost keyboard users the tab
            // strip. Enter is deliberately untouched — it is the anchor's own
            // default and already arrives at `onChange` through the click handler
            // above, so handling it here too would switch tabs twice. Same three
            // lines the mobile row card carries, for the same reason; the rejected
            // alternative — keeping a button and faking the middle click with
            // window.open — is what the whole item is moving away from.
            //
            // Composed with the strip's arrow-key walk rather than replacing it: this
            // prop overrides the one in `shared`, and an anchor tab that lost the
            // arrows would be a strip that is navigable only where it is not a link.
            onKeyDown={(e) => {
              onTabKeyDown(e, tab);
              if (e.defaultPrevented || e.key !== " ") return;
              e.preventDefault();
              onChange(tab.id);
            }}
          >
            {inner}
          </a>
        ) : (
          <button key={tab.id} {...shared} onClick={() => onChange(tab.id)}>
            {inner}
          </button>
        );
        if (!removable) return element;
        return (
          // The × cannot go INSIDE the tab: a button in a button is invalid HTML, and
          // a tab's children are presentational, so a reader would flatten it into the
          // tab's name. It sits beside the tab, over the gutter the tab reserves.
          <div key={tab.id} className={cn("relative flex max-w-full", !vertical && "shrink-0")}>
            {element}
            {isActive && (
              <IconButton
                size="2xs"
                tone="danger"
                // The POINTER's ×, hidden from assistive tech (round 0.34, the showcase's
                // axe check): a tablist may own tabs only, and this button sat in it. The
                // named "Remove <tab>" a screen reader's cursor and a touch reader's swipe
                // reach is `removeButton`, after the strip. Not a tab stop either way:
                // the strip is one, and Delete is the keyboard's path.
                aria-hidden
                data-tab-remove=""
                tabIndex={-1}
                type="button"
                disabled={busy}
                onClick={() => requestRemove(tab.id)}
                className={cn(
                  "absolute inset-y-0 end-1 my-auto",
                  // On a wrapped strip's filled chip the quiet grey would vanish into
                  // the brand fill below `md`.
                  wrap && "text-brand-contrast md:text-placeholder",
                )}
              >
                <X />
              </IconButton>
            )}
          </div>
        );
      })}
    </div>
  );
  // The open tab's remove action as assistive tech meets it: right after the strip,
  // OUTSIDE the tablist, which may own tabs only (round 0.34, the showcase's axe check).
  // Visually hidden, since the × drawn on the tab is the pointer's, and not a tab stop,
  // since Delete is the keyboard's. `sr-only-fixed`: it sits wherever the caller put the
  // strip, with no positioned box of the kit's around it.
  const activeTab = tabs.find((tab) => tab.id === active);
  const removeButton =
    activeTab && isRemovable(activeTab) ? (
      <button
        ref={removeRef}
        type="button"
        tabIndex={-1}
        disabled={busy}
        onClick={() => requestRemove(activeTab.id)}
        className="sr-only-fixed"
      >
        {text.remove(nameOf(activeTab))}
      </button>
    ) : null;
  if (!onAdd) {
    // No outer box: the strip stays the root, as callers' `className` and tests expect.
    return removeButton ? (
      <>
        {tablist}
        {removeButton}
      </>
    ) : (
      tablist
    );
  }
  if (vertical) {
    // Under the column, not beside it, and with no rule to carry on: a side nav has none.
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        {tablist}
        {removeButton}
        <button type="button" onClick={onAdd} disabled={busy} className={TAB_ADD_CLASSES}>
          <Plus aria-hidden />
          {addLabel ?? text.add}
        </button>
      </div>
    );
  }
  return (
    <div
      className={cn(
        wrap ? "flex flex-wrap items-end gap-1.5 md:flex-nowrap md:gap-0" : "flex items-end",
        className,
      )}
    >
      {tablist}
      {removeButton}
      {/* Outside the tablist: an action, not a tab — and a tablist may own only
          tabs. The rule under the strip carries on beneath it. */}
      <div
        className={cn(
          "flex flex-1 items-center",
          wrap
            ? "md:self-stretch md:border-b md:border-subtle"
            : "self-stretch border-b border-subtle",
        )}
      >
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className={cn(TAB_ADD_CLASSES, wrap ? TAB_ADD_WRAP_CLASSES : TAB_ADD_PHONE_CLASSES)}
        >
          <Plus aria-hidden />
          {/* Below md a scrolling strip keeps the room for tabs: the label is visually
              hidden and the "+" carries it as its name. Beside "+ Add loop" a 390px strip
              showed the open tab and a sliver of the next (showcase audit). A wrapping
              strip has its own row there, so it keeps the label. */}
          <span className={wrap ? undefined : "max-md:sr-only"}>{addLabel ?? text.add}</span>
        </button>
      </div>
    </div>
  );
}
