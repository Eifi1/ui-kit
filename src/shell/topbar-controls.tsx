import { Check, Globe, Moon, Palette, Sun } from "lucide-react";
import { cn } from "../lib/cn";
import { HoverMenu } from "../components/hover-menu";
import type { PalettePreset } from "../theme/palette-presets";
import type { ThemeMode } from "../theme/theme-store";
import { Tooltip } from "../components/tooltip";
import { DEFAULT_TOP_BAR_LABELS, useKitLabels } from "../i18n/kit-labels";

/** Shared square icon-button styling for top-bar triggers, so app-owned controls
 *  (account/feedback menus) line up with the shared ones. */
export const TOPBAR_TRIGGER_CLASS =
  "size-9 rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]";

/** Shared row styling for the top-bar hover-menu items. `text-start`, so a label that
 *  wraps aligns to the reading edge in RTL too. */
export const TOPBAR_MENU_ITEM_CLASS =
  "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-start text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]";

/** The small uppercase heading row the top-bar menus share (`heading`). */
function MenuHeading({ children }: { children: string }) {
  return (
    <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-placeholder)]">
      {children}
    </li>
  );
}

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
  /** Default: `topBar.theme` from the {@link UiKitProvider}, else English. */
  ariaLabel?: string;
  title?: string;
  className?: string;
}) {
  // This had no default at all, so a toggle rendered without `ariaLabel` was an
  // icon button with no name — a reader heard "button" and nothing else.
  const labels = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS, { theme: ariaLabel });
  const Icon = mode === "dark" ? Moon : Sun;
  return (
    <Tooltip label={title} portal>
      <button
        type="button"
        onClick={onToggle}
        aria-label={labels.theme}
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
  ariaLabel,
  heading,
}: {
  palettes: PalettePreset[];
  activeId: string;
  mode: ThemeMode;
  onSelect: (id: string) => void;
  /** Default: `topBar.palette` from the {@link UiKitProvider}, else English. */
  ariaLabel?: string;
  /** Optional small heading row above the list. */
  heading?: string;
}) {
  const labels = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS, { palette: ariaLabel });
  const activeName = palettes.find((p) => p.id === activeId)?.name ?? activeId;
  return (
    <HoverMenu
      ariaLabel={labels.palette}
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
                      <span className="truncate text-[11px] text-[var(--text-placeholder)]">
                        {p.blurb}
                      </span>
                    </span>
                  </span>
                  {activeId === p.id && (
                    <Check className="size-4 shrink-0 text-[var(--text-secondary)]" />
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
  ariaLabel,
  heading,
}: {
  options: LanguageOption[];
  current: string | undefined;
  onChange: (code: string) => void;
  /** Default: `topBar.language` from the {@link UiKitProvider}, else English. */
  ariaLabel?: string;
  /** Optional small heading row above the list — as on `TopBarActionMenu`,
   *  `OptionSwitcherMenu` and `PaletteMenu`. */
  heading?: string;
}) {
  const labels = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS, { language: ariaLabel });
  const active = options.find((o) => o.code === current);
  return (
    <HoverMenu
      ariaLabel={labels.language}
      trigger={({ toggle }) => (
        <Tooltip label={active?.label ?? labels.language} portal>
          <button
            type="button"
            onClick={toggle}
            aria-label={labels.language}
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
                    <span
                      aria-hidden
                      className={`fi fi-${lang.country} inline-block h-[15px] w-5 shrink-0 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)]`}
                    />
                    {lang.label}
                  </span>
                  {isActive && <Check className="size-4 text-[var(--text-secondary)]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </HoverMenu>
  );
}
