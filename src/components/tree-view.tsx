import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { Spinner } from "./ui";

/**
 * A hierarchy you walk with the keyboard: kastlan's chart of accounts (Assets › Current
 * assets › Bank › 1020 Operating account), and — through {@link TreeRow} alone — the
 * row labels of its gantt, which indent and fold like a tree but sit beside a timeline
 * and so cannot be one.
 *
 * Both apps had written it as nested `<div>`s with a chevron button per row: every
 * row a Tab stop (a 300-account chart was 300 presses to get past), no way to say
 * "level 3 of 5, collapsed" to a screen reader, and no ←/→ at all. This is the WAI-ARIA
 * tree pattern instead:
 *
 *  - `role="tree"` › `treeitem` (with `aria-level`, `aria-expanded` on a parent,
 *    `aria-selected` when selectable) › `role="group"` for its children — so the
 *    reader announces the position and the state it needs.
 *  - ONE Tab stop (roving tabindex). ↑/↓ walk the visible rows, → opens a closed
 *    parent and then steps into it, ← closes an open one and then steps out to the
 *    parent, Home/End jump to the ends, `*` opens every sibling, and typing a few
 *    letters jumps to the next row that starts with them. ←/→ follow the reading
 *    direction (`horizontalStep`): in an RTL tree the children hang off to the left,
 *    and ← is what opens them.
 *  - Enter / Space, or a click, select. The chevron alone toggles on click.
 *
 * `expanded` and `selected` each work controlled or uncontrolled.
 */

/* ── Nodes ───────────────────────────────────────────────────────────────── */

export interface TreeNode<T = unknown> {
  /** Unique across the whole tree — it is what `expanded` and `selected` hold. */
  id: string;
  label: ReactNode;
  /** The text type-ahead matches. Defaults to the row's rendered text. */
  textValue?: string;
  /** Before the label: an account-type icon, a colour dot. */
  icon?: ReactNode;
  /** After the label, pushed to the end of the row: a balance, a count, an action. */
  trailing?: ReactNode;
  children?: readonly TreeNode<T>[];
  /**
   * The node has children that are not loaded yet — it gets a chevron, and opening it
   * calls `loadChildren`. Pass the children in `items` once they arrive.
   */
  hasChildren?: boolean;
  /** Focusable and announced as unavailable (`aria-disabled`), but not selectable. */
  disabled?: boolean;
  /** Anything of the host's own, handed back to `renderItem` and `onSelectedChange`. */
  data?: T;
}

/** What {@link TreeViewProps.renderItem} is told about a row. */
export interface TreeItemState {
  level: number;
  expanded: boolean;
  selected: boolean;
  /** It has children, loaded or not — it shows a chevron. */
  expandable: boolean;
  loading: boolean;
  disabled: boolean;
}

/* ── TreeRow ─────────────────────────────────────────────────────────────── */

export interface TreeRowProps extends ComponentPropsWithoutRef<"div"> {
  /** 1 for a top-level row. Sets the indent and the number of guides. */
  level: number;
  /** `true`/`false` for a row that can fold; leave it `undefined` for a leaf, which
   *  gets a chevron-sized gap instead so labels at one level still line up. */
  expanded?: boolean;
  /**
   * Make the chevron a real button (with `aria-expanded`, named by the label) that
   * calls this. For a row used ON ITS OWN — kastlan's gantt labels, where each row is
   * a line of a timeline and not an item of a tree widget. Inside {@link TreeView} it
   * is omitted: the tree owns the keys, and a button per row would be a Tab stop per
   * row, which is what the tree exists to remove.
   */
  onToggle?: () => void;
  /** The toggle button's name. By default it is named by the row's label (the state
   *  is `aria-expanded`'s to say); required when `children` replaces the label. */
  toggleLabel?: string;
  label: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  /** Pixels per level. Default 16. */
  indent?: number;
  /** Draw a vertical hairline per ancestor level. Default `true`. */
  guides?: boolean;
  selected?: boolean;
  /** A spinner in place of the chevron, while lazy children load. */
  loading?: boolean;
  /** Replace the label + trailing part of the row (the indent and chevron stay). */
  children?: ReactNode;
}

const DEFAULT_INDENT = 16;
/** The chevron's box; the guide for a level runs through its centre. */
const CHEVRON = 16;
/** The row's start padding, before any indent. */
const ROW_PAD = 4;

/**
 * One row: indent, guides, chevron, icon, label, trailing — no tree semantics of its
 * own. {@link TreeView} is built from it, and a host that needs the look without the
 * widget (a gantt's label column) uses it directly.
 *
 * Laid out with logical properties throughout (`padding-inline-start`,
 * `inset-inline-start`), so the indent, the guides and the chevron all hang from the
 * reading start in an RTL layout without a second code path.
 */
export function TreeRow({
  level,
  expanded,
  onToggle,
  toggleLabel,
  label,
  icon,
  trailing,
  indent = DEFAULT_INDENT,
  guides = true,
  selected,
  loading,
  children,
  className,
  style,
  ...rest
}: TreeRowProps) {
  const labelId = useId();
  const depth = Math.max(0, level - 1);
  const expandable = expanded !== undefined;
  // A right-pointing chevron that turns DOWN when open. In RTL it is mirrored to point
  // left, and turning that one clockwise would point it UP — so it turns the other way.
  const chevron = (
    <ChevronRight
      aria-hidden
      className={cn(
        "size-4 transition-transform motion-reduce:transition-none rtl:-scale-x-100",
        expanded && "rotate-90 rtl:-rotate-90",
      )}
    />
  );
  return (
    <div
      {...rest}
      data-tree-row=""
      data-selected={selected || undefined}
      style={{ paddingInlineStart: ROW_PAD + depth * indent, ...style }}
      className={cn(
        "relative flex min-h-8 items-center gap-1.5 rounded pe-2 text-sm",
        selected
          ? "bg-[var(--bg-active)] font-medium text-[var(--text-primary)]"
          : "text-[var(--text-secondary)]",
        className,
      )}
    >
      {guides &&
        Array.from({ length: depth }, (_, i) => (
          <span
            key={i}
            aria-hidden
            data-tree-guide=""
            className="pointer-events-none absolute inset-y-0 w-px bg-[var(--border)]"
            style={{ insetInlineStart: ROW_PAD + i * indent + CHEVRON / 2 }}
          />
        ))}
      {loading ? (
        <span className="flex size-4 shrink-0 items-center justify-center">
          <Spinner label={null} className="size-3 border" />
        </span>
      ) : expandable && onToggle ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={toggleLabel}
          aria-labelledby={toggleLabel ? undefined : labelId}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex size-4 shrink-0 items-center justify-center rounded text-[var(--text-muted)] outline-none hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        >
          {chevron}
        </button>
      ) : expandable ? (
        <span data-tree-toggle="" className="flex size-4 shrink-0 cursor-pointer items-center justify-center text-[var(--text-muted)]">
          {chevron}
        </span>
      ) : (
        <span aria-hidden className="size-4 shrink-0" />
      )}
      {children ?? (
        <>
          {icon && <span className="flex shrink-0 items-center">{icon}</span>}
          <span id={labelId} data-tree-label="" className="min-w-0 flex-1 truncate">
            {label}
          </span>
          {trailing !== undefined && trailing !== null && (
            <span className="ms-auto flex shrink-0 items-center gap-1 text-xs tabular-nums text-[var(--text-muted)]">
              {trailing}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/* ── TreeView ────────────────────────────────────────────────────────────── */

export interface TreeViewProps<T = unknown>
  extends Omit<ComponentPropsWithoutRef<"ul">, "onSelect" | "children" | "defaultValue"> {
  items: readonly TreeNode<T>[];
  /** Open nodes, controlled. */
  expanded?: readonly string[];
  /** Open nodes on first render, uncontrolled. */
  defaultExpanded?: readonly string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** The selected node's id, controlled; `null` for none. */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelectedChange?: (id: string, node: TreeNode<T>) => void;
  /** `"none"` makes it a navigation-only tree: no `aria-selected`, Enter toggles. */
  selectionMode?: "single" | "none";
  /** The whole row content after the chevron, per node. Wins over `label`/`trailing`. */
  renderItem?: (node: TreeNode<T>, state: TreeItemState) => ReactNode;
  /**
   * Called when a node with `hasChildren` and no `children` is opened. While the
   * promise is pending the row shows a spinner and is `aria-busy`; put the children
   * into `items` before it resolves (or after — the row opens either way).
   */
  loadChildren?: (node: TreeNode<T>) => Promise<void> | void;
  /** Pixels per level. Default 16. */
  indent?: number;
  /** Vertical hairlines per level. Default `true`. */
  indentGuides?: boolean;
  /** Extra classes for each row (the `TreeRow`), e.g. a denser height. */
  rowClassName?: string;
}

interface FlatNode<T> {
  node: TreeNode<T>;
  level: number;
  parentId: string | null;
}

const isExpandable = (n: TreeNode<unknown>) => Boolean(n.children?.length || n.hasChildren);

/** Controlled when `value` is given, otherwise state seeded from `initial`. */
function useControllable<V>(value: V | undefined, initial: V): [V, (next: V) => void] {
  const [own, setOwn] = useState<V>(initial);
  const controlled = value !== undefined;
  const set = (next: V) => {
    if (!controlled) setOwn(next);
  };
  return [controlled ? value : own, set];
}

/** How long a type-ahead run stays open between keys — the APG's suggested half second. */
const TYPEAHEAD_MS = 500;

export function TreeView<T = unknown>({
  items,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  selectionMode = "single",
  renderItem,
  loadChildren,
  indent = DEFAULT_INDENT,
  indentGuides = true,
  rowClassName,
  className,
  onKeyDown,
  onClick,
  ...rest
}: TreeViewProps<T>) {
  const [expandedList, setExpandedOwn] = useControllable<readonly string[]>(
    expandedProp,
    defaultExpanded ?? [],
  );
  const [selected, setSelectedOwn] = useControllable<string | null>(
    selectedProp,
    defaultSelected ?? null,
  );
  const expandedSet = useMemo(() => new Set(expandedList), [expandedList]);
  const [loading, setLoading] = useState<ReadonlySet<string>>(() => new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const pendingFocus = useRef<string | null>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const baseId = useId();

  // Every node by id (for parents and lookups), and the rows currently on screen in
  // order — the list the arrow keys walk.
  const { byId, visible } = useMemo(() => {
    const map = new Map<string, FlatNode<T>>();
    const rows: FlatNode<T>[] = [];
    const walk = (nodes: readonly TreeNode<T>[], level: number, parentId: string | null, shown: boolean) => {
      for (const node of nodes) {
        const flat = { node, level, parentId };
        map.set(node.id, flat);
        if (shown) rows.push(flat);
        if (node.children) walk(node.children, level + 1, node.id, shown && expandedSet.has(node.id));
      }
    };
    walk(items, 1, null, true);
    return { byId: map, visible: rows };
  }, [items, expandedSet]);

  // The one tabbable row. Focus that was inside a branch that has since closed (a
  // click on its parent's chevron) moves up to the nearest ancestor still on screen,
  // so the tab stop never points at a row that is not rendered.
  const visibleIds = useMemo(() => new Set(visible.map((f) => f.node.id)), [visible]);
  const nearestVisible = (id: string | null): string | null => {
    let cur = id;
    while (cur && !visibleIds.has(cur)) cur = byId.get(cur)?.parentId ?? null;
    return cur;
  };
  const tabbable =
    nearestVisible(focusedId) ?? nearestVisible(selected) ?? visible[0]?.node.id ?? null;

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    itemRefs.current.get(id)?.focus();
  });

  const focusRow = (id: string) => {
    setFocusedId(id);
    // After the commit: moving into a branch that just opened targets a row that is
    // not in the DOM yet.
    pendingFocus.current = id;
    itemRefs.current.get(id)?.focus();
  };

  const setExpanded = (next: Set<string>) => {
    const list = [...next];
    setExpandedOwn(list);
    onExpandedChange?.(list);
  };

  const open = (node: TreeNode<T>) => {
    if (expandedSet.has(node.id) || !isExpandable(node)) return;
    const next = new Set(expandedSet);
    next.add(node.id);
    setExpanded(next);
    if (loadChildren && node.hasChildren && !node.children?.length) {
      const pending = loadChildren(node);
      if (pending && typeof pending.then === "function") {
        setLoading((s) => new Set(s).add(node.id));
        const done = () =>
          setLoading((s) => {
            const n = new Set(s);
            n.delete(node.id);
            return n;
          });
        pending.then(done, done);
      }
    }
  };

  const close = (node: TreeNode<T>) => {
    if (!expandedSet.has(node.id)) return;
    const next = new Set(expandedSet);
    next.delete(node.id);
    setExpanded(next);
  };

  const toggle = (node: TreeNode<T>) => (expandedSet.has(node.id) ? close(node) : open(node));

  const select = (node: TreeNode<T>) => {
    if (node.disabled) return;
    if (selectionMode === "none") {
      toggle(node);
      return;
    }
    setSelectedOwn(node.id);
    onSelectedChange?.(node.id, node);
  };

  const idOf = (target: EventTarget | null): string | null =>
    (target as Element | null)?.closest?.<HTMLElement>('[role="treeitem"]')?.dataset.treeId ?? null;

  const textOf = (flat: FlatNode<T>): string => {
    if (flat.node.textValue !== undefined) return flat.node.textValue;
    if (typeof flat.node.label === "string") return flat.node.label;
    const row = itemRefs.current.get(flat.node.id)?.querySelector("[data-tree-row]");
    return row?.textContent ?? "";
  };

  const findByText = (fromIndex: number, text: string): string | null => {
    const needle = text.toLocaleLowerCase();
    for (let i = 1; i <= visible.length; i++) {
      const flat = visible[(fromIndex + i) % visible.length];
      if (textOf(flat).trim().toLocaleLowerCase().startsWith(needle)) return flat.node.id;
    }
    return null;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const id = idOf(e.target);
    const flat = id ? byId.get(id) : undefined;
    if (!flat) return;
    const { node } = flat;
    const index = visible.findIndex((f) => f.node.id === node.id);
    const expandedNow = expandedSet.has(node.id);
    // Forward / backward along the reading direction, from the row itself.
    const step = horizontalStep(e.key, e.target as Element);
    // A space inside a type-ahead run is part of the name being typed ("current a…"),
    // not a request to select.
    const inRun = Date.now() - typeahead.current.at < TYPEAHEAD_MS && typeahead.current.text !== "";
    const key = e.key === " " && inRun ? "typeahead" : e.key;

    let handled = true;
    if (step === 1) {
      if (!isExpandable(node)) handled = false;
      else if (!expandedNow) open(node);
      else if (node.children?.length) focusRow(node.children[0].id);
    } else if (step === -1) {
      if (expandedNow) close(node);
      else if (flat.parentId) focusRow(flat.parentId);
      else handled = false;
    } else {
      switch (key) {
        case "ArrowDown":
          if (index < visible.length - 1) focusRow(visible[index + 1].node.id);
          break;
        case "ArrowUp":
          if (index > 0) focusRow(visible[index - 1].node.id);
          break;
        case "Home":
          if (visible.length) focusRow(visible[0].node.id);
          break;
        case "End":
          if (visible.length) focusRow(visible[visible.length - 1].node.id);
          break;
        case "Enter":
        case " ":
          select(node);
          break;
        case "*": {
          // Every sibling at this level, as the pattern suggests.
          const siblings = flat.parentId ? (byId.get(flat.parentId)?.node.children ?? []) : items;
          const next = new Set(expandedSet);
          for (const s of siblings) if (isExpandable(s)) next.add(s.id);
          setExpanded(next);
          break;
        }
        default: {
          const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
          if (!printable) {
            handled = false;
            break;
          }
          const now = Date.now();
          const run = now - typeahead.current.at < TYPEAHEAD_MS ? typeahead.current.text : "";
          typeahead.current = { text: run + e.key, at: now };
          const typed = typeahead.current.text;
          // "aaa" cycles through the rows starting with "a", as a file list does;
          // anything else extends the prefix, searched from the row after this one
          // (or from this one, when it still matches the longer prefix).
          const repeated = typed.length > 1 && [...typed].every((c) => c === typed[0]);
          const target = repeated
            ? findByText(index, typed[0])
            : typed.length > 1 && textOf(flat).trim().toLocaleLowerCase().startsWith(typed.toLocaleLowerCase())
              ? node.id
              : findByText(index, typed);
          if (target) focusRow(target);
        }
      }
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleClick = (e: MouseEvent<HTMLUListElement>) => {
    onClick?.(e);
    const id = idOf(e.target);
    const flat = id ? byId.get(id) : undefined;
    if (!flat) return;
    // Controls a host rendered into a row (an action in `trailing`) are their own.
    const control = (e.target as Element).closest("button, a[href], input, select, textarea");
    if (control && itemRefs.current.get(flat.node.id)?.contains(control)) return;
    setFocusedId(flat.node.id);
    if ((e.target as Element).closest("[data-tree-toggle]")) {
      toggle(flat.node);
      return;
    }
    select(flat.node);
  };

  const renderNodes = (nodes: readonly TreeNode<T>[], level: number, path: string): ReactNode =>
    nodes.map((node, i) => {
      // Named by its own row, not by its content: a treeitem's content is the whole
      // open branch below it, and "Assets Current assets 1020 Bank …" is not a name.
      // A path of indices, because a host's id may hold spaces an idref cannot.
      const rowId = `${baseId}-${path}${i}`;
      const expandable = isExpandable(node);
      const isOpen = expandable && expandedSet.has(node.id);
      const isSelected = selectionMode !== "none" && selected === node.id;
      const isLoading = loading.has(node.id);
      const state: TreeItemState = {
        level,
        expanded: isOpen,
        selected: isSelected,
        expandable,
        loading: isLoading,
        disabled: Boolean(node.disabled),
      };
      return (
        <li
          key={node.id}
          ref={(el) => {
            if (el) itemRefs.current.set(node.id, el);
            else itemRefs.current.delete(node.id);
          }}
          role="treeitem"
          data-tree-id={node.id}
          aria-labelledby={rowId}
          aria-level={level}
          aria-expanded={expandable ? isOpen : undefined}
          aria-selected={selectionMode === "none" ? undefined : isSelected}
          aria-disabled={node.disabled || undefined}
          aria-busy={isLoading || undefined}
          tabIndex={node.id === tabbable ? 0 : -1}
          onFocus={(e) => {
            // Only the row itself: a focus event bubbling up from a nested row, or from
            // a control inside this one, is not this row being focused.
            if (e.target === e.currentTarget) setFocusedId(node.id);
          }}
          // The ring goes on this row's own box, not the <li>: the <li> contains the
          // whole open branch below it, and ringing that would outline a subtree.
          className="outline-none [&:focus-visible>[data-tree-row]]:ring-2 [&:focus-visible>[data-tree-row]]:ring-[var(--brand)]"
        >
          <TreeRow
            id={rowId}
            level={level}
            expanded={expandable ? isOpen : undefined}
            label={node.label}
            icon={node.icon}
            trailing={node.trailing}
            indent={indent}
            guides={indentGuides}
            selected={isSelected}
            loading={isLoading}
            className={cn(
              node.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[var(--bg-hover)]",
              rowClassName,
            )}
          >
            {renderItem ? renderItem(node, state) : undefined}
          </TreeRow>
          {isOpen && (
            <ul role="group">
              {/* Empty while lazy children load: a "Loading…" line in here would be
                  a child that is not a treeitem, and the parent row already says
                  `aria-busy` and shows the spinner. */}
              {node.children?.length ? renderNodes(node.children, level + 1, `${path}${i}-`) : null}
            </ul>
          )}
        </li>
      );
    });

  return (
    <ul
      {...rest}
      role="tree"
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={cn("flex flex-col text-sm", className)}
    >
      {renderNodes(items, 1, "")}
    </ul>
  );
}
