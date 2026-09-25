import { useId, useMemo } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { TILE_SIZE, TileRadioGroup } from "./tile-radio";
import type { TileItem, TileSize } from "./tile-radio";

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
   *  Leave it out when `swatchClassName` paints the dot instead. */
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
  className,
  ...rest
}: SwatchPickerProps<T>) {
  const text = useKitLabels("swatchPicker", DEFAULT_SWATCH_PICKER_LABELS, labels);
  const mixedId = useId();
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const items: TileItem<T>[] = [
    ...(allowNone ? [{ key: null, label: text.none }] : []),
    ...options.map((o) => ({ key: o.value, label: o.label, note: o.note, disabled: o.disabled })),
  ];
  return (
    <div
      {...rest}
      role="radiogroup"
      aria-disabled={disabled || undefined}
      aria-describedby={
        [rest["aria-describedby"], mixed && mixedId].filter(Boolean).join(" ") || undefined
      }
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      <TileRadioGroup
        items={items}
        checked={mixed ? undefined : value}
        onSelect={onChange}
        activation={activation}
        disabled={disabled}
        size={size}
        tileClassName={tileClassName ? () => tileClassName : undefined}
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
      {/* `hidden`, not `sr-only`: a description is read from hidden text, and this
          way it takes no room in the row. */}
      {mixed && (
        <span id={mixedId} hidden>
          {text.mixed}
        </span>
      )}
    </div>
  );
}
