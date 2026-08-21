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
  ariaLabel,
  title,
  heading,
  options,
  value,
  onSelect,
}: {
  icon: ReactNode;
  ariaLabel: string;
  title?: string;
  heading?: string;
  options: OptionSwitcherOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <HoverMenu
      ariaLabel={ariaLabel}
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
            <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
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
                {value === opt.value && <Check className="size-4 text-slate-700 dark:text-slate-200" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </HoverMenu>
  );
}
