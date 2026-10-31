import { useState } from "react";
import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { Disclosure } from "../components/disclosure";
import { MenuItem } from "../components/menu-item";
import { DEFAULT_TOP_BAR_LABELS, useKitLabels } from "../i18n/kit-labels";
import { languageCodeLabel } from "./language-code";

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
  /**
   * Or the ISO 3166-1 alpha-2 country (lowercase) whose flag-icons flag to draw, as
   * `LanguageMenu`'s `LanguageOption` takes it — so one language list feeds both
   * (Kurvenschmiede's `LANGUAGES`). Needs the app's flag-icons CSS, as `LanguageMenu`
   * does. `flag` wins when both are given.
   */
  country?: string;
}

/** The option's flag: its own node, else the flag-icons flag of its country. */
function flagOf(lang: AccountMenuLanguageOption): ReactNode {
  if (lang.flag !== undefined) return lang.flag;
  if (!lang.country) return undefined;
  return (
    <span
      aria-hidden
      data-country={lang.country}
      className={`fi fi-${lang.country} inline-block h-[0.9375rem] w-5 shrink-0 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)]`}
    />
  );
}

export interface AccountMenuLanguageProps {
  languages: readonly AccountMenuLanguageOption[];
  /** The active language's code. */
  value: string | undefined;
  /** A pick: the app sets the device's language and, signed in, the account's
   *  (settings §6.2). `value` + `onChange`, as every kit control pairs them (CONTRIBUTING
   *  §4; refactor audit 2026-10-30, API-5). */
  onChange?: (code: string) => void;
  /** @deprecated 0.52 — `onChange` (the same call); removed in 0.53. */
  onPick?: (code: string) => void;
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
 * active language's flag and code ("DE") and the chevron — that opens in place onto one checked
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
  onChange,
  onPick,
  close,
  label,
  defaultOpen = false,
}: AccountMenuLanguageProps) {
  const change = onChange ?? onPick;
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
            {active && (
              // The flag alone could not tell de-CH, fr-CH and it-CH apart (one Swiss
              // flag each), so the code sits beside it (0.49 KIT-10); the row's name
              // carries the language's own name.
              <span className="flex items-center gap-1.5">
                {flagOf(active)}
                <span aria-hidden className="text-xs font-semibold tabular-nums tracking-wide text-secondary">
                  {languageCodeLabel(active.code)}
                </span>
                <span className="sr-only">{active.label}</span>
              </span>
            )}
          </span>
        }
      >
        <ul>
          {languages.map((lang) => (
            <li key={lang.code}>
              <MenuItem
                checked={lang.code === value}
                onClick={() => {
                  change?.(lang.code);
                  setOpen(false);
                  close?.();
                }}
                leading={flagOf(lang)}
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
