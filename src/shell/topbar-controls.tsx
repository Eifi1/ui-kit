import { Check, Globe, Moon, Palette, Sun } from "lucide-react";
import { cn } from "../lib/cn";
import { HoverMenu } from "../components/hover-menu";
import type { PalettePreset } from "../theme/palette-presets";
import type { ThemeMode } from "../theme/theme-store";
import { Tooltip } from "../components/tooltip";

/** Shared square icon-button styling for top-bar triggers, so app-owned controls
 *  (account/feedback menus) line up with the shared ones. */
export const TOPBAR_TRIGGER_CLASS =
  "size-9 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800";

/** Shared row styling for the top-bar hover-menu items. */
export const TOPBAR_MENU_ITEM_CLASS =
  "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800";

/** Sun/Moon toggle for the light/dark theme. Controlled: the app owns the mode. */
export function ThemeToggle({
  mode,
  onToggle,
  ariaLabel,
  title,
  className,
}: {
  mode: ThemeMode;
  onToggle: () => void;
  ariaLabel?: string;
  title?: string;
  className?: string;
}) {
  const Icon = mode === "dark" ? Moon : Sun;
  return (
    <Tooltip label={title} portal>
      <button
        type="button"
        onClick={onToggle}
        aria-label={ariaLabel}
        className={cn(TOPBAR_TRIGGER_CLASS, className)}
      >
        <Icon className="size-5" />
      </button>
    </Tooltip>
  );
}

/** Appearance-preset switcher: a hover menu of palette presets with per-theme
 *  colour swatches. Controlled — the app owns the active id and applies it. */
export function PaletteMenu({
  palettes,
  activeId,
  mode,
  onSelect,
  ariaLabel = "Appearance preset",
  heading,
}: {
  palettes: PalettePreset[];
  activeId: string;
  mode: ThemeMode;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  /** Optional small heading row above the list. */
  heading?: string;
}) {
  const activeName = palettes.find((p) => p.id === activeId)?.name ?? activeId;
  return (
    <HoverMenu
      ariaLabel={ariaLabel}
      trigger={({ toggle }) => (
        <Tooltip label={activeName} portal>
          <button
            type="button"
            onClick={toggle}
            aria-label={ariaLabel}
            className={TOPBAR_TRIGGER_CLASS}
          >
            <Palette className="size-5 text-violet-500" />
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <ul className="w-60 py-1">
          {heading && (
            <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {heading}
            </li>
          )}
          {palettes.map((p) => {
            const ts = p[mode];
            const swatches = [ts.bgPage, ts.brand, ts.moneyIncome, ts.moneyExpense, ts.moneyNet];
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(p.id);
                    close();
                  }}
                  className={TOPBAR_MENU_ITEM_CLASS}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex shrink-0 gap-0.5">
                      {swatches.map((c, i) => (
                        <span
                          key={i}
                          className="size-3.5 rounded-sm ring-1 ring-inset ring-black/10 dark:ring-white/10"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="flex min-w-0 flex-col text-left">
                      <span className="truncate">{p.name}</span>
                      <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {p.blurb}
                      </span>
                    </span>
                  </span>
                  {activeId === p.id && (
                    <Check className="size-4 shrink-0 text-slate-700 dark:text-slate-200" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </HoverMenu>
  );
}

export interface LanguageOption {
  code: string;
  label: string;
  /** ISO 3166-1 alpha-2 country code (lowercase) for the flag-icons flag. */
  country: string;
}

/** Language switcher: a hover menu of options with flags and a check on the
 *  active one. Controlled — the app owns the current code and change handler.
 *
 *  The trigger is the *active* option's flag, not an icon: lucide's `Languages`
 *  glyph (文A) is the same mark Chrome puts in the omnibox for "translate this
 *  page", so it read as machine-translation rather than "pick the UI language"
 *  (Keksdose feedback #121). The flag also shows which language is currently on,
 *  which no icon can, and costs the same width on a crowded mobile bar. A globe
 *  covers the case where `current` matches nothing in `options`. */
export function LanguageMenu({
  options,
  current,
  onChange,
  ariaLabel = "Language",
}: {
  options: LanguageOption[];
  current: string | undefined;
  onChange: (code: string) => void;
  ariaLabel?: string;
}) {
  const active = options.find((o) => o.code === current);
  return (
    <HoverMenu
      ariaLabel={ariaLabel}
      trigger={({ toggle }) => (
        <Tooltip label={active?.label ?? ariaLabel} portal>
          <button
            type="button"
            onClick={toggle}
            aria-label={ariaLabel}
            className={TOPBAR_TRIGGER_CLASS}
          >
            {active ? (
              <span
                aria-hidden
                className={`fi fi-${active.country} inline-block h-[15px] w-5 shrink-0 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)]`}
              />
            ) : (
              <Globe className="size-5" />
            )}
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <ul className="py-1">
          {options.map((lang) => {
            const isActive = lang.code === current;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(lang.code);
                    close();
                  }}
                  className={TOPBAR_MENU_ITEM_CLASS}
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`fi fi-${lang.country} inline-block h-[15px] w-5 shrink-0 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)]`}
                    />
                    {lang.label}
                  </span>
                  {isActive && <Check className="size-4 text-slate-700 dark:text-slate-200" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </HoverMenu>
  );
}
