import { isValidElement } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { useLargeText } from "../hooks/use-large-text";
import { useKitLabels } from "../i18n/kit-labels";
import { Popover } from "./popover";
import { Button, CompactControls, IconButton } from "./ui";
import { useCommitReason, type CommitScope } from "./write-lock";
import type { IconButtonGlyphSize, IconButtonSize } from "./ui";
import type { TooltipSide } from "./tooltip";
import type { DataTableColumn } from "./data-table";

/**
 * A row's actions — inline icons at Normal, one "⋯" menu at Large and above
 * (docs/text-size-harmonization.md §10.8).
 *
 * At Large an IconButton shows its label as text (§4). In a dense row — a register's
 * action column, a list row's end — every label at once does not fit: Kurvenschmiede
 * has 44 IconButtons in rows, kastlan 119. So a row's actions collapse instead, into
 * the menu the user roster has used since 0.31 (`UserRowActions`, now built on this):
 * one "⋯" button, and a menu with each action's icon AND words, where a locked one stays
 * listed and says why.
 *
 * The data is the roster's `UserRowActionList`, generalised: entries, and `false` /
 * `null` for the ones a condition left out (`row.locked || {…}`).
 *
 * 0.33 (§10.16): an action carries its state at both sizes — a toggle (`pressed`), a
 * disclosure (`expanded`, `controls`), a tone, a tour anchor (`dataTour`) — so a row
 * with an "on" share button or a tour step no longer keeps hand-rolled IconButtons at
 * Normal and this only at Large (keksdose k15).
 */

/** An action's colour: IconButton's tone inline; in the menu the glyph takes it and the
 *  words keep the text colour, except `danger`, whose words are the danger text. */
export type RowActionTone = "default" | "muted" | "info" | "warning" | "danger";

/** One action of a row. */
export interface RowAction {
  /** React key. Default: the label. */
  key?: string;
  /** The action's name: the inline icon's name and tooltip, the menu entry's words. */
  label: string;
  /**
   * Runs it. The kit sends nothing — the app opens its confirmation or calls its API.
   * Optional only beside `href`; an action has one or the other (or both: `onSelect`
   * then runs as the link is followed).
   */
  onSelect?: () => void;
  /**
   * The action NAVIGATES — an edit page, a mail to compose (0.32.1, kastlan's 0.32
   * report): a real link inline and in the menu, so open in a new tab, a middle click
   * and the URL on hover work, which `onSelect` + `navigate` lost. The kit's link rule
   * applies ({@link Button}'s `href`): in-app through the provider's `linkComponent`, an
   * external or `#anchor` one a plain `<a>`, `mailto:` included.
   *
   * A link cannot carry a reason or a spinner, so an action with a `disabledReason`
   * (or under a write lock, with `commit`) or `pending` stays a button and says why.
   */
  href?: string;
  /** With `href`: leaves the app — a new tab, and a screen reader is told so. */
  external?: boolean;
  /**
   * The glyph: a Lucide icon (`Pencil`), or an element (`<Pencil />`, an app's own
   * svg) — DataTable's `rowActions` hand their `icon` node through. Inline, an action
   * without one is a small text button; in the menu it is the words alone.
   */
  icon?: LucideIcon | ReactElement;
  /**
   * `danger` for delete, revoke, erase: the quiet red of IconButton's `tone="danger"`
   * inline, the danger text tone in the menu. `muted` (an open or add that should not
   * compete), `info` (a notice-worthy, harmless action: keksdose's reconcile) and
   * `warning` (a flag that wants attention): IconButton's tone inline; in the menu the
   * glyph takes it and the words keep the text colour, so `muted` looks like `default`
   * there (0.33).
   */
  tone?: RowActionTone;
  /** Why it is not available for this row. It stays listed, focusable, and says so — an
   *  action that silently vanished would leave the reader looking for it. */
  disabledReason?: ReactNode;
  /**
   * This action COMMITS — it saves, sends, deletes: under a locked
   * {@link WriteLockProvider} it is refused with the lock's reason, as {@link Button}'s
   * `commit` is, inline and in the menu alike. No provider, or an unlocked one: no effect.
   */
  commit?: CommitScope;
  /**
   * In flight — the request it started has not answered. Inline, the icon turns into
   * IconButton's spinner (`pending`); collapsed, the "⋯" button does, since the menu
   * closed when the action was chosen. Either way nothing in the row can be pressed again
   * until it settles: the "⋯" opens no menu while busy.
   */
  pending?: boolean;
  /**
   * Not available for a moment, with nothing to explain — another action of the list
   * is in flight (an admin panel's `busy`). The plain `disabled`; a lasting refusal is a
   * `disabledReason`, which says why.
   */
  disabled?: boolean;
  /** Leave it out for this row. */
  hidden?: boolean;
  /**
   * A toggle (0.33): `aria-pressed` and IconButton's "on" look inline, `aria-pressed` on
   * the menu entry. Keep the label the same in both states ("Share budget"): the pressed
   * state already says whether it is on. Not on an `href` action — a link is not a
   * toggle — nor with `expanded`.
   */
  pressed?: boolean;
  /**
   * Opens or closes something IN THE PAGE (0.33) — a share card under the row, an
   * add-category row: `aria-expanded`, inline and on the menu entry. Not with `pressed`:
   * a disclosure says open, not on. Not on an `href` action.
   */
  expanded?: boolean;
  /** The `id` of what `expanded` opens: `aria-controls`, inline and on the menu entry. */
  controls?: string;
  /**
   * A tour anchor (0.33, §10.18): `data-tour` on ONE element per action at a time.
   * Inline, on the action's own control (the IconButton, the small text button, the
   * link). Collapsed, on an `aria-hidden` box laid over the "⋯" button — `[data-tour=x]`
   * resolves to a box the size of the "⋯", whose `data-slot="row-actions"` box holds the
   * button, two anchored actions in one row don't fight over one attribute, and a tap
   * still reaches the button. Never on the entry in the open menu: the kit's tour takes
   * the first visible match and the menu is portalled after the row, so a copy there
   * would never be found, only make the selector match twice. The kit's name for it, as
   * `AppShellNavItem.dataTour`.
   */
  dataTour?: string;
}

/** What a row's actions may be: entries, and `false` / `null` / `undefined` for the ones
 *  a condition left out. */
export type RowActionList = readonly (RowAction | false | null | undefined)[];

export interface RowActionsLabels {
  /** The menu button's name when the row has no name of its own; also the actions
   *  column's (hidden) header in {@link rowActionsColumn}. */
  actions: string;
  /** The menu button's name, given the row's: "Actions for Ada Example". */
  actionsFor: (name: string) => string;
}

export const DEFAULT_ROW_ACTIONS_LABELS: RowActionsLabels = {
  actions: "Actions",
  actionsFor: (name) => `Actions for ${name}`,
};

/**
 * - `"auto"` (default): the icons inline at Normal; the "⋯" menu at Large and Extra
 *   large once there are two or more (§10.8). A single action stays inline at every
 *   size, with its label as text at Large — one label fits a row, and a menu of one is
 *   a detour.
 * - `"menu"`: the menu at every size — the roster's choice, whose actions grow (§2.4
 *   there) and do not fit a phone card as a strip.
 * - `"inline"`: the icons at every size — for a row the app knows has room; at Large
 *   each then shows its label (IconButton's `labelVisible`).
 */
export type RowActionsCollapse = "auto" | "menu" | "inline";

/** The sizes a row action comes in: IconButton's row steps. `2xs` is DataTable's
 *  compact density. At Large every one is at least a 48 px target (IconButton). */
export type RowActionsSize = Extract<IconButtonSize, "md" | "sm" | "xs" | "2xs">;

export interface RowActionsProps {
  actions: RowActionList;
  /** The row's name, for the menu button's name — "Actions for Ada Example". Without it
   *  (or `null`, as API fields often are) the button is "Actions". */
  name?: string | null;
  /** When the actions collapse into the menu — see {@link RowActionsCollapse}. */
  collapse?: RowActionsCollapse;
  /** The inline icons' and the "⋯" button's size. Default `xs`, a list row's action. */
  size?: RowActionsSize;
  /** The menu's width. Default `"15rem"`, in rem so it grows with the words (§3.2). */
  menuWidth?: `${number}rem`;
  /** On the wrapper: the inline strip, or the box round the "⋯" button. */
  className?: string;
  /** The inline glyphs' size, IconButton's `glyphSize` — e.g. 14 in a dense header strip
   *  (keksdose's category group header). The "⋯" button keeps its box's own. */
  glyphSize?: IconButtonGlyphSize;
  /** The inline tooltips' side, IconButton's `tooltipSide` — `"start"` for a table's last
   *  column, so a bubble does not run off the row's end. Per row: every inline action. */
  tooltipSide?: TooltipSide;
  labels?: Partial<RowActionsLabels>;
}

function visibleActions(actions: RowActionList): RowAction[] {
  return actions.filter((a): a is RowAction => Boolean(a) && !(a as RowAction).hidden);
}

/** An action's glyph as a node: a component is rendered, an element is used as is. */
function glyphOf(icon: RowAction["icon"]): ReactNode {
  if (icon === undefined) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon as LucideIcon;
  return <Icon />;
}

/** The menu glyph's tint per tone (0.33): the words keep the text colour, so the glyph
 *  carries `info` and `warning` — IconButton's toned colours. `danger` colours the words
 *  through Button's tone, and `muted` is the default look in a menu. */
const MENU_GLYPH_TONE: Partial<Record<RowActionTone, string>> = {
  info: "text-info",
  warning: "text-warning",
};

/** The state an action's control says, inline and in the menu alike: `aria-expanded` and
 *  `aria-controls` for a disclosure (a toggle's `aria-pressed` goes through the button's
 *  own `pressed`, which also draws the "on" look). */
function stateAttrs(action: RowAction) {
  return {
    "aria-expanded": action.expanded,
    "aria-controls": action.expanded === undefined ? undefined : action.controls,
  };
}

/** An action's tone on its inline control, for a caller's CSS and a test: `data-tone`,
 *  left off for the default look. */
function toneAttr(tone: RowActionTone | undefined) {
  return { "data-tone": tone === undefined || tone === "default" ? undefined : tone };
}

/**
 * A row's actions, inline or as a "⋯" menu — see {@link RowActionsCollapse}. Every
 * control stops its click (and the Enter/Space it stands for) from reaching the row, so
 * a clickable row or a DataTable `rowLink` does not open as well; in a DataTable column
 * also set `noRowLink: true`, as {@link rowActionsColumn} does.
 *
 * Inline, the icons sit in a {@link CompactControls} region at Normal: their labels
 * stay the names and the tooltips, and a locked one keeps its reason in the tooltip — a
 * line under one icon of a row would break the row. In the menu a locked action's
 * reason is a line under its words at Large and on touch (Button's
 * `disabledReasonDisplay`).
 *
 * The menu is portalled, so a table's scroller cannot clip it; Escape and an outside
 * press close it, and focus goes back to the "⋯" button, which is where a confirmation
 * dialog then returns it.
 */
export function RowActions({
  actions,
  name,
  collapse = "auto",
  size = "xs",
  menuWidth = "15rem",
  className,
  glyphSize,
  tooltipSide,
  labels: labelsProp,
}: RowActionsProps) {
  const labels = useKitLabels("rowActions", DEFAULT_ROW_ACTIONS_LABELS, labelsProp);
  const large = useLargeText();
  const entries = visibleActions(actions);
  if (entries.length === 0) return null;
  const asMenu = collapse === "menu" || (collapse === "auto" && large && entries.length > 1);
  if (!asMenu) {
    const strip = (
      <div data-slot="row-actions" className={cn("inline-flex items-center gap-0.5", className)}>
        {entries.map((action) => (
          <InlineAction
            key={action.key ?? action.label}
            action={action}
            size={size}
            glyphSize={glyphSize}
            tooltipSide={tooltipSide}
          />
        ))}
      </div>
    );
    // Compact at Normal (no room for a reason line in a row); at Large an inline action
    // is the app's choice ("inline") or the row's only one, and shows its words.
    return large ? strip : <CompactControls>{strip}</CompactControls>;
  }
  const title = name ? labels.actionsFor(name) : labels.actions;
  // The menu closed when the action was chosen, so what is in flight shows on "⋯".
  const busy = entries.some((action) => action.pending);
  const anchored = entries.filter((action) => action.dataTour);
  return (
    // The "⋯" in a box of its own, the inline strip's slot: the tour anchors of the
    // collapsed actions lie over the button in it (see `dataTour`), and `className`
    // places the box as it places the strip.
    <div data-slot="row-actions" className={cn("relative inline-flex", className)}>
      <Popover
        width={menuWidth}
        aria-label={title}
        className="p-1"
        trigger={({ open, toggle, ref }) => (
          <IconButton
            ref={ref}
            size={size}
            label={title}
            // "⋯" is read by everyone as "more actions"; the menu it opens is the words.
            labelVisible={false}
            aria-haspopup="dialog"
            aria-expanded={open}
            pending={busy}
            stopPropagation
            onClick={toggle}
          >
            <MoreHorizontal />
          </IconButton>
        )}
        // React carries an event out of a portal along the COMPONENT tree, so a click in
        // the menu reached a clickable row or a DataTable `onRowClick` the menu was opened
        // from, though the panel is nowhere near it in the page — only the "⋯" trigger
        // stopped its own (keksdose's 0.32 report). Stopped on the PANEL itself, its padding
        // and border included (0.32.2: 0.32.1 stopped it on an inner box, and a click on
        // the panel's `p-1` still went through): clicks, and the Enter / Space a row also
        // listens for. Escape goes on, to the popover's own handler that closes it.
        onClick={stopClick}
        onKeyDown={stopActivationKeys}
      >
        {(close) => (
          <ul data-slot="row-actions-menu" className="space-y-0.5">
            {entries.map((action) => (
              <li key={action.key ?? action.label}>
                <MenuAction action={action} close={close} />
              </li>
            ))}
          </ul>
        )}
      </Popover>
      {anchored.map((action) => (
        // The More cell's TourAnchor: decoration over the button, which keeps every tap.
        <span
          key={action.key ?? action.label}
          aria-hidden
          data-tour={action.dataTour}
          className="pointer-events-none absolute inset-0"
        />
      ))}
    </div>
  );
}

function stopClick(e: MouseEvent) {
  e.stopPropagation();
}

function stopActivationKeys(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") e.stopPropagation();
}

/**
 * The `href` an action renders as a link with, or `undefined` for a button: a link
 * cannot carry a reason or a spinner (Button's link form has neither), so a refused
 * action — its own `disabledReason`, or a write lock on a `commit` — and a pending one
 * stay buttons and say so.
 */
function useActionHref(action: RowAction): string | undefined {
  const reason = useCommitReason(action.commit, action.disabledReason);
  const refused = reason !== undefined && reason !== null && reason !== false && reason !== "";
  return action.href !== undefined && !action.pending && !refused ? action.href : undefined;
}

/** One entry of the "⋯" menu: the words, as a link for an `href`, else a button. */
function MenuAction({ action, close }: { action: RowAction; close: () => void }) {
  const href = useActionHref(action);
  const glyph = glyphOf(action.icon);
  const glyphTone = action.tone === undefined ? undefined : MENU_GLYPH_TONE[action.tone];
  const words = (
    <>
      {glyph && (
        <span
          aria-hidden
          data-tone={glyphTone ? action.tone : undefined}
          className={cn("flex shrink-0 [&_svg]:size-4", glyphTone)}
        >
          {glyph}
        </span>
      )}
      {action.label}
    </>
  );
  const tone = action.tone === "danger" ? "danger" : undefined;
  const select = () => {
    close();
    action.onSelect?.();
  };
  if (href !== undefined) {
    return (
      <Button
        href={href}
        external={action.external}
        variant="ghost"
        size="sm"
        stretch
        tone={tone}
        disabled={action.disabled}
        className="w-full justify-start text-start"
        onClick={select}
      >
        {words}
      </Button>
    );
  }
  return (
    <Button
      {...stateAttrs(action)}
      type="button"
      variant="ghost"
      size="sm"
      stretch
      tone={tone}
      pressed={action.pressed}
      disabledReason={action.disabledReason}
      commit={action.commit}
      pending={action.pending}
      disabled={action.disabled}
      className="w-full justify-start text-start"
      onClick={select}
    >
      {words}
    </Button>
  );
}

/** One inline action: an IconButton with its icon, else a small text button — each a
 *  link for an `href` (see {@link useActionHref}). The control carries the action's
 *  state, its tone and its tour anchor. */
function InlineAction({
  action,
  size,
  glyphSize,
  tooltipSide,
}: {
  action: RowAction;
  size: RowActionsSize;
  glyphSize?: IconButtonGlyphSize;
  tooltipSide?: TooltipSide;
}) {
  const href = useActionHref(action);
  const glyph = glyphOf(action.icon);
  const iconTone = action.tone === "default" ? undefined : action.tone;
  // A text button has Button's two tones; `info` and `warning` are a glyph's colours.
  const textTone = action.tone === "danger" || action.tone === "muted" ? action.tone : undefined;
  const marks = { "data-tour": action.dataTour, ...toneAttr(action.tone) };
  if (glyph) {
    if (href !== undefined) {
      return (
        <IconButton
          {...marks}
          href={href}
          external={action.external}
          size={size}
          glyphSize={glyphSize}
          label={action.label}
          tooltipSide={tooltipSide}
          tone={iconTone}
          disabled={action.disabled}
          stopPropagation
          onClick={() => action.onSelect?.()}
        >
          {glyph}
        </IconButton>
      );
    }
    return (
      <IconButton
        {...marks}
        {...stateAttrs(action)}
        size={size}
        glyphSize={glyphSize}
        label={action.label}
        tooltipSide={tooltipSide}
        tone={iconTone}
        pressed={action.pressed}
        disabledReason={action.disabledReason}
        commit={action.commit}
        pending={action.pending}
        disabled={action.disabled}
        stopPropagation
        onClick={() => action.onSelect?.()}
      >
        {glyph}
      </IconButton>
    );
  }
  // A row listening for clicks must not open as well (IconButton's stopPropagation).
  const stop = {
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      action.onSelect?.();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") e.stopPropagation();
    },
  };
  if (href !== undefined) {
    return (
      <Button
        {...marks}
        href={href}
        external={action.external}
        variant="ghost"
        size="sm"
        tone={textTone}
        disabled={action.disabled}
        {...stop}
      >
        {action.label}
      </Button>
    );
  }
  return (
    <Button
      {...marks}
      {...stateAttrs(action)}
      type="button"
      variant="ghost"
      size="sm"
      tone={textTone}
      pressed={action.pressed}
      disabledReason={action.disabledReason}
      commit={action.commit}
      pending={action.pending}
      disabled={action.disabled}
      {...stop}
    >
      {action.label}
    </Button>
  );
}

/** The actions column's hidden header, in the provider's words. */
function RowActionsHeader({ text, labels }: { text?: string; labels?: Partial<RowActionsLabels> }) {
  const resolved = useKitLabels("rowActions", DEFAULT_ROW_ACTIONS_LABELS, labels);
  return <span className="sr-only">{text ?? resolved.actions}</span>;
}

export interface RowActionsColumnOptions<T> {
  /** The column's key. Default `"actions"`. */
  key?: string;
  /** The row's actions — `false` / `null` for the ones a condition leaves out. */
  actions: (row: T) => RowActionList;
  /** The row's name, for the "⋯" button's name ("Actions for Ada Example"). `null` and
   *  `undefined` both mean "Actions". */
  name?: (row: T) => string | null | undefined;
  collapse?: RowActionsCollapse;
  /** Default `xs`. */
  size?: RowActionsSize;
  /** See {@link RowActionsProps.glyphSize}. */
  glyphSize?: IconButtonGlyphSize;
  /** See {@link RowActionsProps.tooltipSide} — `"start"` in a table's last column. */
  tooltipSide?: TooltipSide;
  /**
   * The column's name as plain text — the column-settings checklist and the phone
   * card's label read it (`DataTableColumn.headerText`). Pass the app's own word; left
   * out, the header shows the provider's `rowActions.actions` to a screen reader and
   * the plain-text places fall back to the column's `key`.
   */
  headerText?: string;
  labels?: Partial<RowActionsLabels>;
  /** Anything else for the column (`mobileHidden`, `cellProps`…), merged last. */
  column?: Partial<DataTableColumn<T>>;
}

/**
 * A DataTable column of {@link RowActions} — an app's action column in one line
 * (§10.8): inline icons at Normal, the "⋯" menu at Large with two or more actions.
 *
 *     columns={[...columns, rowActionsColumn({ actions: (r) => [...], name: (r) => r.name })]}
 *
 * The header is visually hidden (the icons say what the column is), the column hugs its
 * content at the row's end, and `noRowLink` keeps a `rowHref` anchor off it, so the
 * buttons keep their own clicks. On a phone it is a line of the card like any column;
 * set `column: { mobileHidden: true }` to drop it there (with `mobileDetailsInRow` it
 * then shows in the opened row instead).
 */
export function rowActionsColumn<T>({
  key = "actions",
  actions,
  name,
  collapse,
  size,
  glyphSize,
  tooltipSide,
  headerText,
  labels,
  column,
}: RowActionsColumnOptions<T>): DataTableColumn<T> {
  return {
    key,
    header: <RowActionsHeader text={headerText} labels={labels} />,
    headerText,
    cell: (row) => (
      <RowActions
        actions={actions(row)}
        name={name?.(row)}
        collapse={collapse}
        size={size}
        glyphSize={glyphSize}
        tooltipSide={tooltipSide}
        labels={labels}
      />
    ),
    className: "w-px whitespace-nowrap text-end",
    headClassName: "w-px",
    noRowLink: true,
    ...column,
  };
}
