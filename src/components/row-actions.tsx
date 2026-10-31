import { isValidElement, useContext } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { hasContent } from "../lib/presence";
import { useLargeText } from "../hooks/use-large-text";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Popover } from "./popover";
import { Button } from "./button";
import { CompactControls } from "./field-parts";
import { IconButton } from "./icon-button";
import { useCommitReason, type CommitScope } from "./write-lock";
import type { IconButtonGlyphSize, IconButtonSize } from "./icon-button";
import type { TooltipSide } from "./tooltip";
import type { DataTableColumn } from "./data-table";
import { TableHeaderCell, type TableHeaderCellProps } from "./table";
import { DEFAULT_ROW_ACTIONS_LABELS } from "./row-actions-labels";
import { ConfirmContext } from "./confirm-context";
import { ConfirmProvider } from "./confirm-dialog";

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
 * Destructive actions belong in the menu (0.49 KIT-12): a `tone: "danger"` action goes
 * into the "⋯" menu while the others stay inline (`dangerPlacement`), and choosing it
 * opens a `ConfirmDialog` before `onSelect` runs (`confirm`; `false` to opt out). A
 * delete is then never a bin icon in every row, one stray tap from gone.
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
   * Runs it. The kit sends nothing — it calls this, after a `tone: "danger"` action's
   * confirmation (see {@link confirm}). Optional only beside `href`; an action has one or
   * the other (or both: `onSelect` then runs as the link is followed).
   */
  onSelect?: () => void;
  /**
   * 0.49 KIT-12: ask before `onSelect`. A `tone: "danger"` action asks by default — a
   * `ConfirmDialog` (the provider's `useConfirm`, else one of its own) titled with the
   * action and the row's name, "Delete “Ada Example”?", the consequence under it
   * (`rowActions.confirmBody`), the action's label on the danger button and focus on
   * Cancel. Pass the words to say more, or `false` when the app confirms in `onSelect`
   * itself or offers an undo instead. Any other tone asks only when given one. Not for
   * an `href` action: a link only navigates.
   */
  confirm?: boolean | RowActionConfirm;
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

/** The words of a {@link RowAction.confirm}; each defaults as described there. */
export interface RowActionConfirm {
  title?: ReactNode;
  body?: ReactNode;
  confirmLabel?: ReactNode;
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
  /** 0.49 KIT-12: a danger action's confirmation title, given the action's label and the
   *  row's name when it has one: "Delete “Ada Example”?", "Delete?". */
  confirmTitle: (action: string, name?: string) => string;
  /** 0.49 KIT-12: the line under it — "This cannot be undone." */
  confirmBody: string;
}

// Defined in ./row-actions-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_ROW_ACTIONS_LABELS };

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
  /**
   * 0.49 KIT-12: where `tone: "danger"` actions go while the others are inline. `"menu"`
   * (default): into the row's "⋯" menu, so a delete is never one stray tap in every
   * row — the other actions stay icons beside it. `"inline"`: an icon like the rest.
   * `collapse="inline"` keeps every action inline, `collapse="menu"` every one in the menu.
   */
  dangerPlacement?: "menu" | "inline";
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
  labels?: LabelOverride<RowActionsLabels>;
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
 * also set `noRowLink: true` and `role: "actions"`, as {@link rowActionsColumn} does.
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
export function RowActions(props: RowActionsProps) {
  const outer = useContext(ConfirmContext);
  // A danger action asks first (0.49 KIT-12). Under the app's ConfirmProvider through
  // it; without one, through a provider of this row's own — only when there is
  // something to ask, so a plain row adds nothing.
  if (outer === null && visibleActions(props.actions).some(asksFirst)) {
    return (
      <ConfirmProvider>
        <RowActionsBody {...props} />
      </ConfirmProvider>
    );
  }
  return <RowActionsBody {...props} />;
}

/** Whether choosing `action` opens a confirmation first: a danger action unless it says
 *  `confirm: false`, any other when it passes one; never a link. */
function asksFirst(action: RowAction): boolean {
  if (action.href !== undefined || action.confirm === false) return false;
  return action.confirm !== undefined || action.tone === "danger";
}

/** `action.onSelect`, after its confirmation when it {@link asksFirst}. */
function useRunAction(name: string | null | undefined, labels: RowActionsLabels) {
  const confirm = useContext(ConfirmContext);
  return (action: RowAction) => {
    if (!asksFirst(action) || confirm === null) {
      action.onSelect?.();
      return;
    }
    const words = typeof action.confirm === "object" ? action.confirm : {};
    void confirm({
      title: words.title ?? labels.confirmTitle(action.label, name ?? undefined),
      body: words.body ?? labels.confirmBody,
      confirmLabel: words.confirmLabel ?? action.label,
      tone: "danger",
      commit: action.commit,
    }).then((ok) => {
      if (ok) action.onSelect?.();
    });
  };
}

function RowActionsBody({
  actions,
  name,
  collapse = "auto",
  dangerPlacement = "menu",
  size = "xs",
  menuWidth = "15rem",
  className,
  glyphSize,
  tooltipSide,
  labels: labelsProp,
}: RowActionsProps) {
  const labels = useKitLabels("rowActions", DEFAULT_ROW_ACTIONS_LABELS, labelsProp);
  const large = useLargeText();
  const run = useRunAction(name, labels);
  const entries = visibleActions(actions);
  if (entries.length === 0) return null;
  const asMenu = collapse === "menu" || (collapse === "auto" && large && entries.length > 1);
  // Inline, a danger action still goes into the "⋯" menu (KIT-12) unless the app keeps it
  // inline: the other actions stay icons, the menu holds the destructive ones.
  const toMenu = (action: RowAction) =>
    asMenu || (collapse === "auto" && dangerPlacement === "menu" && action.tone === "danger");
  const inline = entries.filter((action) => !toMenu(action));
  const menu = entries.filter(toMenu);
  const title = name ? labels.actionsFor(name) : labels.actions;
  const menuButton = menu.length > 0 && (
    <RowActionsMenu
      entries={menu}
      title={title}
      size={size}
      menuWidth={menuWidth}
      run={run}
      className={inline.length === 0 ? className : undefined}
    />
  );
  if (inline.length === 0) return menuButton || null;
  const strip = (
    <div data-slot="row-actions" className={cn("inline-flex items-center gap-0.5", className)}>
      {inline.map((action) => (
        <InlineAction
          key={action.key ?? action.label}
          action={action}
          size={size}
          glyphSize={glyphSize}
          tooltipSide={tooltipSide}
          run={run}
        />
      ))}
      {menuButton}
    </div>
  );
  // Compact at Normal (no room for a reason line in a row); at Large an inline action
  // is the app's choice ("inline") or the row's only one, and shows its words.
  return large ? strip : <CompactControls>{strip}</CompactControls>;
}

/** The "⋯" button and its menu of `entries`. */
function RowActionsMenu({
  entries,
  title,
  size,
  menuWidth,
  run,
  className,
}: {
  entries: RowAction[];
  title: string;
  size: RowActionsSize;
  menuWidth: `${number}rem`;
  run: (action: RowAction) => void;
  className?: string;
}) {
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
                <MenuAction action={action} close={close} run={run} />
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
  const refused = hasContent(reason);
  return action.href !== undefined && !action.pending && !refused ? action.href : undefined;
}

/** One entry of the "⋯" menu: the words, as a link for an `href`, else a button. */
function MenuAction({
  action,
  close,
  run,
}: {
  action: RowAction;
  close: () => void;
  run: (action: RowAction) => void;
}) {
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
    run(action);
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
  run,
}: {
  action: RowAction;
  size: RowActionsSize;
  glyphSize?: IconButtonGlyphSize;
  tooltipSide?: TooltipSide;
  run: (action: RowAction) => void;
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
        onClick={() => run(action)}
      >
        {glyph}
      </IconButton>
    );
  }
  // A row listening for clicks must not open as well (IconButton's stopPropagation).
  const stop = {
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      run(action);
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

/** The actions column's heading, in the provider's words: on screen since 0.46.1 (keksdose
 *  dev#598 rework), a screen reader's name only with `hidden`. */
function RowActionsHeader({
  text,
  labels,
  hidden,
}: {
  text?: string;
  labels?: LabelOverride<RowActionsLabels>;
  hidden?: boolean;
}) {
  const resolved = useKitLabels("rowActions", DEFAULT_ROW_ACTIONS_LABELS, labels);
  const word = text ?? resolved.actions;
  return hidden ? <span className="sr-only">{word}</span> : <>{word}</>;
}

/** The actions cell's classes — `rowActionsColumn`'s `className`: the column hugs its
 *  buttons, on one line, at the row's end. A hand-built table's `<TableCell>` takes them
 *  around its {@link RowActions} (0.47, keksdose N17). */
export const ROW_ACTIONS_CELL_CLASS = "w-px whitespace-nowrap text-end";
/** The actions heading's classes — `rowActionsColumn`'s `headClassName`, which
 *  {@link RowActionsHead} draws: hugging, end-aligned over the buttons (0.47, N17). */
export const ROW_ACTIONS_HEAD_CLASS = "w-px text-end";

export interface RowActionsHeadProps extends Omit<TableHeaderCellProps, "children"> {
  /** The heading. Default: the provider's `rowActions.actions` ("Actions"). */
  children?: ReactNode;
  /** Named for a screen reader only — `rowActionsColumn`'s `header: false`. */
  hideLabel?: boolean;
  labels?: LabelOverride<RowActionsLabels>;
}

/**
 * A hand-built table's actions heading (0.47, keksdose N17): the `<th>` `rowActionsColumn`
 * gives a DataTable — "Actions" on screen in the provider's words, end-aligned over the
 * buttons, hugging them. Pair it with `<TableCell className={ROW_ACTIONS_CELL_CLASS}>`
 * around each row's {@link RowActions}. Every other `TableHeaderCell` prop passes on
 * (`size`, the app's `className`, merged last).
 *
 *     <RowActionsHead size="sm" className={TH} />
 */
export function RowActionsHead({ children, hideLabel, labels, className, ...rest }: RowActionsHeadProps) {
  return (
    <TableHeaderCell align="end" {...rest} className={cn(ROW_ACTIONS_HEAD_CLASS, className)}>
      {typeof children === "string" || children == null ? (
        <RowActionsHeader text={children ?? undefined} labels={labels} hidden={hideLabel} />
      ) : (
        children
      )}
    </TableHeaderCell>
  );
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
   * out, the heading shows the provider's `rowActions.actions` and the plain-text
   * places fall back to the column's `key`.
   */
  headerText?: string;
  /**
   * The heading (0.46.1, keksdose dev#598 rework — Marcel: a VISIBLE "Actions" heading on
   * every table with an actions column). Default: `headerText`, else the provider's
   * `rowActions.actions` ("Actions"), shown, end-aligned over the buttons. A node
   * replaces it; `false` keeps the pre-0.46.1 heading, named for a screen reader only.
   */
  header?: ReactNode | false;
  labels?: LabelOverride<RowActionsLabels>;
  /** Anything else for the column (`mobileHidden`, `cellProps`, another `role`…), merged last. */
  column?: Partial<DataTableColumn<T>>;
}

/**
 * A DataTable column of {@link RowActions} — an app's action column in one line
 * (§10.8): inline icons at Normal, the "⋯" menu at Large with two or more actions.
 *
 *     columns={[...columns, rowActionsColumn({ actions: (r) => [...], name: (r) => r.name })]}
 *
 * The heading says "Actions" on screen (0.46.1; `header` changes or hides it), the
 * column hugs its content at the row's end, and `noRowLink` keeps a `rowHref` anchor off it, so the
 * buttons keep their own clicks. It is `role: "actions"` (0.49 KIT-7): DataTable's default
 * phone card draws it after its three fields, at the card's end, and never counts it as
 * one of them. Set `column: { mobileHidden: true }` to drop it there (with
 * `mobileDetailsInRow` it then shows in the opened row instead).
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
  header,
  labels,
  column,
}: RowActionsColumnOptions<T>): DataTableColumn<T> {
  return {
    key,
    header:
      header === false || header == null ? (
        <RowActionsHeader text={headerText} labels={labels} hidden={header === false} />
      ) : (
        header
      ),
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
    className: ROW_ACTIONS_CELL_CLASS,
    // The heading over the buttons, at the row's end (0.46.1); a hand-built table's
    // `RowActionsHead` (0.47).
    headClassName: ROW_ACTIONS_HEAD_CLASS,
    noRowLink: true,
    // After the phone card's fields, never one of them (0.49 KIT-7).
    role: "actions",
    ...column,
  };
}
