import { Check, Globe, Moon, Palette, Sun } from "lucide-react";
import { cn } from "../lib/cn";
import { HoverMenu } from "../components/hover-menu";
import type { PalettePreset } from "../theme/palette-presets";
import type { ThemeMode } from "../theme/theme-store";
import { Tooltip } from "../components/tooltip";
import { DEFAULT_TOP_BAR_LABELS, useKitLabels } from "../i18n/kit-labels";
import { languageCodeLabel } from "./language-code";

/** Shared square icon-button styling for top-bar triggers, so app-owned controls
 *  (account/feedback menus) line up with the shared ones. */
export const TOPBAR_TRIGGER_CLASS =
  "size-9 rounded-md flex items-center justify-center text-secondary hover:text-primary hover:bg-hover";

/** Shared row styling for the top-bar hover-menu items. `text-start`, so a label that
 *  wraps aligns to the reading edge in RTL too. */
export const TOPBAR_MENU_ITEM_CLASS =
  "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-start text-secondary hover:bg-hover";

/** The small uppercase heading row the top-bar menus share (`heading`). */
function MenuHeading({ children }: { children: string }) {
  return (
    <li className="px-3 py-1 text-micro font-semibold uppercase tracking-wide text-placeholder">
      {children}
    </li>
  );
}

/**
 * Sun/Moon toggle for the light/dark theme. Controlled: the app owns the mode, and the
 * toggle keeps no storage key of its own (docs/top-bar-harmonization.md §6.4).
 *
 * `mode` is the theme ON SCREEN — the resolved one, so with a "system" preference it is
 * whatever the OS gives. A tap asks for the opposite of that: `onChange("light")` while
 * dark is shown, `onChange("dark")` while light is. The app writes it as its theme
 * preference (an explicit light or dark), where Settings → Appearance keeps the three-way
 * choice. `onToggle` is the older way to hear the tap, without the next mode; both fire.
 */
export function ThemeToggle({
  mode,
  onToggle,
  onChange,
  "aria-label": ariaLabel,
  title,
  className,
}: {
  /** The resolved light/dark on screen (`useThemeStore`'s `mode`, not its preference). */
  mode: ThemeMode;
  /** Hears a tap. Kept for 0.41's callers; `onChange` says what to switch to. */
  onToggle?: () => void;
  /** 0.42: the mode to switch to — always the opposite of `mode`. */
  onChange?: (next: ThemeMode) => void;
  /** Default: `topBar.theme` from the {@link UiKitProvider}, else English. */
  "aria-label"?: string;
  title?: string;
  className?: string;
}) {
  // This had no default at all, so a toggle rendered without `aria-label` was an
  // icon button with no name — a reader heard "button" and nothing else.
  const labels = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS, { theme: ariaLabel });
  const Icon = mode === "dark" ? Moon : Sun;
  const button = (
    <button
      type="button"
      onClick={() => {
        onChange?.(mode === "dark" ? "light" : "dark");
        onToggle?.();
      }}
      aria-label={labels.theme}
      className={cn(TOPBAR_TRIGGER_CLASS, className)}
    >
      <Icon className="size-5" />
    </button>
  );
  // The name on hover and focus even without a `title` (0.48, keksdose dev#610); a bubble
  // that only repeats it is visual, in a fragment as on IconButton — see OptionSwitcherMenu.
  const tip = title ?? labels.theme;
  return (
    <Tooltip label={tip} portal>
      {tip === labels.theme ? <>{button}</> : button}
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
  "aria-label": ariaLabel,
  heading,
}: {
  palettes: PalettePreset[];
  activeId: string;
  mode: ThemeMode;
  onSelect: (id: string) => void;
  /** Default: `topBar.palette` from the {@link UiKitProvider}, else English. */
  "aria-label"?: string;
  /** Optional small heading row above the list. */
  heading?: string;
}) {
  const labels = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS, { palette: ariaLabel });
  const activeName = palettes.find((p) => p.id === activeId)?.name ?? activeId;
  return (
    <HoverMenu
      aria-label={labels.palette}
      trigger={({ toggle }) => (
        <Tooltip label={activeName} portal>
          <button
            type="button"
            onClick={toggle}
            aria-label={labels.palette}
            className={TOPBAR_TRIGGER_CLASS}
          >
            {/* A DATA colour, not a semantic one: the palette mark is the
                "colour" control, so it carries a colour, and which hue is
                arbitrary. `--chart-1` is the violet end of the CVD-safe
                categorical ramp and flips per theme — a fixed `violet-500` did
                not, and stayed a cool violet island on a warm page. */}
            <Palette className="size-5 text-[var(--chart-1)]" />
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <ul className="w-60 py-1">
          {heading && <MenuHeading>{heading}</MenuHeading>}
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
                      {/* Deliberately a neutral at 10% and not a token: this hairline
                          sits on an ARBITRARY preset colour, so it has to read against
                          whatever that preset paints, which no themed border does. */}
                      {swatches.map((c, i) => (
                        <span
                          key={i}
                          className="size-3.5 rounded-sm ring-1 ring-inset ring-black/10 dark:ring-white/10"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="flex min-w-0 flex-col text-start">
                      <span className="truncate">{p.name}</span>
                      <span className="truncate text-caption text-placeholder">
                        {p.blurb}
                      </span>
                    </span>
                  </span>
                  {activeId === p.id && (
                    <Check className="size-4 shrink-0 text-secondary" />
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

/** What {@link LanguageMenu}'s trigger shows of the active language (0.49 KIT-10). */
export type LanguageMenuTrigger = "flag+code" | "code" | "flag";

/** The trigger with a code: as tall as the others, as wide as flag and code need. */
const LANGUAGE_TRIGGER_WIDE_CLASS = TOPBAR_TRIGGER_CLASS.replace("size-9", "h-9 min-w-9 gap-1.5 px-2");

const FLAG_CLASS =
  "inline-block h-[0.9375rem] w-5 shrink-0 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)]";

/** Language switcher: a hover menu of options with flags and a check on the
 *  active one. Controlled — the app owns the current code and change handler.
 *
 *  The trigger is the *active* option's flag and its language code in capitals
 *  ("DE", "FR", "IT"; `trigger`, 0.49 KIT-10), not an icon: lucide's `Languages`
 *  glyph (文A) is the same mark Chrome puts in the omnibox for "translate this
 *  page", so it read as machine-translation rather than "pick the UI language"
 *  (Keksdose feedback #121). A flag alone could not tell de-CH, fr-CH and it-CH
 *  apart — one Swiss flag each — so the code is beside it. It is named "Choose
 *  language, current: Deutsch" (`topBar.languageCurrent`). A globe covers the
 *  case where `current` matches nothing in `options`. */
export function LanguageMenu({
  options,
  current,
  onChange,
  "aria-label": ariaLabel,
  heading,
  trigger = "flag+code",
}: {
  options: LanguageOption[];
  current: string | undefined;
  onChange: (code: string) => void;
  /** The menu's name, and the trigger's as given. Default: the menu `topBar.language`,
   *  the trigger `topBar.languageCurrent(<the active label>)`, from the
   *  {@link UiKitProvider}, else English. */
  "aria-label"?: string;
  /** Optional small heading row above the list — as on `TopBarActionMenu`,
   *  `OptionSwitcherMenu` and `PaletteMenu`. */
  heading?: string;
  /** What the trigger shows: `"flag+code"` (default), `"code"` or `"flag"`. */
  trigger?: LanguageMenuTrigger;
}) {
  const labels = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS, { language: ariaLabel });
  const active = options.find((o) => o.code === current);
  const triggerName = ariaLabel ?? (active ? labels.languageCurrent(active.label) : labels.language);
  const showsCode = active !== undefined && trigger !== "flag";
  return (
    <HoverMenu
      aria-label={labels.language}
      trigger={({ toggle }) => (
        <Tooltip label={active?.label ?? labels.language} portal>
          <button
            type="button"
            onClick={toggle}
            aria-label={triggerName}
            className={showsCode ? LANGUAGE_TRIGGER_WIDE_CLASS : TOPBAR_TRIGGER_CLASS}
          >
            {active ? (
              <>
                {trigger !== "code" && <span aria-hidden className={`fi fi-${active.country} ${FLAG_CLASS}`} />}
                {showsCode && (
                  <span aria-hidden className="text-xs font-semibold tabular-nums tracking-wide">
                    {languageCodeLabel(active.code)}
                  </span>
                )}
              </>
            ) : (
              <Globe className="size-5" />
            )}
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <ul className="py-1">
          {heading && <MenuHeading>{heading}</MenuHeading>}
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
                    <span aria-hidden className={`fi fi-${lang.country} ${FLAG_CLASS}`} />
                    {lang.label}
                  </span>
                  {isActive && <Check className="size-4 text-secondary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </HoverMenu>
  );
}
