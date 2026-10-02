import { useId, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { TILE_SIZE, TileRadioGroup } from "./tile-radio";
import type { TileItem, TileSize } from "./tile-radio";
import { Tooltip } from "./tooltip";
import { useCommitReason } from "./write-lock";
import { hasContent, LabelStrip } from "./field-anatomy";

export interface SwatchPickerLabels {
  /** The "no colour" tile's name, when `allowNone` is set. */
  none: string;
  /** Describes the group while `mixed` is set — a bulk edit over rows that disagree. */
  mixed: string;
}

export const DEFAULT_SWATCH_PICKER_LABELS: SwatchPickerLabels = {
  none: "No colour",
  mixed: "Mixed: the selected items have different colours",
};

export interface SwatchOption<T extends string> {
  value: T;
  /** Any CSS colour — a token (`var(--chart-3)`), a hex, an `oklch()`. Painted as an
   *  inline background, so it does not have to be a class the kit's CSS knows.
   *  Leave it out when `swatchClassName` paints the dot instead. For a colour that
   *  must match a `StatusDot` / `Chip` hue elsewhere, `statusDotColor("teal")` rather
   *  than `"var(--hue-teal)"` written out — one table, so the two cannot drift. */
  color?: string;
  /** The colour's name, in the user's language. Shown in the bubble and read out;
   *  required, because a swatch with no name is a colour only some people can read. */
  label: string;
  /** Classes for the swatch dot, for a palette that lives in classes rather than
   *  values (a light/dark pair). An inline `color` would win over a class, so pass
   *  one or the other. */
  swatchClassName?: string;
  /** A remark read after the name and shown under it in the bubble ("used by
   *  Groceries"). The tile wears a dot while it has one. */
  note?: string;
  disabled?: boolean;
}

/**
 * `onChange` is the picker's own — the chosen VALUE, not a DOM event — so the div's
 * is omitted rather than shadowed, as on {@link ToggleGroup}.
 */
export interface SwatchPickerProps<T extends string>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "children" | "defaultValue"> {
  options: SwatchOption<T>[];
  /** The chosen colour, or `null` for none. */
  value: T | null;
  onChange: (value: T | null) => void;
  /** Lead with a "no colour" tile whose value is `null`. Clearing a colour has to be
   *  as reachable as setting one, and a radio cannot be unchecked by clicking it. */
  allowNone?: boolean;
  /**
   * "Some of each" — a bulk edit over rows whose colours differ. Nothing is checked
   * (not even "none", whatever `value` says), and the group is described as mixed.
   * Distinct from `value={null}`, which is an answer: "no colour".
   */
  mixed?: boolean;
  /** See {@link IconPickerProps.activation}. Default "automatic". */
  activation?: "automatic" | "manual";
  /** 28 / 32 / 44px tiles. Default "md"; "lg" is the touch-target size. */
  size?: TileSize;
  /**
   * Classes for every tile's frame, merged after the kit's own — so a caller's
   * `size-*` beats `size`'s. For a tile that has to follow a container query or a
   * breakpoint (keksdose grows its tiles to 40px in a narrow card:
   * `tileClassName="@max-md:size-10"`) without reaching into the kit's markup with an
   * `[&_[role=radio]]` selector. The swatch dot / glyph inside keeps `size`'s
   * dimensions; the tile grows round it.
   */
  tileClassName?: string;
  disabled?: boolean;
  labels?: Partial<SwatchPickerLabels>;
  /**
   * An 11px static label in a strip over the swatches, named by it (keksdose K2): the
   * transaction row's flag picker stands between labelled fields and hand-builds this
   * (`FieldLabel` + `pt-5`, transaction-flags.tsx:155) because the picker had no label.
   * The label sits on the same line as a field's own (`top-1`, `inset-x-3`); the
   * swatches start 20px down, below its whole line box — see `LABEL_STRIP_PAD`. With a
   * label, `className` styles the wrapper, as on a labelled {@link ToggleGroup}; an
   * explicit `aria-label` / `aria-labelledby` still names the group instead.
   */
  label?: ReactNode;
  /** A {@link FieldHint} beside the label. Only with `label`. */
  hint?: ReactNode;
  /**
   * Why the colour cannot be changed right now — {@link Button}'s `disabledReason`, for
   * a picker that saves itself on change (keksdose K3, the flag picker in a row a
   * read-only viewer may see). The swatches stay reachable and the arrow keys still
   * walk them, but nothing reaches `onChange`; the reason is shown in the kit
   * {@link Tooltip} under the row (each swatch's own name bubble sits above it) and
   * describes the group. Wins over `disabled`.
   */
  disabledReason?: ReactNode;
  /** This picker COMMITS — choosing a colour saves it. Under a locked
   *  {@link WriteLockProvider} it takes the `disabledReason` path with the lock's
   *  reason, as {@link Button}'s `commit` does. */
  commit?: boolean;
}

/**
 * A row of colour swatches that is one radio group.
 *
 * Name the group with `aria-label` or `aria-labelledby` — usually the visible heading
 * above it. Each swatch is named by its `label` and shows it in a bubble on hover and
 * focus, so the name is not the screen reader's alone.
 *
 * Keyboard (the APG radio group): Tab reaches the checked swatch, or the first one
 * while nothing is checked; the arrow keys move between swatches and, by default,
 * choose as they go; Home and End jump to the ends. Left and right follow the page's
 * direction.
 */
export function SwatchPicker<T extends string>({
  options,
  value,
  onChange,
  allowNone = false,
  mixed = false,
  activation = "automatic",
  size = "md",
  tileClassName,
  disabled = false,
  labels,
  label,
  hint,
  disabledReason: ownDisabledReason,
  commit,
  className,
  ...rest
}: SwatchPickerProps<T>) {
  const text = useKitLabels("swatchPicker", DEFAULT_SWATCH_PICKER_LABELS, labels);
  const mixedId = useId();
  const labelId = useId();
  const reasonId = useId();
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  const labelled = hasContent(label);
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const items: TileItem<T>[] = [
    ...(allowNone ? [{ key: null, label: text.none }] : []),
    ...options.map((o) => ({ key: o.value, label: o.label, note: o.note, disabled: o.disabled })),
  ];
  const tiles = (
    <TileRadioGroup
      items={items}
      checked={mixed ? undefined : value}
      // A locked picker saves on change, so the change is swallowed — the arrow keys
      // still move the focus (and, automatic, would choose), and nothing is chosen.
      onSelect={(next) => {
        if (!locked) onChange(next);
      }}
      activation={activation}
      // A reason wins over `disabled`: the tiles stay in the tab order.
      disabled={disabled && !locked}
      size={size}
      tileClassName={
        tileClassName || locked
          ? (_item, selected) =>
              cn(
                // The disabled tile's look, without its `disabled`: dimmed, a
                // not-allowed cursor, and no hover offer on a tile that cannot be
                // chosen. Not on the selected tile, whose frame IS its state.
                locked && "cursor-not-allowed opacity-50",
                locked && !selected && "hover:border-[var(--border)] hover:bg-[var(--bg-surface)]",
                tileClassName,
              )
          : undefined
      }
      renderTile={(item) => {
        const opt = item.key === null ? undefined : byValue.get(item.key);
        return (
          <span
            aria-hidden
            // A hairline round the dot, drawn over whatever colour it is: a pale
            // yellow swatch on a white surface is otherwise a hole in the row.
            className={cn(
              "rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15",
              TILE_SIZE[size].swatch,
              opt?.swatchClassName,
            )}
            style={{ background: opt?.color }}
          />
        );
      }}
    />
  );
  const group = (
    <div
      {...rest}
      role="radiogroup"
      aria-labelledby={
        labelled && rest["aria-label"] === undefined && rest["aria-labelledby"] === undefined
          ? labelId
          : rest["aria-labelledby"]
      }
      aria-disabled={disabled || locked || undefined}
      aria-describedby={
        [rest["aria-describedby"], mixed && mixedId, locked && reasonId].filter(Boolean).join(" ") ||
        undefined
      }
      className={cn("flex flex-wrap items-center gap-1.5", !labelled && className)}
    >
      {locked ? (
        // Inside the group, round the tiles — not round the group, whose box is the
        // caller's row item. This row inherits the group's gap, wrap and alignment, so
        // the tiles sit exactly where they sit unlocked. Below the row: each tile's own
        // bubble (its colour's name) is above it.
        <Tooltip
          label={disabledReason}
          side="bottom"
          className="flex min-w-0 flex-1 gap-[inherit] [align-items:inherit] [flex-wrap:inherit] [justify-content:inherit]"
        >
          <>
            {tiles}
            <span id={reasonId} hidden>
              {disabledReason}
            </span>
          </>
        </Tooltip>
      ) : (
        tiles
      )}
      {/* `hidden`, not `sr-only`: a description is read from hidden text, and this
          way it takes no room in the row. */}
      {mixed && (
        <span id={mixedId} hidden>
          {text.mixed}
        </span>
      )}
    </div>
  );
  if (!labelled) return group;
  return (
    <LabelStrip labelId={labelId} label={label} hint={hint} disabled={disabled || locked} pad="tiles" className={className}>
      {group}
    </LabelStrip>
  );
}
