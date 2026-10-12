import { useCallback, useId, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { foldForSearch } from "../lib/text-match";
import { ComboboxPanel, useComboboxCore, type ComboOption } from "./combobox-core";
import { assignRef } from "./field-parts";
import { DEFAULT_COMBOBOX_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";

export interface PickerGroup {
  key: string;
  label: string;
  /** `icon` is an optional leading glyph, drawn before the label — the same slot
   *  `ComboOption` has always had, so the two pickers can present one option set
   *  the same way. Omitted, a row is exactly what it was: label only, with no
   *  reserved space, so a list where nothing has an icon does not indent. */
  items: { key: string; label: string; icon?: ReactNode }[];
}

/**
 * `onSelect` is omitted from the div's own attributes because this component's
 * means "an item was chosen", not the DOM's "text was selected inside me" — two
 * different signatures under one name, and the kit's meaning is the one three apps
 * are written against.
 */
export interface GroupedPickerProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  groups: PickerGroup[];
  /** Face of the closed picker button. A string also names the trigger when no
   *  `aria-label` does. */
  buttonLabel: ReactNode;
  /** Keys of the current selection, if any. */
  selected: { group: string; item: string } | null;
  onSelect: (groupKey: string, itemKey: string) => void;
  /** The filter box's prompt, and its accessible name. Default: `combobox.search` from
   *  the {@link UiKitProvider}, else "Search". */
  filterPlaceholder?: string;
  /** The TRIGGER — the focusable `<button>` — as on every picker of the kit (MultiSelect,
   *  CountrySelect, CurrencySelect), not the wrapper the rest of the props go on (0.34,
   *  API-2, refactor audit 2026-10). */
  ref?: Ref<HTMLButtonElement>;
}

/** An item's value in the list: the group's key and the item's, which together are
 *  unique where an item key alone is not (two groups may each have an "Other"). */
const itemValue = (group: string, item: string) => `${group}\u0000${item}`;

/** Panel picker for large grouped option sets: instead of one long flat
 * dropdown, the groups sit side by side as columns with their items listed
 * beneath (feedback #267/#276), narrowed by a filter box at the top (feedback
 * #267 rework). A query that matches a group's name keeps the whole group;
 * otherwise groups are reduced to their matching items.
 *
 * On the picker family's foundation since round 0.34 (Wave 2, DUP-4 + BUG-12):
 * `useComboboxCore` + `ComboboxPanel` in its `columns` layout. Its trigger promised a
 * dialog that was no dialog, and the choice showed by colour alone; it is a combobox over
 * a listbox now — one `role="group"` per column, named by its heading, the chosen item
 * `aria-selected` and checked — with the arrow keys, Enter, a named filter box, the live
 * result count, portal anchoring (dev#548) and, on a phone, the full-screen sheet
 * (live #200) in one column. */
export function GroupedPicker({
  groups,
  buttonLabel,
  selected,
  onSelect,
  "aria-label": ariaLabel,
  filterPlaceholder,
  className,
  ref,
  ...rest
}: GroupedPickerProps) {
  // `filter: false`: the filter below keeps a whole group when its name matches, so the
  // panel is handed the rows, as CountrySelect's are. Escape is the core's layer on the
  // kit's stack — this kept an Escape handler of its own on its panel (round 0.34 BUG-1),
  // and the stack is the one answer to it now (DUP-1). Back closes the list, as it did on
  // `useDropdown`.
  const core = useComboboxCore<string>({ filter: false, backCloses: true });
  const { open, setOpen, triggerRef, closeToTrigger, query } = core;
  // The core anchors the panel to the trigger and hands focus back to it; the caller's
  // `ref` wants the same element. One callback feeds both, as on MultiSelect.
  const setTrigger = useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      assignRef(ref, el);
    },
    [ref, triggerRef],
  );
  const comboText = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS);

  // Folded as every kit list folds (DUP-5): the locale's case (the Turkish "İ" that
  // plain `toLowerCase` gets wrong), and now the accents too — "zurich" finds Zürich.
  const locale = useKitLocale();
  const results = useMemo(() => {
    const q = foldForSearch(query.trim(), locale);
    const has = (s: string) => foldForSearch(s, locale).includes(q);
    const kept = q
      ? groups
          .map((g) => (has(g.label) ? g : { ...g, items: g.items.filter((i) => has(i.label)) }))
          .filter((g) => g.items.length > 0)
      : groups;
    return kept.flatMap((g) =>
      g.items.map(
        (item): ComboOption<string> => ({
          value: itemValue(g.key, item.key),
          label: item.label,
          icon: item.icon,
          group: g.label,
        }),
      ),
    );
  }, [groups, query, locale]);
  // Back to keys for `onSelect`, by the value the row carries.
  const keysOf = useMemo(() => {
    const map = new Map<string, [string, string]>();
    for (const g of groups) for (const item of g.items) map.set(itemValue(g.key, item.key), [g.key, item.key]);
    return map;
  }, [groups]);
  const chosen = selected ? itemValue(selected.group, selected.item) : null;

  const listboxId = `${useId()}-listbox`;
  // The trigger's NAME: a combobox takes none from its content. The caller's
  // `aria-label`, as on every picker of the kit, else the face when it is text.
  const name = ariaLabel ?? (typeof buttonLabel === "string" ? buttonLabel : undefined);

  return (
    // `rest` goes on the wrapper, but the accessible NAME does not: this div is a
    // positioning box with no role, so a label parked on it would be announced by
    // nothing. It belongs to the control — the same split every picker in this wave
    // makes, and the reason `aria-label` is destructured out rather than left in
    // `rest`. Spread FIRST so the attributes below, each of them a fix with an
    // incident behind it, cannot be clobbered from outside.
    <div {...rest} className={cn("relative", className)}>
      <button
        ref={setTrigger}
        type="button"
        // A closed choice that expands into the list below — the role every trigger
        // picker in the kit wears. It said `aria-haspopup="dialog"` over a panel that was
        // no dialog (BUG-12).
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-label={name}
        onClick={() => setOpen((o) => !o)}
        // Down/Up opens the list from the closed trigger, per the APG.
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-strong bg-surface px-2.5 py-1.5 text-sm text-primary hover:bg-hover"
      >
        {/* The trigger's label and each item wrap from Large up (text size §10.17,
            round 0.34 T1: the sweep read "Choose a cat…" at 360 px / Extra large). */}
        <span className="truncate-until-large">{buttonLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-placeholder" />
      </button>
      <ComboboxPanel
        core={{ ...core, results }}
        listboxId={listboxId}
        columns
        // As wide as four columns want (56rem), within the glass, from the trigger's
        // start — the panel it always was.
        width={{ minRem: 56 }}
        searchPlaceholder={filterPlaceholder ?? comboText.search}
        sheetTitle={ariaLabel ?? buttonLabel}
        isSelected={(v) => v === chosen}
        onChoose={(o) => {
          const keys = keysOf.get(o.value);
          if (keys) onSelect(keys[0], keys[1]);
          closeToTrigger();
        }}
        showCreate={false}
        onCreate={() => {}}
        createContent={null}
      />
    </div>
  );
}
