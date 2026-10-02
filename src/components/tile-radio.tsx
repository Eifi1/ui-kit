import { useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Ban, Check } from "lucide-react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { Tooltip } from "./tooltip";

/**
 * A row of square tiles that behaves as ONE radio group — the machinery
 * {@link SwatchPicker} and {@link IconPicker} are built on, public since 0.22.0 for the
 * one-of-n pickers those two do not cover (kastlan's input audit: a choice whose tiles
 * show something of the app's own — a mark, a pattern, a symbol set the kit does not
 * ship).
 *
 * Keksdose had three of these (the category colours, the category symbols, the
 * transaction flags) and all three were rows of `aria-pressed` buttons: a separate
 * tab stop per tile, and "pressed" on a choice that is really one-of-n. The APG radio
 * group is the shape a screen reader expects for that ("Red, radio, 2 of 7, checked")
 * and the one a keyboard expects too — a single tab stop, arrows to move.
 *
 * ## The container is yours
 *
 * It renders the TILES only — no wrapper — so it can sit in a layout the caller owns
 * (a wrapping row, a grid, a row beside a search box). That element must carry the
 * group's semantics, as SwatchPicker's does:
 *
 * ```tsx
 * <div role="radiogroup" aria-labelledby={headingId} className="flex flex-wrap gap-1.5">
 *   <TileRadioGroup
 *     items={[{ key: "dots", label: "Dots" }, { key: "lines", label: "Lines" }]}
 *     checked={pattern}
 *     onSelect={(key) => key && setPattern(key)}
 *     renderTile={(item) => <PatternGlyph pattern={item.key} className={TILE_SIZE.md.glyph} />}
 *   />
 * </div>
 * ```
 *
 * `role="radiogroup"` and a name (`aria-label` or `aria-labelledby`) — without them a
 * screen reader hears radios that belong to nothing, and no "2 of 7". Set
 * `aria-disabled` on it as well when the whole group is `disabled`.
 *
 * ## What a tile is
 *
 * A square (28 / 32 / 44px, {@link TILE_SIZE}) holding `renderTile`'s content, NAMED by
 * the item's `label` (`aria-label`, so what is drawn inside is decoration) and showing
 * that label in a bubble on hover and focus — a row of unlabelled squares is the
 * complaint that put the bubble there. It is for choices that are SEEN: a colour, a
 * glyph, a pattern. A choice that has to be READ — a plan with a price and three lines
 * of features, an option with a sentence of explanation — is a {@link ChoiceCardGroup}
 * (`type="radio"`): a card names its option by its title and describes it by its text,
 * where a tile would hide the text behind a bubble and repeat it.
 *
 * No strings of its own: every name is an item's `label`, the "none" tile's included.
 */

/** A tile's size: 28 / 32 / 44px — see {@link TILE_SIZE}. */
export type TileSize = "sm" | "md" | "lg";

/** 28 / 32 / 44px. `lg` is the touch target a phone surface wants (`min-h-11`). `glyph`
 *  and `swatch` are the content sizes the kit's own pickers draw inside each — use them
 *  in `renderTile` so a tile of the app's own matches theirs. */
export const TILE_SIZE: Record<TileSize, { tile: string; glyph: string; swatch: string }> = {
  sm: { tile: "size-7", glyph: "size-3.5", swatch: "size-4" },
  md: { tile: "size-8", glyph: "size-4", swatch: "size-5" },
  lg: { tile: "size-11", glyph: "size-5", swatch: "size-6" },
};

/** One tile, whatever it shows. `key` is `null` for the "none" entry — a tile of its
 *  own that leads back to nothing, since clicking a checked tile does not uncheck it. */
export interface TileItem<T extends string> {
  key: T | null;
  label: string;
  /** Said after the name, and shown in the bubble under it. Marks the tile with a
   *  dot, so the note is visible without hovering every tile to find it. */
  note?: string;
  disabled?: boolean;
}

export interface TileRadioGroupProps<T extends string> {
  /** The tiles, in reading order. Render them inside a `role="radiogroup"` element
   *  with a name — see the module note. */
  items: TileItem<T>[];
  /** The checked key, or `undefined` for "nothing is checked" (the mixed state, or
   *  a value that is not among the options). */
  checked: T | null | undefined;
  onSelect: (key: T | null) => void;
  /** "automatic" (default): an arrow key moves AND checks, the APG default. "manual":
   *  arrows move focus only, Space or Enter checks — for a picker whose change is
   *  expensive (a bulk edit that saves on every change). */
  activation?: "automatic" | "manual";
  /** Every tile disabled. Mark the container `aria-disabled` too. Default `false`. */
  disabled?: boolean;
  /** 28 / 32 / 44px tiles ({@link TILE_SIZE}). Default "md"; "lg" is the touch-target
   *  size a phone surface wants. */
  size?: TileSize;
  /** What goes inside a tile — `aria-hidden` decoration, since the tile is named by
   *  `label`. Not called for the `null` ("none") item, which shows the kit's "no"
   *  glyph. The frame, the tick and the note's dot are drawn around it. */
  renderTile: (item: TileItem<T>, selected: boolean) => ReactNode;
  /** Extra classes for a tile, per item, merged after the kit's — so a `size-*` here
   *  beats `size`'s (a tile that grows in a narrow card). */
  tileClassName?: (item: TileItem<T>, selected: boolean) => string | undefined;
}

/**
 * The tile's frame. Selection is a thicker, darker frame AND a tick in the corner —
 * never a colour change alone,
 * because the thing inside a swatch tile IS a colour, and a red frame round a red dot
 * says nothing to a reader who cannot see red.
 *
 * `focus-visible` with an offset in the surface colour, as the checkbox does: the ring
 * must not be painted in the colour of the frame it touches.
 */
const TILE_BASE =
  "relative inline-flex shrink-0 items-center justify-center rounded-md border transition-colors " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";
const TILE_IDLE =
  "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]";
const TILE_SELECTED =
  "border-[var(--text-primary)] bg-[var(--bg-surface)] ring-1 ring-[var(--text-primary)]";

/**
 * The tiles of one radio group, without the group element — render them inside a
 * `role="radiogroup"` with a name (the module note above has the example). One tab stop
 * (the checked tile, else the first that can be chosen), arrows to move — left and
 * right follow the page's direction — Home and End to the ends, and by default the
 * arrows choose as they go.
 */
export function TileRadioGroup<T extends string>({
  items,
  checked,
  onSelect,
  activation = "automatic",
  disabled = false,
  size = "md",
  renderTile,
  tileClassName,
}: TileRadioGroupProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const noteId = useId();
  const s = TILE_SIZE[size];
  const checkedIndex =
    checked === undefined ? -1 : items.findIndex((it) => it.key === checked);
  // The ONE tab stop: the checked tile, else the first that can be chosen — the APG
  // rule, so Tab into a group with nothing checked still lands somewhere.
  const tabStop =
    checkedIndex >= 0 && !items[checkedIndex].disabled
      ? checkedIndex
      : items.findIndex((it) => !it.disabled);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Left and right are VISUAL directions: in a right-to-left page the row runs the
    // other way. Up and down follow reading order either way — the APG's radio group
    // treats them as previous/next, and the tiles wrap, so there is no column to keep.
    const horizontal = horizontalStep(e.key, e.currentTarget);
    let step: number | "first" | "last";
    switch (horizontal ? "horizontal" : e.key) {
      case "horizontal":
        step = horizontal;
        break;
      case "ArrowDown":
        step = 1;
        break;
      case "ArrowUp":
        step = -1;
        break;
      case "Home":
        step = "first";
        break;
      case "End":
        step = "last";
        break;
      default:
        return;
    }
    e.preventDefault();
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    if (!enabled.length) return;
    const at = enabled.indexOf(index);
    let target: number;
    if (step === "first") target = enabled[0];
    else if (step === "last") target = enabled[enabled.length - 1];
    // Wrapping, as a native radio group does: the last tile's "next" is the first.
    else target = enabled[(at + step + enabled.length) % enabled.length];
    refs.current[target]?.focus();
    if (activation === "automatic") onSelect(items[target].key);
  };

  return (
    <>
      {items.map((item, i) => {
        const selected = i === checkedIndex;
        const button = (
          <button
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={item.label}
            // The note is a DESCRIPTION, read after the name and the state, not glued
            // into the name — the punctuation between the two would be English's.
            aria-describedby={item.note ? `${noteId}-${i}` : undefined}
            tabIndex={i === tabStop ? 0 : -1}
            disabled={disabled || item.disabled}
            // Clicking the checked tile again does nothing: a radio is not a toggle.
            // "None" is the way back to nothing, and it is a tile of its own.
            onClick={() => !selected && onSelect(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              TILE_BASE,
              s.tile,
              selected ? TILE_SELECTED : TILE_IDLE,
              tileClassName?.(item, selected),
            )}
          >
            {item.key === null ? (
              <Ban aria-hidden className={cn(s.glyph, "text-[var(--text-muted)]")} />
            ) : (
              renderTile(item, selected)
            )}
            {item.note && (
              <>
                {/* A dot rather than a dimmed tile: dimming reads as "disabled", and a
                    tile with a note is entirely available. */}
                <span
                  aria-hidden
                  className="absolute end-0.5 top-0.5 size-1.5 rounded-full bg-[var(--text-muted)]"
                />
                {/* `hidden` still serves as a description: aria-describedby reads
                    hidden text, which is what keeps it out of the layout. */}
                <span id={`${noteId}-${i}`} hidden>
                  {item.note}
                </span>
              </>
            )}
            {selected && <SelectedTick />}
          </button>
        );
        return (
          // The bubble is the SIGHTED user's name for the tile — eight unlabelled
          // squares are the complaint that put a bubble on Keksdose's (live #289).
          // It wraps a span rather than the button, because a Tooltip hands its
          // child an `aria-describedby`, and a tile named "Red" and described as
          // "Red" is read out twice.
          <Tooltip
            key={item.key ?? "\u0000none"}
            label={
              item.note ? (
                <>
                  <span className="block">{item.label}</span>
                  <span className="block font-normal text-[var(--text-muted)]">{item.note}</span>
                </>
              ) : (
                item.label
              )
            }
            portal
          >
            <span className="inline-flex">{button}</span>
          </Tooltip>
        );
      })}
    </>
  );
}

/** The tick on a selected tile — a small badge in the corner, in the text colour on
 *  the surface colour, so it reads the same over every swatch colour. */
function SelectedTick() {
  return (
    <span
      aria-hidden
      className="absolute -bottom-1 -end-1 inline-flex size-3.5 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-surface)]"
    >
      <Check strokeWidth={3} className="size-2.5" />
    </span>
  );
}
