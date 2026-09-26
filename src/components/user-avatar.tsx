import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { StatusDot } from "./status-dot";
import type { StatusDotSize, StatusDotTone } from "./status-dot";

/** Initials from a display name (first + last) or, failing that, an email —
 *  e.g. "Marcel Eifert" → "ME", "marcel@x.com" → "MA". App-agnostic.
 *
 *  "Failing that" means BLANK, not merely absent. This was `name ?? email ?? "?"`,
 *  and `??` falls through on null/undefined alone — so an empty or whitespace-only
 *  display name short-circuited the email it had in hand and landed on the guard
 *  below, returning "?" for a user whose address says "MA" perfectly well. Keksdose
 *  cannot reach it (its `display_name` has `min_length=1`), but this is exported as
 *  app-agnostic, and any consumer whose profile name is optional free text got a wall
 *  of "?" chips. The guard is what shows the empty case was foreseen; it just
 *  answered it at the wrong end. */
export function avatarInitials(name?: string | null, email?: string | null): string {
  const source = [name, email].map((s) => s?.trim()).find(Boolean) ?? "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const AVATAR_SIZES = {
  sm: "size-7 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-12 text-base",
} as const;

const CHIP =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--bg-inverse)] font-semibold text-[var(--text-inverse)]";

/** The dot grows with the avatar: 8px on `sm`, 10px on `md` (keksdose's), 12px on `lg`. */
const BADGE_SIZES: Record<keyof typeof AVATAR_SIZES, StatusDotSize> = { sm: "sm", md: "md", lg: "lg" };

/** A status dot in the avatar's top corner — an unread count, presence. */
export interface UserAvatarBadge {
  /** What the dot MEANS, for a screen reader ("3 unread"). Required: a coloured circle
   *  says nothing to someone who cannot see it. */
  label: ReactNode;
  /** Default `danger`, the unread dot both apps draw by hand. */
  tone?: StatusDotTone;
}

/** A `<span>`'s props, minus `children`: the content is the initials this computes
 *  from `name`/`email`, so there is nothing for a caller to put inside. */
export interface UserAvatarProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  /**
   * A status dot in the top-end corner (the top-right in LTR, top-left in RTL), ringed
   * in the surface colour so it reads as its own mark (keksdose account-menu ~385,
   * top-bar :152). Its `label` is read as text where the dot sits — inside a button
   * named by its content it joins that name. In `TopBarActionMenu`'s `trigger` the
   * button is named by the menu's `ariaLabel` followed by this label: "Account menu
   * 3 unread". The initials stay hidden either way, so the person's name is NOT part
   * of it — put it in `ariaLabel` ("Marcel Eifert, account menu") if it should be.
   */
  badge?: UserAvatarBadge | null;
}

/**
 * A round initials avatar — the common user chip shared across apps (feedback
 * #333). Purely presentational; wrap it in a button for the account menu trigger.
 */
export function UserAvatar({ name, email, size = "md", badge, className, ...rest }: UserAvatarProps) {
  if (badge) {
    // A wrapper, because the chip itself is `aria-hidden` and the badge label must not
    // be. `className` stays on the chip (a size override still sizes the circle); the
    // other attributes go on the wrapper, which is what a caller addresses. `relative`
    // also contains the sr-only text.
    return (
      <span {...rest} className="relative inline-flex shrink-0">
        <span
          aria-hidden
          className={cn(
            CHIP,
            AVATAR_SIZES[size],
            className,
          )}
        >
          {avatarInitials(name, email)}
        </span>
        <StatusDot
          ring
          tone={badge.tone ?? "danger"}
          size={BADGE_SIZES[size]}
          className="absolute -end-0.5 -top-0.5"
        />
        <span className="sr-only">{badge.label}</span>
      </span>
    );
  }
  return (
    <span
      // `aria-hidden` sits BEFORE the spread, unlike the structural attributes on the
      // other components here, because it is a DEFAULT rather than an invariant. The
      // avatar is decorative next to the name it belongs to — which is where all three
      // apps render it — so hiding it stops a screen reader saying "ME" after the word
      // "Marcel Eifert". A caller who renders one ALONE (an assignee column, a
      // presence dot) needs the opposite, and now has it: `aria-hidden={false}` plus an
      // `aria-label` arrives through `...rest` and wins.
      aria-hidden
      {...rest}
      className={cn(
        CHIP,
        AVATAR_SIZES[size],
        className,
      )}
    >
      {avatarInitials(name, email)}
    </span>
  );
}
