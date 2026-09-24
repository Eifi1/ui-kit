import { useId, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { SearchField } from "./search-field";
import { TILE_SIZE, TileRadioGroup } from "./tile-radio";
import type { TileItem, TileSize } from "./tile-radio";

export interface IconPickerLabels {
  /** The "no icon" tile's name, when `allowNone` is set. */
  none: string;
  /** Describes the group while `mixed` is set — a bulk edit over rows that disagree. */
  mixed: string;
  /** The search box's accessible name and placeholder, when `searchable` is set. */
  search: string;
  /** Shown in place of the tiles when the search matches nothing. */
  noResults: string;
  /** Announced as the search narrows the grid. Receives the number of matches. */
  resultCount: (count: number) => string;
}

export const DEFAULT_ICON_PICKER_LABELS: IconPickerLabels = {
  none: "No icon",
  mixed: "Mixed: the selected items have different icons",
  search: "Search icons",
  noResults: "No icons match",
  resultCount: (count) => (count === 1 ? "1 icon" : `${count} icons`),
};

export interface IconOption<T extends string> {
  value: T;
  /** A Lucide icon, or any component that takes a `className`. Rendered `aria-hidden`
   *  — the tile's name is `label`. */
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** What the symbol IS, in the user's language ("Game controller") — not the icon
   *  library's identifier (`Gamepad2`), which is nobody's word for anything. */
  label: string;
  /** More words the search matches ("games", "play"), besides `label`. */
  keywords?: string[];
  /** A remark read after the name and shown under it in the bubble ("used by
   *  Leisure"). The tile wears a dot while it has one. */
  note?: string;
  disabled?: boolean;
}

export interface IconPickerProps<T extends string>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "children" | "defaultValue"> {
  options: IconOption<T>[];
  /** The chosen icon, or `null` for none. */
  value: T | null;
  onChange: (value: T | null) => void;
  /** Lead with a "no icon" tile whose value is `null`. */
  allowNone?: boolean;
  /** See {@link SwatchPickerProps.mixed}: nothing is checked, and the group is
   *  described as mixed. */
  mixed?: boolean;
  /**
   * "automatic" (default): an arrow key moves AND chooses, the APG radio group.
   * "manual": arrows move focus only; Space or Enter chooses. For a picker whose every
   * change is expensive — a bulk edit that saves as it goes.
   */
  activation?: "automatic" | "manual";
  /** A search box above the grid, matching `label` and `keywords`. For a set large
   *  enough that scanning it is slower than typing. */
  searchable?: boolean;
  /** 28 / 32 / 44px tiles. Default "md"; "lg" is the touch-target size. */
  size?: TileSize;
  disabled?: boolean;
  labels?: Partial<IconPickerLabels>;
}

/** Case- and accent-insensitive, so "cafe" finds "Café". */
function fold(text: string, locale: string | undefined): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(locale);
}

/**
 * A grid of symbols that is one radio group, with an optional search.
 *
 * Name the group with `aria-label` or `aria-labelledby`. The name lands on the
 * radiogroup itself, not on the outer box: with `searchable` the outer box also holds
 * the search field, which has a name of its own.
 *
 * Keyboard is {@link SwatchPicker}'s: one tab stop, arrows to move (flipped in a
 * right-to-left page), Home and End.
 */
export function IconPicker<T extends string>({
  options,
  value,
  onChange,
  allowNone = false,
  mixed = false,
  activation = "automatic",
  searchable = false,
  size = "md",
  disabled = false,
  labels,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: IconPickerProps<T>) {
  const text = useKitLabels("iconPicker", DEFAULT_ICON_PICKER_LABELS, labels);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const locale = useKitLocale();
  const mixedId = useId();
  const [query, setQuery] = useState("");
  const needle = fold(query.trim(), locale);

  const visible = useMemo(
    () =>
      needle
        ? options.filter((o) =>
            [o.label, ...(o.keywords ?? [])].some((w) => fold(w, locale).includes(needle)),
          )
        : options,
    [options, needle, locale],
  );
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const items: TileItem<T>[] = [
    // "None" stays through a search: it is the way back to no icon, and it matches
    // no word anybody would type for it.
    ...(allowNone ? [{ key: null, label: text.none }] : []),
    ...visible.map((o) => ({ key: o.value, label: o.label, note: o.note, disabled: o.disabled })),
  ];

  return (
    <div {...rest} className={cn("space-y-2", className)}>
      {searchable && (
        <SearchField
          value={query}
          onChange={setQuery}
          aria-label={text.search}
          clearLabel={common.clear}
          disabled={disabled}
        />
      )}
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={[ariaDescribedBy, mixed && mixedId].filter(Boolean).join(" ") || undefined}
        aria-disabled={disabled || undefined}
        className="flex flex-wrap items-center gap-1.5"
      >
        <TileRadioGroup
          items={items}
          checked={mixed ? undefined : value}
          onSelect={onChange}
          activation={activation}
          disabled={disabled}
          size={size}
          renderTile={(item) => {
            const Icon = item.key === null ? undefined : byValue.get(item.key)?.icon;
            return Icon ? <Icon aria-hidden className={TILE_SIZE[size].glyph} /> : null;
          }}
          tileClassName={(_item, selected) =>
            selected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
          }
        />
      </div>
      {needle && visible.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">{text.noResults}</p>
      )}
      {mixed && (
        <span id={mixedId} hidden>
          {text.mixed}
        </span>
      )}
      {searchable && (
        // Typing moves no focus and the grid changes silently, so the count is said.
        // `sr-only-fixed`: this sits inside a consumer's markup and must not extend
        // the document height (see tokens.css).
        <span role="status" aria-live="polite" aria-atomic className="sr-only-fixed">
          {needle ? text.resultCount(visible.length) : ""}
        </span>
      )}
    </div>
  );
}
