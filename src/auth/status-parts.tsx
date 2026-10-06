import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * The pieces the signed-out status pages share — {@link ForgotPasswordForm},
 * {@link ResetPasswordForm}, {@link VerifyEmailStatus}, {@link AcceptInvitation} and
 * {@link NotFoundPage} (docs/auth-harmonization.md §7).
 *
 * @internal Not part of the barrel; the pages are.
 */

/** A heading level a page part may take. Default `h2`, under the page's `h1`
 *  (`AuthLayout`'s `title`, the app's name), as on `SignInForm`'s steps; deeper for a
 *  page embedded in another (a preview, the docs). */
export type AuthHeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** The form pages' heading: start-aligned, the size of `SignInForm`'s step headings. */
export const FORM_HEADING_CLASS = "text-base font-semibold text-[var(--text-primary)]";
/** The status pages' heading: centred over the centred outcome below it. */
export const STATUS_HEADING_CLASS = "text-center text-base font-semibold text-[var(--text-primary)]";
export const INTRO_CLASS = "text-sm text-[var(--text-secondary)]";

/**
 * kastlan's outcome block (verify-email-page, reset-password-page): the kit's
 * `EmptyState` without its dashed box, because it already sits in `AuthLayout`'s card —
 * a box in a box. The icon and the title carry the tone.
 */
export const OUTCOME_CLASS = "border-0 bg-transparent px-0 py-3";

/** `href` with `key=value` added to its query, before any `#fragment`: the reset page's
 *  "Sign in" carries the address (`/login?email=ada%40example.com`). */
export function withQuery(href: string, key: string, value: string): string {
  const hash = href.indexOf("#");
  const base = hash === -1 ? href : href.slice(0, hash);
  const fragment = hash === -1 ? "" : href.slice(hash);
  const separator = base.includes("?") ? (base.endsWith("?") || base.endsWith("&") ? "" : "&") : "?";
  return `${base}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}${fragment}`;
}

/** What a callback's promise came to. */
export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Run `start(key)` ONCE per key, and hand what it settles to into `settle` — unless the
 * key moved on in the meantime, when the stale answer is dropped.
 *
 * keksdose's verify-email and join pages fire their request from an effect behind a
 * `useRef` guard, and say why: the token is single-use, and StrictMode's
 * mount → unmount → remount would send it twice and turn a success into "invalid" on
 * the second answer. The guard is the same here; there is deliberately no "unmounted"
 * flag set in the cleanup, because StrictMode's simulated unmount would set it and the
 * remount would never clear the guard — the page would hang on its spinner (the bug
 * keksdose hit on /join with a react-query observer). A state update after a real
 * unmount is a no-op in React 18 and later.
 *
 * `key === null` runs nothing (no token, not signed in yet) and forgets the last key, so
 * the same token runs again once it is back.
 */
export function useOncePerKey<T>(
  key: string | null,
  start: (key: string) => T | Promise<T>,
  settle: (key: string, result: Settled<T>) => void,
): void {
  const latest = useRef({ start, settle });
  useEffect(() => {
    latest.current = { start, settle };
  });
  const current = useRef<string | null>(null);
  useEffect(() => {
    if (key === null) {
      current.current = null;
      return;
    }
    if (current.current === key) return;
    current.current = key;
    const report = (result: Settled<T>) => {
      if (current.current === key) latest.current.settle(key, result);
    };
    let started: T | Promise<T>;
    try {
      started = latest.current.start(key);
    } catch (error) {
      report({ ok: false, error });
      return;
    }
    Promise.resolve(started).then(
      (value) => report({ ok: true, value }),
      (error: unknown) => report({ ok: false, error }),
    );
  }, [key]);
}

/** Whether a callback's return is a promise to wait for. A callback that returns
 *  nothing is done when it returns. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null)?.then === "function";
}

/**
 * Move focus to `ref` when `active` turns true — the outcome a person's own submit led
 * to ("If an account exists … the link is on its way", "Your password has been
 * changed"). The submit button they pressed is gone with the form, which drops focus to
 * `<body>`; a screen reader then hears nothing at all. Focusing the message (a
 * `tabIndex={-1}` box) reads it out and leaves the next Tab where the page continues.
 */
export function useFocusWhen(active: boolean, ref: { current: HTMLElement | null }): void {
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active, ref]);
}

/** The box {@link useFocusWhen} focuses: centred, no focus ring of its own (it is not a
 *  control; the ring would read as one). */
export function OutcomeMessage({
  icon,
  children,
  focusRef,
  className,
}: {
  icon: ReactNode;
  children: ReactNode;
  focusRef?: { current: HTMLDivElement | null };
  className?: string;
}) {
  return (
    <div
      ref={focusRef}
      tabIndex={-1}
      className={cn("flex flex-col items-center gap-2 py-2 text-center outline-none", className)}
    >
      <span aria-hidden className="[&_svg]:size-10">
        {icon}
      </span>
      {children}
    </div>
  );
}
