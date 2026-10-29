import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { HoverMenu } from "../components/hover-menu";
import { TOPBAR_MENU_ITEM_CLASS, TOPBAR_TRIGGER_CLASS } from "./topbar-controls";
import { Tooltip } from "../components/tooltip";

export interface OptionSwitcherOption<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * A top-bar hover menu that switches between a small set of options, with a
 * check on the active one and an optional heading. Generic glue over
 * {@link HoverMenu} — e.g. a dev role/impersonation switcher, an environment
 * picker. Controlled: the app owns `value` and `onSelect`.
 */
export function OptionSwitcherMenu<T extends string>({
  icon,
  "aria-label": ariaLabel,
  title,
  heading,
  options,
  value,
  onSelect,
}: {
  icon: ReactNode;
  /** Names the trigger and the menu. Required: the trigger is an icon (refactor audit
   *  2026-10, API-1 — the `ariaLabel` spelling went in 0.35). */
  "aria-label": string;
  /** The trigger's tooltip. Default: `aria-label` (0.48) — the name, shown on hover and
   *  focus. A different text also describes the trigger (`aria-describedby`). */
  title?: string;
  heading?: string;
  options: OptionSwitcherOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <HoverMenu
      aria-label={ariaLabel}
      trigger={({ toggle }) => {
        const button = (
          <button type="button" onClick={toggle} aria-label={ariaLabel} className={TOPBAR_TRIGGER_CLASS}>
            {icon}
          </button>
        );
        // The name on hover and focus even without a `title` (0.48, keksdose dev#610). A
        // bubble that repeats the name sits round the button in a fragment, as IconButton's
        // does, so it does not describe the button by its own name — a reader heard "Text
        // size, button, Text size". A `title` that says more still describes it.
        const tip = title ?? ariaLabel;
        return (
          <Tooltip label={tip} portal>
            {tip === ariaLabel ? <>{button}</> : button}
          </Tooltip>
        );
      }}
    >
      {(close) => (
        <ul className="py-1">
          {heading && (
            <li className="px-3 py-1 text-micro font-semibold uppercase tracking-wide text-placeholder">{heading}</li>
          )}
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  close();
                }}
                className={TOPBAR_MENU_ITEM_CLASS}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check className="size-4 text-secondary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </HoverMenu>
  );
}
