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
 * Names the trigger and the menu: one of the two spellings is required (API-1, refactor
 * audit 2026-10). `aria-label` wins when both are given. TopBarActionMenu has the same
 * type; both become a plain required `aria-label` when `ariaLabel` goes in 0.35.
 */
type RequiredMenuName =
  | {
      "aria-label": string;
      /** @deprecated 0.34 — use `aria-label`; removed in 0.35. */
      ariaLabel?: string;
    }
  | {
      "aria-label"?: string;
      /** @deprecated 0.34 — use `aria-label`; removed in 0.35. */
      ariaLabel: string;
    };

/**
 * A top-bar hover menu that switches between a small set of options, with a
 * check on the active one and an optional heading. Generic glue over
 * {@link HoverMenu} — e.g. a dev role/impersonation switcher, an environment
 * picker. Controlled: the app owns `value` and `onSelect`.
 */
export function OptionSwitcherMenu<T extends string>({
  icon,
  "aria-label": ariaLabelAttr,
  ariaLabel: ariaLabelProp,
  title,
  heading,
  options,
  value,
  onSelect,
}: {
  icon: ReactNode;
  title?: string;
  heading?: string;
  options: OptionSwitcherOption<T>[];
  value: T;
  onSelect: (value: T) => void;
} & RequiredMenuName) {
  // The DOM spelling wins; `ariaLabel` is the fallback for call sites not moved yet.
  const ariaLabel = ariaLabelAttr ?? ariaLabelProp;
  return (
    <HoverMenu
      aria-label={ariaLabel}
      trigger={({ toggle }) => (
        <Tooltip label={title} portal>
          <button type="button" onClick={toggle} aria-label={ariaLabel} className={TOPBAR_TRIGGER_CLASS}>
            {icon}
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <ul className="py-1">
          {heading && (
            <li className="px-3 py-1 text-micro font-semibold uppercase tracking-wide text-placeholder">
              {heading}
            </li>
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
