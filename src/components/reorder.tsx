import { useId, useLayoutEffect, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useAnnounce } from "../hooks/use-announce";
import { matchesHotkey, parseHotkey } from "../hooks/use-hotkey";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { firstTabStop, focusIsLost, tabStops } from "../lib/focus-left";
import type { RowAction } from "./row-actions";
import { useWriteLock, type CommitScope } from "./write-lock";
import { DEFAULT_REORDER_LABELS } from "./reorder-labels";

/* ── Labels ───────────────────────────────────────────────────────────────── */

export interface ReorderLabels {
  /** The action that moves a row one place up: its name, tooltip and menu entry. */
  moveUp: string;
  /** The action that moves a row one place down. */
  moveDown: string;
  /** Why "Move up" is not available on the first row — and what Alt+ArrowUp says there. */
  atTop: string;
  /** Why "Move down" is not available on the last row — and what Alt+ArrowDown says there. */
  atBottom: string;
  /** Announced once a row has moved, with its new place counted from 1 and the row
   *  count: "Moved to position 3 of 7". */
  moved: (position: number, total: number) => string;
}

// Defined in ./reorder-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_REORDER_LABELS };

/* ── useReorder ───────────────────────────────────────────────────────────── */

export interface UseReorderOptions<T> {
  /** The rows in the order they are shown — the app's order, which it owns. */
  items: readonly T[];
  /** A row's stable key, as DataTable's `rowKey`: the focus finds a moved row by it. */
  rowKey: (item: T) => string | number;
  /**
   * Move the row at `from` to `to` (places in `items`, counted from 0; a move is one
   * place, `to` is `from ± 1`, unless {@link UseReorderReturn.move} is called with
   * more). The app reorders its rows and persists the order: the kit only asks, and
   * waits for `items` to show the row at `to` before it announces the move and moves
   * the focus after it — at once for a local reorder, when the answer comes for one
   * that saves first.
   */
  onReorder: (from: number, to: number) => void;
  /**
   * Moving COMMITS — it saves the order: the two actions are locked under a locked
   * {@link WriteLockProvider} with the lock's reason (RowActions' `commit`), and the
   * keyboard's move says that reason instead of moving. No provider, or an unlocked
   * one: no effect.
   */
  commit?: CommitScope;
  labels?: LabelOverride<ReorderLabels>;
}

/** What {@link ReorderRow.props} spreads onto a `ListItem` (or any row with a target). */
export interface ReorderRowProps {
  /**
   * Alt+ArrowUp and Alt+ArrowDown on the row's target. A row that takes `targetProps`
   * of its own merges them: `targetProps={{ ...row.props.targetProps, draggable: true }}`.
   */
  targetProps: Pick<HTMLAttributes<HTMLElement>, "onKeyDown">;
  /** The two keys, announced on the target as Tabs' Delete is. */
  "aria-keyshortcuts": string;
  /** Which list, and which row in it: where the focus goes when the control it was on
   *  is gone after a move. */
  "data-reorder-list": string;
  "data-reorder-key": string;
}

/** One row's moves, from {@link UseReorderReturn.row}. */
export interface ReorderRow {
  /** Not the first row. */
  canMoveUp: boolean;
  /** Not the last row. */
  canMoveDown: boolean;
  /** One place up (nothing on the first row): `onReorder(index, index - 1)`. */
  moveUp: () => void;
  /** One place down (nothing on the last row). */
  moveDown: () => void;
  /**
   * "Move up" and "Move down" as {@link RowActions} entries, arrows for icons: put them
   * before the row's other actions, `[...row.actions, remove]`. At the ends the one that
   * cannot move stays in the tab order and says why (`disabledReason`: "Already at the
   * top") — a plain `disabled` took the very button that moved the row to the top out of
   * the tab order while it held the focus.
   */
  actions: [RowAction, RowAction];
  /** Spread onto the row: `<ListItem {...row.props} … />`. See {@link ReorderRowProps}. */
  props: ReorderRowProps;
}

export interface UseReorderReturn {
  /** The moves of the row at `index` (its place in `items`, from 0). */
  row: (index: number) => ReorderRow;
  /**
   * Move a row anywhere — what a drop calls, so a dragged row is announced as a moved
   * one is. Ignored for a place outside the list or `from === to`, and refused under a
   * lock that refuses `commit`.
   */
  move: (from: number, to: number) => void;
  /** The live region the moves are announced in. Render it once, unconditionally,
   *  BESIDE the list (a `<ul>` holds items only): `<>{list}{reorder.element}</>`. */
  element: ReactElement;
}

// Read with the kit's one reading of a chord (use-hotkey's `matchesHotkey`): exactly Alt,
// so Ctrl+Alt+↑ or Alt+Shift+↑ is left to whoever wants it. `false` for Apple: no `Mod`.
const UP = parseHotkey("Alt+ArrowUp", false);
const DOWN = parseHotkey("Alt+ArrowDown", false);
/** `aria-keyshortcuts` spells keys as `KeyboardEvent.key` does, space-separated. */
const SHORTCUTS = "Alt+ArrowUp Alt+ArrowDown";

interface PendingMove {
  key: string;
  from: number;
  to: number;
  /** What had the focus when the move was asked for: the control to give it back to. */
  focus: Element | null;
  /** Its place among its row's tab stops, or -1: where the same control is found again
   *  when it was mounted anew — a "Move up" that reached the top is locked with its
   *  reason, and a locked IconButton is a new node (it moves into its reason's frame). */
  slot: number;
}

/**
 * Rows the app orders by hand, moved one place at a time: "Move up" / "Move down" in the
 * row's {@link RowActions}, and Alt+ArrowUp / Alt+ArrowDown on the row (0.58, keksdose's
 * shopping list, SL-10). No drag and drop: a pair of buttons works with a thumb, a
 * keyboard and a screen reader alike, and a drag works with a mouse only (a row's
 * `targetProps` can still carry one, and its drop calls {@link UseReorderReturn.move}).
 *
 *     const reorder = useReorder({ items, rowKey: (i) => i.id, onReorder: save, commit: true });
 *     <List>
 *       {items.map((item, index) => {
 *         const row = reorder.row(index);
 *         return (
 *           <ListItem key={item.id} {...row.props} title={item.label} onClick={() => open(item)}
 *             actions={<RowActions name={item.label} actions={[...row.actions, remove(item)]} />} />
 *         );
 *       })}
 *     </List>
 *     {reorder.element}
 *
 * What it does that a hand-written pair of arrows (keksdose's, 18 lines a row) did not:
 *
 * - **The focus stays with the row.** A keyed row React only moves keeps it (react-dom
 *   gives the focus back to a node it moved, after the commit). A control mounted anew
 *   does not: the arrow that took the row to an end is locked with its reason there, and
 *   a locked IconButton is a new node (it moves into its reason's frame) — the old one
 *   leaves with the focus, onto `<body>`, saying nothing (lib/focus-left). Once `items`
 *   shows the row in its new place, a focus that was lost goes back to the control that
 *   had it if it is still there, else to the control in its place in the moved row (the
 *   same arrow, the row's target, the "⋯"); a focus that went somewhere real is left there.
 * - **It says where the row went**, politely, once it is there: "Moved to position 3 of
 *   7". A row's buttons look the same before and after; only the place changed.
 * - **The keyboard path**, Alt+ArrowUp / Alt+ArrowDown on the focused row — the chord
 *   that moves a line in VS Code, and one nothing in the kit holds (a select or a
 *   combobox opens on Alt+ArrowDown, but a row's target holds no field). On the row's
 *   target only, not the page: a row is what moves. Announced through
 *   `aria-keyshortcuts`, as Tabs' Delete is; a held key moves once, as `useHotkey`'s
 *   fires once; at an end it says "Already at the top" instead of nothing.
 */
export function useReorder<T>({
  items,
  rowKey,
  onReorder,
  commit,
  labels: labelsProp,
}: UseReorderOptions<T>): UseReorderReturn {
  const labels = useKitLabels("reorder", DEFAULT_REORDER_LABELS, labelsProp);
  const { announce, regionProps } = useAnnounce();
  const lock = useWriteLock(commit ?? false);
  const listId = useId();
  const pending = useRef<PendingMove | null>(null);
  const keyAt = (index: number) => String(rowKey(items[index]!));

  const move = (from: number, to: number) => {
    const last = items.length - 1;
    const inside = (place: number) => Number.isInteger(place) && place >= 0 && place <= last;
    if (!inside(from) || !inside(to) || from === to) return;
    // The actions are refused by RowActions itself (`commit`); this is the keyboard's
    // refusal, and a drop's.
    if (lock.locked) {
      if (typeof lock.reason === "string") announce(lock.reason);
      return;
    }
    const key = keyAt(from);
    const focus = typeof document === "undefined" ? null : document.activeElement;
    const target = focus && findRow(focus.ownerDocument, listId, key);
    const box = target && rowOf(target);
    const slot = box && focus instanceof HTMLElement && box.contains(focus) ? tabStops(box).indexOf(focus) : -1;
    pending.current = { key, from, to, focus, slot };
    onReorder(from, to);
  };

  // After every render, not on `items` alone: an app that saves first renders the old
  // order again (a refetch, a new array) before the new one. The move waits while its row
  // is still at `from`, lands when it is at `to`, and is dropped when it went elsewhere.
  useLayoutEffect(() => {
    const asked = pending.current;
    if (!asked) return;
    const at = items.findIndex((item) => String(rowKey(item)) === asked.key);
    if (at === asked.from) return;
    pending.current = null;
    if (at !== asked.to) return;
    announce(labels.moved(at + 1, items.length));
    if (focusIsLost()) followFocus(asked, listId);
  });

  const row = (index: number): ReorderRow => {
    const canMoveUp = index > 0;
    const canMoveDown = index < items.length - 1;
    const moveUp = () => move(index, index - 1);
    const moveDown = () => move(index, index + 1);
    return {
      canMoveUp,
      canMoveDown,
      moveUp,
      moveDown,
      actions: [
        {
          key: "move-up",
          label: labels.moveUp,
          icon: ArrowUp,
          commit,
          disabledReason: canMoveUp ? undefined : labels.atTop,
          onSelect: moveUp,
        },
        {
          key: "move-down",
          label: labels.moveDown,
          icon: ArrowDown,
          commit,
          disabledReason: canMoveDown ? undefined : labels.atBottom,
          onSelect: moveDown,
        },
      ],
      props: {
        targetProps: {
          onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
            const up = matchesHotkey(e.nativeEvent, UP);
            if (!up && !matchesHotkey(e.nativeEvent, DOWN)) return;
            // Cancelled whether it moves or not — Alt+arrow is no scroll on a row — and a
            // held key's repeats move nothing (useHotkey's rule).
            e.preventDefault();
            if (e.repeat) return;
            if (up && !canMoveUp) announce(labels.atTop);
            else if (!up && !canMoveDown) announce(labels.atBottom);
            else if (up) moveUp();
            else moveDown();
          },
        },
        "aria-keyshortcuts": SHORTCUTS,
        "data-reorder-list": listId,
        "data-reorder-key": keyAt(index),
      },
    };
  };

  return { row, move, element: <span {...regionProps} /> };
}

/**
 * Give back a focus the move lost (see {@link useReorder}): to the control that had it,
 * while that is still a tab stop in the page; else to the control in its
 * place in the moved row (the same action, mounted anew); else to the row's target, or
 * the row's first stop. Nothing when nothing had it: a move asked for with the focus on
 * the page itself (a mouse drop) pulls it nowhere.
 */
function followFocus(move: PendingMove, listId: string): void {
  const before = move.focus;
  if (!(before instanceof HTMLElement) || before === before.ownerDocument.body) return;
  if (before.isConnected && firstTabStop(before) === before) {
    before.focus();
    return;
  }
  const target = findRow(before.ownerDocument, listId, move.key);
  if (!target) return;
  const stops = tabStops(rowOf(target));
  (stops[move.slot] ?? firstTabStop(target) ?? stops[0])?.focus();
}

/** A row's box around its target — its `<li>`, which holds the actions beside the target
 *  too; the target's parent for a row drawn `as="div"`. */
function rowOf(target: HTMLElement): HTMLElement {
  return target.closest("li") ?? target.parentElement ?? target;
}

/** The target of the row `key` in the list `listId`, by its marks (compared as values,
 *  so no key needs escaping into a selector). */
function findRow(doc: Document, listId: string, key: string): HTMLElement | null {
  for (const el of doc.querySelectorAll<HTMLElement>("[data-reorder-key]")) {
    if (el.dataset.reorderList === listId && el.dataset.reorderKey === key) return el;
  }
  return null;
}
