import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { CARD_TITLE_CLASS } from "../account/account-parts";

/** The heading a settings card's title becomes. */
export type SettingsHeadingTag = "h2" | "h3" | "h4";

const SettingsHeadingLevelContext = createContext<SettingsHeadingTag | null>(null);

export interface SettingsHeadingLevelProps {
  /** The element every kit setting card below titles itself with. */
  level: SettingsHeadingTag;
  children?: ReactNode;
}

/**
 * The level the kit's setting cards title themselves at (docs/settings-harmonization.md
 * §3.7). Inside {@link SettingsLayout} a card's title is a heading under the group's —
 * `h3` under the desktop's `h2`, `h2` under a phone group page's `h1` — and the layout
 * sets this for every card it renders. Outside one, nothing is set and the same cards
 * keep the plain `div` title they always had, so a card on an app's own page does not
 * suddenly put an `h3` into an outline that has no `h2`.
 *
 * Set it yourself only where an app lays out settings cards without the layout and
 * wants them in its outline: `<SettingsHeadingLevel level="h3">…</SettingsHeadingLevel>`.
 * `ProfileSetting`, `PasswordSetting`, `TwoFactorSetting`, `PasskeysSetting`,
 * `EmailChangeSetting`, `SessionsSetting`, `DataExportSetting`, `DeleteAccountSetting`
 * and `SettingsSection` read it.
 */
export function SettingsHeadingLevel({ level, children }: SettingsHeadingLevelProps) {
  return <SettingsHeadingLevelContext.Provider value={level}>{children}</SettingsHeadingLevelContext.Provider>;
}

/** The nearest {@link SettingsHeadingLevel}, or `null` outside one. */
export function useSettingsHeadingLevel(): SettingsHeadingTag | null {
  return useContext(SettingsHeadingLevelContext);
}

/**
 * A setting card's title at the settings type scale: a heading inside a
 * {@link SettingsHeadingLevel}, the plain `div` outside one.
 *
 * As a heading it takes `tabIndex={-1}`: `?focus=` moves focus to the card's heading so a
 * screen reader lands on the card it was sent to (§3.5), and a heading is not focusable
 * otherwise. No outline of its own — the ring round the card marks it.
 *
 * @internal The kit's cards use it; not part of the barrel.
 */
export function SettingsCardTitle({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const level = useSettingsHeadingLevel();
  if (!level) return <div {...props} className={cn(CARD_TITLE_CLASS, className)} />;
  return <SettingsHeading as={level} tabIndex={-1} {...props} className={cn(CARD_TITLE_CLASS, "outline-none", className)} />;
}

/**
 * A heading at a level chosen at run time. Its own component, taking the tag as a prop
 * (as `CardTitle` does), so the element type is a prop and not a value computed in the
 * caller's render.
 *
 * @internal
 */
export function SettingsHeading({ as: Tag, ...props }: { as: SettingsHeadingTag } & ComponentPropsWithoutRef<"h2">) {
  return <Tag {...props} />;
}
