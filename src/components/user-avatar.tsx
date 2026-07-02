import { cn } from "../lib/cn";

/** Initials from a display name (first + last) or, failing that, an email —
 *  e.g. "Marcel Eifert" → "ME", "marcel@x.com" → "MA". App-agnostic. */
export function avatarInitials(name?: string | null, email?: string | null): string {
  const source = (name ?? email ?? "?").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const AVATAR_SIZES = {
  sm: "size-7 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-12 text-base",
} as const;

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}

/**
 * A round initials avatar — the common user chip shared across apps (feedback
 * #333). Purely presentational; wrap it in a button for the account menu trigger.
 */
export function UserAvatar({ name, email, size = "md", className }: UserAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white dark:bg-slate-100 dark:text-slate-900",
        AVATAR_SIZES[size],
        className,
      )}
    >
      {avatarInitials(name, email)}
    </span>
  );
}
