import { useState } from "react";
import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { Disclosure } from "../components/disclosure";
import { MenuItem } from "../components/menu-item";
import { DEFAULT_TOP_BAR_LABELS, useKitLabels } from "../i18n/kit-labels";

/** One offered language in the account menu's sub-list. */
export interface AccountMenuLanguageOption {
  code: string;
  /** Its name, in its own language ("Deutsch", "Français"). */
  label: ReactNode;
  /**
   * A flag before the name, as the app draws it — keksdose's flag-icons span
   * (`<span aria-hidden className="fi fi-ch …" />`). A node rather than a country code, so
   * the kit ships no flag set; decorative, so give it `aria-hidden`.
   */
  flag?: ReactNode;
}

export interface AccountMenuLanguageProps {
  languages: readonly AccountMenuLanguageOption[];
  /** The active language's code. */
  value: string | undefined;
  /** A pick: the app sets the device's language and, signed in, the account's
   *  (settings §6.2). */
  onPick: (code: string) => void;
  /** The account menu's `close` (from `TopBarActionMenu`'s `children`): a pick shuts it. */
  close?: () => void;
  /** The row's name. Default: `topBar.language` ("Language"). */
  label?: string;
  /** Open the sub-list at first. Default `false`. */
  defaultOpen?: boolean;
}

/**
 * The language choice INSIDE the account menu (docs/top-bar-harmonization.md §2.3),
 * keksdose's sub-list: a `Disclosure variant="menu"` row — the globe, "Language", the
 * active language's flag and the chevron — that opens in place onto one checked
 * `MenuItem` per language. Inline rather than a nested popover: a popover inside a
 * popover fights the outside click and has nowhere to go on a phone (keksdose #140).
 *
 * It renders its own `<li>`: drop it into `TopBarActionMenu`'s `children` first after the
 * app's context rows (§6.5). Signed out there is no account menu; `LanguageMenu` stays
 * the bar's button (§2.3).
 */
export function AccountMenuLanguage({
  languages,
  value,
  onPick,
  close,
  label,
  defaultOpen = false,
}: AccountMenuLanguageProps) {
  const words = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS);
  const [open, setOpen] = useState(defaultOpen);
  const active = languages.find((l) => l.code === value);
  return (
    <li>
      <Disclosure
        variant="menu"
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Globe aria-hidden className="size-4" />
              {label ?? words.language}
            </span>
            {active?.flag}
          </span>
        }
      >
        <ul>
          {languages.map((lang) => (
            <li key={lang.code}>
              <MenuItem
                checked={lang.code === value}
                onClick={() => {
                  onPick(lang.code);
                  setOpen(false);
                  close?.();
                }}
                leading={lang.flag}
                // Under the row's own text, past the globe.
                className="ps-9"
              >
                {lang.label}
              </MenuItem>
            </li>
          ))}
        </ul>
      </Disclosure>
    </li>
  );
}
