import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Card } from "../components/ui";
import type { CardTone } from "../components/ui";
import { cn } from "../lib/cn";
import { CARD_DESCRIPTION_CLASS, CARD_TITLE_CLASS } from "../account/account-parts";
import { SettingsHeading, useSettingsHeadingLevel } from "./settings-heading";
import { useSettingsLayout } from "./settings-context";

export interface SettingsSectionProps extends Omit<ComponentPropsWithoutRef<"div">, "title" | "id"> {
  /** The card's DOM id — the catalogue entry's `anchor`, the `?focus=` target. */
  anchor: string;
  /** The card's name: a heading at the layout's level (`h3` by default). */
  title: ReactNode;
  /**
   * `false` keeps the title for screen readers only — for a card alone in a group named
   * after it, so the page does not print the same heading twice (§3.7, keksdose's admin,
   * dev#490/#493/#494). The heading is still there: the outline and `?focus=` need it.
   * Default `true`.
   */
  titleVisible?: boolean;
  /** One muted line under the title. */
  description?: ReactNode;
  /** `danger` for the destructive cards at the end of "data" (§3.7). */
  tone?: CardTone;
  /** A control at the title's end — a refresh, a toggle. It drops under the title when
   *  the card is too narrow for both. */
  action?: ReactNode;
  children?: ReactNode;
}

/**
 * Is this a development build? The consumer's bundler makes `import.meta.env.DEV` false in
 * production, so the check below is dead code there. Unlike the kit's warnings it stays
 * on under vitest: a card that cannot be found is a bug a test should fail on.
 * Optional-chained: `import.meta.env` is a Vite injection, absent under plain Node.
 */
function devChecks(): boolean {
  return Boolean(import.meta.env?.DEV);
}

/**
 * An app's own settings card (docs/settings-harmonization.md §3.7, §7.1): a kit `Card` at
 * the settings type scale — the title `text-sm font-medium`, the description `text-xs`
 * muted, as the kit's own setting cards — with the catalogue anchor as its id, the title
 * as a heading under the group's, and the `?focus=` ring landing on it.
 *
 * **A card without a catalogue entry throws in development** (keksdose's `section()`
 * guard). A card search cannot find breaks the rule that every setting is findable
 * (§4.1), and the old failure was silent: a hit that scrolled nowhere. The check runs
 * inside a {@link SettingsLayout}, which holds the catalogue; outside one there is
 * nothing to check against.
 */
export function SettingsSection({
  anchor,
  title,
  titleVisible = true,
  description,
  tone,
  action,
  children,
  className,
  ...rest
}: SettingsSectionProps) {
  const layout = useSettingsLayout();
  const level = useSettingsHeadingLevel() ?? "h3";
  if (layout && devChecks() && !layout.hasAnchor(anchor)) {
    throw new Error(
      `SettingsSection "${anchor}" has no catalogue entry: add a SettingsEntry with anchor "${anchor}" so search and ?focus= can reach it.`,
    );
  }
  const heading = (
    <SettingsHeading
      as={level}
      // Focusable from script only: `?focus=` moves focus here (§3.5).
      tabIndex={-1}
      data-settings-heading=""
      className={cn(CARD_TITLE_CLASS, "outline-none", !titleVisible && "sr-only-fixed")}
    >
      {title}
    </SettingsHeading>
  );
  const header =
    titleVisible || description != null || action != null ? (
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          {heading}
          {description != null && <div className={CARD_DESCRIPTION_CLASS}>{description}</div>}
        </div>
        {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    ) : (
      heading
    );
  return (
    <Card
      {...rest}
      id={anchor}
      tone={tone}
      // A column with a gap, not `space-y-3`: a hidden title is `position: fixed` and so
      // out of the flow, and a gap is only drawn between items in it — `space-y` would
      // still push the first card part down by a gap for the title nobody sees.
      className={cn("flex flex-col gap-3 p-4 transition-shadow motion-reduce:transition-none", className)}
    >
      {header}
      {children}
    </Card>
  );
}
