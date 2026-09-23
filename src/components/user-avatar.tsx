import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";

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

/** A `<span>`'s props, minus `children`: the content is the initials this computes
 *  from `name`/`email`, so there is nothing for a caller to put inside. */
export interface UserAvatarProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof AVATAR_SIZES;
}

/**
 * A round initials avatar — the common user chip shared across apps (feedback
 * #333). Purely presentational; wrap it in a button for the account menu trigger.
 */
export function UserAvatar({ name, email, size = "md", className, ...rest }: UserAvatarProps) {
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
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--bg-inverse)] font-semibold text-[var(--text-inverse)]",
        AVATAR_SIZES[size],
        className,
      )}
    >
      {avatarInitials(name, email)}
    </span>
  );
}
